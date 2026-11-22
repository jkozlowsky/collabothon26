/// <reference types="node" />
import { readFileSync } from 'fs';
import path from 'path';

/**
 * The duel question banks (back/src/main/resources/content/duel/<story>.json), read so the demo knows the right
 * answers. A match draws a few questions per ticked story and the server may reorder options and items, so a question
 * is recognised by its prompt and answers are given as texts, not indices.
 */

export const normalise = (s: string) => s.replace(/\s+/g, ' ').trim();

type Common = { id: string; prompt: string };
export type DuelStep =
  | (Common & { type: 'quiz'; options: string[]; correctIndex: number })
  | (Common & { type: 'predict'; input: { min: number; max: number }; answer: number })
  | (Common & { type: 'chart'; input: { min: number; max: number }; answer: number })
  | (Common & { type: 'sort'; items: { text: string; bucket: number }[] })
  | (Common & { type: 'match'; pairs: [string, string][] });

export type DuelQuestion = { story: string; lessonId: string; step: DuelStep };

export function loadDuelQuestions(stories: string[]): DuelQuestion[] {
  return stories.flatMap((story) => {
    const file = path.resolve(`../back/src/main/resources/content/duel/${story}.json`);
    const { questions } = JSON.parse(readFileSync(file, 'utf8')) as { questions: { lessonId: string; step: DuelStep }[] };
    return questions.map((q) => ({ story, lessonId: q.lessonId, step: q.step }));
  });
}

/** The question whose prompt the screen shows. */
export function findQuestion(questions: DuelQuestion[], screenText: string): DuelQuestion {
  const text = normalise(screenText);
  const found = questions.find((q) => text.includes(normalise(q.step.prompt)));
  if (!found) throw new Error(`No answer key for the duel question: ${text.slice(0, 120)}`);
  return found;
}
