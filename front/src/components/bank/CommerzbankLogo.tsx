import { Image } from 'react-native';

/** Commerzbank ribbon emblem (no wordmark), cropped from the team's PNG. Demo only: it is a trademark. */
const EMBLEM = require('../../../assets/images/commerzbank-emblem.png');
const ASPECT = 222 / 192;

export function CommerzbankLogo({ height }: { height: number }) {
  return (
    <Image
      source={EMBLEM}
      style={{ height, width: height * ASPECT }}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="Commerzbank"
    />
  );
}
