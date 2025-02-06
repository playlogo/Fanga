<script>
	import Icon from "@iconify/svelte";
</script>

<div class="main">
	<p class="note">Note: This is a demo instance. Changes to any project are disable!</p>

	<br />

	<h1>Fånga</h1>
	<h3 style="color: var(--color-inactive)">API development evolved</h3>

	<br />

	<p>Record and simulate your private internal REST APIs for easy and secure public "deployments".</p>

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
</div>

<style>
	.main {
		max-width: 600px;

		margin-left: auto;
		margin-right: auto;

		margin-top: 40px;
	}

	br {
		line-height: 150%;
	}

	p,
	h1,
	h2,
	h3,
	h4,
	h5,
	h6 {
		color: var(--color);

		display: flex;
		align-items: center;
		gap: 16px;
	}

	/* Special */
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

	.note {
		padding-top: 24px;
		padding-bottom: 24px;
		padding-left: 12px;

		border-left: 4px solid var(--border-accent);
		background-color: var(--border);
	}
</style>
