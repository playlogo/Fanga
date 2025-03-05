<script>
	import { projects } from "../stores/projects";
	import { currentProject } from "../stores/currentProject";

	import RouteEntry from "../components/RouteEntry.svelte";
</script>

<div class="main scrollbar">
	<div class="top">
		<h2>Routes</h2>
	</div>

	{#if $currentProject}
		{#each $currentProject.routes as route}
			<RouteEntry {route} />
		{/each}
	{:else}
		<div class="note">
			<p>Select or create a project to view routes</p>
			<button class="button" onclick={projects.openCreateModal}>Create Project</button>
		</div>
	{/if}
</div>

<style>
	.main {
		grid-area: routes;

		display: flex;
		flex-direction: column;

		border-right: 1px solid var(--border-accent);

		overflow-y: auto;
	}

	.top {
		display: flex;
		padding: 8px 12px;
		align-items: center;

		height: 21px;

		border-bottom: 1px solid var(--border);
	}

	.top > h2 {
		color: var(--color);
		font-size: 14px;
		font-style: normal;
		font-weight: 800;
		line-height: normal;
	}

	/* Note */
	.note {
		display: flex;
		align-items: center;
		flex-direction: column;
		justify-content: center;

		flex-grow: 1;

		gap: 16px;
	}

	.note > p {
		color: var(--color);
		font-size: 12px;
		font-style: normal;
		font-weight: 700;
		line-height: normal;

		text-align: center;
		width: 80%;
	}
</style>
