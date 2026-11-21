import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { setSfxMuted, SOUND_MUTED_KEY } from '@/lib/sfx';

const KEY = SOUND_MUTED_KEY;

/** Sound mute (scene narration and answer sounds), remembered on the device (not in the profile). Sound is on by default. */
export function useSceneMuted() {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(KEY).then(
      (v) => !cancelled && v !== null && setMuted(v === '1'),
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const set = useCallback((next: boolean) => {
    setMuted(next);
    setSfxMuted(next);
    AsyncStorage.setItem(KEY, next ? '1' : '0').catch(() => {});
  }, []);

  return [muted, set] as const;
}
