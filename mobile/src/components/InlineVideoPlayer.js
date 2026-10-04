import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

export default function InlineVideoPlayer({
  source,
  style,
  resizeMode = ResizeMode.COVER,
  enabled = true,
  autoPlay = false,
  isLooping = true,
}) {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setPlaying(enabled && autoPlay);
  }, [enabled, autoPlay]);

  const updateProgress = (status) => {
    if (status.isLoaded && status.durationMillis > 0) {
      setProgress(Math.min(1, status.positionMillis / status.durationMillis));
    }
  };

  return (
    <View style={[style, { overflow: 'hidden', backgroundColor: '#000' }]}>
      <Video
        source={source}
        style={{ width: '100%', height: '100%' }}
        resizeMode={resizeMode}
        isLooping={isLooping}
        shouldPlay={enabled && playing}
        isMuted={muted}
        progressUpdateIntervalMillis={250}
        onPlaybackStatusUpdate={updateProgress}
      />
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Pause video' : 'Play video'}
        activeOpacity={1}
        onPress={() => setPlaying((current) => !current)}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' }}
      >
        {!playing && (
          <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(0,0,0,0.58)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="play" size={30} color="#fff" style={{ marginLeft: 3 }} />
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={muted ? 'Turn sound on' : 'Mute video'}
        onPress={() => setMuted((current) => !current)}
        style={{ position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.58)', alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={19} color="#fff" />
      </TouchableOpacity>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.42)' }}>
        <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: '#fff' }} />
      </View>
    </View>
  );
}
