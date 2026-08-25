<script lang="ts">
	import { page } from '$app/state';
	import { surveyStore } from '$lib/surveyStore.svelte';
	import QuestionCard from '$lib/QuestionCard.svelte';
	import type { QuestionType } from '$lib/types';

	const sectionId = $derived(page.params.section ?? '');
	const section = $derived(surveyStore.section(sectionId));

	const questionTypeLabels: Record<QuestionType, string> = {
		short_text: 'Texto corto',
		single_choice: 'Selección única',
		multi_choice: 'Selección múltiple',
		rating: 'Escala'
	};
</script>

{#if !section}
	<p class="empty">
		{surveyStore.status === 'connecting' ? 'Cargando...' : 'Sección no encontrada.'}
	</p>
{:else}
	<div class="add-bar">
		{#each Object.entries(questionTypeLabels) as [type, label] (type)}
			<button onclick={() => surveyStore.addQuestion(sectionId, type as QuestionType)}>
				+ {label}
			</button>
		{/each}
	</div>

	<ul class="questions">
		{#each section.questions as question (question.id)}
			<QuestionCard {sectionId} {question} typeLabel={questionTypeLabels[question.type]} />
		{:else}
			<p class="empty">Todavía no hay preguntas en esta sección. Agregá una arriba.</p>
		{/each}
	</ul>
{/if}

<style>
	.add-bar {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}

	.add-bar button {
		border: 1px solid #ccc;
		background: #fafafa;
		border-radius: 6px;
		padding: 0.4rem 0.75rem;
		cursor: pointer;
		font-size: 0.85rem;
	}

	.add-bar button:hover {
		background: #f0f0f0;
	}

	.questions {
		list-style: none;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.empty {
		color: #888;
		font-style: italic;
	}
</style>
