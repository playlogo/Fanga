<script lang="ts">
	import Icon from "@iconify/svelte";

	import { state } from "../stores/state";

	let url: HTMLElement;

	function copyProxyUrl() {
		url.classList.remove("success");
		url.classList.remove("error");

		navigator.clipboard.writeText(proxyUrl).then(
			function () {
				url.classList.add("success");
			},
			function (err) {
				url.classList.add("error");
				console.error(err);
			}
		);
	}

	let proxyUrl = $derived(`${window.location.protocol}//${window.location.hostname}:${$state.proxyPort}`);
</script>

<div class="main">
	<h2>Proxy</h2>

	{#if $state.proxyPort}
		<div class="url" bind:this={url}>
			<input type="text" readonly value={proxyUrl} />
			<button onclick={copyProxyUrl}>
				<Icon icon="lucide:copy" width="16px" height="16px" />
			</button>
		</div>

		<p>Use this address in your Browser/App to access the api</p>
	{:else}
		<p>Start capturing / serving a project to see the proxy URL</p>
	{/if}
</div>

<style>
	.main {
		grid-area: proxy;

		border-right: 1px solid var(--border-accent);
	}

	.main > h2 {
		color: var(--color);
		font-size: 14px;
		font-style: normal;
		font-weight: 800;
		line-height: normal;

		margin-left: 12px;
		margin-top: 8px;
	}

	.url {
		margin-left: 12px;
		margin-right: 12px;
		margin-top: 12px;

		width: calc(100% - 24px);
		height: 32px;

		display: flex;
		align-items: center;

		border-radius: 4px;
		background: #262626;
		border: 1px solid var(--border-accent);
	}

	.url > input {
		background: transparent;
		outline: none;
		border: none;
		outline: none;

		width: fill-available;

		color: var(--color);
		font-family: "JetBrains Mono";
		font-size: var(--font-size-small);

		padding-left: 8px;
	}

	.url > button {
		margin-left: auto;
		margin-right: 12px;

		color: var(--border-accent);
	}

	.main > p {
		color: var(--color);
		font-size: 12px;
		font-style: normal;
		font-weight: 400;
		line-height: normal;

		text-align: center;

		margin-top: 12px;
	}

	/* Animations */
	:global(.success) {
		animation: fade-out-success;
		animation-fill-mode: forwards;
		animation-duration: 1s;
	}

	:global(.error) {
		animation: fade-out-error;
		animation-fill-mode: forwards;
		animation-duration: 1s;
	}

	@keyframes fade-out-error {
		0% {
			background-color: var(--color-accent-error);
		}
		100% {
			background-color: transparent;
		}
	}

	@keyframes fade-out-success {
		0% {
			background-color: var(--color-accent-success);
		}
		100% {
			background-color: transparent;
		}
	}
</style>
