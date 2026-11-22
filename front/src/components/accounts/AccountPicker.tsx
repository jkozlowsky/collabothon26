import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { CommerzbankLogo } from '@/components/bank/CommerzbankLogo';
import { Icon } from '@/components/bank/Icon';
import { Avatar } from '@/components/profile/Avatar';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import {
  fetchDemoAccounts,
  getDeviceId,
  type DemoAccount,
} from '@/lib/session';
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

  const loadAccounts = useCallback(() => {
    setLoading(true);
    setError(null);
    setRefreshKey((k) => k + 1);
  }, []);

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
            {accounts.map((acc) => {
              const inUse = acc.status === 'in-use';
              const isSelected = pickingId === acc.userId;

              return (
                <Pressable
                  key={acc.userId}
                  testID={`account-${acc.userId}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${acc.firstName} ${acc.lastName}${inUse ? ', in use' : ''}`}
                  accessibilityState={{ disabled: inUse || Boolean(pickingId) }}
                  aria-disabled={inUse}
                  disabled={inUse || Boolean(pickingId)}
                  onPress={() => handleSelect(acc)}
                  style={({ pressed }) => [
                    styles.card,
                    inUse ? styles.cardInUse : styles.cardActive,
                    pressed && !inUse && styles.cardPressed,
                  ]}
                >
                  <View style={[styles.cardContent, inUse && styles.contentInUse]}>
                    <Avatar id={acc.avatar} size={52} />
                    <Text style={styles.cardName} numberOfLines={1}>
                      {acc.firstName} {acc.lastName}
                    </Text>
                  </View>
                  {inUse ? (
                    <View
                      style={styles.inUsePill}
                      testID={`account-${acc.userId}-in-use`}
                    >
                      <Icon name="lock" size={14} color={colors.textMuted} />
                      <Text style={styles.inUseText}>In use</Text>
                    </View>
                  ) : isSelected ? (
                    <ActivityIndicator size="small" color={colors.brandPrimary} />
                  ) : (
                    <Icon name="chevron-right" size={20} color={colors.textMuted} />
                  )}
                </Pressable>
              );
            })}
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
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  content: {
    paddingTop: 48,
    gap: 28,
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  headerText: {
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
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
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
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
    marginBottom: 4,
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
    marginBottom: 4,
  },
  errorButtonWrapper: {
    width: '100%',
  },
  list: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgSurface,
    borderRadius: 20,
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 16,
    gap: 14,
  },
  cardActive: {
    ...elevation.low,
  },
  cardInUse: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  cardPressed: {
    backgroundColor: colors.brandPrimarySoft,
    transform: [{ scale: 0.99 }],
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  contentInUse: {
    opacity: 0.45,
  },
  cardName: {
    ...type.titleCard,
    color: colors.textPrimary,
    flex: 1,
  },
  inUsePill: {
    backgroundColor: colors.borderDefault,
    borderRadius: radii.pill,
    paddingVertical: 4,
    paddingLeft: 8,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inUseText: {
    ...type.labelStrong,
    color: colors.textMuted,
  },
  footnote: {
    ...type.labelDefault,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 34,
  },
});
