import { StyleSheet } from 'react-native';

import { colors, elevation, radii, spacing, type } from '@/constants/theme';

/** Frame shared by every duel question type: the column, its prompt and the white input card. */
export const questionStyles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  prompt: {
    ...type.titleSection,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  card: {
    gap: spacing.sm,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    ...elevation.low,
  },
  cardLabel: {
    ...type.overline,
    color: colors.textMuted,
  },
  submit: {
    marginTop: spacing.md,
  },
});
