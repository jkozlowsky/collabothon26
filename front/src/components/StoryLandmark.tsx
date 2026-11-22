import { StyleSheet, View } from 'react-native';

import { radii } from '@/constants/theme';
import type { LandmarkKind } from '@/types/stories';

type Props = { kind: LandmarkKind; at: number; color: string };

/** Building heights for the hero skyline, derived from the city name so every city gets its own, stable outline. */
export function skyline(city: string) {
  let seed = [...city].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return Array.from({ length: 16 }, () => {
    seed = (seed * 1103515245 + 12345) >>> 0;
    return 40 + (seed % 70);
  });
}

/** A city's landmark silhouette over the story hero skyline, in the story tint. */
export function StoryLandmark({ kind, at, color }: Props) {
  const fill = { backgroundColor: color };
  return (
    <View pointerEvents="none" style={[styles.anchor, { left: `${at * 100}%` }]}>
      {kind === 'tower' ? (
        // A broadcast tower: mast with an observation deck.
        <View style={[styles.mast, fill]}>
          <View style={[styles.deck, fill]} />
        </View>
      ) : kind === 'lattice' ? (
        // A lattice tower: tiers that narrow towards the top, with a spire and one observation deck.
        <View style={styles.lattice}>
          <View style={[styles.spire, fill]} />
          {[10, 16, 24, 34, 46].map((width, i) => (
            <View key={width} style={[styles.tier, fill, { width }, i === 2 && styles.latticeDeck]} />
          ))}
          <View style={styles.legs}>
            <View style={[styles.leg, fill]} />
            <View style={[styles.leg, fill]} />
          </View>
        </View>
      ) : kind === 'raised' ? (
        // A raised block: a long box held up by two frames, with an open plaza underneath.
        <View style={styles.raised}>
          <View style={[styles.box, fill]} />
          <View style={styles.frames}>
            <View style={[styles.frame, fill]} />
            <View style={[styles.frame, fill]} />
          </View>
        </View>
      ) : (
        // A columned gate: roof block, beam and six columns.
        <View style={styles.gate}>
          <View style={[styles.roof, fill]} />
          <View style={[styles.beam, fill]} />
          <View style={styles.columns}>
            {Array.from({ length: 6 }, (_, i) => (
              <View key={i} style={[styles.column, fill]} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'absolute', bottom: 0, alignItems: 'center' },
  mast: { width: 4, height: 128 },
  deck: { position: 'absolute', top: 24, left: -8, width: 20, height: 10, borderRadius: radii.pill },
  gate: { width: 72, alignItems: 'center' },
  roof: { width: 24, height: 10, borderTopLeftRadius: radii.bar, borderTopRightRadius: radii.bar },
  beam: { width: 72, height: 12 },
  columns: { width: 64, height: 50, flexDirection: 'row', justifyContent: 'space-between' },
  column: { width: 6, height: 50 },
  lattice: { alignItems: 'center' },
  spire: { width: 3, height: 26 },
  tier: { height: 14, borderTopLeftRadius: radii.bar, borderTopRightRadius: radii.bar },
  latticeDeck: { height: 10, marginVertical: 2 },
  legs: { width: 58, height: 22, flexDirection: 'row', justifyContent: 'space-between' },
  leg: { width: 12, height: 22 },
  raised: { width: 96, alignItems: 'center' },
  box: { width: 96, height: 30, borderRadius: radii.bar },
  frames: { width: 96, height: 30, flexDirection: 'row', justifyContent: 'space-between' },
  frame: { width: 8, height: 30 },
});
