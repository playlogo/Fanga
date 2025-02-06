<script module>
	const themes = {
		green: {
			border: "#4CBF45",
			background: "rgba(107, 255, 98, 0.24)",
			color: "#A5FBA0",
		},
	};

	export { tag, themes };
</script>

{#snippet tag(/** @type {{ border: any; background: any; color: any; }} */ theme, /** @type {string} */ text)}
	<div class="tag" style={`border-color: ${theme.border}; background-color:${theme.background}; `}>
		<p style={`color: ${theme.color}`}>{text}</p>
	</div>
{/snippet}

<style>
	.tag {
		display: flex;
		padding: 1px 4px;
		justify-content: center;
		align-items: center;

		border-radius: 4px;
		border-width: 1px;
		border-style: solid;

		width: fit-content;
		height: fit-content;
	}

	p {
		font-size: 10px;
		font-style: normal;
		font-weight: 700;
		line-height: normal;
		text-transform: uppercase;

		margin: 0;
		padding: 0;
	}
</style>
