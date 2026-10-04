import React, { useRef, useState } from 'react';
import { View, Text, Image, TouchableOpacity, Animated, Alert, Share, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Avatar, VerifiedBadge } from './UI';
import { timeAgo, FILTERS } from '../utils/format';
import InlineVideoPlayer from './InlineVideoPlayer';

const W = Dimensions.get('window').width;

function PostCard({ post, navigation, onDeleted, isActive = false }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [p, setP] = useState(post);
  const [page, setPage] = useState(0);
  const scale = useRef(new Animated.Value(1)).current;
  const pop = () => Animated.sequence([Animated.spring(scale, { toValue: 1.4, useNativeDriver: true, speed: 40 }), Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 })]).start();

  const toggleLike = async () => {
    const liked = !p.liked; pop();
    setP((x) => ({ ...x, liked, likesCount: x.likesCount + (liked ? 1 : -1) })); // optimistic
    try { liked ? await api.post(`/posts/${p._id}/like`) : await api.del(`/posts/${p._id}/like`); }
    catch { setP((x) => ({ ...x, liked: !liked, likesCount: x.likesCount + (liked ? -1 : 1) })); }
  };
  const toggleSave = async () => {
    const saved = !p.saved; setP((x) => ({ ...x, saved }));
    try { saved ? await api.post(`/posts/${p._id}/save`) : await api.del(`/posts/${p._id}/save`); } catch { setP((x) => ({ ...x, saved: !saved })); }
  };
  const share = () => Share.share({ message: `Check out @${p.author.username}'s post on StimzzyVibe 🚀\n${p.caption || ''}` });
  const more = () => {
    const mine = p.author._id === user._id;
    Alert.alert('Post options', undefined, [
      mine ? { text: 'Delete post', style: 'destructive', onPress: async () => { try { await api.del(`/posts/${p._id}`); onDeleted?.(p._id); } catch (e) { Alert.alert('Oops', e.message); } } }
        : { text: 'Report', onPress: () => Alert.alert('Report post', 'Why are you reporting this?', ['Spam', 'Inappropriate', 'Harassment'].map((reason) => ({ text: reason, onPress: () => api.post(`/posts/${p._id}/report`, { reason }).then(() => Alert.alert('Thanks', 'We will review this post.')).catch((e) => Alert.alert('Oops', e.message)) })).concat([{ text: 'Cancel', style: 'cancel' }])) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };
  const renderCaption = () => (p.caption || '').split(/(#[\p{L}\p{N}_]+|@[a-z0-9._]+)/giu).map((part, i) =>
    /^#/.test(part) ? <Text key={i} style={{ color: colors.accent, fontWeight: '600' }} onPress={() => navigation.push('Hashtag', { name: part.slice(1) })}>{part}</Text>
    : /^@/.test(part) ? <Text key={i} style={{ color: colors.primary, fontWeight: '600' }} onPress={() => navigation.push('Profile', { id: part.slice(1) })}>{part}</Text> : part);
  const overlay = FILTERS[p.filter];

  return (
    <View style={{ marginBottom: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 }}>
        <TouchableOpacity onPress={() => navigation.push('Profile', { id: p.author._id })} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Avatar user={p.author} size={38} />
          <View style={{ marginLeft: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={{ color: colors.text, fontWeight: '700' }}>{p.author.username}</Text>{p.author.isVerified && <VerifiedBadge />}</View>
            {!!p.location && <Text style={{ color: colors.muted, fontSize: 12 }}>📍 {p.location}</Text>}
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={more} hitSlop={12}><Ionicons name="ellipsis-horizontal" size={22} color={colors.text} /></TouchableOpacity>
      </View>

      <View>
        <Animated.FlatList data={p.media} horizontal pagingEnabled showsHorizontalScrollIndicator={false} keyExtractor={(_, i) => String(i)}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / W))}
          renderItem={({ item, index }) => (
            <TouchableOpacity activeOpacity={1} onLongPress={toggleLike} delayLongPress={250}>
              {item.type === 'video'
                ? <InlineVideoPlayer source={{ uri: item.url }} style={{ width: W, height: W * 1.15 }} enabled={isActive && page === index} autoPlay />
                : <Image source={{ uri: item.url }} style={{ width: W, height: W * 1.15, backgroundColor: colors.card }} />}
              {overlay && <View pointerEvents="none" style={{ position: 'absolute', inset: 0, top: 0, bottom: 0, left: 0, right: 0, backgroundColor: overlay }} />}
            </TouchableOpacity>
          )} />
        {p.media.length > 1 && <View style={{ position: 'absolute', top: 10, right: 12, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}><Text style={{ color: '#fff', fontSize: 12 }}>{page + 1}/{p.media.length}</Text></View>}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 10 }}>
        <TouchableOpacity onPress={toggleLike} hitSlop={8}><Animated.View style={{ transform: [{ scale }] }}><Ionicons name={p.liked ? 'heart' : 'heart-outline'} size={28} color={p.liked ? '#F43F5E' : colors.text} /></Animated.View></TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.push('Comments', { id: p._id, kind: 'posts' })} style={{ marginLeft: 16 }} hitSlop={8}><Ionicons name="chatbubble-outline" size={25} color={colors.text} /></TouchableOpacity>
        <TouchableOpacity onPress={share} style={{ marginLeft: 16 }} hitSlop={8}><Ionicons name="paper-plane-outline" size={25} color={colors.text} /></TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={toggleSave} hitSlop={8}><Ionicons name={p.saved ? 'bookmark' : 'bookmark-outline'} size={25} color={p.saved ? colors.primary : colors.text} /></TouchableOpacity>
      </View>
      <View style={{ paddingHorizontal: 14, paddingTop: 8 }}>
        <Text style={{ color: colors.text, fontWeight: '700' }}>{p.likesCount} {p.likesCount === 1 ? 'like' : 'likes'}</Text>
        {!!p.caption && <Text style={{ color: colors.text, marginTop: 4, lineHeight: 20 }}><Text style={{ fontWeight: '700' }}>{p.author.username} </Text>{renderCaption()}</Text>}
        {p.commentsCount > 0 && <TouchableOpacity onPress={() => navigation.push('Comments', { id: p._id, kind: 'posts' })}><Text style={{ color: colors.muted, marginTop: 4 }}>View all {p.commentsCount} comments</Text></TouchableOpacity>}
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>{timeAgo(p.createdAt).toUpperCase()}</Text>
      </View>
    </View>
  );
}

export default React.memo(PostCard, (a, b) => a.post === b.post && a.isActive === b.isActive);
