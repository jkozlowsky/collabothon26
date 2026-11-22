import { haptic } from '@/components/onboarding/ui';
import { playSfx } from '@/lib/sfx';

/** Haptic and sound for a graded answer, on top of the visual feedback. */
export function answerCue(correct: boolean) {
  haptic(correct ? 'success' : 'light');
  playSfx(correct ? 'correct' : 'wrong');
}
