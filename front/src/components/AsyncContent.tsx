import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { colors, spacing } from '@/constants/theme';

type Props = {
  loading: boolean;
  error?: Error;
  onRetry: () => void;
  children: () => ReactNode;
};

/** Loading / error / content switch for screens backed by useApi. */
export function AsyncContent({ loading, error, onRetry, children }: Props) {
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Can&apos;t reach the backend</Text>
        <Text style={styles.detail}>{error.message}</Text>
        <Button label="Try again" onPress={onRetry} />
      </View>
    );
  }
  return <>{children()}</>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.sm },
  title: { fontSize: 17, fontWeight: '600', color: colors.text, textAlign: 'center' },
  detail: { color: colors.muted, textAlign: 'center', marginBottom: spacing.sm },
});
