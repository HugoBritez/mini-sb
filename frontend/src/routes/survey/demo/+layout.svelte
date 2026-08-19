<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { surveyStore } from '$lib/surveyStore.svelte';

	let { children } = $props();

	onMount(() => {
		surveyStore.connect();
	});
</script>

<main>
	<header>
		<h1>{surveyStore.survey.title || 'Encuesta de prueba'}</h1>
		<span class="status status-{surveyStore.status}">
			{#if surveyStore.status === 'connecting'}
				Conectando...
			{:else if surveyStore.status === 'ready'}
				● En vivo
			{:else}
				Error de conexión
			{/if}
		</span>
	</header>

	<nav class="sections">
		{#each surveyStore.survey.sections as s (s.id)}
			<a href="/survey/demo/{s.id}" class:active={page.url.pathname === `/survey/demo/${s.id}`}>
				{s.title}
			</a>
		{/each}
		<a href="/survey/demo/preview" class:active={page.url.pathname === '/survey/demo/preview'}>
			Preview
		</a>
		<a href="/survey/demo/json" class:active={page.url.pathname === '/survey/demo/json'}> JSON </a>
		<a href="/survey/demo/history" class:active={page.url.pathname === '/survey/demo/history'}>
			Historial
		</a>
	</nav>

	{@render children()}
</main>

<style>
	main {
		max-width: 640px;
		margin: 0 auto;
		padding: 2rem 1rem;
		font-family: system-ui, sans-serif;
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.status {
		font-size: 0.85rem;
		color: #888;
	}

	.status-ready {
		color: #1a9c4a;
	}

	.status-error {
		color: #c0392b;
	}

	.sections {
		display: flex;
		gap: 0.5rem;
		border-bottom: 1px solid #ddd;
		margin-bottom: 1.5rem;
	}

	.sections a {
		padding: 0.5rem 0.25rem;
		text-decoration: none;
		color: #666;
		font-size: 0.9rem;
		border-bottom: 2px solid transparent;
	}

	.sections a.active {
		color: #111;
		border-bottom-color: #111;
		font-weight: 600;
	}
</style>
