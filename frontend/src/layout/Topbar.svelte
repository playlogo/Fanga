<script lang="ts">
	import Icon from "@iconify/svelte";

	import { state } from "../stores/state";
</script>

<div class="main">
	<div class="switch">
		<button
			class:active={$state.mode === "capture"}
			onclick={() => {
				state.change("capture");
			}}
		>
			Capture
		</button>
		<button
			class:active={$state.mode === "serve"}
			onclick={() => {
				state.change("serve");
			}}
		>
			Serve
		</button>
		<button
			class:active={$state.mode === "pause"}
			onclick={() => {
				state.change("pause");
			}}
		>
			Pause
		</button>
	</div>

	<button class="dropdown">
		Projects <Icon icon="ri:arrow-drop-down-line" width="24px" height="24px" /></button
	>
</div>

<style>
	.main {
		grid-area: navbar;

		border-bottom: 1px solid var(--border-accent);

		display: flex;
		align-items: center;
		padding-left: 12px;
		gap: 20px;
	}

	/* Switch */
	.switch {
		display: flex;
		height: 24px;
		align-items: center;

		border-radius: 4px;
		border: 1px solid var(--border);

		overflow: hidden;
	}

	.switch > button {
		display: flex;
		padding: 0px 8px;
		justify-content: center;
		align-items: center;

		align-self: stretch;

		cursor: pointer;

		color: var(--color);

		font-family: "JetBrains Mono";
		font-size: 12px;
		font-style: normal;
		font-weight: 400;
		line-height: normal;
	}

	.switch > .active {
		background-color: var(--accent);
	}

	/* Dropdown */
	.dropdown {
		display: flex;
		align-items: center;
		justify-content: center;

		color: var(--color);
		font-family: "JetBrains Mono";
		font-size: 12px;
		font-style: normal;
		font-weight: 400;
		line-height: normal;
	}
</style>
