import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import useAsync from '../hooks/useAsync';
import Grid from '../components/Grid';
import { Avatar, VerifiedBadge, Skeleton, ErrorState, Empty } from '../components/UI';

const TABS = ['users', 'posts', 'hashtags', 'videos'];

export default function ExploreScreen({ navigation }) {
  const { colors } = useTheme();
  const explore = useAsync(() => api.get('/posts/explore'), []);
  const [q, setQ] = useState(''); const [suggest, setSuggest] = useState(null);
  const [results, setResults] = useState(null); const [tab, setTab] = useState('users'); const [searching, setSearching] = useState(false);
  const timer = useRef();

  useEffect(() => {
    clearTimeout(timer.current);
    if (!q.trim()) { setSuggest(null); setResults(null); return; }
    timer.current = setTimeout(() => api.get(`/search/suggest?q=${encodeURIComponent(q)}`).then(setSuggest).catch(() => {}), 250);
    return () => clearTimeout(timer.current);
  }, [q]);

  const runSearch = async () => {
    if (!q.trim()) return;
    setSearching(true); setSuggest(null);
    try { setResults(await api.get(`/search?q=${encodeURIComponent(q)}`)); } catch { setResults({ users: [], posts: [], hashtags: [], videos: [], failed: true }); }
    setSearching(false);
  };
  const UserRow = ({ u }) => (
    <TouchableOpacity onPress={() => navigation.navigate('Profile', { id: u._id })} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14 }}>
      <Avatar user={u} size={44} />
      <View style={{ marginLeft: 12 }}><View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={{ color: colors.text, fontWeight: '700' }}>{u.username}</Text>{u.isVerified && <VerifiedBadge />}</View><Text style={{ color: colors.muted }}>{u.fullName}</Text></View>
    </TouchableOpacity>
  );
  const TagRow = ({ h }) => (
    <TouchableOpacity onPress={() => navigation.navigate('Hashtag', { name: h.name })} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.accent, fontSize: 20, fontWeight: '800' }}>#</Text></View>
      <View style={{ marginLeft: 12 }}><Text style={{ color: colors.text, fontWeight: '700' }}>#{h.name}</Text><Text style={{ color: colors.muted }}>{h.count} posts</Text></View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, margin: 12, borderRadius: 14, paddingHorizontal: 12 }}>
        <Ionicons name="search" size={20} color={colors.muted} />
        <TextInput value={q} onChangeText={setQ} onSubmitEditing={runSearch} returnKeyType="search" placeholder="Search users, posts, #hashtags, videos" placeholderTextColor={colors.muted} autoCapitalize="none"
          style={{ flex: 1, color: colors.text, padding: 12, fontSize: 15 }} />
        {!!q && <TouchableOpacity onPress={() => setQ('')}><Ionicons name="close-circle" size={20} color={colors.muted} /></TouchableOpacity>}
      </View>

      {suggest ? (
        <ScrollView keyboardShouldPersistTaps="handled">
          {suggest.users.map((u) => <UserRow key={u._id} u={u} />)}
          {suggest.hashtags.map((h) => <TagRow key={h._id} h={h} />)}
          <TouchableOpacity onPress={runSearch} style={{ padding: 16 }}><Text style={{ color: colors.primary, fontWeight: '700' }}>Search "{q}"</Text></TouchableOpacity>
        </ScrollView>
      ) : searching ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} /> : results ? (
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', paddingHorizontal: 12 }}>
            {TABS.map((t) => <TouchableOpacity key={t} onPress={() => setTab(t)} style={{ paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 2, borderColor: tab === t ? colors.primary : 'transparent' }}>
              <Text style={{ color: tab === t ? colors.primary : colors.muted, fontWeight: '700', textTransform: 'capitalize' }}>{t}</Text></TouchableOpacity>)}
          </View>
          <ScrollView>
            {results.failed && <ErrorState onRetry={runSearch} />}
            {tab === 'users' && (results.users?.length ? results.users.map((u) => <UserRow key={u._id} u={u} />) : <Empty icon="🔍" text="No users found." />)}
            {tab === 'hashtags' && (results.hashtags?.length ? results.hashtags.map((h) => <TagRow key={h._id} h={h} />) : <Empty icon="#️⃣" text="No hashtags found." />)}
            {tab === 'posts' && (results.posts?.length ? <Grid items={results.posts} onPress={(p) => navigation.navigate('PostDetail', { id: p._id })} /> : <Empty icon="🖼️" text="No posts found." />)}
            {tab === 'videos' && (results.videos?.length ? <Grid items={results.videos} onPress={() => navigation.navigate('Vibes')} /> : <Empty icon="🎬" text="No videos found." />)}
          </ScrollView>
        </View>
      ) : explore.error ? <ErrorState message={explore.error} onRetry={explore.reload} /> : (
        <ScrollView refreshControl={<RefreshControl refreshing={explore.refreshing} onRefresh={explore.refresh} tintColor={colors.primary} />}>
          {explore.loading ? <View style={{ padding: 12 }}><Skeleton height={36} style={{ marginBottom: 12 }} /><Skeleton height={300} /></View> : (
            <>
              {!!explore.data.trending.length && <View>
                <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16, margin: 14, marginBottom: 8 }}>🔥 Trending</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 12 }}>
                  {explore.data.trending.map((h) => <TouchableOpacity key={h._id} onPress={() => navigation.navigate('Hashtag', { name: h.name })} style={{ backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8 }}>
                    <Text style={{ color: colors.accent, fontWeight: '700' }}>#{h.name}</Text></TouchableOpacity>)}
                </ScrollView></View>}
              {explore.data.posts.length ? <Grid items={explore.data.posts} onPress={(p) => navigation.navigate('PostDetail', { id: p._id })} /> : <Empty icon="🌱" text="Nothing to explore yet. Be the first to post!" />}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
