<script lang="ts">
	import type { Route } from "../stores/types";

	import { tag, themes, colorTable } from "../components/Tag.svelte";
	import CodeViewer from "../components/CodeViewer.svelte";
	import { currentProject } from "../stores/currentProject";

	let { route }: { route: Route } = $props();

	let requestContent: string | undefined = $state(undefined);
	let responseContent: string | undefined = $state(undefined);

	// Fetch response & request
	(async () => {
		const res = await fetch(`${window.api}/projects/${$currentProject?.id}/routes/${route.id}`);

		if (!res.ok) {
			console.error("Unable to load route");
			return;
		}

		const content: { request?: string; response?: string } = await res.json();

		requestContent = content.request;
		responseContent = content.response;
	})();
</script>

<div class="main">
	<div class="topbar">
		{@render tag(colorTable[route.method] ?? themes["green"], route.method)}
		<h2>{route.path}</h2>
	</div>
	<div class="entry request">
		<div class="header">
			<h3>Request</h3>
			<p>{route.requestType}</p>
		</div>
		{#if requestContent}
			<CodeViewer content={requestContent} lang={route.requestType.split("/")[1]} />
		{/if}
	</div>
	<div class="entry response">
		<div class="header">
			<h3>Response</h3>
			<p>{route.responseType}</p>
		</div>
		{#if responseContent}
			<CodeViewer content={responseContent} lang={route.responseType.split("/")[1]} />
		{/if}
	</div>
</div>

<style>
	.main {
		display: flex;
		flex-direction: column;
	}

	.topbar {
		display: flex;
		padding: 16px;
		align-items: center;
		align-self: stretch;

		gap: 16px;

		border-bottom: 1px solid var(--border);

		padding-left: 24px;
		padding-right: 24;
	}

	.topbar > h2 {
		color: #fff;
		font-size: 14px;
		font-style: normal;
		font-weight: 700;
		line-height: normal;
	}

	/* Entry */
	.entry {
		display: flex;
		padding: 8px 16px;
		flex-direction: column;

		gap: 8px;
	}

	.request {
		border-bottom: 1px solid var(--border);
	}

	.header {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.header > h3 {
		color: #fff;
		font-size: 12px;
		font-style: normal;
		font-weight: 700;
		line-height: normal;
	}

	.header > p {
		color: var(--color-inactive);
		font-size: 12px;
		font-style: normal;
		font-weight: 700;
		line-height: normal;
	}
</style>
