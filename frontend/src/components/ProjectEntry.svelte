<script lang="ts">
	import Icon from "@iconify/svelte";
	import { currentProject, type Project } from "../stores/projects";
	import { tag, themes } from "./Tag.svelte";

	let { project }: { project: Project } = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="container" onclick={() => currentProject.change(project.id)}>
	<div class="left">
		<p>{project.name}</p>
		{#if project.active}
			{@render tag(themes["green"], "active")}
		{/if}
	</div>
	<div class="right">
		<button>
			<Icon icon="iconamoon:trash-light" width="16px" height="16px" />
		</button>
		<button>
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
	}

	.left {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.left > p {
		color: #fff;
		font-size: 14px;
		font-style: normal;
		font-weight: 400;
		line-height: normal;
	}
</style>
