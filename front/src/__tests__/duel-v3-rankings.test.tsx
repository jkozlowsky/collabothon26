import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import DuelRankingsScreen from '@/app/duel/rankings';
import { haptic, playSound } from '@/lib/duel/feedback';
import type { RankingRow, Rankings } from '@/types/duel';

jest.mock('@/lib/duel/feedback', () => ({
  playSound: jest.fn(),
  haptic: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    replace: jest.fn(),
    push: jest.fn(),
  },
}));

const mockPlaySound = playSound as unknown as jest.Mock;
const mockHaptic = haptic as unknown as jest.Mock;

const TOP_PLAYERS: RankingRow[] = [
  { rank: 1, userId: 'u1', name: 'Tomasz Nowak', avatar: 'm3', level: 6, weeklyXp: 350 },
  { rank: 2, userId: 'u2', name: 'Ola Wisniewska', avatar: 'f1', level: 5, weeklyXp: 290 },
  { rank: 3, userId: 'u3', name: 'Marta Kowalska', avatar: 'f2', level: 4, weeklyXp: 240 },
  { rank: 4, userId: 'u4', name: 'Piotr Zielinski', avatar: 'm2', level: 4, weeklyXp: 210 },
  { rank: 5, userId: 'u5', name: 'Anna Lewandowska', avatar: 'f3', level: 3, weeklyXp: 180 },
  { rank: 6, userId: 'u6', name: 'Janusz Korwin', avatar: 'm1', level: 3, weeklyXp: 150 },
  { rank: 7, userId: 'u7', name: 'Krzysztof Bosak', avatar: 'm1', level: 2, weeklyXp: 120 },
  { rank: 8, userId: 'u8', name: 'Szymon Holownia', avatar: 'm2', level: 2, weeklyXp: 100 },
  { rank: 9, userId: 'u9', name: 'Wladyslaw Kosiniak', avatar: 'm3', level: 2, weeklyXp: 90 },
  { rank: 10, userId: 'u10', name: 'Donald Tusk', avatar: 'm1', level: 2, weeklyXp: 80 },
  { rank: 11, userId: 'demo-user', name: 'Alex Weber', avatar: 'm1', level: 2, weeklyXp: 75 },
];

let mockRankingsData: Rankings = {
  top: TOP_PLAYERS,
  me: TOP_PLAYERS[10],
};

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  mockRankingsData = {
    top: TOP_PLAYERS,
    me: TOP_PLAYERS[10],
  };

  globalThis.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockRankingsData),
    } as Response)
  );
});

describe('Duel v3 Rankings', () => {
  it('renders 3 medal cards for top 3 with "First L." formatting and header matching Figma Frame 04', async () => {
    await render(<DuelRankingsScreen />);

    // Header copy strictly matches Figma Frame 04
    expect(screen.getByText('XP earned since Monday')).toBeOnTheScreen();
    expect(screen.getByText('Weekly ranking')).toBeOnTheScreen();
    expect(screen.getByText(/Week \d+ · ends in \d+ (day|days)/)).toBeOnTheScreen();
    expect(screen.queryByText('League Table')).toBeNull();
    expect(screen.queryByText('Weekly Ranking · Financial Knowledge')).toBeNull();

    // Top 3 medal cards exist
    expect(await screen.findByTestId('medal-card-1')).toBeOnTheScreen();
    expect(screen.getByTestId('medal-card-2')).toBeOnTheScreen();
    expect(screen.getByTestId('medal-card-3')).toBeOnTheScreen();

    // Verify "First L." formatted names
    expect(screen.getByText('Tomasz N.')).toBeOnTheScreen();
    expect(screen.getByText('Ola W.')).toBeOnTheScreen();
    expect(screen.getByText('Marta K.')).toBeOnTheScreen();

    // List from #4 exists
    expect(screen.getByTestId('rankings-list')).toBeOnTheScreen();
    expect(screen.getByTestId('ranking-row-4')).toBeOnTheScreen();
    expect(screen.getByText('Piotr Z.')).toBeOnTheScreen();

    // User is #11, so sticky row is present
    expect(screen.getByTestId('rankings-pinned-me')).toBeOnTheScreen();
  });

  it('highlights your medal card and hides sticky row when you are in top 3', async () => {
    const meInTop3: RankingRow = {
      rank: 2,
      userId: 'demo-user',
      name: 'Alex Weber',
      avatar: 'm1',
      level: 5,
      weeklyXp: 290,
    };
    const topWithMe = [...TOP_PLAYERS];
    topWithMe[1] = meInTop3;

    mockRankingsData = {
      top: topWithMe,
      me: meInTop3,
    };

    await render(<DuelRankingsScreen />);

    expect(await screen.findByTestId('medal-card-2')).toBeOnTheScreen();
    expect(screen.getByText('You · Lv 5')).toBeOnTheScreen();

    // No sticky row should be rendered when in top 3
    expect(screen.queryByTestId('rankings-pinned-me')).toBeNull();
  });

  it('confirms sticky row is displayed with user stats when below the fold at rank 11', async () => {
    mockRankingsData = {
      top: TOP_PLAYERS,
      me: TOP_PLAYERS[10], // rank 11, demo-user
    };

    await render(<DuelRankingsScreen />);

    const stickyWrap = await screen.findByTestId('rankings-pinned-me');
    expect(stickyWrap).toBeOnTheScreen();

    const stickyItem = screen.getByTestId('rankings-sticky-item');
    expect(stickyItem).toBeOnTheScreen();
    expect(stickyItem).toHaveTextContent(/Alex W\./);
    expect(stickyItem).toHaveTextContent(/You · Lv 2/);
    expect(stickyItem).toHaveTextContent(/75 XP/);
    expect(stickyItem).toHaveTextContent(/11/);
  });

  it('ignores duplicate climb when lastXpEventId was already animated in AsyncStorage', async () => {
    // Pre-populate AsyncStorage to simulate already-seen event
    await AsyncStorage.setItem('@duel_climb_event_demo-user', '98765');

    const meClimbing: RankingRow = {
      rank: 6,
      previousRank: 7,
      lastXpEventId: 98765,
      userId: 'demo-user',
      name: 'Alex Weber',
      avatar: 'm1',
      level: 3,
      weeklyXp: 160,
    };

    mockRankingsData = {
      top: TOP_PLAYERS.map((p) => {
        if (p.rank === 6) return meClimbing;
        if (p.rank === 11) return { ...p, userId: 'other-user', name: 'Other User' };
        return p;
      }),
      me: meClimbing,
    };

    await render(<DuelRankingsScreen />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Sound should not have been called because it was already stored
    expect(mockPlaySound).not.toHaveBeenCalled();
    // And user is directly rendered at rank 6
    expect(screen.getByTestId('ranking-row-6')).toHaveTextContent(/Alex W\./);
  });

  it('hides sticky row when row is visible in viewport, and shows sticky row only when scrolled away', async () => {
    // User is rank 5 (which is inside the initial viewport on screen)
    const meAtRank5: RankingRow = {
      rank: 5,
      userId: 'demo-user',
      name: 'Alex Weber',
      avatar: 'm1',
      level: 4,
      weeklyXp: 180,
    };

    mockRankingsData = {
      top: TOP_PLAYERS.map((p) => {
        if (p.rank === 5) return meAtRank5;
        if (p.rank === 11) return { ...p, userId: 'other-user', name: 'Other User' };
        return p;
      }),
      me: meAtRank5,
    };

    await render(<DuelRankingsScreen />);

    // Row #5 is visible in the list
    expect(await screen.findByTestId('ranking-row-5')).toBeOnTheScreen();

    // Since row #5 is visible in viewport at scrollY = 0, sticky row MUST NOT be shown
    expect(screen.queryByTestId('rankings-pinned-me')).toBeNull();

    // Scroll down 500px so row #5 scrolls out of view above the top edge
    const scrollView = screen.getByTestId('rankings-scroll');
    await act(async () => {
      fireEvent.scroll(scrollView, {
        nativeEvent: {
          contentOffset: { y: 500 },
        },
      });
    });

    // Now row #5 is scrolled away outside the visible viewport -> sticky row MUST be shown
    expect(screen.getByTestId('rankings-pinned-me')).toBeOnTheScreen();

    // Scroll back up so row #5 is back in the viewport
    await act(async () => {
      fireEvent.scroll(scrollView, {
        nativeEvent: {
          contentOffset: { y: 0 },
        },
      });
    });

    // Row visible again -> sticky copy disappears
    expect(screen.queryByTestId('rankings-pinned-me')).toBeNull();
  });

  it('animates climb from previousRank to new rank and renders exactly the API order with no missing rows after completion', async () => {
    jest.useFakeTimers();

    // Climb from #6 to #5 (exactly matching QA scenario)
    const meClimbingTo5: RankingRow = {
      rank: 5,
      previousRank: 6,
      lastXpEventId: 98765,
      userId: 'demo-user',
      name: 'Alex Weber',
      avatar: 'm1',
      level: 4,
      weeklyXp: 180,
    };

    const overtakenRow6: RankingRow = {
      rank: 6,
      userId: 'u6',
      name: 'Kasia Kowalska',
      avatar: 'f2',
      level: 3,
      weeklyXp: 150,
    };

    const finalApiTop = TOP_PLAYERS.map((p) => {
      if (p.rank === 4) return { ...p, name: 'Jonas Braun' }; // Row #4 before me
      if (p.rank === 5) return meClimbingTo5; // Me at #5
      if (p.rank === 6) return overtakenRow6; // Overtaken row at #6
      if (p.rank === 11) return { ...p, userId: 'other-user', name: 'Other User' };
      return p;
    });

    mockRankingsData = {
      top: finalApiTop,
      me: meClimbingTo5,
    };

    await render(<DuelRankingsScreen />);

    // Initially at t=0 before climb finishes:
    // Jonas #4 is present
    expect(await screen.findByTestId('rankings-me-row')).toBeOnTheScreen();
    expect(screen.getByTestId('ranking-row-4')).toHaveTextContent(/Jonas B\./);
    // User is rendered visually at previousRank (6)
    expect(screen.getByTestId('ranking-row-6')).toHaveTextContent(/Alex W\./);
    // Kasia is rendered visually at rank 5 (pushed up)
    expect(screen.getByTestId('ranking-row-5')).toHaveTextContent(/Kasia K\./);
    expect(screen.queryByTestId('climb-up-chip')).toBeNull();

    // Advance fake timers by 1.2s to complete climb animation
    await act(async () => {
      jest.advanceTimersByTime(1200);
    });

    // AFTER animation completes:
    // 1. Exactly the API order is rendered:
    // Row #4 is Jonas B. (NOT missing!)
    expect(screen.getByTestId('ranking-row-4')).toHaveTextContent(/Jonas B\./);
    // Row #5 is Alex W. (You, with Up 1 place chip)
    expect(screen.getByTestId('ranking-row-5')).toHaveTextContent(/Alex W\./);
    expect(screen.getByTestId('climb-up-chip')).toHaveTextContent(/Up 1 place/);
    // Row #6 is Kasia K. (Overtaken row settled at 6)
    expect(screen.getByTestId('ranking-row-6')).toHaveTextContent(/Kasia K\./);
    // Row #7 is Krzysztof B.
    expect(screen.getByTestId('ranking-row-7')).toHaveTextContent(/Krzysztof B\./);

    // 2. Sound and haptic fired
    expect(mockPlaySound).toHaveBeenCalledWith('rank-up');
    expect(mockHaptic).toHaveBeenCalledWith('light');

    // 3. Check AsyncStorage recorded the event
    const stored = await AsyncStorage.getItem('@duel_climb_event_demo-user');
    expect(stored).toBe('98765');
  });
});
