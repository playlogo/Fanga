import { TextLineStream } from "https://deno.land/std@0.224.0/streams/mod.ts";
import { Context, Server, proxy } from "https://deno.land/x/faster@v12.1/mod.ts";

import { JsonParseStream } from "jsr:@std/json@0.224.0/json-parse-stream";

import { genId, hash } from "../utils.ts";
import { ProjectType, RouteSerializedType, RouteType } from "../types.ts";

import { ProjectManager } from "./projectManager.ts";

export class Project {
	project: ProjectType;

	#projectManager: ProjectManager;

	/* Routes */
	#routeContent: {
		[key: string]: {
			[key: string]: {
				req: unknown;
				res: unknown;
			};
		};
	} = {};
	#routeList: RouteType[] = [];
	#routeIdToPath: { [key: string]: [string, string] } = {};

	constructor(project: ProjectType, projectManager: ProjectManager) {
		this.project = project;
		this.#projectManager = projectManager;
	}

	/* Storage */
	async unload() {
		await this.pause();

		this.project.active = false;

		// Serialize
		const encoder = new TextEncoder();
		const file = await Deno.open(`projects/${this.project.fileName}`, { create: true, write: true });

		// Heading
		await file.write(encoder.encode(JSON.stringify(this.project)));

		// Routes
		for (const route of this.#routeList) {
			const entry = JSON.parse(JSON.stringify(route));

			entry.request = this.#routeContent[route.path][route.method].req;
			entry.response = this.#routeContent[route.path][route.method].res;

			await file.write(encoder.encode(JSON.stringify(entry) + "\n"));
		}

		file.close();
	}

	async load() {
		this.project.active = true;

		// Parse file
		const file = await Deno.open(`projects/${this.project.fileName}`);
		const readable = file.readable
			.pipeThrough(new TextDecoderStream())
			.pipeThrough(new TextLineStream())
			.pipeThrough(new JsonParseStream());

		let firstLine = true;

		for await (const parsed of readable) {
			if (firstLine) {
				firstLine = false;

				this.project = parsed as unknown as ProjectType;
				continue;
			}

			const route = parsed as unknown as RouteSerializedType;
			this.#routeList.push({
				id: route.id,
				method: route.method,
				path: route.path,
				requestType: route.requestType,
				responseType: route.responseType,
			});

			if (this.#routeContent[route.path] === undefined) {
				this.#routeContent[route.path] = {};
			}

			this.#routeContent[route.path][route.method] = { res: route.response, req: route.request };
			this.#routeIdToPath[route.id] = [route.path, route.method];
		}
	}

	/* Routes */
	listRoutes() {
		return this.#routeList;
	}

	inspectRoute(routeId: string) {
		const routePath = this.#routeIdToPath[routeId];
		const entry = this.#routeContent[routePath[0]][routePath[1]];

		return {
			request: entry.req,
			response: entry.res,
		};
	}

	deleteRoute(routeId: string) {
		const routePath = this.#routeIdToPath[routeId];
		delete this.#routeIdToPath[routeId];

		delete this.#routeContent[routePath[0]][routePath[1]];

		this.#routeList.splice(
			this.#routeList.findIndex((entry) => entry.id === routeId),
			1
		);
	}

	/* State */
	server: Server | undefined;

	async capture() {
		await this.pause();

		this.server = new Server();

		const requestBodyCache: { [key: string]: ReadableStream<Uint8Array> } = {};

		// Store request body
		this.server.useAtBeginning(async (ctx, next) => {
			if (!ctx.req.body) {
				return;
			}

			const rayId = await hash(`${ctx.req.method}/${ctx.req.url}`);

			const [requestBodyOriginal, requestBodyCopy] = ctx.req.body.tee();

			ctx.req = new Request(ctx.req.url, {
				body: requestBodyOriginal,
				headers: ctx.req.headers,
				method: ctx.req.method,
			});

			requestBodyCache[rayId] = requestBodyCopy;

			// Continue
			await next();

			if (ctx.error) {
				console.error(ctx.error);
			}

			// Delete on internal error
			delete requestBodyCache[rayId];
		});

		const handler = async (ctx: Context) => {
			const method = ctx.req.method;
			const url = ctx.req.url.replace(this.project.url, "");

			// Get bodies
			let requestBodyType = ctx.req.headers.get("content-type") ?? "empty";
			let requestBody = ctx.req.body;

			if (requestBody !== null) {
				const rayId = await hash(`${ctx.req.method}/${ctx.req.url}`);

				if (requestBodyCache[rayId]) {
					requestBody = requestBodyCache[rayId];
					delete requestBodyCache[rayId];
				}
			}

			let responseBodyType = ctx.res.headers.get("content-type") ?? "empty";
			let responseBody = ctx.res.body;

			if (responseBody !== null) {
				const [responseBodyOriginal, responseBodyCopy] = ctx.res.body?.tee();
				ctx.res.body = responseBodyOriginal;

				responseBody = responseBodyCopy;
			}

			// TODO: Types: only store text/plain, not encoding utf-8 etc

			// Delete old stored route
			const index = this.#routeList.findIndex(
				(entry) => `${entry.method}/${entry.path}` === `${method}/${url}`
			);

			if (index != -1) {
				delete this.#routeIdToPath[this.#routeList[index].id];
				delete this.#routeContent[url][method];
				this.#routeList.splice(index, 1);
			}

			// Store route
			const id = genId(10);

			this.#routeList.push({
				id: genId(10),
				method: method,
				path: url,
				requestType: requestBodyType,
				responseType: responseBodyType,
			});

			this.#routeIdToPath[id] = [url, method];

			if (this.#routeContent[url] === undefined) {
				this.#routeContent[url] = {};
			}

			this.#routeContent[url][method] = {
				res: responseBody,
				req: requestBody,
			};
		};

		this.server.get("*", proxy({ url: this.project.url }), handler);
		this.server.put("*", proxy({ url: this.project.url }), handler);
		this.server.post("*", proxy({ url: this.project.url }), handler);
		this.server.delete("*", proxy({ url: this.project.url }), handler);

		// Start listening
		console.log("[routes] Capturing");

		this.server!.listen({ port: 8001 });
	}

	async serve() {
		await this.pause();

		this.server = new Server();

		this.server.get("*", async (ctx: Context) => {
			console.log(ctx.req.url);
			console.log(ctx.req.method);

			if (ctx.req.body !== null) {
				console.log(ctx.req.headers);
			}
		});

		// Start listening
		console.log("serving");

		this.server!.listen({ port: 8001 });
	}

	async pause() {
		if (this.server) {
			await this.server.server.shutdown();
			this.server = undefined;
		}
	}
}
