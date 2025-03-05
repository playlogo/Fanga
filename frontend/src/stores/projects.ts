import { writable, get } from "svelte/store";

import type { Project } from "./types";

import { modal } from "./modal";
import { currentProject } from "./currentProject";

/* Project list */
function useProjects() {
	const { subscribe, set, update } = writable<Project[]>([], function start() {
		(async () => {
			// Fetch project list
			const res = await fetch(`${window.api}/projects`);
			const projects = (await res.json()) as Project[];

			set(projects);

			// Update current project to active one
			if (projects.filter((entry) => entry.active).length === 1) {
				await currentProject.setActiveProject(projects.filter((entry) => entry.active)[0]);
			}
		})();
	});

	// Add new project / Delete project
	async function deleteProject(id: string) {
		const res = await fetch(`${window.api}/projects/${id}`, {
			method: "DELETE",
		});

		if (res.ok) {
			// Remove from state
			update((store) => {
				store = store.filter((project) => {
					project.id !== id;
				});

				return store;
			});

			// Remove if currently active
			if (get(currentProject)?.id === id) {
				currentProject.set(undefined);
			}
		}
	}

	async function createProject(name: string, url: string) {
		const res = await fetch(`${window.api}/projects`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: name,
				url: url,
			}),
		});

		const body = await res.json();

		console.log(`[projects] New project id: ${body.id}`);

		// Update store
		update((store) => {
			store = store.map((project) => {
				project.active = false;
				return project;
			});

			store.push(body);

			return store;
		});

		// Update current active one
		await currentProject.activate(body.id);
	}

	// Modals
	function openCreateModal() {
		const cb = async (res: any) => {
			await projects.createProject(res.name, res.url);
			modal.set(undefined);

			window.location.reload();
		};

		modal.set({
			title: "Create new project",
			content: "Create a new empty project to capture and serve a REST API",
			actions: [
				{
					label: "Cancel",
					color: "default",
					callback: modal.close,
				},
				{
					label: "Create",
					color: "accent",
					callback: cb,
				},
			],
			inputs: [
				{
					type: "text",
					label: "Name",
					id: "name",
					default: "MyAwesomeAPI",
				},
				{
					type: "text",
					label: "Target URL",
					id: "url",
					default: "https://my.api.com",
				},
			],
		});
	}

	function openDeleteModal(project: Project) {
		async function callback(res: any) {
			// @ts-expect-error this any
			const project: Project = this;

			await fetch(`${window.api}/projects/${project.id}`, {
				method: "DELETE",
			});

			window.location.reload();
		}

		modal.set({
			title: `Delete ${project.name}`,
			content: "This will delete this project IRREVERSIBLY",
			inputs: [],
			actions: [
				{
					label: "Cancel",
					color: "default",
					callback: modal.close,
				},
				{
					label: "DELETE",
					color: "warning",
					callback: callback.bind(project),
				},
			],
		});
	}

	function openEditModal(project: Project) {
		async function callback(res: any) {
			// @ts-expect-error this any
			const project: Project = this;

			const name = res["name"];
			const url = res["url"];

			await fetch(`${window.api}/projects/${project.id}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: name,
					url: url,
				}),
			});

			window.location.reload();
		}

		modal.set({
			title: `Edit ${project.name}`,
			content: "Change the name or url of the project.",
			inputs: [
				{
					type: "text",
					label: "Name",
					id: "name",
					default: project.name,
				},
				{
					type: "text",
					label: "Target URL",
					id: "url",
					default: project.url,
				},
			],
			actions: [
				{
					label: "Cancel",
					color: "default",
					callback: modal.close,
				},
				{
					label: "Update",
					color: "accent",
					callback: callback.bind(project),
				},
			],
		});
	}

	// TODO: Importing exporting
	async function exportProjects() {
		console.error("Not implemented");
	}
	async function importProjects() {
		console.error("Not implemented");
	}

	// Store store
	const store = {
		subscribe,
		set,
		update,

		deleteProject,
		createProject,

		exportProjects,
		importProjects,

		openCreateModal,
		openDeleteModal,
		openEditModal,
	};

	return store;
}

export const projects = useProjects();
