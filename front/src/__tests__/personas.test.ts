import fs from 'node:fs';
import path from 'node:path';

jest.mock('@/lib/user', () => ({ useCurrentUser: () => ({ userId: 'demo-user' }), USER_ID: 'demo-user' }), { virtual: true });
jest.mock('@/hooks/useOnboarding', () => ({ profileWritesSettled: () => Promise.resolve(), resetProfileWrites: () => {} }), { virtual: true });

import { formatEUR } from '@/lib/bank/money';
import { seedDaniel } from '@/lib/bank/seed-daniel';
import { seedElena } from '@/lib/bank/seed-elena';
import {
  depotChart,
  depotTotal,
  largestPlace,
  largestPosition,
  positionCount,
  savingsShare,
  totalCreditOutstanding,
} from '@/lib/bank/selectors';
import { ageBandOf, factsFrom } from '@/lib/categorization';
import { personalizeStep } from '@/lib/lessonMetrics';
import { PERSONAS, PERSONA_IDS, personaFor } from '@/lib/personas';
import type { BankState } from '@/types/bank';
import type { Step } from '@/types/lessons';

describe('Personas registry and seeds', () => {
  it('has valid registry entries for all three personas', () => {
    expect(PERSONA_IDS).toEqual(['demo-user', 'demo-daniel', 'demo-elena']);
    expect(Object.keys(PERSONAS)).toEqual(['demo-user', 'demo-daniel', 'demo-elena']);

    expect(personaFor('demo-user').userId).toBe('demo-user');
    expect(personaFor('demo-daniel').userId).toBe('demo-daniel');
    expect(personaFor('demo-elena').userId).toBe('demo-elena');

    // Unknown ID falls back to Alex
    expect(personaFor('unknown-user').userId).toBe('unknown-user');
    expect(personaFor('unknown-user').hints).toBeNull();
  });

  it('provides matching onboarding hints for Daniel and Elena, null for Alex', () => {
    expect(PERSONAS['demo-user'].hints).toBeNull();

    expect(PERSONAS['demo-daniel'].hints).toEqual({
      interests: ['seoul', 'mumbai'],
      lifeStage: 'settled',
      experience: 'investing',
    });

    expect(PERSONAS['demo-elena'].hints).toEqual({
      interests: ['berlin', 'buenos-aires'],
      lifeStage: 'later-life',
      experience: 'regular',
    });

    // The age band is not asked: the onboarding derives it from the bank's owner.age.
    expect(seedDaniel().owner.age).toBe(45);
    expect(ageBandOf(seedDaniel().owner.age)).toBe('41-59');
    expect(seedElena().owner.age).toBe(72);
    expect(ageBandOf(seedElena().owner.age)).toBe('60+');
  });

  it('is deterministic: repeated seed calls produce deep-equal states', () => {
    expect(seedDaniel()).toEqual(seedDaniel());
    expect(seedElena()).toEqual(seedElena());
  });

  it('produces exact factsFrom values required by spec §2', () => {
    const danielState = seedDaniel();
    const elenaState = seedElena();

    const danielFacts = factsFrom(danielState);
    expect(danielFacts).toEqual(
      expect.objectContaining({
        incomeBand: '5k+',
        cashBufferMonths: '6+',
        savesRegularly: false,
        inOverdraft: false,
        holdsInvestments: true,
        hasLoan: true,
      }),
    );

    const elenaFacts = factsFrom(elenaState);
    expect(elenaFacts).toEqual(
      expect.objectContaining({
        incomeBand: '1-2k',
        cashBufferMonths: '6+',
        savesRegularly: true,
        inOverdraft: false,
        holdsInvestments: false,
        hasLoan: false,
      }),
    );
  });

  it('evaluates bank selectors without crashing or returning NaN on Elena and Daniel', () => {
    const daniel = seedDaniel();
    const elena = seedElena();

    for (const [, state] of [['Daniel', daniel], ['Elena', elena]] as const) {
      expect(Number.isNaN(depotTotal(state))).toBe(false);
      expect(Number.isNaN(positionCount(state))).toBe(false);
      expect(Number.isNaN(savingsShare(state))).toBe(false);
      expect(Number.isNaN(totalCreditOutstanding(state))).toBe(false);

      const lp = largestPosition(state);
      expect(Number.isNaN(lp.share)).toBe(false);

      const place = largestPlace(state);
      expect(Number.isNaN(place.share)).toBe(false);

      for (const range of ['1W', '1M', '1Y', 'Max'] as const) {
        const chart = depotChart(state, range);
        expect(Number.isNaN(chart.change)).toBe(false);
        for (const pt of chart.points) {
          expect(Number.isNaN(pt)).toBe(false);
        }
      }

      expect(Number.isNaN(state.owner.age)).toBe(false);
    }

    expect(largestPosition(elena)).toEqual({ name: '', share: 0 });
    expect(depotTotal(elena)).toBe(0);
    expect(positionCount(elena)).toBe(0);
    expect(totalCreditOutstanding(elena)).toBe(0);

    expect(depotTotal(daniel)).toBe(1420000);
    expect(positionCount(daniel)).toBe(1);
    expect(largestPosition(daniel).name).toBe('NovaTech Inc.');
  });

  describe('personalizeStep with Daniel and Elena on all lesson JSONs', () => {
    const money = (cents: number, opts?: { whole?: boolean }) => formatEUR(cents, opts);
    const lessonsDir = path.resolve(__dirname, '../../../back/src/main/resources/content/lessons');
    const lessonFiles = fs.readdirSync(lessonsDir).filter((f) => f.endsWith('.json'));

    const states: { name: string; state: BankState }[] = [
      { name: 'Daniel', state: seedDaniel() },
      { name: 'Elena', state: seedElena() },
    ];

    it('has lesson files present in the backend', () => {
      expect(lessonFiles.length).toBeGreaterThan(0);
    });

    function checkTextValues(value: unknown, context: string): void {
      if (typeof value === 'string') {
        expect({ context, value }).not.toMatchObject({ value: expect.stringMatching(/\bNaN\b/) });
        expect({ context, value }).not.toMatchObject({ value: expect.stringMatching(/\bundefined\b/) });
        expect({ context, value }).not.toMatchObject({ value: expect.stringMatching(/\bnull\b/) });
        expect({ context, value }).not.toMatchObject({ value: expect.stringMatching(/\{\{[^}]+\}\}/) });
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => checkTextValues(item, `${context}[${index}]`));
      } else if (value && typeof value === 'object') {
        Object.entries(value).forEach(([key, val]) => checkTextValues(val, `${context}.${key}`));
      }
    }

    test.each(states)('$name: personalizeStep produces valid content without NaN/undefined/null text or unreplaced {{token}}', ({ state }) => {
      for (const file of lessonFiles) {
        const fullPath = path.join(lessonsDir, file);
        const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        const steps: Step[] = content.steps ?? [];

        for (const step of steps) {
          const personalized = personalizeStep(step, state, money);
          const serialized = JSON.stringify(personalized);

          // Check serialized json for unreplaced tokens or broken numeric/string substitutions
          expect(serialized).not.toMatch(/\{\{[^}]+\}\}/);
          expect(serialized).not.toContain('"NaN"');
          expect(serialized).not.toContain('"undefined"');
          expect(serialized).not.toContain(':NaN');

          // Check string fields for "null", "undefined", "NaN" text
          checkTextValues(personalized, `${file}:${step.id}`);
        }
      }
    });
  });
});
