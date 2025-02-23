import { writable, get } from "svelte/store";

import type { Modal } from "./types";

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
		close,
	};

	return store;
}

export const modal = useModal();
