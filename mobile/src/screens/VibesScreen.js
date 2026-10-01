import React, { useCallback, useRef, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Dimensions, Share, ActivityIndicator } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../services/api';
import { Avatar, VerifiedBadge, ErrorState, Empty } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { compact } from '../utils/format';

const { height: SH, width: SW } = Dimensions.get('window');

export default function VibesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const H = SH - 60 - insets.bottom - insets.top; // tab bar height 60
  const [videos, setVideos] = useState(null); const [error, setError] = useState(null);
  const [active, setActive] = useState(0); const [focused, setFocused] = useState(true);

  useFocusEffect(useCallback(() => {
    setFocused(true);
    api.get('/videos').then((r) => setVideos((v) => v || r.videos)).catch((e) => setError(e.message));
    return () => setFocused(false); // pause when leaving the tab
  }, []));

  const loadingMore = useRef(false);
  const loadMore = async () => {
    if (loadingMore.current || !videos?.length) return;
    loadingMore.current = true;
    try {
      const r = await api.get(`/videos?before=${videos[videos.length - 1].createdAt}`);
      if (r.videos.length) setVideos((v) => [...v, ...r.videos.filter((n) => !v.some((o) => o._id === n._id))]);
    } catch {}
    loadingMore.current = false;
  };

  const viewable = useRef(({ viewableItems }) => viewableItems[0] && setActive(viewableItems[0].index)).current;
  const update = (id, patch) => setVideos((vs) => vs.map((v) => (v._id === id ? { ...v, ...patch(v) } : v)));

  const like = async (v) => {
    const liked = !v.liked; update(v._id, (x) => ({ liked, likesCount: x.likesCount + (liked ? 1 : -1) }));
    try { liked ? await api.post(`/videos/${v._id}/like`) : await api.del(`/videos/${v._id}/like`); } catch { update(v._id, (x) => ({ liked: !liked, likesCount: x.likesCount + (liked ? -1 : 1) })); }
  };
  const follow = async (v) => {
    update(v._id, () => ({ following: true }));
    try { await api.post(`/users/${v.author._id}/follow`); } catch {}
  };

  if (error && !videos) return <ErrorState message={error} onRetry={() => { setError(null); api.get('/videos').then((r) => setVideos(r.videos)).catch((e) => setError(e.message)); }} />;
  if (!videos) return <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center' }}><ActivityIndicator color="#fff" size="large" /><Text style={{ color: '#fff', textAlign: 'center', marginTop: 12 }}>Loading vibes...</Text></View>;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <FlatList data={videos} keyExtractor={(v) => v._id} pagingEnabled snapToInterval={H + insets.top} decelerationRate="fast" showsVerticalScrollIndicator={false}
        onViewableItemsChanged={viewable} viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
        initialNumToRender={2} maxToRenderPerBatch={2} windowSize={3} removeClippedSubviews
        onEndReachedThreshold={0.5} onEndReached={loadMore}
        ListEmptyComponent={<View style={{ height: SH, justifyContent: 'center' }}><Empty icon="🔥" text="No vibes yet. Tap + and post the first one!" /></View>}
        renderItem={({ item: v, index }) => (
          <View style={{ height: H + insets.top, width: SW }}>
            <Video source={{ uri: v.url }} style={{ flex: 1 }} resizeMode={ResizeMode.COVER} isLooping shouldPlay={focused && index === active} progressUpdateIntervalMillis={1000} />
            <LinearGradient colors={['transparent', 'rgba(11,16,32,0.85)']} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 240 }} />
            <View style={{ position: 'absolute', right: 12, bottom: 30, alignItems: 'center' }}>
              <TouchableOpacity onPress={() => like(v)} style={{ alignItems: 'center', marginBottom: 20 }}><Ionicons name={v.liked ? 'heart' : 'heart-outline'} size={34} color={v.liked ? '#F43F5E' : '#fff'} /><Text style={{ color: '#fff', fontWeight: '700' }}>{compact(v.likesCount)}</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('Comments', { id: v._id, kind: 'videos' })} style={{ alignItems: 'center', marginBottom: 20 }}><Ionicons name="chatbubble-outline" size={31} color="#fff" /><Text style={{ color: '#fff', fontWeight: '700' }}>{compact(v.commentsCount)}</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => Share.share({ message: `Watch @${v.author.username}'s vibe on Stimzzy'sgram 🔥` })}><Ionicons name="paper-plane-outline" size={30} color="#fff" /></TouchableOpacity>
            </View>
            <View style={{ position: 'absolute', left: 14, bottom: 30, right: 80 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => navigation.navigate('Profile', { id: v.author._id })} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Avatar user={v.author} size={38} /><Text style={{ color: '#fff', fontWeight: '800', marginLeft: 8 }}>{v.author.username}</Text>{v.author.isVerified && <VerifiedBadge />}
                </TouchableOpacity>
                {v.author._id !== user._id && !v.following && <TouchableOpacity onPress={() => follow(v)} style={{ marginLeft: 12, borderWidth: 1.5, borderColor: '#fff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 }}><Text style={{ color: '#fff', fontWeight: '700' }}>Follow</Text></TouchableOpacity>}
              </View>
              {!!v.caption && <Text style={{ color: '#fff', marginTop: 8 }} numberOfLines={3}>{v.caption}</Text>}
              <Text style={{ color: '#E9D5FF', marginTop: 8 }}>🎵 {v.audio?.title} {v.audio?.artist ? `· ${v.audio.artist}` : ''}</Text>
            </View>
          </View>
        )} />
      <Text style={{ position: 'absolute', top: insets.top + 12, left: 16, color: '#fff', fontSize: 22, fontWeight: '900' }}>Vibes 🔥</Text>
    </View>
  );
}
