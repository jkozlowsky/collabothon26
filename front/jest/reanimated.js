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

// Layout animation builders (FadeIn.duration(200), LinearTransition…): chainable no-ops.
const builder = new Proxy(function () {}, { get: () => () => builder, apply: () => builder });

// expo-router/testing-library sets `default.call`, so `default` must be a plain object.
module.exports = {
  __esModule: true,
  default: Animated,
  ...Animated,
  cubicBezier: () => 'ease',
  useReducedMotion: () => false,
  // Read by react-native-gesture-handler to tell shared values from plain props.
  isSharedValue: () => false,
  useComposedEventHandler: () => undefined,
  FadeIn: builder,
  FadeOut: builder,
  LinearTransition: builder,
};
