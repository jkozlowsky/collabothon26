import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

/** Same key as useSceneMuted: one sound switch for narration and answer sounds. */
export const SOUND_MUTED_KEY = 'financequest.sceneMuted';

const SOURCES = {
  correct: require('../../assets/sounds/correct.mp3'),
  wrong: require('../../assets/sounds/wrong.mp3'),
};
type Sfx = keyof typeof SOURCES;

const players: Partial<Record<Sfx, AudioPlayer>> = {};
let muted: boolean | null = null;

/** Called by useSceneMuted so a toggle applies at once. */
export function setSfxMuted(next: boolean) {
  muted = next;
}

function player(name: Sfx) {
  players[name] ??= createAudioPlayer(SOURCES[name]);
  return players[name];
}

/** Answer feedback sound. A bonus on top of the visual: never awaited, never allowed to throw. */
export function playSfx(name: Sfx) {
  void (async () => {
    try {
      if (muted === null) muted = (await AsyncStorage.getItem(SOUND_MUTED_KEY)) === '1';
      if (muted) return;
      const p = player(name);
      await p.seekTo(0);
      p.play();
    } catch {
      // No sound is fine; the colour and icon already say right or wrong.
    }
  })();
}

/** Loads both files early so the first answer is not late. */
export function preloadSfx() {
  try {
    player('correct');
    player('wrong');
  } catch {}
}
