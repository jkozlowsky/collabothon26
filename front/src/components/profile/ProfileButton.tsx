import { Tappable } from '@/components/onboarding/ui';
import { Avatar } from '@/components/profile/Avatar';
import { useAccount } from '@/hooks/useAccount';
import { useOpenLearn } from '@/hooks/useOpenLearn';

/** The user's avatar in the bank header; opens the Atlas profile (onboarding first, the first time). */
export function ProfileButton() {
  const { account } = useAccount();
  const openLearn = useOpenLearn();
  return (
    <Tappable
      onPress={() => openLearn('/profile')}
      accessibilityRole="button"
      accessibilityLabel="Your profile"
      pressedScale={0.92}
      hitSlop={6}
      testID="bank-avatar"
    >
      <Avatar id={account?.avatar ?? 'm1'} size={40} />
    </Tappable>
  );
}
