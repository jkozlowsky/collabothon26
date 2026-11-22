import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { setSfxMuted, SOUND_MUTED_KEY } from '@/lib/sfx';

/** Sound mute (scene narration and answer sounds), remembered on the device (not in the profile). Sound is on by default. */
export function useSceneMuted() {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(SOUND_MUTED_KEY).then(
      (stored) => {
        if (!cancelled && stored !== null) setMuted(stored === '1');
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const set = useCallback((next: boolean) => {
    setMuted(next);
    setSfxMuted(next);
    AsyncStorage.setItem(SOUND_MUTED_KEY, next ? '1' : '0').catch(() => {});
  }, []);

  return [muted, set] as const;
}
