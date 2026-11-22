
import { useRef } from "react";
import { View, type ViewInstance } from "react-native";

export function Dummy() {
  const containerRef = useRef<ViewInstance>(null);
  const tileRef = useRef<ViewInstance>(null);

  const measure = () => {
    if (tileRef.current && containerRef.current) {
      tileRef.current.measureLayout(
        containerRef.current,
        (left: number, top: number, width: number, height: number) => {
          console.log(left, top, width, height);
        },
        () => {}
      );
    }
  };

  return (
    <View ref={containerRef}>
      <View ref={tileRef} />
    </View>
  );
}
