<script lang="ts">
	import { surveyStore } from '$lib/surveyStore.svelte';
	import type { Question } from '$lib/types';

	// Cuánto esperar tras perder el foco de todos los campos de la tarjeta
	// antes de dar la edición por abandonada (debe ser un poco mayor al grace
	// del store para el lock, así el lock no se suelta antes que el draft).
	const DISCARD_DELAY_MS = 200;

	let {
		sectionId,
		question,
		typeLabel
	}: {
		sectionId: string;
		question: Question;
		typeLabel: string;
	} = $props();

	const locked = $derived(surveyStore.isLockedByOther(question.id));
	const holder = $derived(surveyStore.lockHolder(question.id));

	let editing = $state(false);
	// Snapshot inicial intencional: el $effect de abajo mantiene el draft
	// sincronizado con `question` en cada re-render mientras no se edita.
	// svelte-ignore state_referenced_locally
	let draftText = $state(question.text);
	// svelte-ignore state_referenced_locally
	let draftOptions = $state<string[]>([...(question.options ?? [])]);
	let blurTimer: ReturnType<typeof setTimeout> | undefined;

	// Mientras no se está editando, el draft sigue reflejando lo último guardado.
	$effect(() => {
		if (!editing) {
			draftText = question.text;
			draftOptions = [...(question.options ?? [])];
		}
	});

	const dirty = $derived(
		draftText !== question.text ||
			JSON.stringify(draftOptions) !== JSON.stringify(question.options ?? [])
	);

	function startEditing() {
		clearTimeout(blurTimer);
		editing = true;
		surveyStore.lockQuestion(question.id);
	}

	function stopEditingSoon() {
		surveyStore.scheduleUnlock(question.id);
		clearTimeout(blurTimer);
		blurTimer = setTimeout(() => {
			editing = false;
		}, DISCARD_DELAY_MS);
	}

	function save() {
		clearTimeout(blurTimer);
		surveyStore.saveQuestion(sectionId, question.id, {
			text: draftText,
			options: question.options ? draftOptions : undefined
		});
		editing = false;
	}

	function addDraftOption() {
		startEditing();
		draftOptions.push(`Opción ${draftOptions.length + 1}`);
	}

	function removeDraftOption(i: number) {
		startEditing();
		if (draftOptions.length > 1) draftOptions.splice(i, 1);
	}
</script>

<li class="question" class:locked>
	<div class="question-header">
		<span class="badge">{typeLabel}</span>
		{#if locked && holder}
			<span class="lock-badge" style:--holder-color={holder.color}>
				<span class="lock-dot"></span>
				{holder.name} está editando
			</span>
		{/if}
		<button
			class="remove"
			disabled={locked}
			onclick={() => surveyStore.removeQuestion(sectionId, question.id)}
		>
			✕
		</button>
	</div>

	<input
		class="question-text"
		type="text"
		placeholder="Escribí la pregunta..."
		bind:value={draftText}
		disabled={locked}
		onfocus={startEditing}
		onblur={stopEditingSoon}
	/>

	{#if question.type === 'single_choice' || question.type === 'multi_choice'}
		<ul class="options">
			{#each draftOptions as _, i (i)}
				<li class="option">
					<span class="option-marker">
						{question.type === 'single_choice' ? '○' : '☐'}
					</span>
					<input
						type="text"
						bind:value={draftOptions[i]}
						disabled={locked}
						onfocus={startEditing}
						onblur={stopEditingSoon}
					/>
					<button class="remove-option" disabled={locked} onclick={() => removeDraftOption(i)}>
						✕
					</button>
				</li>
			{/each}
		</ul>
		<button class="add-option" disabled={locked} onclick={addDraftOption}> + Agregar opción </button>
	{:else if question.type === 'rating'}
		<div class="scale-preview">
			{#each { length: (question.scale?.max ?? 5) - (question.scale?.min ?? 1) + 1 } as _, i (i)}
				<span class="scale-dot">{(question.scale?.min ?? 1) + i}</span>
			{/each}
		</div>
	{/if}

	{#if editing}
		<div class="save-bar">
			{#if dirty}
				<span class="dirty-hint">Cambios sin guardar</span>
			{/if}
			<button class="save" disabled={!dirty} onclick={save}>Guardar</button>
		</div>
	{/if}
</li>

<style>
	.question {
		border: 1px solid #ddd;
		border-radius: 8px;
		padding: 1rem;
		transition:
			border-color 0.15s,
			background 0.15s;
	}

	.question.locked {
		border-color: var(--holder-color, #ccc);
		background: #fafafa;
	}

	.question-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.badge {
		font-size: 0.75rem;
		color: #666;
		background: #eee;
		border-radius: 999px;
		padding: 0.15rem 0.6rem;
	}

	.lock-badge {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.75rem;
		color: var(--holder-color);
		margin-right: auto;
		margin-left: 0.5rem;
	}

	.lock-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		background: var(--holder-color);
		flex-shrink: 0;
	}

	.remove,
	.remove-option {
		border: none;
		background: transparent;
		cursor: pointer;
		color: #999;
	}

	.remove:hover,
	.remove-option:hover {
		color: #c0392b;
	}

	.question-text {
		width: 100%;
		font-size: 1rem;
		padding: 0.4rem 0;
		border: none;
		border-bottom: 1px solid #ddd;
		outline: none;
	}

	.question-text:focus {
		border-bottom-color: #333;
	}

	input:disabled {
		color: #999;
		cursor: not-allowed;
	}

	button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.options {
		list-style: none;
		padding: 0;
		margin-top: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.option input {
		flex: 1;
		border: none;
		border-bottom: 1px solid #eee;
		padding: 0.2rem 0;
		outline: none;
	}

	.add-option {
		margin-top: 0.5rem;
		border: none;
		background: transparent;
		color: #555;
		cursor: pointer;
		font-size: 0.85rem;
	}

	.scale-preview {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.75rem;
	}

	.scale-dot {
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 50%;
		border: 1px solid #ccc;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.8rem;
		color: #666;
	}

	.save-bar {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.6rem;
		margin-top: 0.85rem;
		padding-top: 0.75rem;
		border-top: 1px solid #eee;
	}

	.dirty-hint {
		font-size: 0.75rem;
		color: #b8860b;
	}

	.save {
		border: none;
		background: #111;
		color: #fff;
		border-radius: 6px;
		padding: 0.4rem 0.9rem;
		font-size: 0.85rem;
		cursor: pointer;
	}

	.save:disabled {
		background: #ccc;
		opacity: 1;
		cursor: default;
	}
</style>
