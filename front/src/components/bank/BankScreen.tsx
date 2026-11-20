import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, nav, spacing, type } from '@/constants/theme';

type Props = {
  /** Large page title (Payments, Credits, Invest). Omit when the screen draws its own header. */
  title?: string;
  /** Round buttons right of the title. */
  actions?: ReactNode;
  children: ReactNode;
  testID?: string;
};

/** Scrolling bank page: 20 px sides, 24 px between sections, room at the bottom for the floating nav. */
export function BankScreen({ title, actions, children, testID }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']} testID={testID}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgCanvas },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: nav.clearance + spacing.xl, gap: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: -spacing.sm },
  title: type.displayLarge,
});
