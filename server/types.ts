export type QuestionType = "short_text" | "single_choice" | "multi_choice" | "rating";

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options?: string[];
  scale?: { min: number; max: number };
  /**
   * Metadata original sin interpretar (ej. conditions/conditionGroups de una
   * encuesta importada). El editor y el diff la ignoran; solo viaja con el
   * documento para no perder datos de la fuente real.
   */
  raw?: Record<string, unknown>;
}

export interface Section {
  id: string;
  title: string;
  questions: Question[];
  /** Agrupador de navegación (tab -> subtab). Sin `group`, la sección se muestra suelta. */
  group?: string;
}

export interface Survey {
  title: string;
  sections: Section[];
}
