<script lang="ts">
	import type { Route } from "../stores/types";
	import { currentProject } from "../stores/currentProject";

	import { tag, themes, colorTable } from "./Tag.svelte";

	let { route }: { route: Route } = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="main"
	onclick={() => {
		currentProject.changeRoute(route.id);
	}}
>
	<div class="path">
		{@render tag(colorTable[route.method] ?? themes["green"], route.method)}
		<h3>{route.path}</h3>
	</div>
	<div class="types">
		<p>Request: {route.requestType}</p>
		<p>Response: {route.responseType}</p>
	</div>
</div>

<style>
	.main {
		display: flex;
		padding: 2px 0px;
		flex-direction: column;

		border-bottom: 1px solid var(--border);
	}

	.path {
		display: flex;
		padding: 7px 12px;
		align-items: center;
		gap: 12px;
		align-self: stretch;
		position: relative;
	}

	.path > h3 {
		color: var(--color);
		font-size: 13px;
		font-style: normal;
		font-weight: 700;
		line-height: normal;

		position: absolute;

		left: 68px;
	}

	.types {
		display: flex;
		padding: 4px 10px;
		align-items: center;
		gap: 16px;
	}

	.types > p {
		color: var(--color-inactive);
		font-size: 10px;
		font-style: normal;
		font-weight: 700;
		line-height: normal;
	}
</style>
