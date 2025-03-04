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

				console.log(`[projects] Deleted project '${this.activeProject!.project.name}'`);
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
		 */
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
