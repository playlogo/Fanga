interface Project {
	name: string;
	id: string;
	active?: boolean;
	url: string;
	routes: Route[];
}

interface Route {
	id: string;
	method: string;
	path: string;
	requestType: string;
	responseType: string;
}

interface State {
	currentProject: string | undefined;
	mode: "capture" | "serve" | "pause";
	proxyUrl: string;
	demo: boolean;
}

interface RouteSerialized {
	id: string;
	request: string;
	response: string;
	path: string;
	method: string;
}
