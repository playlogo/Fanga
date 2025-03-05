import { writable, get } from "svelte/store";

import type { CurrentProjectType } from "./types";

function useCurrentProject() {
	const { subscribe, set, update } = writable<CurrentProjectType | undefined>(undefined);

	// Change current project
	async function activate(newProjectId: string) {
		if (get(store)?.id === newProjectId) {
			return;
		}

		// Fetch new project information from api
		const res = await fetch(`${window.api}/projects/${newProjectId}/activate`, { method: "POSt" });
		const body = (await res.json()) as CurrentProjectType;

		set(body);

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

	// TODO: SSE to update routes

	// Store store
	const store = {
		subscribe,
		set,
		update,
		activate,
		changeRoute,
	};

	return store;
}

export const currentProject = useCurrentProject();
