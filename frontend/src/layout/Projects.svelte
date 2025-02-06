<script>
	import Icon from "@iconify/svelte";

	import ProjectEntry from "../components/ProjectEntry.svelte";

	import { projects } from "../stores/projects";
</script>

<div class="main">
	<div class="topbar">
		<h2>Projects</h2>
		<button>
			<Icon icon="material-symbols:add-rounded" width="18px" height="18px" />
		</button>
	</div>
	{#each $projects as project}
		<ProjectEntry {project} />
	{/each}
</div>

<style>
	.main {
		grid-area: projects;

		display: flex;
		flex-direction: column;

		border-right: 1px solid var(--border-accent);
		border-bottom: 1px solid var(--border-accent);
	}

	.topbar {
		display: flex;

		padding: 8px 12px;

		justify-content: space-between;

		align-items: center;
		flex-shrink: 0;
		align-self: stretch;

		border-bottom: 1px solid var(--border);
	}

	.topbar > h2 {
		color: #fff;
		font-size: 14px;
		font-style: normal;
		font-weight: 800;
		line-height: normal;
	}

	.topbar > button {
		color: var(--border-accent);
	}
</style>
