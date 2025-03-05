<script lang="ts">
	import Icon from "@iconify/svelte";

	import type { Project } from "../stores/types";
	import { projects } from "../stores/projects";
	import { currentProject } from "../stores/currentProject";

	import { tag, themes } from "./Tag.svelte";

	let { project }: { project: Project } = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="container"
	class:active={$currentProject && $currentProject.id === project.id}
	onclick={() => currentProject.activate(project.id)}
>
	<div class="left">
		<p>{project.name}</p>
		{#if $currentProject && $currentProject.id === project.id}
			{@render tag(themes["green"], "active")}
		{/if}
	</div>
	<div class="right">
		<button
			onclick={() => {
				projects.openDeleteModal(project);
			}}
			style="--color: #FD4D4D;"
		>
			<Icon icon="iconamoon:trash-light" width="16px" height="16px" />
		</button>
		<button
			onclick={() => {
				projects.openEditModal(project);
			}}
			style="--color: var(--border-accent);"
		>
			<Icon icon="ph:gear" width="16px" height="16px" />
		</button>
	</div>
</div>

<style>
	.container {
		display: flex;

		padding: 0px 12px;

		justify-content: space-between;
		align-items: center;
		align-self: stretch;
		height: 48px;
		border-bottom: 1px solid var(--border);

		cursor: pointer;
	}

	.container:hover {
		background-color: var(--border);
		cursor: pointer;
	}

	.active {
		cursor: default !important;
	}

	.active:hover {
		cursor: default;
		background-color: transparent;
	}

	.left {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.left > p {
		color: var(--color);
		font-size: 14px;
		font-style: normal;
		font-weight: 400;
		line-height: normal;
	}

	button {
		color: var(--color);
	}
</style>
