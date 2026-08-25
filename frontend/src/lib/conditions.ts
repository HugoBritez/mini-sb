import type { Question } from './types';

/** Condición a nivel pregunta (visibilidad de toda la pregunta). */
interface RawQuestionCondition {
	codeName: string;
	type: string;
	value: string;
	operator: 'equals' | 'not_equals' | 'greater_than_eq' | string;
}

/** Condición a nivel opción (ej. cascada provincia -> cantón). */
interface RawOptionCondition {
	codeName: string;
	type: string;
	values: string[];
	operator: 'equals' | 'not_equals' | string;
	showIfNoData: boolean;
}

interface RawOption {
	text: string;
	value: string;
	conditions?: RawOptionCondition[];
}

/** Respuestas del simulador de preview: por codeName, un valor o una lista (checkbox). */
export type Answers = Record<string, string | string[]>;

function matches(answer: string | string[] | undefined, value: string, operator: string): boolean {
	const values = Array.isArray(answer) ? answer : answer !== undefined ? [answer] : [];
	switch (operator) {
		case 'not_equals':
			return !values.includes(value);
		case 'greater_than_eq':
			return values.some((v) => Number(v) >= Number(value));
		case 'equals':
		default:
			return values.includes(value);
	}
}

/**
 * Solo sabemos evaluar condiciones "socioEconomic" (referencian otra pregunta
 * de esta misma encuesta plana). Las de tipo "family" (ej. edad de un
 * miembro) no tienen dónde vivir en este modelo, así que esa condición
 * puntual se da por satisfecha (no bloquea el OR) en vez de ocultar la
 * pregunta para siempre.
 */
function conditionMatches(condition: RawQuestionCondition, answers: Answers): boolean {
	if (condition.type !== 'socioEconomic') return true;
	return matches(answers[condition.codeName], condition.value, condition.operator);
}

/** Las preguntas sin `conditions` (o con array vacío) siempre se muestran; si hay, alcanza con que una condición se cumpla (son un OR de valores posibles para el mismo campo). */
export function isQuestionVisible(question: Question, answers: Answers): boolean {
	const conditions = (question.raw?.conditions as RawQuestionCondition[] | undefined) ?? [];
	if (conditions.length === 0) return true;
	return conditions.some((c) => conditionMatches(c, answers));
}

/** Opciones visibles de una pregunta (para el cascadeo tipo provincia -> cantón). */
export function visibleOptionIndexes(question: Question, answers: Answers): number[] {
	const rawOptions = (question.raw?.options as RawOption[] | undefined) ?? [];
	const options = question.options ?? [];
	return options.map((_, i) => i).filter((i) => {
		const conditions = rawOptions[i]?.conditions ?? [];
		if (conditions.length === 0) return true;
		return conditions.some((c) => {
			if (c.type !== 'socioEconomic') return true;
			if (answers[c.codeName] === undefined) return c.showIfNoData;
			return c.values.some((v) => matches(answers[c.codeName], v, c.operator));
		});
	});
}

/** Valor real a guardar en `answers` para una opción (el `value` original, no el texto mostrado). */
export function optionValue(question: Question, index: number): string {
	const rawOptions = question.raw?.options as RawOption[] | undefined;
	return rawOptions?.[index]?.value ?? question.options?.[index] ?? '';
}

/** codeName de la pregunta en el modelo original, usado como clave de `answers`. Si no viene de una encuesta importada, se usa el id. */
export function answerKey(question: Question): string {
	return (question.raw?.codeName as string | undefined) ?? question.id;
}

/**
 * `single_choice` es "una sola respuesta", no un widget particular: la
 * encuesta original ya distinguía radio (pocas opciones) de select (una
 * lista larga, ej. las 24 provincias o 221 cantones). Si tenemos ese dato lo
 * respetamos; si no (pregunta armada a mano en el editor), un umbral por
 * cantidad de opciones evita listas de radios larguísimas igual.
 */
export function isDropdown(question: Question): boolean {
	if (question.type !== 'single_choice') return false;
	const answerType = question.raw?.answerType as string | undefined;
	if (answerType) return answerType === 'select';
	return (question.options?.length ?? 0) > 8;
}
