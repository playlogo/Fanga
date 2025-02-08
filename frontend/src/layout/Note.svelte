<script lang="ts">
	let { children } = $props();
</script>

<div class="note">
	{@render children()}
</div>

<style>
	.note {
		max-width: 600px;

		margin-left: auto;
		margin-right: auto;

		margin-top: 40px;
	}

	:global(.note > br) {
		line-height: 150%;
	}

	:global(.note > p),
	:global(.note > h1),
	:global(.note > h2),
	:global(.note > h3),
	:global(.note > h4),
	:global(.note > h5),
	:global(.note > h6) {
		color: var(--color);

		display: flex;
		align-items: center;
		gap: 16px;
	}

	:global(.note > .indent) {
		padding-top: 24px;
		padding-bottom: 24px;
		padding-left: 12px;

		border-left: 4px solid var(--border-accent);
		background-color: var(--border);
	}
</style>
