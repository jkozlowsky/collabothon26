import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Page } from '@/components/onboarding/Page';
import { BackButton, BigButton, OptionCard, type } from '@/components/onboarding/ui';
import { colors, spacing } from '@/constants/theme';
import { useApi } from '@/hooks/useApi';
import { useCurrentUser } from '@/lib/user';
import type { StoryPage } from '@/types/stories';

type Props = {
  /** Story ids already picked; ids with no tile are ignored. */
  initial?: string[];
  onBack: () => void;
  onDone: (interests: string[]) => void;
};

/** "What would you like to learn?": one tile per available path, multi-select, plus an exclusive "Not sure yet". */
export function InterestsStep({ initial, onBack, onDone }: Props) {
  const { userId } = useCurrentUser();
  const { data, error, reload } = useApi<StoryPage[]>(`/api/stories?userId=${encodeURIComponent(userId)}`);
  // undefined = nothing picked yet; [] = "Not sure yet".
  const [picked, setPicked] = useState(initial);

  const paths = data?.filter((s) => s.status === 'available');
  const chosen = picked?.filter((id) => paths?.some((s) => s.id === id)) ?? [];
  const notSure = picked?.length === 0;

  const toggle = (id: string) => {
    const next = chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id];
    setPicked(next.length ? next : undefined);
  };

  return (
    <Page
      testID="onboarding-interests"
      header={
        <View style={styles.row}>
          <BackButton onPress={onBack} />
        </View>
      }
      footer={
        <BigButton
          label="Continue"
          onPress={() => onDone(chosen)}
          disabled={!paths || (!notSure && chosen.length === 0)}
          testID="onboarding-continue"
        />
      }
    >
      <Text style={type.display} accessibilityRole="header">
        What would you like to learn?
      </Text>
      <Text style={type.body}>Pick every topic that is new to you.</Text>
      <View style={styles.answers}>
        {error ? (
          <>
            <Text style={type.body}>We could not load the topics.</Text>
            <BigButton label="Retry" onPress={reload} testID="interests-retry" />
            <BigButton label="Skip" variant="ghost" onPress={() => onDone([])} testID="interests-skip" />
          </>
        ) : !paths ? (
          <ActivityIndicator color={colors.brandPrimary} accessibilityLabel="Loading the topics" testID="interests-loading" />
        ) : (
          <>
            {paths.map((s) => (
              <OptionCard
                key={s.id}
                testID={`interest-${s.id}`}
                role="checkbox"
                title={s.category}
                subtitle={s.topic}
                icon={s.icon}
                selected={chosen.includes(s.id)}
                onPress={() => toggle(s.id)}
              />
            ))}
            <OptionCard
              testID="interest-not-sure"
              role="checkbox"
              title="Not sure yet"
              subtitle="Atlas picks a starting point for you"
              icon="help-circle"
              selected={notSure}
              onPress={() => setPicked(notSure ? undefined : [])}
            />
          </>
        )}
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  answers: { gap: spacing.smPlus, marginTop: spacing.lg },
});
