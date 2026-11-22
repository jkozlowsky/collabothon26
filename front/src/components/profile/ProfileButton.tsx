import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Sheet } from '@/components/bank/Sheet';
import { Button } from '@/components/Button';
import { Tappable } from '@/components/onboarding/ui';
import { Avatar, DEFAULT_AVATAR } from '@/components/profile/Avatar';
import { colors, spacing, type } from '@/constants/theme';
import { useAccount } from '@/hooks/useAccount';
import { useBank } from '@/hooks/useBank';
import { useCurrentUser } from '@/lib/user';

/** The user's avatar in the bank header; opens a bottom sheet with the full name and Log out. */
export function ProfileButton() {
  const { account } = useAccount();
  const { state } = useBank();
  const { logOut } = useCurrentUser();
  const [sheetOpen, setSheetOpen] = useState(false);

  const fullName = account ? `${account.firstName} ${account.lastName}` : state.owner.name;
  const avatar = account?.avatar ?? DEFAULT_AVATAR;

  const handleLogout = async () => {
    setSheetOpen(false);
    await logOut();
  };

  return (
    <>
      <Tappable
        onPress={() => setSheetOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Your account"
        pressedScale={0.92}
        hitSlop={6}
        testID="bank-avatar"
      >
        <Avatar id={avatar} size={40} />
      </Tappable>

      <Sheet visible={sheetOpen} onClose={() => setSheetOpen(false)}>
        <View style={styles.sheetContent}>
          <View style={styles.ownerRow}>
            <Avatar id={avatar} size={56} />
            <View style={styles.ownerInfo}>
              <Text style={styles.userName} testID="bank-sheet-name" numberOfLines={1}>
                {fullName}
              </Text>
              <Text style={styles.userRole}>Demo account</Text>
            </View>
          </View>
          <View style={styles.buttonWrapper}>
            <Button
              label="Log out"
              variant="primary"
              onPress={handleLogout}
              testID="bank-logout"
            />
          </View>
          <Text style={styles.note}>Your progress stays saved on this account.</Text>
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  sheetContent: {
    gap: spacing.lg,
    paddingTop: 6,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.mdPlus,
    alignSelf: 'stretch',
  },
  ownerInfo: {
    flex: 1,
    gap: spacing.xxs,
  },
  userName: {
    ...type.titleSection,
    color: colors.textPrimary,
  },
  userRole: {
    ...type.labelDefault,
    color: colors.textMuted,
  },
  buttonWrapper: {
    width: '100%',
    alignSelf: 'stretch',
  },
  note: {
    ...type.labelDefault,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
