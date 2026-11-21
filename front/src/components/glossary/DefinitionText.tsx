import { StyleSheet, Text } from 'react-native';

import { colors, fonts, type } from '@/constants/theme';
import { parseDefinition } from '@/lib/glossaryMarkup';

type Props = {
  text: string;
  onOpenTerm: (slug: string) => void;
};

/** Renders a definition; every [[slug|text]] marker becomes an underlined link to that term. */
export function DefinitionText({ text, onOpenTerm }: Props) {
  return (
    <Text style={styles.text} testID="definition-text">
      {parseDefinition(text).map((segment, i) =>
        segment.type === 'text' ? (
          segment.value
        ) : (
          <Text
            key={i}
            testID={`definition-link-${segment.slug}`}
            accessibilityRole="link"
            onPress={() => onOpenTerm(segment.slug)}
            style={styles.link}
          >
            {segment.label}
          </Text>
        ),
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: type.bodyReading,
  link: { fontFamily: fonts.semiBold, color: colors.globeOceanLight, textDecorationLine: 'underline' },
});
