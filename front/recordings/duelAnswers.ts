/// <reference types="node" />
import { readFileSync } from 'fs';
import path from 'path';

/**
 * The Berlin duel bank (Duel v2), read from the backend content so the demo knows the right answers.
 * The server may reorder options, pairs and items, so answers are given as texts, not indices.
 */
const BANK = path.resolve('../back/src/main/resources/content/duel/berlin.json');

export const normalise = (s: string) => s.replace(/\s+/g, ' ').trim();

type Step =
  | { type: 'quiz'; id: string; options: string[]; correctIndex: number }
  | { type: 'predict' | 'chart'; id: string; input: { min: number; max: number }; answer: number }
  | { type: 'sort'; id: string; buckets: string[]; items: { text: string; bucket: number }[] }
  | { type: 'match'; id: string; pairs: [string, string][] };

export type DuelBank = {
  /** option text → { id of its quiz, whether it is the right one } */
  quizOption: Map<string, { quiz: string; correct: boolean }>;
  /** quiz id → correct option text */
  quizAnswer: Map<string, string>;
  predict: { min: number; max: number; answer: number };
  chart: { min: number; max: number; answer: number };
  /** item text → bucket index */
  sort: Map<string, number>;
  /** term → definition */
  match: Map<string, string>;
};

export function loadDuelBank(): DuelBank {
  const { questions } = JSON.parse(readFileSync(BANK, 'utf8')) as { questions: { step: Step }[] };
  const bank: Partial<DuelBank> = { quizOption: new Map(), quizAnswer: new Map(), sort: new Map(), match: new Map() };
  for (const { step } of questions) {
    if (step.type === 'quiz') {
      step.options.forEach((o, i) => bank.quizOption!.set(normalise(o), { quiz: step.id, correct: i === step.correctIndex }));
      bank.quizAnswer!.set(step.id, normalise(step.options[step.correctIndex]));
    } else if (step.type === 'predict' || step.type === 'chart') {
      bank[step.type] = { min: step.input.min, max: step.input.max, answer: step.answer };
    } else if (step.type === 'sort') {
      for (const item of step.items) bank.sort!.set(normalise(item.text), item.bucket);
    } else if (step.type === 'match') {
      for (const [term, definition] of step.pairs) bank.match!.set(normalise(term), normalise(definition));
    }
  }
  if (!bank.predict || !bank.chart) throw new Error(`${BANK} has no predict or chart question`);
  return bank as DuelBank;
}
