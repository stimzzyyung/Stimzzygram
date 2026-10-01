import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import useAsync from '../hooks/useAsync';
import { Header, Loading, ErrorState, Empty, OutlineButton, Avatar } from '../components/UI';

const TABS = ['stats', 'reports', 'users', 'hashtags'];

export default function AdminScreen({ navigation }) {
  const { colors } = useTheme();
  const [tab, setTab] = useState('stats'); const [q, setQ] = useState('');
  const { data, loading, error, reload } = useAsync(() => api.get(`/admin/${tab}${tab === 'users' || tab === 'hashtags' ? `?q=${encodeURIComponent(q)}` : ''}`), [tab, q]);
  const act = async (fn) => { try { await fn(); reload(); } catch (e) { Alert.alert('Oops', e.message); } };
  const Card = ({ children }) => <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 12, marginBottom: 10 }}>{children}</View>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Admin dashboard" navigation={navigation} />
      <View style={{ flexDirection: 'row' }}>{TABS.map((t) => <TouchableOpacity key={t} onPress={() => setTab(t)} style={{ flex: 1, padding: 12, borderBottomWidth: 2, borderColor: tab === t ? colors.primary : 'transparent' }}><Text style={{ textAlign: 'center', color: tab === t ? colors.primary : colors.muted, fontWeight: '700', textTransform: 'capitalize' }}>{t}</Text></TouchableOpacity>)}</View>
      {(tab === 'users' || tab === 'hashtags') && <TextInput value={q} onChangeText={setQ} placeholder={`Search ${tab}...`} placeholderTextColor={colors.muted} autoCapitalize="none" style={{ margin: 12, backgroundColor: colors.card, color: colors.text, borderRadius: 12, padding: 12 }} />}
      {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={reload} /> : (
        <ScrollView contentContainerStyle={{ padding: 12 }}>
          {tab === 'stats' && <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {Object.entries({ 'Total users': 'totalUsers', 'Active (24h)': 'activeUsers', 'New (7d)': 'newUsers', 'Total posts': 'totalPosts', 'Total videos': 'totalVideos', 'Open reports': 'openReports', Flagged: 'flagged' }).map(([label, k]) => (
              <View key={k} style={{ width: '48%', margin: '1%', backgroundColor: colors.card, borderRadius: 14, padding: 16 }}><Text style={{ color: colors.primary, fontSize: 28, fontWeight: '900' }}>{data.stats[k]}</Text><Text style={{ color: colors.muted }}>{label}</Text></View>))}
          </View>}
          {tab === 'reports' && (data.reports.length ? data.reports.map((r) => <Card key={r._id}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{r.targetType.toUpperCase()} · reported by @{r.reporter?.username}</Text>
            <Text style={{ color: colors.muted, marginVertical: 4 }}>Reason: {r.reason}</Text>
            {!!r.targetMedia && <Image source={{ uri: r.targetMedia }} style={{ width: 90, height: 90, borderRadius: 8, marginVertical: 4 }} />}
            <Text style={{ color: colors.text }} numberOfLines={3}>{r.targetPreview}</Text>
            <View style={{ flexDirection: 'row', marginTop: 10 }}>
              {r.targetType !== 'user' && <OutlineButton small danger title="Remove content" onPress={() => act(() => api.put(`/admin/reports/${r._id}`, { action: 'remove_content' }))} style={{ marginRight: 8 }} />}
              <OutlineButton small title="Dismiss" onPress={() => act(() => api.put(`/admin/reports/${r._id}`, { action: 'dismiss' }))} />
            </View></Card>) : <Empty icon="✅" text="No open reports." />)}
          {tab === 'users' && data.users.map((u) => <Card key={u._id}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}><Avatar user={u} size={40} /><View style={{ marginLeft: 10, flex: 1 }}><Text style={{ color: colors.text, fontWeight: '700' }}>{u.username} {u.isVerified ? '✔️' : ''} {u.isSuspended ? '⛔' : ''}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{u.email}</Text></View></View>
            <View style={{ flexDirection: 'row', marginTop: 10 }}>
              <OutlineButton small title={u.isSuspended ? 'Unsuspend' : 'Suspend'} onPress={() => act(() => api.put(`/admin/users/${u._id}/suspend`, { suspend: !u.isSuspended }))} style={{ marginRight: 6 }} />
              <OutlineButton small title={u.isVerified ? 'Unverify' : 'Verify'} onPress={() => act(() => api.put(`/admin/users/${u._id}/verify`, { verified: !u.isVerified }))} style={{ marginRight: 6 }} />
              <OutlineButton small danger title="Delete" onPress={() => Alert.alert('Delete account?', `@${u.username} and all their content will be removed.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => act(() => api.del(`/admin/users/${u._id}`)) }])} />
            </View></Card>)}
          {tab === 'hashtags' && data.hashtags.map((h) => <Card key={h._id}><View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ flex: 1, color: colors.text, fontWeight: '700' }}>#{h.name} <Text style={{ color: colors.muted }}>({h.count})</Text> {h.isBanned ? '🚫' : ''}</Text>
            <OutlineButton small danger={!h.isBanned} title={h.isBanned ? 'Unban' : 'Ban'} onPress={() => act(() => api.put(`/admin/hashtags/${h._id}/ban`, { banned: !h.isBanned }))} /></View></Card>)}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
