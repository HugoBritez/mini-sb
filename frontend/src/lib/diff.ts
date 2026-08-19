import type { Question, Section, Survey } from './types';

export interface DiffToken {
	text: string;
	type: 'same' | 'add' | 'del';
}

/** Diff palabra por palabra (preserva espacios) usando LCS clásico. */
export function diffWords(before: string, after: string): DiffToken[] {
	const a = before.split(/(\s+)/).filter(Boolean);
	const b = after.split(/(\s+)/).filter(Boolean);
	const m = a.length;
	const n = b.length;

	const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
	for (let i = m - 1; i >= 0; i--) {
		for (let j = n - 1; j >= 0; j--) {
			dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
		}
	}

	const tokens: DiffToken[] = [];
	let i = 0;
	let j = 0;
	while (i < m && j < n) {
		if (a[i] === b[j]) {
			tokens.push({ text: a[i], type: 'same' });
			i++;
			j++;
		} else if (dp[i + 1][j] >= dp[i][j + 1]) {
			tokens.push({ text: a[i], type: 'del' });
			i++;
		} else {
			tokens.push({ text: b[j], type: 'add' });
			j++;
		}
	}
	while (i < m) {
		tokens.push({ text: a[i], type: 'del' });
		i++;
	}
	while (j < n) {
		tokens.push({ text: b[j], type: 'add' });
		j++;
	}
	return tokens;
}

interface OptionDiff {
	kind: 'same' | 'added' | 'removed' | 'modified';
	tokens: DiffToken[];
}

function diffOptions(before: string[], after: string[]): OptionDiff[] {
	const max = Math.max(before.length, after.length);
	const out: OptionDiff[] = [];
	for (let i = 0; i < max; i++) {
		const b = before[i];
		const a = after[i];
		if (b === undefined) out.push({ kind: 'added', tokens: [{ text: a, type: 'add' }] });
		else if (a === undefined) out.push({ kind: 'removed', tokens: [{ text: b, type: 'del' }] });
		else if (b === a) out.push({ kind: 'same', tokens: [{ text: a, type: 'same' }] });
		else out.push({ kind: 'modified', tokens: diffWords(b, a) });
	}
	return out;
}

export interface QuestionDiff {
	questionId: string;
	sectionTitle: string;
	kind: 'added' | 'removed' | 'modified';
	textTokens: DiffToken[];
	optionDiffs?: OptionDiff[];
}

function indexQuestions(sections: Section[]): Map<string, { section: Section; question: Question }> {
	const map = new Map<string, { section: Section; question: Question }>();
	for (const section of sections) {
		for (const question of section.questions) {
			map.set(question.id, { section, question });
		}
	}
	return map;
}

/** Compara dos snapshots del survey y arma un diff por pregunta, estilo GitHub. */
export function diffSurvey(before: Survey, after: Survey): QuestionDiff[] {
	const beforeIndex = indexQuestions(before.sections ?? []);
	const afterIndex = indexQuestions(after.sections ?? []);
	const results: QuestionDiff[] = [];

	for (const [id, { section, question }] of afterIndex) {
		const prev = beforeIndex.get(id);
		if (!prev) {
			results.push({
				questionId: id,
				sectionTitle: section.title,
				kind: 'added',
				textTokens: [{ text: question.text, type: 'add' }],
				optionDiffs: question.options?.map((o) => ({
					kind: 'added',
					tokens: [{ text: o, type: 'add' }]
				}))
			});
			continue;
		}
		const textChanged = prev.question.text !== question.text;
		const optionsChanged =
			JSON.stringify(prev.question.options ?? []) !== JSON.stringify(question.options ?? []);
		if (textChanged || optionsChanged) {
			results.push({
				questionId: id,
				sectionTitle: section.title,
				kind: 'modified',
				textTokens: diffWords(prev.question.text, question.text),
				optionDiffs: question.options
					? diffOptions(prev.question.options ?? [], question.options)
					: undefined
			});
		}
	}

	for (const [id, { section, question }] of beforeIndex) {
		if (!afterIndex.has(id)) {
			results.push({
				questionId: id,
				sectionTitle: section.title,
				kind: 'removed',
				textTokens: [{ text: question.text, type: 'del' }],
				optionDiffs: question.options?.map((o) => ({
					kind: 'removed',
					tokens: [{ text: o, type: 'del' }]
				}))
			});
		}
	}

	return results;
}
