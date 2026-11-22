import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { AccountCard } from '@/components/accounts/AccountCard';
import { CommerzbankLogo } from '@/components/bank/CommerzbankLogo';
import { Icon } from '@/components/bank/Icon';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { fetchDemoAccounts, getDeviceId, type DemoAccount } from '@/lib/session';
import { useCurrentUser } from '@/lib/user';

type Props = {
  notice?: string | null;
  onSelect?: (userId: string) => Promise<void> | void;
};

export function AccountPicker({ notice, onSelect }: Props) {
  const { chooseUser, conflictNotice, clearConflictNotice } = useCurrentUser();
  const [accounts, setAccounts] = useState<DemoAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pickingId, setPickingId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const displayNotice = notice ?? conflictNotice;

  useEffect(() => {
    let cancelled = false;
    getDeviceId()
      .then((id) => fetchDemoAccounts(id))
      .then(
        (list) => {
          if (!cancelled) {
            setAccounts(list);
            setError(null);
            setLoading(false);
          }
        },
        (e: unknown) => {
          if (!cancelled) {
            setError(e instanceof Error ? e.message : 'Could not load demo accounts');
            setLoading(false);
          }
        },
      );
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  function loadAccounts() {
    setLoading(true);
    setError(null);
    setRefreshKey((k) => k + 1);
  }

  const handleSelect = async (account: DemoAccount) => {
    if (account.status === 'in-use' || pickingId) return;
    clearConflictNotice();
    setPickingId(account.userId);
    try {
      if (onSelect) {
        await onSelect(account.userId);
      } else {
        await chooseUser(account.userId);
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        // Race condition: another device claimed this account just now. Refresh list.
        loadAccounts();
      } else {
        setError(e instanceof Error ? e.message : 'Could not select account');
      }
    } finally {
      setPickingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} testID="account-picker">
      <View style={styles.content}>
        <View style={styles.header}>
          <CommerzbankLogo height={40} />
          <View style={styles.headerText}>
            <Text style={styles.title}>Pick a demo account</Text>
            <Text style={styles.subtitle}>
              Each account has its own bank data and learning path.
            </Text>
          </View>
        </View>

        {displayNotice && (
          <View style={styles.noticeBanner} testID="conflict-notice">
            <Text style={styles.noticeText}>{displayNotice}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.centered} testID="account-picker-loading">
            <ActivityIndicator size="large" color={colors.brandPrimary} />
          </View>
        ) : error ? (
          <View style={styles.errorCard} testID="account-picker-error">
            <View style={styles.errorIconTile}>
              <Icon name="wifi-off" size={26} color={colors.feedbackDanger} />
            </View>
            <Text style={styles.errorTitle}>{"Can't reach the demo server"}</Text>
            <Text style={styles.errorMessage}>
              Check your connection and try again.
            </Text>
            <View style={styles.errorButtonWrapper}>
              <Button
                label="Retry"
                variant="primary"
                onPress={loadAccounts}
                testID="account-picker-retry"
              />
            </View>
          </View>
        ) : (
          <View style={styles.list}>
            {accounts.map((acc) => (
              <AccountCard
                key={acc.userId}
                account={acc}
                picking={pickingId === acc.userId}
                busy={Boolean(pickingId)}
                onPress={() => handleSelect(acc)}
              />
            ))}
          </View>
        )}
      </View>

      <Text style={styles.footnote}>
        Demo data only. No real accounts or money.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgCanvas,
    paddingHorizontal: spacing.xxl,
    justifyContent: 'space-between',
  },
  content: {
    paddingTop: 48,
    gap: 28,
  },
  header: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerText: {
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  title: {
    ...type.displayLarge,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...type.bodyDefault,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
  noticeBanner: {
    backgroundColor: colors.brandAccentSoft,
    borderColor: colors.brandAccent,
    borderWidth: 1,
    borderRadius: radii.card,
    padding: spacing.md,
  },
  noticeText: {
    ...type.labelStrong,
    color: colors.brandPrimary,
    textAlign: 'center',
  },
  centered: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: 20,
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
    ...elevation.low,
  },
  errorIconTile: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.feedbackDangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  errorTitle: {
    ...type.titleCard,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  errorMessage: {
    ...type.bodyDefault,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  errorButtonWrapper: {
    width: '100%',
  },
  list: {
    gap: spacing.md,
  },
  footnote: {
    ...type.labelDefault,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 34,
  },
});
