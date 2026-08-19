<script lang="ts">
	import { surveyStore } from '$lib/surveyStore.svelte';

	const json = $derived(JSON.stringify(surveyStore.survey, null, 2));
	let copied = $state(false);

	async function copy() {
		await navigator.clipboard.writeText(json);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
</script>

<div class="json-view">
	<div class="toolbar">
		<p class="hint">
			Este es el json que deberiamos enviar al backend para que haga lo suyo
		</p>
		<button onclick={copy}>{copied ? '✓ Copiado' : 'Copiar JSON'}</button>
	</div>

	<pre>{json}</pre>
</div>

<style>
	.toolbar {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.hint {
		font-size: 0.85rem;
		color: #888;
	}

	.toolbar button {
		flex-shrink: 0;
		border: 1px solid #ccc;
		background: #fafafa;
		border-radius: 6px;
		padding: 0.4rem 0.75rem;
		cursor: pointer;
		font-size: 0.85rem;
	}

	.toolbar button:hover {
		background: #f0f0f0;
	}

	pre {
		background: #1e1e1e;
		color: #d4d4d4;
		border-radius: 8px;
		padding: 1rem;
		overflow-x: auto;
		font-size: 0.85rem;
		line-height: 1.5;
	}
</style>
