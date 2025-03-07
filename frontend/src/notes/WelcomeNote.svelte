<script>
	import Icon from "@iconify/svelte";
	import { state } from "../stores/state";
</script>

{#if $state.demo}
	<p class="indent">
		Note: This is a demo instance. Editing or deleting projects, as well as capturing new routes is
		disabled.
	</p>

	<p class="indent">
		Tip: Click on a route to inspect it. Or go to the proxy url to see the captured API in action!
	</p>
{/if}

<br />

<h1>Fånga</h1>
<h3 style="color: var(--color-inactive)">API development evolved</h3>

<br />

<p>
	Record requests and responses of your private internal REST APIs and serve the captured routes later for
	easy public read-only demonstrations.
</p>

<br />

<p>
	Checkout this project on Github: <button
		onclick={() => {
			//@ts-expect-error: cannot assign string
			window.location = "https://github.com/playlogo/Fanga";
		}}
		class="button github"
		style="background-color: black;"
	>
		<Icon icon="mdi:github" width="24px" height="24px" />playlogo/Fanga
	</button>
</p>

<br />

<p>
	Checkout the backend API docs: <button
		onclick={() => {
			//@ts-expect-error: cannot assign string
			window.location = "/docs.html";
		}}
		class="button github"
	>
		<Icon icon="eos-icons:api" width="24px" height="24px" />/docs.html
	</button>
</p>

<style>
	button.github {
		display: flex;
		align-items: center;
		gap: 8px;

		padding-left: 12px;
		padding-right: 12px;
		padding-top: 6px;
		padding-bottom: 6px;
	}

	hr {
		border-color: var(--border-accent);
	}
</style>
