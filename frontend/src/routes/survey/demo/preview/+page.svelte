<script lang="ts">
	import { surveyStore } from '$lib/surveyStore.svelte';
	import {
		answerKey,
		isDropdown,
		isQuestionVisible,
		optionValue,
		visibleOptionIndexes,
		type Answers
	} from '$lib/conditions';
	import { stoplightColor } from '$lib/stoplight';
	import type { Question } from '$lib/types';

	// Respuestas del simulador: viven solo en esta pestaña (no se sincronizan
	// por Automerge), sirven para ver en vivo el efecto de las condicionales
	// de la encuesta importada mientras se la responde de prueba.
	let answers = $state<Answers>({});

	function setAnswer(question: Question, value: string) {
		answers[answerKey(question)] = value;
	}

	function toggleChecklistAnswer(question: Question, value: string, checked: boolean) {
		const key = answerKey(question);
		const current = Array.isArray(answers[key]) ? [...(answers[key] as string[])] : [];
		answers[key] = checked ? [...current, value] : current.filter((v) => v !== value);
	}

	function isChecked(question: Question, value: string): boolean {
		const current = answers[answerKey(question)];
		return Array.isArray(current) && current.includes(value);
	}
</script>

<div class="preview">

	{#each surveyStore.survey.sections as section, i (section.id)}
		{#if section.group && section.group !== surveyStore.survey.sections[i - 1]?.group}
			<h1 class="group-title">{section.group}</h1>
		{/if}
		<section>
			<h2>{section.title}</h2>

			{#if section.questions.length === 0}
				<p class="empty">Esta sección todavía no tiene preguntas.</p>
			{:else}
				<ol class="questions">
					{#each section.questions as question (question.id)}
						{#if isQuestionVisible(question, answers)}
							<li class="question">
								<p class="question-text">{question.text || '(pregunta sin texto)'}</p>

								{#if question.type === 'short_text'}
									<input
										type="text"
										placeholder="Respuesta"
										oninput={(e) => setAnswer(question, e.currentTarget.value)}
									/>
								{:else if question.type === 'single_choice' && isDropdown(question)}
									<select
										value={answers[answerKey(question)] ?? ''}
										onchange={(e) => setAnswer(question, e.currentTarget.value)}
									>
										<option value="" disabled>Seleccionar...</option>
										{#each visibleOptionIndexes(question, answers) as i (i)}
											<option value={optionValue(question, i)}>
												{question.options?.[i] || `Opción ${i + 1}`}
											</option>
										{/each}
									</select>
								{:else if question.type === 'single_choice'}
									<ul class="choices">
										{#each visibleOptionIndexes(question, answers) as i (i)}
											{@const color = stoplightColor(question, i)}
											<li>
												<label>
													<input
														type="radio"
														name={question.id}
														checked={answers[answerKey(question)] === optionValue(question, i)}
														onchange={() => setAnswer(question, optionValue(question, i))}
													/>
													{#if color}
														<span class="stoplight-dot" style:background={color}></span>
													{/if}
													{question.options?.[i] || `Opción ${i + 1}`}
												</label>
											</li>
										{/each}
									</ul>
								{:else if question.type === 'multi_choice'}
									<ul class="choices">
										{#each visibleOptionIndexes(question, answers) as i (i)}
											<li>
												<label>
													<input
														type="checkbox"
														checked={isChecked(question, optionValue(question, i))}
														onchange={(e) =>
															toggleChecklistAnswer(
																question,
																optionValue(question, i),
																e.currentTarget.checked
															)}
													/>
													{question.options?.[i] || `Opción ${i + 1}`}
												</label>
											</li>
										{/each}
									</ul>
								{:else if question.type === 'rating'}
									<div class="scale">
										{#each { length: (question.scale?.max ?? 5) - (question.scale?.min ?? 1) + 1 } as _, i (i)}
											{@const value = String((question.scale?.min ?? 1) + i)}
											<button
												type="button"
												class:selected={answers[answerKey(question)] === value}
												onclick={() => setAnswer(question, value)}
											>
												{value}
											</button>
										{/each}
									</div>
								{/if}
							</li>
						{/if}
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

	.group-title {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #999;
		margin: 2.5rem 0 0.5rem;
	}

	.group-title:first-child {
		margin-top: 0;
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

	select {
		width: 100%;
		max-width: 24rem;
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 6px;
		font: inherit;
		background: #fff;
	}

	.stoplight-dot {
		width: 0.7rem;
		height: 0.7rem;
		border-radius: 50%;
		flex-shrink: 0;
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
		cursor: pointer;
	}

	.scale button.selected {
		background: #111;
		border-color: #111;
		color: #fff;
	}

	.empty {
		color: #888;
		font-style: italic;
	}
</style>
