/* State */
export interface State {
	mode: "capture" | "serve" | "pause";
	proxyUrl?: string;
	demo: boolean;
}

/* Projects */
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

/* Modal */
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
	default: any;
}

export interface ModalAction {
	label: string;
	color: "accent" | "warning" | "default";
	callback: Function;
}

/* Current project */
export type CurrentProjectType = Project & {
	currentRoute?: Route;
};
