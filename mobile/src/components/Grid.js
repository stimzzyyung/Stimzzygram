import React from 'react';
import { View, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { thumb } from '../utils/format';

const W = Dimensions.get('window').width;
/** 3-column grid for posts or videos. Items: post objects (media[]) or video objects (url). */
export default function Grid({ items, onPress, cols = 3 }) {
  const { colors } = useTheme();
  const size = (W - 2 * (cols - 1)) / cols;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {items.map((it, i) => {
        const m = it.media?.[0] || { url: it.url, type: 'video' };
        return (
          <TouchableOpacity key={it._id} onPress={() => onPress(it)} style={{ width: size, height: size, marginRight: (i + 1) % cols ? 2 : 0, marginBottom: 2, backgroundColor: colors.card }}>
            {m.type === 'video' ? <View style={{ flex: 1, backgroundColor: '#1E2647', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="play-circle" size={34} color="#fff" /></View>
              : <Image source={{ uri: thumb(m.url, 400) }} style={{ flex: 1 }} />}
            {it.media?.length > 1 && <Ionicons name="copy" size={16} color="#fff" style={{ position: 'absolute', top: 6, right: 6 }} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
