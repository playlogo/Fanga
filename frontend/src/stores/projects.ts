import { writable, get } from "svelte/store";

export interface Project {
	active: boolean;
	name: string;
	id: string;
	url: string;
	routes: Route[];
}

export interface Route {
	id: string;
	method: string;
	path: string;
	requestType: string;
	responseType: string;
}

export interface Modal {
	title: string;
	content: string;
	inputs: ModalInput[];
	actions: ModalAction[];
}

export interface ModalInput {
	type: "checkbox" | "text";
	label: string;
	id: string;
}

export interface ModalAction {
	label: string;
	color: "accent" | "warning" | "default";
	callback: Function;
}

export interface State {
	mode: "capture" | "serve";
	proxyUrl: string;
}

/* State */
function useState() {
	const { subscribe, set, update } = writable<State>(
		{ mode: "capture", proxyUrl: "http://localhost:4000" },
		function start() {
			(async () => {
				// Fetch state
				const res = await fetch(`${window.api}/state`);
				const state = (await res.json()) as State;

				set(state);
			})();
		}
	);

	// Change current state
	async function change(newMode: State["mode"]) {
		if (get(store).mode === newMode) {
			return;
		}

		// Fetch new project information from api
		const res = await fetch(`${window.api}/state/${newMode}`, {
			method: "POST",
		});

		if (res.ok) {
			update((state) => {
				state.mode = newMode;

				return state;
			});
		} else {
			console.error("Failed to change state");
		}
	}

	// Store store
	const store = {
		subscribe,
		set,
		update,
		change,
	};

	return store;
}

export const state = useState();

/* Modal */
function useModal() {
	const { subscribe, set, update } = writable<Modal | undefined>(undefined);

	// Open a modal
	async function create(data: Modal) {
		set(data);
	}

	// Close modal
	async function close() {
		set(undefined);
	}

	// Store store
	const store = {
		subscribe,
		set,
		update,
		create,
	};

	return store;
}

export const modal = useModal();

/* Current project */
function useCurrentProject() {
	const { subscribe, set, update } = writable<Project | undefined>(undefined);

	// Change current project
	async function change(newProjectId: string) {
		if (get(store)?.id === newProjectId) {
			return;
		}

		// Fetch new project information from api
		const res = await fetch(`${window.api}/projects/${newProjectId}`);
		const body = (await res.json()) as Project;

		// Set!
		set(body);

		// Change website title
		document.title = `Fånga - ${body.name}`;
	}

	// TODO: SSE to update routes

	// Store store
	const store = {
		subscribe,
		set,
		update,
		change,
	};

	return store;
}

export const currentProject = useCurrentProject();

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
				await currentProject.change(projects.filter((entry) => entry.active)[0].id);
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
		await currentProject.change(body.id);
	}

	// Modals
	function openCreateModal() {}

	function openDeleteModal(id: string) {}

	function openEditModal(id: string) {}

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
