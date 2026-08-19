export type QuestionType = 'short_text' | 'single_choice' | 'multi_choice' | 'rating';

export interface Question {
	id: string;
	type: QuestionType;
	text: string;
	options?: string[];
	scale?: { min: number; max: number };
}

export interface Section {
	id: string;
	title: string;
	questions: Question[];
}

export interface Survey {
	title: string;
	sections: Section[];
}
