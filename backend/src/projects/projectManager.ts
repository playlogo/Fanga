import { parseArgs } from "jsr:@std/cli/parse-args";

import { TextLineStream } from "https://deno.land/std@0.224.0/streams/mod.ts";
import { Context, Server, req, res, setCORS } from "https://deno.land/x/faster@v12.1/mod.ts";

import { exists, genId, serialize } from "../utils.ts";
import { ProjectType, ProxyState, StateType } from "../types.ts";
import { Project } from "./project.ts";

export class ProjectManager {
	projects: { [key: string]: Project } = {};

	state: StateType = {
		currentProject: undefined,
		demo: false,
		proxyPort: undefined,
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

	async args() {
		const flags = parseArgs(Deno.args, {
			boolean: ["serve", "capture"],
			string: ["project"],
			default: { capture: false, serve: false },
		});

		// Activate project
		if (flags.project !== undefined) {
			const lookup = Object.values(this.projects).filter(
				(entry) => entry.project.name === flags.project
			);

			if (lookup.length !== 1) {
				console.error(`Unknown project '${flags.project}'`);
				Deno.exit(2);
			}

			await this.activateProject(lookup[0].project.id);

			console.log(`[startup] Activated project`);

			// Set mode
			if (flags.capture) {
				this.state.proxyPort = await this.activeProject?.capture();
				this.state.mode = "capture";

				console.log(`[startup] Started capture mode`);
			} else if (flags.serve) {
				this.state.proxyPort = await this.activeProject?.serve();
				this.state.mode = "serve";

				console.log(`[startup] Started serve mode`);
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

		/**
		 * @typedef {object} Project
		 * @summary A project entry
		 * @property {string} name - Project name
		 * @property {string} id - Project id
		 * @property {boolean} active - Project currently loaded
		 * @property {string} url - Target URL to proxy to
		 * @property {array<RouteDescription>} routes - Captured routes
		 */

		/**
		 * @typedef {object} RouteDescription
		 * @summary A route entry
		 * @property {string} id - Route id
		 * @property {string} method - Route method
		 * @property {string} path - Route path
		 * @property {string} requestType - Request Type
		 * @property {string} responseType - Response Type
		 */

		/**
		 * GET /api/projects/
		 * @summary List all projects
		 * @tags projects
		 * @return {array<Project>} 200 - List of projects
		 * @return {ResponseError} 500 - Error
		 * @example response - 200 - response example
		 * [
		 * 		{
		 *     		"name": "Bumble",
		 *     		"id": "zdhj8ka21",
		 *     		"active": false,
		 * 	   		"url": "http://api.bumble.hackclub.app",
		 *     		"fileName": "bumble.jsonl",
		 *     		"routes": []
		 * 		}
		 * ]
		 */
		server.get("/projects", setCORS(), res("json"), (ctx: Context) => {
			ctx.res.body = Object.values(this.projects)
				.map((entry) => entry.project)
				.map((entry) => {
					entry.active = this.activeProject?.project.id === entry.id;
					return entry;
				});
		});

		/**
		 * POST /api/projects/{projectId}/activate
		 * @summary Switch active project
		 * @tags projects
		 * @param {string} projectId.path - Project id
		 * @return {Project} 200 - Successfully switched to  project
		 * @return {ResponseError} 500 - Error
		 */
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
		);

		/**
		 * DELETE /api/projects/{projectId}
		 * @summary Delete a project
		 * @tags projects
		 * @param {string} projectId.path - Project id
		 * @return {object} 200 - Successfully deleted project
		 * @return {ResponseError} 500 - Error
		 */
		server.delete(
			"/projects/:projectId",
			setCORS(),
			(async (ctx: Context) => {
				const projectId = ctx.params.projectId;

				await this.deleteProject(projectId);

				console.log(`[projects] Deleted project '${projectId}'`);
			}).bind(this)
		);

		/**
		 * @typedef {object} NewProject
		 * @property {string} name - Project name
		 * @property {string} url - Target URL to proxy to
		 */

		/**
		 * POST /api/projects/
		 * @summary Create a new project
		 * @tags projects
		 * @param {NewProject} request.body.required - Project properties
		 * @return {Project} 200 - Successfully created project
		 * @return {ResponseError} 500 - Error
		 * @example request - Payload example
		 * {
		 *   "name": "Bumble",
		 *   "url": "http://api.bumble.hackclub.app"
		 * }
		 * @example response - 200 - Success example
		 * {
		 *     "name": "Bumble",
		 *     "id": "zdhj8ka21",
		 *     "active": false,
		 * 	   "url": "http://api.bumble.hackclub.app",
		 *     "fileName": "bumble.jsonl",
		 *     "routes": []
		 * }
		 */
		server.options("/projects", setCORS());
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
					fileName: serialize(body.name) + ".jsonl",
					id: genId(10),
				};

				this.projects[newProject.id] = new Project(newProject, this);

				await this.projects[newProject.id].unload();
				await this.activateProject(newProject.id);

				ctx.res.body = newProject;
			}).bind(this)
		);

		/**
		 * @typedef {object} NewProject
		 * @property {string} name - Project name
		 * @property {string} url - Target URL to proxy to
		 */

		/**
		 * POST /api/projects/{projectId}
		 * @summary Update project
		 * @tags projects
		 * @param {NewProject} request.body.required - Updated project properties
		 * @param {string} projectId.path - Project id
		 * @return {object} 200 - Successfully updated project
		 * @return {ResponseError} 500 - Error
		 */
		server.options("/projects/:projectId", setCORS());
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
		);

		/* Routes */

		/**
		 * GET /api/projects/{projectId}/routes
		 * @summary List all routes of a active project
		 * @tags routes
		 * @param {string} projectId.path - Project id
		 * @return {array<RouteDescription>} 200 - List of routes
		 * @return {ResponseError} 401 - Project not found
		 * @return {ResponseError} 402 - Project not active
		 * @return {ResponseError} 500 - Error
		 */
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
					ctx.res.status = 402;
					ctx.res.statusText = "Project not active";

					return;
				}
			}).bind(this)
		);

		/**
		 * @typedef {object} RouteInspect
		 * @summary A detailed route entry
		 * @property {object} request - Capture request body
		 * @property {object} response - Capture response body
		 */

		/**
		 * GET /api/projects/{projectId}/routes/{routeId}
		 * @summary Inspect a route of a active project
		 * @tags routes
		 * @param {string} projectId.path - Project id
		 * @param {string} routeId.path - Route id
		 * @return {RouteInspect} 200 - List of projects
		 * @return {ResponseError} 401 - Project not found
		 * @return {ResponseError} 402 - Project not active
		 * @return {ResponseError} 500 - Error
		 */
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
					ctx.res.status = 402;
					ctx.res.statusText = "Project not active";

					return;
				}
			}).bind(this)
		);

		/**
		 * DELETE /api/projects/{projectId}/routes/{routeId}
		 * @summary Delete a route of a active project
		 * @tags routes
		 * @param {string} projectId.path - Project id
		 * @param {string} routeId.path - Route id
		 * @return {object} 200 - Successfully delete project
		 * @return {ResponseError} 401 - Project not found
		 * @return {ResponseError} 402 - Project not active
		 * @return {ResponseError} 500 - Error
		 */
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
					ctx.res.status = 402;
					ctx.res.statusText = "Project not active";

					return;
				}
			}).bind(this)
		);

		/* State */

		/**
		 * @typedef {object} State
		 * @summary State of the backend
		 * @property {string} currentProject - Current active project
		 * @property {string} mode - Proxy state - enum:capture,serve,pause
		 * @property {string} proxyPort - Proxy port
		 * @property {boolean} demo - Demo mode enabled
		 */

		/**
		 * GET /api/state/
		 * @summary Get the state of the backend
		 * @tags state
		 * @return {State} 200 - Current state
		 * @return {ResponseError} 500 - Error
		 * @example response - 200 - response example
		 * 	{
		 *     		"currentProject": "Bumble",
		 *     		"mode": "capture",
		 *     		"proxyPort": "4001",
		 * 	   		"demo": false
		 * 	}
		 */
		server.get(
			"/state",
			setCORS(),
			res("json"),
			((ctx: Context) => {
				ctx.res.body = this.state;
			}).bind(this)
		);

		/**
		 * @typedef {object} ModeUpdate
		 * @summary Mode update body
		 * @property {string} state - New state - enum:capture,serve,pause
		 */

		/**
		 * POST /api/state/
		 * @summary Update the mode of the backend
		 * @tags state
		 * @param {ModeUpdate} request.body.required - New mode
		 * @return {object} 200 - Successfully updated mode
		 * @return {ResponseError} 500 - Error
		 */
		server.options("/state", setCORS());
		server.post("/state", req("json"), res("json"), setCORS(), async (ctx: Context) => {
			const body: { state: ProxyState } = ctx.body;

			if (this.activeProject !== undefined) {
				if (body.state === "pause") {
					this.state.proxyPort = await this.activeProject.pause();
				}

				if (body.state === "capture") {
					this.state.proxyPort = await this.activeProject.capture();
				}

				if (body.state === "serve") {
					this.state.proxyPort = await this.activeProject.serve();
				}

				this.state.mode = body.state;
				ctx.res.body = this.state;
				console.log(`[projects] Changed state to '${body.state}'`);
			} else {
				ctx.res.status = 401;
			}
		});
	}
}

export default new ProjectManager();
