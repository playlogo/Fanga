<script lang="ts">
	import CodeMirror from "svelte-codemirror-editor";

	import { json } from "@codemirror/lang-json";
	import { css } from "@codemirror/lang-css";
	import { html } from "@codemirror/lang-html";
	import { javascript } from "@codemirror/lang-javascript";
	import { markdown } from "@codemirror/lang-markdown";
	import { xml } from "@codemirror/lang-xml";
	import { yaml } from "@codemirror/lang-yaml";

	import { vscodeDark } from "../lib/VSCodeTheme";

	let { content, lang }: { content: string; lang: string } = $props();

	const langLookup: { [key: string]: any } = {
		json: json,
		css: css,
		html: html,
		javascript: javascript,
		markdown: markdown,
		xml: xml,
		yaml: yaml,
	};
</script>

<div class="code">
	<CodeMirror
		value={content.trim()}
		readonly={true}
		lang={langLookup[lang] !== undefined ? langLookup[lang]() : undefined}
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
