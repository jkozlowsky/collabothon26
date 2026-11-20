import { StyleSheet, Text, View } from 'react-native';

import { categoryStyle } from '@/constants/glossary';
import { radii, spacing, type } from '@/constants/theme';

export function CategoryPill({ slug, name }: { slug: string; name: string }) {
  const style = categoryStyle(slug);
  return (
    <View style={[styles.pill, { backgroundColor: style.tint }]}>
      <Text style={[type.overline, { color: style.color }]}>{name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radii.pill },
});
