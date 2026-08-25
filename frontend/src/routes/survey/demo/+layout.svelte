<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { surveyStore } from '$lib/surveyStore.svelte';
	import type { Section } from '$lib/types';

	let { children } = $props();

	onMount(() => {
		surveyStore.connect();
	});

	// Tabs (group) -> subtabs (sección). Las secciones sin `group` (ej. el demo
	// vacío original) caen en un grupo genérico, para no romper ese caso.
	const sectionGroups = $derived.by(() => {
		const groups = new Map<string, Section[]>();
		for (const s of surveyStore.survey.sections) {
			const key = s.group ?? 'Secciones';
			const list = groups.get(key);
			if (list) list.push(s);
			else groups.set(key, [s]);
		}
		return [...groups.entries()];
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

	<div class="shell">
		<nav class="sidebar">
			{#each sectionGroups as [group, sections] (group)}
				<span class="nav-label">{group}</span>
				{#each sections as s (s.id)}
					<a
						href="/survey/demo/{s.id}"
						class="sub"
						class:active={page.url.pathname === `/survey/demo/${s.id}`}
					>
						{s.title}
					</a>
				{/each}
			{/each}

			<span class="nav-label">Vista</span>
			<a href="/survey/demo/preview" class:active={page.url.pathname === '/survey/demo/preview'}>
				Preview
			</a>
			<a href="/survey/demo/json" class:active={page.url.pathname === '/survey/demo/json'}>
				JSON
			</a>
			<a href="/survey/demo/history" class:active={page.url.pathname === '/survey/demo/history'}>
				Historial
			</a>
		</nav>

		<div class="content">
			{@render children()}
		</div>
	</div>
</main>

<style>
	main {
		max-width: 960px;
		margin: 0 auto;
		padding: 2rem 1rem;
		font-family: system-ui, sans-serif;
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.5rem;
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

	.shell {
		display: flex;
		align-items: flex-start;
		gap: 2rem;
	}

	.sidebar {
		flex: 0 0 200px;
		position: sticky;
		top: 2rem;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		border-right: 1px solid #eee;
		padding-right: 1rem;
	}

	.nav-label {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #999;
		margin: 1rem 0 0.35rem;
	}

	.nav-label:first-child {
		margin-top: 0;
	}

	.sidebar a {
		padding: 0.35rem 0.5rem;
		margin: 0 -0.5rem;
		border-radius: 6px;
		text-decoration: none;
		color: #555;
		font-size: 0.9rem;
		line-height: 1.3;
	}

	.sidebar a.sub {
		padding-left: 1rem;
		font-size: 0.85rem;
	}

	.sidebar a:hover {
		background: #f5f5f5;
	}

	.sidebar a.active {
		color: #111;
		background: #eee;
		font-weight: 600;
	}

	.content {
		flex: 1;
		min-width: 0;
	}

	@media (max-width: 720px) {
		.shell {
			flex-direction: column;
			gap: 1rem;
		}

		.sidebar {
			position: static;
			flex-direction: row;
			flex-wrap: wrap;
			border-right: none;
			border-bottom: 1px solid #eee;
			padding-right: 0;
			padding-bottom: 0.75rem;
			width: 100%;
		}

		.nav-label {
			width: 100%;
			margin: 0.5rem 0 0.15rem;
		}

		.nav-label:first-child {
			margin-top: 0;
		}
	}
</style>
