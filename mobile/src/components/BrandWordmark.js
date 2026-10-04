import React from 'react';
import { Text } from 'react-native';
import { useFonts, DancingScript_700Bold } from '@expo-google-fonts/dancing-script';
import { palette } from '../theme';

export default function BrandWordmark({ size = 39, color = palette.ivory, accentColor = palette.gold }) {
  const [fontsLoaded] = useFonts({ DancingScript_700Bold });

  return (
    <Text style={{ fontFamily: 'serif', fontSize: size, fontWeight: '700', color, letterSpacing: 3 }}>
      STIMZZY
      <Text
        style={{
          color: accentColor,
          fontSize: size * 0.62,
          fontFamily: fontsLoaded ? 'DancingScript_700Bold' : 'serif',
          fontWeight: '700',
          letterSpacing: 0,
        }}
      >
        {' '}vibe
      </Text>
    </Text>
  );
}
