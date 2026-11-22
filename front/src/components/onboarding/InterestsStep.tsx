import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ChoiceChip } from '@/components/onboarding/ChoiceChip';
import { BackButton } from '@/components/onboarding/HeaderButtons';
import { Page } from '@/components/onboarding/Page';
import { BigButton, type } from '@/components/onboarding/ui';
import { colors, spacing } from '@/constants/theme';
import { useApi } from '@/hooks/useApi';
import { useCurrentUser } from '@/lib/user';
import type { StoryPage } from '@/types/stories';

type Props = {
  /** Story ids already picked; one id selects its whole area, ids with no chip are ignored. */
  initial?: string[];
  onBack: () => void;
  onDone: (interests: string[]) => void;
};

const areaOf = (story: StoryPage) => story.area ?? story.category;
const slugOf = (area: string) => area.toLowerCase().replace(/[^a-z0-9]+/g, '-');

/** "What would you like to learn?": one chip per map area, saved as that area's story ids, plus an exclusive "Not sure yet". */
export function InterestsStep({ initial, onBack, onDone }: Props) {
  const { userId } = useCurrentUser();
  const { data, error, reload } = useApi<StoryPage[]>(`/api/stories?userId=${encodeURIComponent(userId)}`);
  // undefined = nothing picked yet; [] = "Not sure yet".
  const [picked, setPicked] = useState(initial);

  const paths = data?.filter((s) => s.status === 'available');
  const areas = [...new Set(paths?.map(areaOf))];
  const chosen = [...new Set(picked?.flatMap((id) => paths?.filter((s) => s.id === id).map(areaOf) ?? []))];
  const notSure = picked?.length === 0;

  const idsOf = (picks: string[]) =>
    picks.flatMap((area) => paths?.filter((s) => areaOf(s) === area).map((s) => s.id) ?? []);
  const toggle = (area: string) => {
    const next = chosen.includes(area) ? chosen.filter((x) => x !== area) : [...chosen, area];
    setPicked(next.length ? idsOf(next) : undefined);
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
          onPress={() => onDone(idsOf(chosen))}
          disabled={!paths || (!notSure && chosen.length === 0)}
          testID="onboarding-continue"
        />
      }
    >
      <Text style={type.display} accessibilityRole="header">
        What would you like to learn?
      </Text>
      <Text style={type.body}>Pick every topic that is new to you. We&apos;ll build your path around them.</Text>
      {error ? (
        <View style={styles.status}>
          <Text style={type.body}>We could not load the topics.</Text>
          <BigButton label="Retry" onPress={reload} testID="interests-retry" />
          <BigButton label="Skip" variant="ghost" onPress={() => onDone([])} testID="interests-skip" />
        </View>
      ) : !paths ? (
        <View style={styles.status}>
          <ActivityIndicator color={colors.brandPrimary} accessibilityLabel="Loading the topics" testID="interests-loading" />
        </View>
      ) : (
        <>
          <View style={styles.chips}>
            {areas.map((area) => (
              <ChoiceChip
                key={area}
                testID={`interest-${slugOf(area)}`}
                label={area}
                selected={chosen.includes(area)}
                onPress={() => toggle(area)}
              />
            ))}
            <ChoiceChip
              testID="interest-not-sure"
              label="Not sure yet"
              selected={notSure}
              onPress={() => setPicked(notSure ? undefined : [])}
            />
          </View>
          {chosen.length > 0 && (
            <View style={styles.count} accessibilityLiveRegion="polite" testID="interests-count">
              <Feather name="check" size={spacing.lg} color={colors.feedbackSuccess} />
              <Text style={[type.strong, styles.countText]}>{chosen.length} selected</Text>
            </View>
          )}
        </>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  status: { gap: spacing.smPlus, marginTop: spacing.lg },
  // Rows look 10 apart: each chip's touch target is already taller than its pill.
  chips: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.sm, rowGap: spacing.xs, marginTop: spacing.md },
  count: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  countText: { color: colors.feedbackSuccess },
});
