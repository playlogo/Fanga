import { writable, get } from "svelte/store";

import type { CurrentProjectType, Project } from "./types";
import { state } from "./state";

function useCurrentProject() {
	const { subscribe, set, update } = writable<CurrentProjectType | undefined>(undefined);

	// Change current project
	async function activate(newProjectId: string) {
		if (get(store)?.id === newProjectId) {
			return;
		}

		// Fetch new project information from api
		const res = await fetch(`${window.api}/projects/${newProjectId}/activate`, { method: "POST" });
		const body = (await res.json()) as CurrentProjectType;

		set(body);

		// Update State
		state.update((state) => {
			state.proxyPort = undefined;
			state.mode = "pause";
			return state;
		});

		// Change website title
		//@ts-ignore-error Document not found
		document.title = `Fånga - ${body.name}`;
	}

	async function changeRoute(newRouteId: string) {
		update((state) => {
			state!.currentRoute = "switching";
			return state;
		});

		setTimeout(() => {
			update((state) => {
				state!.currentRoute = state?.routes.filter((route) => route.id === newRouteId)[0];
				return state;
			});
		}, 1);
	}

	function setActiveProject(project: Project) {
		set({
			...project,
			currentRoute: undefined,
		});
	}

	// TODO: SSE to update routes

	// Store store
	const store = {
		subscribe,
		set,
		update,
		activate,
		setActiveProject,
		changeRoute,
	};

	return store;
}

export const currentProject = useCurrentProject();
