import { TextLineStream } from "https://deno.land/std@0.224.0/streams/mod.ts";
import { Context, Server, proxy } from "https://deno.land/x/faster@v12.1/mod.ts";

import { JsonParseStream } from "jsr:@std/json@0.224.0/json-parse-stream";

import { exists, genId, hash } from "../utils.ts";
import { ProjectType, RouteSerializedType, RouteType } from "../types.ts";

import { ProjectManager } from "./projectManager.ts";

export class Project {
	project: ProjectType;

	#projectManager: ProjectManager;

	/* Routes */
	#routeContent: {
		[key: string]: {
			[key: string]: {
				req?: string;
				res?: string;
				resType?: string;
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

		if (await exists(`projects/${this.project.fileName}`)) {
			await Deno.remove(`./projects/${this.project.fileName}`);
		}

		// Serialize
		const encoder = new TextEncoder();
		const file = await Deno.open(`projects/${this.project.fileName}`, { create: true, write: true });

		// Heading
		await file.write(encoder.encode(JSON.stringify(this.project) + "\n"));

		// Routes
		for (const route of this.#routeList) {
			const entry = JSON.parse(JSON.stringify(route));

			entry.request = this.#routeContent[route.path][route.method].req;
			entry.response = this.#routeContent[route.path][route.method].res;
			entry.responseType = this.#routeContent[route.path][route.method].resType;

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

			this.#routeContent[route.path][route.method] = {
				res: route.response,
				req: route.request,
				resType: route.responseType,
			};
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

		const requestBodyCache: { [key: string]: string } = {};

		// Store request body
		this.server.useAtBeginning(async (ctx, next) => {
			if (!ctx.req.body) {
				await next();
				return;
			}

			const url = new URL(ctx.req.url);
			const path = ctx.req.url.replace(url.protocol + "//", "").replace(url.host, "");
			const rayId = await hash(`${ctx.req.method}/${path}`);

			const [requestBodyOriginal, requestBodyCopy] = ctx.req.body.tee();

			ctx.req = new Request(ctx.req.url, {
				body: requestBodyOriginal,
				headers: ctx.req.headers,
				method: ctx.req.method,
			});

			// Decode request body
			let decodedRequestBody;

			try {
				const read = await requestBodyCopy.getReader().read();
				decodedRequestBody = new TextDecoder().decode(read.value);
			} catch (err) {}

			requestBodyCache[rayId] = decodedRequestBody!;

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
			let requestBody: any = ctx.req.body;

			if (requestBody !== null) {
				const url = new URL(ctx.req.url);
				const path = ctx.req.url.replace(url.protocol + "//", "").replace(url.host, "");
				const rayId = await hash(`${ctx.req.method}/${path}`);

				if (requestBodyCache[rayId]) {
					requestBody = requestBodyCache[rayId];
					delete requestBodyCache[rayId];
				}
			}

			let responseBodyType = ctx.res.headers.get("content-type") ?? "empty";
			let responseBody = ctx.res.body as ReadableStream<Uint8Array> | null;

			if (responseBody !== null) {
				const [responseBodyOriginal, responseBodyCopy] = (ctx.res
					.body as ReadableStream<Uint8Array> | null)!.tee();
				ctx.res.body = responseBodyOriginal;

				responseBody = responseBodyCopy;
			}

			// Types: only store text/plain, not encoding utf-8 etc
			requestBodyType = requestBodyType.split(";")[0];
			responseBodyType = responseBodyType.split(";")[0];

			// Break SSE
			if (
				responseBodyType === "text/event-stream" ||
				!(responseBodyType.startsWith("application") || responseBodyType.startsWith("text"))
			) {
				throw new Error("Cancel");
			}

			// Bodies: Only store "plaintext" (html, json, etc.) requests & responses
			let decodedResponse;

			if (responseBody !== null) {
				try {
					// Read entire body
					const reader = responseBody.getReader();
					let total = new Uint8Array();

					let r;
					while (!(r = await reader.read()).done) {
						total = new Uint8Array([...total, ...r.value]);
					}

					decodedResponse = new TextDecoder().decode(total);
				} catch (err) {}
			}

			// Store: Either overwrite stored route, or create new one
			const index = this.#routeList.findIndex(
				(entry) => `${entry.method}/${entry.path}` === `${method}/${url}`
			);

			if (this.#routeContent[url] === undefined) {
				this.#routeContent[url] = {};
			}

			this.#routeContent[url][method] = {
				res: decodedResponse,
				resType: responseBodyType,
				req: requestBody,
			};

			if (index != -1) {
				this.#routeList[index].requestType = requestBodyType;
				this.#routeList[index].responseType = responseBodyType;
			} else {
				// Store route
				const id = genId(10);

				this.#routeList.push({
					id: id,
					method: method,
					path: url,
					requestType: requestBodyType,
					responseType: responseBodyType,
				});

				this.#routeIdToPath[id] = [url, method];
			}
		};

		this.server.get("*", proxy({ url: this.project.url }), handler.bind(this));
		this.server.put("*", proxy({ url: this.project.url }), handler.bind(this));
		this.server.post("*", proxy({ url: this.project.url }), handler.bind(this));
		this.server.delete("*", proxy({ url: this.project.url }), handler.bind(this));

		// Start listening
		console.log("[routes] Capturing");

		this.server!.listen({ port: 8001 });

		return 8001;
	}

	async serve() {
		await this.pause();

		this.server = new Server();

		const handler = async (ctx: Context) => {
			const url = new URL(ctx.req.url);
			const path = ctx.req.url.replace(url.protocol + "//", "").replace(url.host, "");

			if (this.#routeContent[path] !== undefined) {
				if (this.#routeContent[path][ctx.req.method] !== undefined) {
					const entry = this.#routeContent[path][ctx.req.method];

					if (entry.res !== undefined) {
						ctx.res.headers.append("Content-type", entry.resType!);
						ctx.res.body = new TextEncoder().encode(entry.res);
					}

					return;
				}
			}

			ctx.res.status = 404;
		};

		this.server.get("*", handler.bind(this));
		this.server.put("*", handler.bind(this));
		this.server.post("*", handler.bind(this));
		this.server.delete("*", handler.bind(this));

		// Start listening
		this.server!.listen({ port: 8001 });

		return 8001;
	}

	async pause() {
		if (this.server) {
			await this.server.server.shutdown();
			this.server = undefined;
		}

		return undefined;
	}
}
