// Jest stand-in for react-native-reanimated. Reanimated 4's own mock initialises the native
// module under Jest and throws, so tests render plain views and ignore CSS animations instead.
const { Text, View, Image, ScrollView } = require('react-native');

const Animated = {
  View,
  Text,
  Image,
  ScrollView,
  createAnimatedComponent: (c) => c,
};

// expo-router/testing-library sets `default.call`, so `default` must be a plain object.
module.exports = {
  __esModule: true,
  default: Animated,
  ...Animated,
  cubicBezier: () => 'ease',
  useReducedMotion: () => false,
};
