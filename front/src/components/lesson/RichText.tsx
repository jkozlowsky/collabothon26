import { createContext, useContext } from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { colors, fonts } from '@/constants/theme';

/** Opens the glossary sheet for a concept key. Provided by the lesson player, so steps need no prop for it. */
export const ConceptLinkContext = createContext<(key: string) => void>(() => {});

type Props = { text: string; style?: StyleProp<TextStyle>; testID?: string };

// **bold** and [[concept]] / [[concept|shown text]]
const TOKEN = /(\*\*[^*]+\*\*|\[\[[a-z0-9-]+(?:\|[^\]]*)?\]\])/g;

/** Lesson text with **bold** and tappable glossary links. */
export function RichText({ text, style, testID }: Props) {
  const openConcept = useContext(ConceptLinkContext);
  return (
    <Text style={style} testID={testID}>
      {text.split(TOKEN).map((part, i) => {
        if (part.startsWith('**')) {
          return (
            <Text key={i} style={styles.bold}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        if (part.startsWith('[[')) {
          const [key, shown] = part.slice(2, -2).split('|');
          return (
            <Text
              key={i}
              style={styles.link}
              onPress={() => openConcept(key)}
              accessibilityRole="link"
              accessibilityHint="Opens the definition"
              testID={`concept-${key}`}
            >
              {shown ?? key.replace(/-/g, ' ')}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  bold: { fontFamily: fonts.semiBold },
  // Dotted underline marks a glossary word without competing with the yellow primary action.
  link: {
    fontFamily: fonts.semiBold,
    color: colors.brandPrimary,
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
  },
});
