import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { createAudioPlayer } from 'expo-audio';

export type SoundEffect = 'correct' | 'wrong' | 'win' | 'level-up' | 'rank-up' | 'firework';
export type HapticKind = 'success' | 'error' | 'light';

const SOUND_ASSETS: Record<SoundEffect, number> = {
  correct: require('../../../assets/sounds/correct.wav'),
  wrong: require('../../../assets/sounds/wrong.wav'),
  win: require('../../../assets/sounds/win.wav'),
  'level-up': require('../../../assets/sounds/level-up.wav'),
  'rank-up': require('../../../assets/sounds/rank-up.wav'),
  firework: require('../../../assets/sounds/firework.wav'),
};

type AudioPlayerInstance = {
  play: () => void;
  seekTo?: (seconds: number) => Promise<unknown> | void;
};

const players = new Map<SoundEffect, AudioPlayerInstance>();
let preloaded = false;

function ensurePreloaded(): void {
  if (preloaded) return;
  preloaded = true;
  for (const [name, asset] of Object.entries(SOUND_ASSETS) as [SoundEffect, number][]) {
    try {
      const player = createAudioPlayer(asset);
      players.set(name, player);
    } catch {
      // Ignore preload errors on web or unsupported platforms
    }
  }
}

/**
 * Play a short sound effect. Preloads players on first use.
 * Never throws, safe on web and during unit tests.
 */
export function playSound(name: SoundEffect): void {
  try {
    ensurePreloaded();
    const player = players.get(name);
    if (player) {
      if (typeof player.seekTo === 'function') {
        const res = player.seekTo(0);
        if (res && typeof (res as Promise<unknown>).catch === 'function') {
          (res as Promise<unknown>).catch(() => {});
        }
      }
      player.play();
    }
  } catch {
    // Never throw
  }
}

/**
 * Trigger haptic vibration.
 * Safe on web (no-op) and during unit tests.
 */
export function haptic(kind: HapticKind): void {
  if (Platform.OS === 'web') return;
  try {
    let p: Promise<void> | undefined;
    if (kind === 'success') {
      p = Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (kind === 'error') {
      p = Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else if (kind === 'light') {
      p = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    p?.catch(() => {});
  } catch {
    // Never throw
  }
}
