import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors, elevation, fonts, radii, type } from '@/constants/theme';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
};

/** Pill-shaped search input; petrol border while focused, round clear button once there is text. */
export function SearchField({ value, onChangeText }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.field, focused && styles.focused]}>
      <Feather name="search" size={20} color={colors.textPrimary} />
      <TextInput
        testID="search-input"
        accessibilityLabel="Search terms"
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search terms, e.g. “ETF” or “inflation”"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        maxLength={64}
        style={styles.input}
      />
      {value !== '' && (
        <Pressable
          testID="search-clear"
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={() => onChangeText('')}
          hitSlop={10}
          style={styles.clear}
        >
          <Feather name="x" size={14} color={colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    ...elevation.low,
  },
  focused: { borderWidth: 2, borderColor: colors.brandPrimary, paddingHorizontal: 15 },
  // outlineStyle removes the browser's default focus ring on web; the petrol border replaces it.
  input: { flex: 1, ...type.titleCard, fontFamily: fonts.medium, color: colors.textPrimary, outlineStyle: 'none' } as object,
  clear: { width: 24, height: 24, borderRadius: radii.pill, backgroundColor: colors.bgTint, alignItems: 'center', justifyContent: 'center' },
});
