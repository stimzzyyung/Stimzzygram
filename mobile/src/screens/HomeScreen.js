import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import PostCard from '../components/PostCard';
import StoryBar from '../components/StoryBar';
import { PostSkeleton, ErrorState, Empty } from '../components/UI';

export function AppHeader({ navigation, unread = 0 }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 52 }}>
      <Text style={{ flex: 1, fontSize: 24, fontWeight: '900', color: colors.primary }}>Stimzzy's<Text style={{ color: colors.accent }}>gram</Text></Text>
      <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={{ padding: 8 }}>
        <Ionicons name="heart-outline" size={26} color={colors.text} />
        {unread > 0 && <View style={{ position: 'absolute', top: 4, right: 4, backgroundColor: colors.danger, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{unread}</Text></View>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Inbox')} style={{ padding: 8 }}><Ionicons name="chatbubbles-outline" size={25} color={colors.text} /></TouchableOpacity>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const { colors } = useTheme();
  const [posts, setPosts] = useState(null);
  const [groups, setGroups] = useState([]);
  const [storiesLoading, setSL] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [more, setMore] = useState(false); const [done, setDone] = useState(false);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async (refresh) => {
    if (refresh) setRefreshing(true);
    setError(null);
    try {
      const [f, s, n] = await Promise.all([api.get('/posts'), api.get('/stories').catch(() => ({ groups: [] })), api.get('/notifications/unread-count').catch(() => ({ count: 0 }))]);
      setPosts(f.posts); setGroups(s.groups); setUnread(n.count); setDone(f.posts.length < 5);
    } catch (e) { setError(e.message); }
    setSL(false); setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => {
    const sock = getSocket(); if (!sock) return;
    const h = () => setUnread((u) => u + 1);
    sock.on('notification:new', h); return () => sock.off('notification:new', h);
  }, []);

  const renderPost = useCallback(({ item }) => (
    <PostCard post={item} navigation={navigation} onDeleted={(id) => setPosts((p) => p.filter((x) => x._id !== id))} />
  ), [navigation]);

  const loadMore = async () => {
    if (more || done || !posts?.length) return;
    setMore(true);
    try { const r = await api.get(`/posts?before=${posts[posts.length - 1].createdAt}`); setPosts((p) => [...p, ...r.posts]); if (r.posts.length < 5) setDone(true); } catch {}
    setMore(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <AppHeader navigation={navigation} unread={unread} />
      {error && !posts ? <ErrorState message={error} onRetry={() => load()} /> : (
        <FlatList data={posts || []} keyExtractor={(p) => p._id}
          ListHeaderComponent={<StoryBar groups={groups} loading={storiesLoading} navigation={navigation} />}
          renderItem={renderPost}
          initialNumToRender={3} maxToRenderPerBatch={3} windowSize={7} updateCellsBatchingPeriod={50} removeClippedSubviews
          ListEmptyComponent={posts === null ? <View><PostSkeleton /><PostSkeleton /></View> : <Empty icon="👋" text={'Your feed is empty.\nFollow people from Explore or share your first post!'} />}
          ListFooterComponent={more ? <ActivityIndicator style={{ margin: 20 }} color={colors.primary} /> : null}
          onEndReached={loadMore} onEndReachedThreshold={0.6}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />} />
      )}
    </SafeAreaView>
  );
}
