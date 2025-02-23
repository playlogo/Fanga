import { TextLineStream } from "https://deno.land/std@0.224.0/streams/mod.ts";
import { JsonParseStream } from "jsr:@std/json@0.224.0/json-parse-stream";

import { Context, Server, req, res, proxy, setCORS } from "https://deno.land/x/faster@v12.1/mod.ts";

import { exists, genId, serialize, hash } from "./utils.ts";
import { ProjectType, ProxyState, StateType, RouteSerializedType, RouteType } from "./types.ts";

export class ProjectManager {
	projects: { [key: string]: Project } = {};

	state: StateType = {
		currentProject: undefined,
		demo: false,
		proxyUrl: "",
		mode: "pause",
	};

	activeProject: Project | undefined = undefined;

	async collect(state: ProxyState = "pause", currentProject: string | undefined = undefined) {
		// Scan project dir for projects
		if (!exists("projects/")) {
			await Deno.mkdir("projects/");
		}

		for await (const entry of Deno.readDir("projects/")) {
			if (!entry.isFile) {
				continue;
			}

			// Parse first line
			const file = await Deno.open(`projects/${entry.name}`, { read: true });
			const lines = file.readable
				.pipeThrough(new TextDecoderStream())
				.pipeThrough(new TextLineStream());

			const reader = lines.getReader();
			const { value: firstLine } = await reader.read();
			reader.releaseLock();

			let project: ProjectType;

			try {
				project = JSON.parse(firstLine!);
				project.fileName = entry.name;
			} catch (err) {
				console.error(`[projects] Unable to parse '${entry.name}'`);
				console.error(err);

				continue;
			}

			// Create internal project
			this.projects[project.id] = new Project(project, this);
		}

		console.log(`[projects] Found ${Object.keys(this.projects).length} project(s)`);

		// Get current state
		if (currentProject !== undefined) {
			// Lookup id -> Name
			const lookup = Object.entries(this.projects).filter(
				(entry) => entry[1].project.name === currentProject
			);

			if (lookup.length !== 0) {
				console.error(`[projects] Unable to activate project '${currentProject}': Not found`);
				Deno.exit(1);
			}

			const currentProjectId = lookup[0][0];

			// Load project
			await this.activateProject(currentProjectId);

			// Apply state
			this.state.mode = state;

			if (state === "capture") {
				await this.activeProject!.capture();
			}

			if (state === "serve") {
				await this.activeProject!.serve();
			}
		}
	}

	async activateProject(projectId: string) {
		// Unload last project
		if (this.activeProject !== undefined) {
			// Check if same
			if (this.activeProject.project.id === projectId) {
				return;
			}

			// Check if recording or serving
			if (this.state.mode !== "pause") {
				await this.activeProject.pause();
				this.state.mode = "pause";
			}

			await this.activeProject.unload();
		}

		// Activate new project
		this.state["currentProject"] = projectId;
		this.activeProject = this.projects[projectId];

		await this.activeProject.load();

		console.log(`[projects] Activated project '${this.activeProject!.project.name}'`);
	}

	async deleteProject(projectId: string) {
		const projectToDelete = this.projects[projectId];
		delete this.projects[projectId];

		if (this.activeProject?.project.id === projectId) {
			// Unload project
			await this.activeProject.unload();

			this.state["currentProject"] = undefined;
			this.activeProject = undefined;
		}

		// Delete project
		await Deno.remove(`projects/${projectToDelete.project.fileName}`);
	}

	async exit() {
		if (this.activeProject !== undefined) {
			await this.activeProject.unload();
		}
	}

	routes(server: Server) {
		/* Projects */
		server.get("/projects", setCORS(), res("json"), (ctx: Context) => {
			ctx.res.body = Object.values(this.projects)
				.map((entry) => entry.project)
				.map((entry) => {
					entry.active = this.activeProject?.project.id === entry.id;
					return entry;
				});
		}); // List projects

		server.post(
			"/projects/:projectId/activate",
			setCORS(),
			res("json"),
			(async (ctx: Context) => {
				const projectId = ctx.params.projectId;

				await this.activateProject(projectId);

				// Return routes
				ctx.res.body = this.activeProject!.project!;
				ctx.res.body.routes = this.activeProject!.listRoutes();
			}).bind(this)
		); // Activate project

		server.delete(
			"/projects/:projectId",
			setCORS(),
			(async (ctx: Context) => {
				const projectId = ctx.params.projectId;

				await this.deleteProject(projectId);

				console.log(`[projects] Deleted project '${this.activeProject!.project.name}'`);
			}).bind(this)
		); // Delete project

		server.post(
			"/projects",
			setCORS(),
			req("json"),
			res("json"),
			(async (ctx: Context) => {
				const body = ctx.body;

				const newProject: ProjectType = {
					name: body.name,
					routes: [],
					url: body.url,
					fileName: serialize(body.name) + ".txt",
					id: genId(10),
				};

				this.projects[newProject.id] = new Project(newProject, this);

				await this.activateProject(newProject.id);

				ctx.res.body = newProject;
			}).bind(this)
		); // Create project

		server.post(
			"/projects/:projectId",
			setCORS(),
			req("json"),
			res("json"),
			(async (ctx: Context) => {
				const projectId = ctx.params.projectId;
				const body: { name: string; url: string } = ctx.body;

				// Only allow changing params on active project
				if (this.activeProject === undefined || this.activeProject?.project.id !== projectId) {
					ctx.res.status = 401;
					return;
				}

				// Update params
				this.activeProject.project.name = body.name;
				this.activeProject.project.url = body.url;

				// Unload (save) project
				await this.activeProject.unload();

				// Load project
				await this.activeProject.load();

				console.log(`[projects] Updated project '${this.activeProject.project.name}'`);
			}).bind(this)
		); // Edit project params: name + url

		/* Routes */
		server.get(
			"/projects/:projectId/routes",
			setCORS(),
			res("json"),
			(async (ctx: Context) => {
				const projectId = ctx.params.projectId;

				if (this.projects[projectId] === undefined) {
					ctx.res.status = 401;
					ctx.res.statusText = "Project not found";

					return;
				}

				if (this.activeProject?.project.id === projectId) {
					ctx.res.body = await this.activeProject.listRoutes();
				} else {
					ctx.res.status = 401;
					ctx.res.statusText = "Project not active";

					return;
				}
			}).bind(this)
		); // List routes

		server.get(
			"/projects/:projectId/routes/:routeId",
			setCORS(),
			res("json"),
			(async (ctx: Context) => {
				const projectId = ctx.params.projectId;
				const routeId = ctx.params.routeId;

				if (this.projects[projectId] === undefined) {
					ctx.res.status = 401;
					ctx.res.statusText = "Project not found";

					return;
				}

				if (this.activeProject?.project.id === projectId) {
					ctx.res.body = await this.activeProject.inspectRoute(routeId);
				} else {
					ctx.res.status = 401;
					ctx.res.statusText = "Project not active";

					return;
				}
			}).bind(this)
		); // Inspect routes

		server.delete(
			"/projects/:projectId/routes/:routeId",
			setCORS(),
			(async (ctx: Context) => {
				const projectId = ctx.params.projectId;
				const routeId = ctx.params.routeId;

				if (this.projects[projectId] === undefined) {
					ctx.res.status = 401;
					ctx.res.statusText = "Project not found";

					return;
				}

				if (this.activeProject?.project.id === projectId) {
					ctx.res.body = await this.activeProject.deleteRoute(routeId);
				} else {
					ctx.res.status = 401;
					ctx.res.statusText = "Project not active";

					return;
				}
			}).bind(this)
		); // Delete route routes

		/* State */
		server.get(
			"/state",
			setCORS(),
			res("json"),
			((ctx: Context) => {
				ctx.res.body = this.state;
			}).bind(this)
		);

		server.options("/state", setCORS());
		server.post("/state", req("json"), setCORS(), async (ctx: Context) => {
			const body: { state: ProxyState } = ctx.body;

			if (this.activeProject !== undefined) {
				if (body.state === "pause") {
					await this.activeProject.pause();
				}

				if (body.state === "capture") {
					await this.activeProject.capture();
				}

				if (body.state === "serve") {
					await this.activeProject.serve();
				}

				this.state.mode = body.state;
				console.log(`[projects] Changed state to '${body.state}'`);
			} else {
				ctx.res.status = 401;
			}
		}); // Change state
	}
}

export default new ProjectManager();

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

/*


*/
