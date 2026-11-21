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

// Shared values as plain boxes; animations jump straight to their target.
const sharedValue = (value) => {
  const sv = { value, get: () => sv.value, set: (v) => (sv.value = v) };
  return sv;
};
const { useState } = require('react');
const easing = () => (t) => t;

// expo-router/testing-library sets `default.call`, so `default` must be a plain object.
module.exports = {
  __esModule: true,
  default: Animated,
  ...Animated,
  cubicBezier: () => 'ease',
  useReducedMotion: () => false,
  ReduceMotion: { System: 'system', Always: 'always', Never: 'never' },
  // Read by react-native-gesture-handler to tell shared values from plain props.
  isSharedValue: () => false,
  useComposedEventHandler: () => undefined,
  useSharedValue: (initial) => useState(() => sharedValue(initial))[0],
  // Computed once per render, so tests still see the projected positions.
  useAnimatedStyle: (updater) => updater(),
  useAnimatedProps: (updater) => updater(),
  useAnimatedReaction: () => {},
  withTiming: (to) => to,
  withSpring: (to) => to,
  withDecay: () => 0,
  withRepeat: (animation) => animation,
  withDelay: (_ms, animation) => animation,
  withSequence: (...animations) => animations[animations.length - 1],
  cancelAnimation: () => {},
  interpolate: (_value, _input, output) => output[0],
  Easing: new Proxy({}, { get: () => easing }),
  FadeIn: builder,
  FadeInDown: builder,
  FadeOut: builder,
  ZoomIn: builder,
  LinearTransition: builder,
};
