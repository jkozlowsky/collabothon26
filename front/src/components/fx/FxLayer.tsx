import { useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';

type Size = { width: number; height: number };

type Props = {
  /** Rendered once the layer has been measured, so particles can be placed by the real size. */
  children: (size: Size) => ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** A transparent, touch-through layer over its parent that tells its children how big it is. */
export function FxLayer({ children, style }: Props) {
  // Tests never lay out, so they start with a phone-sized layer.
  const [size, setSize] = useState<Size | null>(process.env.NODE_ENV === 'test' ? { width: 390, height: 844 } : null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((old) => (old && old.width === width && old.height === height ? old : { width, height }));
  };
  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none" onLayout={onLayout}>
      {size ? children(size) : null}
    </View>
  );
}
