<script>
	import Icon from "@iconify/svelte";
</script>

<p class="indent">
	Note: This is a demo instance. You cannot edit or delete projects, you can only switch between Pause and
	Serve mode.
</p>

<br />

<h1>Fånga</h1>
<h3 style="color: var(--color-inactive)">API development evolved</h3>

<br />

<p>Record and simulate your private internal REST APIs for easy and secure public demonstrations.</p>

<br />

<p>
	Check out this project on Github: <button
		onclick={() => {
			//@ts-expect-error: cannot assign string
			window.location = "https://github.com/playlogo/Fanga";
		}}
		class="button github"><Icon icon="mdi:github" width="24px" height="24px" />playlogo/Fanga</button
	>
</p>

<style>
	button.github {
		background-color: black;

		display: flex;
		align-items: center;
		gap: 8px;

		padding-left: 12px;
		padding-right: 12px;
		padding-top: 6px;
		padding-bottom: 6px;
	}
</style>
