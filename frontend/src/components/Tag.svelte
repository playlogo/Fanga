<script module lang="ts">
	const themes = {
		green: {
			border: "#4CBF45",
			background: "rgba(107, 255, 98, 0.24)",
			color: "#A5FBA0",
		},
		yellow: {
			color: "#DFCA51",
			background: "rgba(255, 224, 98, 0.24)",
			border: "#E1CA7F",
		},
		red: {
			color: "#E17F7F",
			background: "rgba(185, 54, 54, 0.24)",
			border: "#DF5151",
		},
		purple: {
			background: "rgba(117, 54, 185, 0.24)",
			color: "#A651DF",
			border: "#AB7FE1",
		},
	};

	const colorTable: { [key: string]: any } = {
		GET: themes["green"],
		POST: themes["purple"],
		DELETE: themes["red"],
		PUT: themes["yellow"],
	};

	export { tag, themes, colorTable };
</script>

{#snippet tag(
	theme: {
		border: any;
		background: any;
		color: any;
	},
	text: string
)}
	<div class="tag" style={`border-color: ${theme.border}; background-color:${theme.background}; `}>
		<p style={`color: ${theme.color}`}>{text}</p>
	</div>
{/snippet}

<style>
	.tag {
		display: flex;
		padding: 1px 6px;
		justify-content: center;
		align-items: center;

		border-radius: 4px;
		border-width: 1px;
		border-style: solid;

		width: fit-content;
		height: fit-content;
	}

	p {
		font-size: 12px;
		font-style: normal;
		font-weight: 700;
		line-height: normal;
		text-transform: uppercase;

		margin: 0;
		padding: 0;
	}
</style>
