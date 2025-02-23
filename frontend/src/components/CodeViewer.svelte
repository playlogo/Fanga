<script lang="ts">
	import CodeMirror from "svelte-codemirror-editor";
	import { json } from "@codemirror/lang-json";

	import { vscodeDark } from "../lib/VSCodeTheme";

	let { content, lang }: { content: string; lang: string } = $props();
</script>

<div class="code">
	<CodeMirror
		value={content.trim()}
		readonly={true}
		lang={lang === "json" ? json() : undefined}
		theme={vscodeDark}
	/>
</div>

<style>
	.code {
		background-color: #262626;

		border-radius: 4px;
		border: 1px solid var(--border);
		background: #262626;

		overflow: hidden;
	}
</style>
