import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text, View } from 'react-native';

import { IconTile, type } from '@/components/onboarding/ui';
import type { IconName } from '@/constants/onboarding';
import { GLYPH } from '@/constants/path';
import * as theme from '@/constants/theme';
import { colors, radii, spacing } from '@/constants/theme';

type Props = {
  /** What the account shows in plain words. */
  facts: string[];
};

function Lines({ title, lines, icon, color, testID }: { title: string; lines: string[]; icon: IconName; color: string; testID: string }) {
  return (
    <View style={styles.card} testID={testID}>
      <Text style={type.strong}>{title}</Text>
      {lines.map((line) => (
        <View key={line} style={styles.line}>
          <Feather name={icon} size={GLYPH} color={color} />
          <Text style={styles.lineText}>{line}</Text>
        </View>
      ))}
    </View>
  );
}

/** The one consent screen: what the account already shows, and the notice of what is shared and kept. */
export function ConsentCard({ facts }: Props) {
  return (
    <>
      <IconTile icon="lock" active />
      <Text style={type.display} accessibilityRole="header">
        Your path starts from your account
      </Text>
      <Text style={type.body}>
        Atlas reads a few summaries from your account to build your learning path. Learn needs them to work.
      </Text>
      <Lines title="Your account already shows" lines={facts} icon="check" color={colors.feedbackSuccess} testID="consent-facts" />
      <Text style={type.label} testID="consent-notice">
        Your answers, the topics you pick and ranges from your accounts are checked by an external AI provider to pick
        your first lesson. Exact account numbers never leave this phone. We keep the result, your topics and the ranges.
        Your choices are checked by an AI service.
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.mdPlus,
    gap: spacing.sm,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  lineText: { ...theme.type.bodyDefault, flex: 1 },
});
