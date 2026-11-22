import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, type ComponentRef, type ReactNode } from 'react';
import { useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';

import { nav } from '@/constants/theme';
import { useBankScroll } from '@/hooks/useBankScroll';
import { useSpotlightIfAny } from '@/hooks/useSpotlight';
import type { SpotId } from '@/types/spotlight';

type Props = { id: SpotId; children: ReactNode; style?: StyleProp<ViewStyle> };

/** Wait for the tab switch to settle, and then for the scroll to settle, before measuring. */
const SETTLE_MS = 450;
const TOP_ROOM = 140;
/** Re-measure this often until the box stops moving, for at most MAX_TRIES × POLL_MS. */
const POLL_MS = 120;
const MAX_TRIES = 25;

/** Marks a bank feature the spotlight can point at. When its spot is shown, it scrolls into view and reports its box. */
export function SpotTarget({ id, children, style }: Props) {
  const ref = useRef<ComponentRef<typeof View>>(null);
  const spotlight = useSpotlightIfAny();
  const scroll = useBankScroll();
  const { height } = useWindowDimensions();
  const active = spotlight?.active?.id === id;
  const setRect = spotlight?.setRect;
  const close = spotlight?.close;

  useEffect(() => {
    if (!active || !setRect) return;
    // measureInWindow answers later, so its callback can arrive after cleanup; then it must not start a timer or report a box.
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const measure = (then: (y: number, h: number) => void) =>
      ref.current?.measureInWindow((x, y, width, h) => {
        if (!cancelled && width && h) then(y, h);
      });
    // A smooth scroll can take longer than any fixed wait, so report the box once it stops moving.
    const settle = (last: string | null, tries: number) => {
      ref.current?.measureInWindow((x, y, width, h) => {
        if (cancelled) return;
        const box = `${x},${y},${width},${h}`;
        if (box === last || tries >= MAX_TRIES) setRect({ x, y, width, height: h });
        else timer = setTimeout(() => settle(box, tries + 1), POLL_MS);
      });
    };
    timer = setTimeout(() => {
      measure((y, h) => {
        const visible = y >= TOP_ROOM / 2 && y + h <= height - nav.clearance;
        if (!visible) scroll?.scrollBy(y - TOP_ROOM);
        timer = setTimeout(() => settle(null, 0), POLL_MS);
      });
    }, SETTLE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [active, setRect, scroll, height]);

  // Leaving the tab ends the spotlight: the hole would point at nothing.
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (active) close?.();
      };
    }, [active, close]),
  );

  return (
    <View
      ref={ref}
      collapsable={false}
      style={style}
      // Using the feature ends the spotlight; the touch still reaches it.
      onTouchEnd={active ? close : undefined}
      onPointerUp={active ? close : undefined}
    >
      {children}
    </View>
  );
}
