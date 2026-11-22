import { useMemo, useRef, type ComponentRef, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, nav, spacing, type } from '@/constants/theme';
import { BankScrollContext } from '@/hooks/useBankScroll';

type Props = {
  /** Large page title (Payments, Credits, Invest). Omit when the screen draws its own header. */
  title?: string;
  /** Round buttons right of the title. */
  actions?: ReactNode;
  /** Floats over the page and does not scroll with it (the Atlas popup). */
  overlay?: ReactNode;
  children: ReactNode;
  testID?: string;
};

/** Scrolling bank page: 20 px sides, 24 px between sections, room at the bottom for the floating nav. */
export function BankScreen({ title, actions, overlay, children, testID }: Props) {
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const offset = useRef(0);
  const scroll = useMemo(
    () => ({ scrollBy: (dy: number) => scrollRef.current?.scrollTo({ y: Math.max(0, offset.current + dy), animated: true }) }),
    [],
  );
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']} testID={testID}>
      <BankScrollContext.Provider value={scroll}>
        <ScrollView
          ref={scrollRef}
          onScroll={(e) => {
            offset.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={32}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {title && (
            <View style={styles.header}>
              <Text style={styles.title} accessibilityRole="header">
                {title}
              </Text>
              {actions}
            </View>
          )}
          {children}
        </ScrollView>
      </BankScrollContext.Provider>
      {overlay}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgCanvas },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: nav.clearance + spacing.xl, gap: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: -spacing.sm },
  title: type.displayLarge,
});
