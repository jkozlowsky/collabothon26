/**
 * The three demo accounts the picker offers (.plans/demo-accounts-spec.md). Names and avatars come from the
 * backend `account` row; this registry holds only what the frontend needs per account: the mock bank seed and the
 * onboarding answer hints. Alex (`demo-user`) is frozen: his entry points at the unchanged `seedAccount`.
 *
 * CONTRACT (written by the coordinator):
 * - `PersonaId`, `Persona`, `OnboardingHints`, `PERSONAS`, `PERSONA_IDS`, `personaFor` keep these names and shapes.
 * - The persona-data worker replaces the two TODO seeds with `seedDaniel()` / `seedElena()` and fills the hints.
 * - Everyone else only reads from this file.
 */
import { seedDaniel } from '@/lib/bank/seed-daniel';
import { seedElena } from '@/lib/bank/seed-elena';
import { DEFAULT_SEED, seedAccount } from '@/lib/bank/seed';
import type { BankState } from '@/types/bank';
import type { Experience, LifeStage } from '@/types/onboarding';

export type PersonaId = 'demo-user' | 'demo-daniel' | 'demo-elena';

/**
 * Preselected answers for the onboarding's profiling questions only (never the Quick check's knowledge questions).
 * `interests` (story ids) is asked in a fresh onboarding and preselects those chips; `lifeStage` and `experience`
 * only in Profile → "Edit answers", where they fill in what the profile does not hold yet. The age band is not a
 * question: it comes from the bank's `owner.age`. Every field optional; an absent field means "no hint", and any
 * hint can be changed.
 */
export type OnboardingHints = {
  interests?: string[];
  lifeStage?: LifeStage;
  experience?: Experience;
};

export type Persona = {
  userId: PersonaId;
  /** Fresh mock bank state for this account; deterministic, called once per sign-in. */
  bankSeed: () => BankState;
  /** null = no hints (Alex). */
  hints: OnboardingHints | null;
};

export const PERSONA_IDS: readonly PersonaId[] = ['demo-user', 'demo-daniel', 'demo-elena'];

export const PERSONAS: Record<PersonaId, Persona> = {
  'demo-user': { userId: 'demo-user', bankSeed: () => seedAccount(DEFAULT_SEED), hints: null },
  'demo-daniel': {
    userId: 'demo-daniel',
    bankSeed: () => seedDaniel(),
    hints: {
      interests: ['seoul', 'mumbai'],
      lifeStage: 'settled',
      experience: 'investing',
    },
  },
  'demo-elena': {
    userId: 'demo-elena',
    bankSeed: () => seedElena(),
    hints: {
      interests: ['berlin', 'buenos-aires'],
      lifeStage: 'later-life',
      experience: 'regular',
    },
  },
};

/** The persona for a user id; unknown ids (e.g. a custom EXPO_PUBLIC_USER_ID) fall back to Alex's seed, no hints. */
export function personaFor(userId: string): Persona {
  return (PERSONAS as Record<string, Persona>)[userId] ?? { ...PERSONAS['demo-user'], userId: userId as PersonaId };
}
