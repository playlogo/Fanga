<script lang="ts">
	import Projects from "./layout/Projects.svelte";
	import Proxy from "./layout/Proxy.svelte";
	import RouteInspector from "./layout/RouteInspector.svelte";
	import Routes from "./layout/Routes.svelte";
	import Topbar from "./layout/Topbar.svelte";

	import Note from "./layout/Note.svelte";
	import WelcomeNote from "./notes/WelcomeNote.svelte";
	import StarterNote from "./notes/StarterNote.svelte";

	import { currentProject } from "./stores/currentProject";
</script>

<Topbar />
<Projects />
<Proxy />
<Routes />

<main>
	{#if $currentProject}
		{#if $currentProject.currentRoute}
			<RouteInspector route={$currentProject.currentRoute} />
		{:else}
			<Note><WelcomeNote /></Note>
		{/if}
	{:else}
		<Note><WelcomeNote /></Note>
	{/if}
</main>

<style>
	:global(#app) {
		display: grid;

		grid-template-areas:
			"navbar navbar navbar"
			"projects routes main"
			"proxy routes main";

		grid-template-columns: 240px 320px auto;
		grid-template-rows: 38px auto 140px;

		height: 100vh;
		width: 100vw;
	}

	main {
		grid-area: main;

		overflow-y: auto;
	}
</style>
