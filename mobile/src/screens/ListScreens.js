import React from 'react';
import { View, Text, FlatList, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import useAsync from '../hooks/useAsync';
import PostCard from '../components/PostCard';
import Grid from '../components/Grid';
import { Avatar, VerifiedBadge, Header, Loading, ErrorState, Empty, OutlineButton, GradientButton } from '../components/UI';
import { timeAgo } from '../utils/format';

const Wrap = ({ children }) => { const { colors } = useTheme(); return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>{children}</SafeAreaView>; };

export function FollowListScreen({ navigation, route }) {
  const { id, type } = route.params; const { colors } = useTheme(); const { user: me } = useAuth();
  const { data, setData, loading, error, reload } = useAsync(() => api.get(`/users/${id}/${type}`).then((r) => r.users), [id, type]);
  const removeFollower = (u) => Alert.alert('Remove follower?', `@${u.username} won't be notified.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: async () => { await api.del(`/users/followers/${u._id}`).catch(() => {}); setData((d) => d.filter((x) => x._id !== u._id)); } }]);
  return (
    <Wrap><Header title={type === 'followers' ? 'Followers' : 'Following'} navigation={navigation} />
      {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={reload} /> : (
        <FlatList data={data} keyExtractor={(u) => u._id} ListEmptyComponent={<Empty icon="👥" text={type === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'} />}
          renderItem={({ item: u }) => (
            <TouchableOpacity onPress={() => navigation.push('Profile', { id: u._id })} style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}>
              <Avatar user={u} size={48} />
              <View style={{ flex: 1, marginLeft: 12 }}><View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={{ color: colors.text, fontWeight: '700' }}>{u.username}</Text>{u.isVerified && <VerifiedBadge />}</View><Text style={{ color: colors.muted }}>{u.fullName}</Text></View>
              {type === 'followers' && id === me._id && <OutlineButton small title="Remove" onPress={() => removeFollower(u)} />}
            </TouchableOpacity>
          )} />
      )}
    </Wrap>
  );
}

export function FollowRequestsScreen({ navigation }) {
  const { colors } = useTheme();
  const { data, setData, loading, error, reload } = useAsync(() => api.get('/users/me/requests').then((r) => r.users), []);
  const act = async (u, verb) => { try { await api.post(`/users/requests/${u._id}/${verb}`); setData((d) => d.filter((x) => x._id !== u._id)); } catch (e) { Alert.alert('Oops', e.message); } };
  return (
    <Wrap><Header title="Follow requests" navigation={navigation} />
      {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={reload} /> : (
        <FlatList data={data} keyExtractor={(u) => u._id} ListEmptyComponent={<Empty icon="📭" text="No pending requests." />}
          renderItem={({ item: u }) => (
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}>
              <Avatar user={u} size={46} /><Text style={{ flex: 1, color: colors.text, fontWeight: '700', marginLeft: 12 }}>{u.username}</Text>
              <GradientButton small title="Accept" onPress={() => act(u, 'accept')} style={{ marginRight: 8 }} /><OutlineButton small title="Reject" onPress={() => act(u, 'reject')} />
            </View>
          )} />
      )}
    </Wrap>
  );
}

export function HashtagScreen({ navigation, route }) {
  const { name } = route.params; const { colors } = useTheme();
  const { data, loading, error, reload } = useAsync(() => api.get(`/hashtags/${encodeURIComponent(name)}`), [name]);
  return (
    <Wrap><Header title={`#${name}`} navigation={navigation} />
      {loading ? <Loading text="Loading posts..." /> : error ? <ErrorState message={error} onRetry={reload} /> : (
        <ScrollView>
          <Text style={{ color: colors.muted, padding: 14 }}>{data.hashtag.count} posts</Text>
          {data.posts.length ? <Grid items={data.posts} onPress={(p) => navigation.navigate('PostDetail', { id: p._id })} /> : <Empty icon="#️⃣" text="No posts with this hashtag yet." />}
        </ScrollView>
      )}
    </Wrap>
  );
}

export function PostDetailScreen({ navigation, route }) {
  const { data, loading, error, reload } = useAsync(() => api.get(`/posts/${route.params.id}`).then((r) => r.post), [route.params.id]);
  return (
    <Wrap><Header title="Post" navigation={navigation} />
      {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={reload} /> : <ScrollView><PostCard post={data} navigation={navigation} onDeleted={() => navigation.goBack()} /></ScrollView>}
    </Wrap>
  );
}

const TEXT = { follow: 'started following you', follow_request: 'requested to follow you', like: 'liked your post', comment: 'commented on your post', reply: 'replied to your comment', message: 'sent you a message', mention: 'mentioned you', story_reaction: 'reacted to your story' };
export function NotificationsScreen({ navigation }) {
  const { colors } = useTheme();
  const { data, loading, error, reload } = useAsync(async () => { const r = await api.get('/notifications'); api.post('/notifications/read-all').catch(() => {}); return r.notifications; }, []);
  return (
    <Wrap><Header title="Notifications" navigation={navigation} />
      {loading ? <Loading text="Loading..." /> : error ? <ErrorState message={error} onRetry={reload} /> : (
        <FlatList data={data} keyExtractor={(n) => n._id} ListEmptyComponent={<Empty icon="🔔" text="No notifications yet." />}
          renderItem={({ item: n }) => (
            <TouchableOpacity onPress={() => n.type === 'follow_request' ? navigation.navigate('FollowRequests') : n.post ? navigation.navigate('PostDetail', { id: n.post._id }) : n.type === 'message' ? navigation.navigate('Inbox') : navigation.navigate('Profile', { id: n.sender._id })}
              style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: n.read ? 'transparent' : colors.card }}>
              <Avatar user={n.sender} size={44} />
              <Text style={{ flex: 1, color: colors.text, marginLeft: 12, lineHeight: 20 }}><Text style={{ fontWeight: '700' }}>{n.sender?.username} </Text>{TEXT[n.type]}{n.text && n.type !== 'story_reaction' ? `: "${n.text.slice(0, 50)}"` : n.type === 'story_reaction' ? ` ${n.text}` : ''} <Text style={{ color: colors.muted }}>{timeAgo(n.createdAt)}</Text></Text>
              {n.post?.media?.[0]?.type === 'image' && <Image source={{ uri: n.post.media[0].url }} style={{ width: 44, height: 44, borderRadius: 8 }} />}
            </TouchableOpacity>
          )} />
      )}
    </Wrap>
  );
}
