import { mount } from "svelte";
import "./app.css";
import App from "./App.svelte";

declare global {
	interface Window {
		api: string;
	}
}

if (import.meta.env.DEV) {
	window.api = "http://192.168.178.61:8000";
} else {
	window.api = "";
}

const app = mount(App, {
	target: document.getElementById("app")!,
});

export default app;
