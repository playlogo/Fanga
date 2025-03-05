import { writable, get } from "svelte/store";

import type { State } from "./types";

/* State */
function useState() {
	const { subscribe, set, update } = writable<State>(
		{ mode: "pause", proxyPort: undefined, demo: false },
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
		const res = await fetch(`${window.api}/state`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				state: newMode,
			}),
		});

		if (res.ok) {
			const body = await res.json();
			update((state) => {
				state.mode = newMode;
				state.proxyPort = body.proxyPort;

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
