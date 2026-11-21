import { largestPosition } from '@/lib/bank/selectors';
import { calloutState, isDone, sortStories } from '@/lib/stories';
import type { BankState, FqTeaser, FqTeaserPlacement } from '@/types/bank';
import type { Story } from '@/types/stories';

/** The story each bank tab advertises; `home` follows the learner instead (see pickHomeStory). */
export const TEASER_STORY: Record<Exclude<FqTeaserPlacement, 'home'>, string> = {
  // The Credits tab shows an instalment loan: São Paulo is about the real cost of instalments.
  credits: 'sao-paulo',
  // The Invest tab and its buy nudge: Tokyo is about spreading your investments.
  invest: 'tokyo',
};

/** Before onboarding, home talks about the user's savings: Berlin is about safe savings losing value. */
export const NEWCOMER_HOME_STORY = 'berlin';

/** Home: a story the learner is part-way through, else the Map's first open story (current, then not started). */
export function pickHomeStory(stories: Story[]): Story {
  const open = sortStories(stories).filter((s) => s.status === 'available' && !isDone(s));
  return open.find((s) => calloutState(s) === 'inProgress') ?? open[0] ?? stories[0];
}

/** The card text for one story, from its real progress and next lesson. */
export function teaserFor(story: Story): FqTeaser {
  const { done, total } = story.progress;
  const next = story.nextLesson;
  const progress = total > 0 ? Math.min(done / total, 1) : 0;
  if (!next || isDone(story)) {
    return { storyId: story.id, title: `Review: ${story.topic}`, meta: `${story.city} · all ${total} lessons done`, progress: 1 };
  }
  const verb = calloutState(story) === 'inProgress' ? 'Continue' : 'Start';
  return {
    storyId: story.id,
    lessonId: next.id,
    title: `${verb}: ${next.title}`,
    meta: `${story.city} · Lesson ${done + 1} of ${total} · ${next.minutes} min`,
    progress,
  };
}

/** The bank's `money` helper, so hidden amounts stay hidden in the popup too. */
type Money = (cents: number, opts?: { whole?: boolean }) => string;

/**
 * For a user who has not tried Atlas yet: the popup starts from a fact in their own bank data and asks
 * the question the story answers. It explains and never advises (no "you should").
 */
export function newcomerTeaser(placement: FqTeaserPlacement, story: Story, state: BankState, money: Money): FqTeaser {
  const minutes = story.nextLesson?.minutes;
  const top = largestPosition(state);
  const title = {
    home: `You have ${money(state.savings.balance, { whole: true })} in savings at ${state.savings.rate}% a year. Learn how to keep it from losing value.`,
    credits: `Your loan costs ${state.loan.apr}% a year. See what that adds up to over all the instalments.`,
    invest: `${Math.round(top.share * 100)}% of your depot is in ${top.name}. What does that mean for your risk?`,
  }[placement];
  return {
    ...teaserFor(story),
    title,
    meta: `${story.city} · ${story.title}${minutes ? ` · ${minutes} min` : ''}`,
    personal: true,
  };
}
