/* eslint-disable react/no-unknown-property -- three.js JSX elements take three.js props (args, uniforms, ...). */
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { Asset } from 'expo-asset';
import { useEffect, useMemo, useRef } from 'react';
import { useAnimatedReaction, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { LinearFilter, NoColorSpace, TextureLoader, Vector3, type Group, type Texture } from 'three';

import { colors } from '@/constants/theme';

type Props = {
  /** Sphere radius in px; the orthographic camera maps 1 world unit to this many pixels. */
  radius: number;
  yaw: SharedValue<number>;
  pitch: SharedValue<number>;
  /** Pinch zoom: the sphere is drawn this many times bigger. */
  zoom: SharedValue<number>;
  /** Px from the canvas centre up to the sphere's centre: the canvas reaches further down than up. */
  offsetY?: number;
  /** False pauses rendering entirely (tab not visible). */
  active: boolean;
  /** No frame within FIRST_FRAME_TIMEOUT: the GL context or the texture never came up. */
  onFail: () => void;
  /** The first frame with the land texture is on screen. */
  onReady?: () => void;
};

const FIRST_FRAME_TIMEOUT = 5000;

const LAND_TEXTURE = require('../../../assets/globe/land-2048.png');
const landUri = () => Asset.fromModule(LAND_TEXTURE).uri;

/** Starts loading the land texture into useLoader's cache, so the first frame does not wait for it. */
export function preloadLand() {
  useLoader.preload(TextureLoader, landUri());
}

/** Hex token → raw sRGB vector, so the shader paints exactly the Figma colour (no colour management). */
function rgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return new Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/**
 * No flip and no mipmaps: rows are read top-down on every GL backend (expo-gl ignores UNPACK_FLIP_Y), and the
 * atan seam stays invisible. Configures the loaded texture in place: a clone loses the flags r3f's native loader
 * sets, and expo-gl then cannot upload it.
 */
function prepareLand(texture: Texture) {
  texture.flipY = false;
  texture.generateMipmaps = false;
  texture.minFilter = LinearFilter;
  texture.colorSpace = NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

const VERTEX = /* glsl */ `
varying vec3 vObj;
varying vec3 vView;
void main() {
  vObj = position;
  vView = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// Flat, illustrative look: ocean gradient in view space (light top-left, deep at the edge), land from the
// texture, darker rim. UVs come from the object-space position, so lat/lng match src/lib/geo.ts exactly.
// Keep the shading in sync with scripts/make-globe-texture.mjs (fallback picture).
const FRAGMENT = /* glsl */ `
uniform sampler2D land;
uniform vec3 oceanLight;
uniform vec3 oceanDeep;
varying vec3 vObj;
varying vec3 vView;
const float PI = 3.141592653589793;
void main() {
  vec3 n = normalize(vObj);
  vec2 uv = vec2(atan(n.x, n.z) / (2.0 * PI) + 0.5, 0.5 - asin(clamp(n.y, -1.0, 1.0)) / PI);
  vec4 l = texture2D(land, uv);
  vec3 v = normalize(vView);
  vec3 ocean = mix(oceanLight, oceanDeep, clamp(length(v.xy - vec2(-0.35, 0.4)) / 1.5, 0.0, 1.0));
  vec3 c = mix(ocean, l.rgb, l.a) * mix(1.0, 0.72, pow(1.0 - v.z, 2.0));
  gl_FragColor = vec4(c, 1.0);
}`;

/**
 * The three.js globe: one textured sphere turned by `yaw`/`pitch`. Pins and the plane are RN overlays.
 * The canvas fills its parent.
 */
export function GlobeScene({ radius, yaw, pitch, zoom, offsetY = 0, active, onFail, onReady }: Props) {
  const drawn = useRef(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!drawn.current) onFail();
    }, FIRST_FRAME_TIMEOUT);
    return () => clearTimeout(timer);
  }, [onFail]);
  const onFirstFrame = () => {
    drawn.current = true;
    onReady?.();
  };

  return (
    <Canvas
      orthographic
      camera={{ zoom: radius, position: [0, 0, 5] }}
      frameloop={active ? 'demand' : 'never'}
      gl={{ antialias: true, alpha: true }}
    >
      <Sphere yaw={yaw} pitch={pitch} zoom={zoom} lift={offsetY / radius} onFirstFrame={onFirstFrame} />
    </Canvas>
  );
}

type SphereProps = Pick<Props, 'yaw' | 'pitch' | 'zoom'> & {
  /** How far above the canvas centre the sphere sits, in sphere radii. */
  lift: number;
  onFirstFrame: () => void;
};

function Sphere({ yaw, pitch, zoom, lift, onFirstFrame }: SphereProps) {
  const group = useRef<Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  const loaded = useLoader(TextureLoader, landUri());
  // A new layout moves the sphere: draw a frame for it.
  useEffect(() => {
    invalidate();
  }, [lift, invalidate]);

  const uniforms = useMemo(
    () => ({ land: { value: prepareLand(loaded) }, oceanLight: { value: rgb(colors.globeOceanLight) }, oceanDeep: { value: rgb(colors.globeOceanDeep) } }),
    [loaded],
  );

  // Render on demand: a new frame only when the orientation or the zoom changes.
  useAnimatedReaction(
    () => yaw.value + pitch.value * 1e3 + zoom.value * 1e6,
    (next, prev) => {
      if (next !== prev) scheduleOnRN(invalidate);
    },
  );

  const first = useRef(true);
  useFrame(() => {
    group.current?.rotation.set(pitch.value, yaw.value, 0, 'XYZ');
    group.current?.scale.setScalar(zoom.value);
    // World units are sphere radii; lifts the sphere from the canvas centre to the globe area's centre.
    group.current?.position.setY(lift);
    if (first.current) {
      first.current = false;
      onFirstFrame();
    }
  });

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <shaderMaterial vertexShader={VERTEX} fragmentShader={FRAGMENT} uniforms={uniforms} />
      </mesh>
    </group>
  );
}
