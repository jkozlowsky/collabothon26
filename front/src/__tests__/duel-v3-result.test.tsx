import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { ResultView } from '@/components/duel/ResultView';
import { haptic, playSound } from '@/lib/duel/feedback';
import type { CategoryMatchEnd, MatchEnd } from '@/types/duel';

jest.mock('@/lib/duel/feedback', () => ({
  playSound: jest.fn(),
  haptic: jest.fn(),
}));

const mockPlaySound = playSound as unknown as jest.Mock;
const mockHaptic = haptic as unknown as jest.Mock;

describe('Duel v3 ResultView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const CATEGORIES: CategoryMatchEnd[] = [
    {
      story: 'saving',
      xpGained: 20,
      xpBefore: 92,
      xpAfter: 112,
      levelBefore: 3,
      levelAfter: 4,
      xpIntoLevelAfter: 12,
      xpForLevelAfter: 120,
    },
    {
      story: 'investing',
      xpGained: 15,
      xpBefore: 72,
      xpAfter: 87,
      levelBefore: 2,
      levelAfter: 3,
      xpIntoLevelAfter: 7,
      xpForLevelAfter: 90,
    },
  ];

  const WIN_RESULT: MatchEnd = {
    matchId: 101,
    mode: 'HUMAN',
    categories: CATEGORIES,
    outcome: 'WIN',
    score: 5,
    rivalScore: 4,
    you: { name: 'Alex Weber', avatar: 'm1', levels: { saving: 3, investing: 2 } },
    rival: { name: 'Ola Wisniewska', avatar: 'f1', levels: { saving: 2, investing: 2 } },
    xpGained: 35,
    xpByCategory: { saving: 20, investing: 15 },
    review: [
      {
        index: 0,
        category: 'saving',
        step: {
          type: 'quiz',
          id: 'q0',
          prompt: 'What is inflation?',
          options: ['Rising prices', 'Falling prices', 'Tax'],
          correctIndex: 0,
          explanation: 'Rising prices is inflation.',
        },
        yourAnswer: { option: 0 },
        correct: true,
        lessonId: 'berlin-1',
        lessonTitle: 'Inflation & savings',
      },
    ],
  };

  it('renders WIN outcome: "You won!" headline, trophy, generous confetti, win sound and haptics, winner crown', async () => {
    const onSeeRankings = jest.fn();
    const onBackToLobby = jest.fn();

    await render(
      <ResultView
        result={WIN_RESULT}
        youName="Alex Weber"
        onSeeRankings={onSeeRankings}
        onBackToLobby={onBackToLobby}
      />
    );

    expect(screen.getByTestId('result-heading')).toHaveTextContent('You won!');
    expect(screen.getByTestId('result-score')).toHaveTextContent('5 : 4');
    expect(screen.getByTestId('result-you-name')).toHaveTextContent('Alex W.');
    expect(screen.getByTestId('result-rival-name')).toHaveTextContent('Ola W.');

    // Trophy badge & generous confetti
    expect(screen.getByTestId('result-trophy-badge')).toBeOnTheScreen();
    expect(screen.getByTestId('result-confetti')).toBeOnTheScreen();
    expect(screen.getByTestId('winner-crown')).toBeOnTheScreen();

    // Sound & haptic
    expect(mockPlaySound).toHaveBeenCalledWith('win');
    expect(mockHaptic).toHaveBeenCalledWith('success');

    // See ranking link
    fireEvent.press(screen.getByTestId('result-see-rankings'));
    expect(onSeeRankings).toHaveBeenCalledTimes(1);
  });

  it('renders LOSS outcome: "You lost" headline, danger color, crown on rival, no confetti', async () => {
    const lossResult: MatchEnd = {
      ...WIN_RESULT,
      outcome: 'LOSS',
      score: 3,
      rivalScore: 4,
    };

    await render(
      <ResultView
        result={lossResult}
        youName="Alex Weber"
        onBackToLobby={jest.fn()}
      />
    );

    expect(screen.getByTestId('result-heading')).toHaveTextContent('You lost');
    expect(screen.getByTestId('result-score')).toHaveTextContent('3 : 4');
    expect(screen.queryByTestId('result-confetti')).toBeNull();
    expect(screen.queryByTestId('result-trophy-badge')).toBeNull();
  });

  it('renders DRAW outcome: "Draw" headline, +0 XP, no crown', async () => {
    const drawResult: MatchEnd = {
      ...WIN_RESULT,
      outcome: 'DRAW',
      score: 4,
      rivalScore: 4,
      xpGained: 0,
    };

    await render(
      <ResultView
        result={drawResult}
        youName="Alex Weber"
        onBackToLobby={jest.fn()}
      />
    );

    expect(screen.getByTestId('result-heading')).toHaveTextContent('Draw');
    expect(screen.getByTestId('result-score')).toHaveTextContent('4 : 4');
    expect(screen.queryByTestId('winner-crown')).toBeNull();
    expect(screen.queryByTestId('result-confetti')).toBeNull();
  });

  it('renders SOLO below 60 %: "Practice complete", score "n / total", no rival side or XP pill', async () => {
    const soloResult: MatchEnd = {
      ...WIN_RESULT,
      mode: 'SOLO',
      outcome: 'SOLO',
      score: 0,
      rivalScore: null,
      rival: null,
      xpGained: 0,
    };

    await render(
      <ResultView
        result={soloResult}
        youName="Alex Weber"
        onBackToLobby={jest.fn()}
      />
    );

    expect(screen.getByTestId('result-heading')).toHaveTextContent('Practice complete');
    expect(screen.getByTestId('result-score')).toHaveTextContent('0 / 1');
    expect(screen.getByText('You · solo, no XP')).toBeOnTheScreen();
    expect(screen.queryByTestId('result-rival-name')).toBeNull();
    expect(screen.queryByTestId('result-xp')).toBeNull();
  });

  it('shows full-screen max celebration LevelUpOverlay in sequence for multiple categories', async () => {
    await render(
      <ResultView
        result={WIN_RESULT}
        youName="Alex Weber"
        onBackToLobby={jest.fn()}
      />
    );

    // 1st category in sequence: Saving (Lv 3 -> Lv 4)
    expect(screen.getByTestId('level-up-overlay')).toBeOnTheScreen();
    expect(screen.getByTestId('level-up-title')).toHaveTextContent('Level up!');
    expect(screen.getByTestId('level-up-category')).toHaveTextContent('Saving');
    const firstLevels = screen.getByTestId('level-up-levels');
    expect(firstLevels).toHaveTextContent(/Lv 3/);
    expect(screen.getByTestId('level-up-confetti')).toBeOnTheScreen();
    expect(mockPlaySound).toHaveBeenCalledWith('level-up');
    expect(mockHaptic).toHaveBeenCalledWith('success');

    // Wait for level landing & haptic
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(mockHaptic).toHaveBeenCalledWith('light');
    expect(firstLevels).toHaveTextContent(/Lv 4/);

    mockPlaySound.mockClear();
    mockHaptic.mockClear();

    // Tap to advance to 2nd category (Investing, Lv 2 -> Lv 3)
    await act(async () => {
      fireEvent.press(screen.getByTestId('level-up-overlay'));
    });

    expect(screen.getByTestId('level-up-overlay')).toBeOnTheScreen();
    expect(screen.getByTestId('level-up-category')).toHaveTextContent('Investing');
    const secondLevels = screen.getByTestId('level-up-levels');
    expect(secondLevels).toHaveTextContent(/Lv 2/);
    expect(mockPlaySound).toHaveBeenCalledWith('level-up');
    expect(mockHaptic).toHaveBeenCalledWith('success');

    // Wait for level landing on second overlay
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(mockHaptic).toHaveBeenCalledWith('light');
    expect(secondLevels).toHaveTextContent(/Lv 3/);

    // Tap to dismiss final overlay
    await act(async () => {
      fireEvent.press(screen.getByTestId('level-up-overlay'));
    });

    expect(screen.queryByTestId('level-up-overlay')).toBeNull();
  });
});
