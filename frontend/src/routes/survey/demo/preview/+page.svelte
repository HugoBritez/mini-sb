<script lang="ts">
	import { surveyStore } from '$lib/surveyStore.svelte';
</script>

<div class="preview">

	{#each surveyStore.survey.sections as section (section.id)}
		<section>
			<h2>{section.title}</h2>

			{#if section.questions.length === 0}
				<p class="empty">Esta sección todavía no tiene preguntas.</p>
			{:else}
				<ol class="questions">
					{#each section.questions as question (question.id)}
						<li class="question">
							<p class="question-text">{question.text || '(pregunta sin texto)'}</p>

							{#if question.type === 'short_text'}
								<input type="text" placeholder="Respuesta" disabled />
							{:else if question.type === 'single_choice'}
								<ul class="choices">
									{#each question.options ?? [] as option, i (i)}
										<li>
											<label>
												<input type="radio" name={question.id} disabled />
												{option || `Opción ${i + 1}`}
											</label>
										</li>
									{/each}
								</ul>
							{:else if question.type === 'multi_choice'}
								<ul class="choices">
									{#each question.options ?? [] as option, i (i)}
										<li>
											<label>
												<input type="checkbox" disabled />
												{option || `Opción ${i + 1}`}
											</label>
										</li>
									{/each}
								</ul>
							{:else if question.type === 'rating'}
								<div class="scale">
									{#each { length: (question.scale?.max ?? 5) - (question.scale?.min ?? 1) + 1 } as _, i (i)}
										<button type="button" disabled>{(question.scale?.min ?? 1) + i}</button>
									{/each}
								</div>
							{/if}
						</li>
					{/each}
				</ol>
			{/if}
		</section>
	{/each}
</div>

<style>
	.hint {
		font-size: 0.85rem;
		color: #888;
		margin-bottom: 1.5rem;
	}

	section {
		margin-bottom: 2rem;
	}

	section h2 {
		font-size: 1.1rem;
		margin-bottom: 1rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid #eee;
	}

	.questions {
		list-style: none;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.question-text {
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.question input[type='text'] {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 6px;
		font: inherit;
	}

	.choices {
		list-style: none;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.choices label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #333;
	}

	.scale {
		display: flex;
		gap: 0.5rem;
	}

	.scale button {
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		border: 1px solid #ccc;
		background: #fff;
		font-size: 0.85rem;
	}

	input:disabled,
	button:disabled {
		opacity: 0.7;
		cursor: default;
	}

	.empty {
		color: #888;
		font-style: italic;
	}
</style>
