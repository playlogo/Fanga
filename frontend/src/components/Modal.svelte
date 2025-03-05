<script lang="ts">
	import { get } from "svelte/store";
	import { modal } from "../stores/modal";

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		const callback = get(modal)!.actions.filter((entry) => entry.label === event.submitter?.id)[0]
			.callback;

		const values: { [key: string]: any } = {};

		for (const entry of get(modal)!.inputs) {
			values[entry.id] = (document.getElementById(entry.id) as HTMLInputElement).value;

			if (`${values[entry.id]}`.length === 0) {
				values[entry.id] = (document.getElementById(entry.id) as HTMLInputElement).placeholder;
			}
		}

		await callback(values);
	}

	const colorLookup = {
		accent: "#3269df",
		warning: "#fd4d4d",
		default: "#2a2a2b",
	};
</script>

<div class="backdrop">
	<div class="modal">
		<form onsubmit={handleSubmit}>
			<div class="header">
				<h2>{$modal!.title}</h2>
			</div>
			<div class="body">
				<p>{$modal!.content}</p>

				<div class="inputs">
					{#each $modal!.inputs as input}
						{#if input.type === "checkbox"}
							<div class="checkbox">
								<input type="checkbox" value={input.default} id={input.id} />
								<label for={input.id}>{input.label}</label>
							</div>
						{:else if input.type === "text"}
							<div class="text">
								<label for={input.id}>{input.label}</label>
								<input type="text" id={input.id} placeholder={input.default} />
							</div>
						{/if}
					{/each}
				</div>
			</div>
			<div class="actions">
				{#each $modal!.actions as action}
					<button style={`--color: ${colorLookup[action.color]}`} id={action.label} type="submit">
						{action.label}
					</button>
				{/each}
			</div>
		</form>
	</div>
</div>

<style>
	.backdrop {
		position: absolute;

		width: 100%;
		height: 100%;

		background-color: rgba(58, 58, 58, 0.637);

		display: flex;
		align-items: center;
		justify-content: center;
	}

	.modal {
		background-color: #171717;

		display: flex;
		align-items: center;

		flex-direction: column;

		border-radius: 8px;

		min-width: 400px;
		position: relative;
	}

	form {
		width: 100%;

		position: relative;
		overflow: hidden;
	}

	/* Header */
	.header {
		padding: 24px;
		padding-bottom: 12px;
		padding-top: 12px;

		border-bottom: 1px solid var(--border);
	}

	.header > h2 {
		color: white;
	}

	/* Body */
	.body {
		display: flex;
		flex-direction: column;

		gap: 16px;

		padding: 24px;
		padding-top: 24px;
	}

	.body > p {
		color: white;

		max-width: 400px;
	}

	.inputs {
		display: flex;
		flex-direction: column;
		gap: 16px;

		color: white;
		font-size: 14px;
	}

	.inputs > .text {
		display: flex;
		align-items: start;
		flex-direction: column;
		justify-content: center;
	}

	.inputs input[type="text"] {
		width: 80%;

		background: #262626;
		outline: none;
		border: none;
		outline: none;

		width: fill-available;

		color: var(--color);
		font-family: "JetBrains Mono";
		font-size: var(--font-size-medium);

		border-radius: 4px;
		background: #262626;
		border: 1px solid var(--border-accent);
		height: 24px;

		font-family: "JetBrains Mono";
	}

	.inputs label {
		color: var(--color-inactive);
	}

	.inputs > .checkbox {
		display: flex;
		align-items: center;
		flex-direction: row;
		justify-content: start;

		gap: 8px;
	}

	/* Actions */
	.actions {
		display: flex;
		align-items: center;
		justify-content: space-between;

		padding: 24px;
		padding-top: 12px;
		padding-bottom: 12px;

		border-top: 1px solid var(--border);
	}

	.actions > button {
		background-color: var(--color);
		color: white;
		padding: 8px;
		padding-left: 12px;
		padding-right: 12px;

		border-radius: 8px;
		font-weight: 600;
	}
</style>
