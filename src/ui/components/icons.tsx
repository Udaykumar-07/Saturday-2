/**
 * Zero-dependency minimalist vector icons for Saturday.
 * Hand-crafted with pure React Native primitives for instant rendering
 * and zero native module/font overhead.
 */

import React from 'react';
import { View } from 'react-native';

interface IconProps {
  color?: string;
  size?: number;
}

export const MenuIcon: React.FC<IconProps> = ({ color = '#A0A0A0', size = 18 }) => (
  <View style={{ width: size, height: size * 0.65, justifyContent: 'space-between' }}>
    <View style={{ height: 1.8, backgroundColor: color, borderRadius: 1, width: size }} />
    <View style={{ height: 1.8, backgroundColor: color, borderRadius: 1, width: size * 0.75 }} />
    <View style={{ height: 1.8, backgroundColor: color, borderRadius: 1, width: size * 0.5 }} />
  </View>
);

export const PlusIcon: React.FC<IconProps> = ({ color = '#A0A0A0', size = 18 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ position: 'absolute', width: size * 0.7, height: 1.8, backgroundColor: color, borderRadius: 1 }} />
    <View style={{ position: 'absolute', height: size * 0.7, width: 1.8, backgroundColor: color, borderRadius: 1 }} />
  </View>
);

export const SlidersIcon: React.FC<IconProps> = ({ color = '#A0A0A0', size = 18 }) => {
  const s = size;
  return (
    <View style={{ width: s, height: s, justifyContent: 'space-around', paddingVertical: 1 }}>
      {/* Track 1 with knob */}
      <View style={{ height: 1.5, backgroundColor: color, opacity: 0.35, justifyContent: 'center' }}>
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color, left: s * 0.25, top: -1.25 }} />
      </View>
      {/* Track 2 with knob */}
      <View style={{ height: 1.5, backgroundColor: color, opacity: 0.35, justifyContent: 'center' }}>
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color, left: s * 0.65, top: -1.25 }} />
      </View>
      {/* Track 3 with knob */}
      <View style={{ height: 1.5, backgroundColor: color, opacity: 0.35, justifyContent: 'center' }}>
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color, left: s * 0.35, top: -1.25 }} />
      </View>
    </View>
  );
};

export const MicIcon: React.FC<IconProps> = ({ color = '#A0A0A0', size = 18 }) => {
  const scale = size / 20;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Capsule body */}
      <View
        style={{
          width: 7 * scale,
          height: 10.5 * scale,
          borderRadius: 3.5 * scale,
          borderWidth: 1.5 * scale,
          borderColor: color,
          backgroundColor: 'transparent',
        }}
      />
      {/* Cradle arc */}
      <View
        style={{
          position: 'absolute',
          top: 3.5 * scale,
          width: 12 * scale,
          height: 8 * scale,
          borderBottomLeftRadius: 6 * scale,
          borderBottomRightRadius: 6 * scale,
          borderWidth: 1.5 * scale,
          borderTopWidth: 0,
          borderColor: color,
        }}
      />
      {/* Stem */}
      <View
        style={{
          position: 'absolute',
          bottom: 2 * scale,
          width: 1.5 * scale,
          height: 3.5 * scale,
          backgroundColor: color,
        }}
      />
      {/* Base stand */}
      <View
        style={{
          position: 'absolute',
          bottom: 1 * scale,
          width: 8 * scale,
          height: 1.5 * scale,
          borderRadius: 1,
          backgroundColor: color,
        }}
      />
    </View>
  );
};

export const ArrowUpIcon: React.FC<IconProps> = ({ color = '#0A0A0A', size = 16 }) => {
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
      {/* Arrow Shaft */}
      <View style={{ width: 2, height: s * 0.62, backgroundColor: color, borderRadius: 1 }} />
      {/* Left Wing */}
      <View
        style={{
          position: 'absolute',
          top: s * 0.16,
          left: s * 0.22,
          width: 2,
          height: s * 0.38,
          backgroundColor: color,
          borderRadius: 1,
          transform: [{ rotate: '45deg' }],
        }}
      />
      {/* Right Wing */}
      <View
        style={{
          position: 'absolute',
          top: s * 0.16,
          right: s * 0.22,
          width: 2,
          height: s * 0.38,
          backgroundColor: color,
          borderRadius: 1,
          transform: [{ rotate: '-45deg' }],
        }}
      />
    </View>
  );
};
