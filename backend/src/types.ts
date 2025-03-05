export interface ProjectType {
	name: string;
	id: string;
	active?: boolean;
	url: string;
	fileName: string;
	routes?: RouteType[];
}

export interface RouteType {
	id: string;
	method: string;
	path: string;
	requestType: string;
	responseType: string;
}

export type ProxyState = "capture" | "serve" | "pause";

export interface StateType {
	currentProject: string | undefined;
	mode: ProxyState;
	proxyPort?: number;
	demo: boolean;
}

export interface RouteSerializedType {
	id: string;
	request: string;
	response: string;
	requestType: string;
	responseType: string;
	path: string;
	method: string;
}
