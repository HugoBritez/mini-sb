import type { Question } from './types';

interface RawStoplightColor {
	value: number;
}

const COLOR_BY_VALUE: Record<number, string> = {
	3: '#2ecc71',
	2: '#f1c40f',
	1: '#e74c3c'
};

/**
 * Color semáforo (verde/amarillo/rojo) para la opción `index` de una pregunta
 * importada de una fuente externa con metadata `raw.stoplightColors`.
 * `options` se generó a partir de esa metadata ordenada por valor
 * descendente, así que el mismo orden aplica acá.
 */
export function stoplightColor(question: Question, index: number): string | undefined {
	const colors = question.raw?.stoplightColors as RawStoplightColor[] | undefined;
	if (!colors) return undefined;
	const sorted = [...colors].sort((a, b) => b.value - a.value);
	const value = sorted[index]?.value;
	return value === undefined ? undefined : COLOR_BY_VALUE[value];
}
