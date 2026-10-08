import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import Grid from '../components/Grid';
import { Avatar, VerifiedBadge, GradientButton, OutlineButton, Skeleton, ErrorState, Empty } from '../components/UI';
import { compact } from '../utils/format';
import AvatarCustomizerModal from '../components/AvatarCustomizerModal';

const TABS = [{ k: 'posts', icon: 'grid-outline' }, { k: 'videos', icon: 'play-circle-outline' }, { k: 'saved', icon: 'bookmark-outline', mine: true }, { k: 'tagged', icon: 'pricetag-outline' }];

export default function ProfileScreen({ navigation, route }) {
  const { id, isTab } = route?.params || {};
  const { colors } = useTheme();
  const [u, setU] = useState(null); const [items, setItems] = useState(null); const [tab, setTab] = useState('posts');
  const [error, setError] = useState(null); const [refreshing, setRefreshing] = useState(false);
  const [customizerVisible, setCustomizerVisible] = useState(false);

  const load = useCallback(async (t = tab, refresh) => {
    if (!id) return;
    if (refresh) setRefreshing(true);
    setError(null);
    try {
      const { user } = await api.get(`/users/${id}`); setU(user);
      const c = await api.get(`/users/${user._id}/content?tab=${t}`); setItems(c.items);
    } catch (e) { setError(e.message); }
    setRefreshing(false);
  }, [id, tab]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const changeTab = (k) => { setTab(k); setItems(null); load(k); };

  const toggleFollow = async () => {
    try {
      if (u.isFollowing || u.isPending) { await api.del(`/users/${u._id}/follow`); setU({ ...u, isFollowing: false, isPending: false, followersCount: u.followersCount - (u.isFollowing ? 1 : 0) }); }
      else { const r = await api.post(`/users/${u._id}/follow`); setU(r.status === 'pending' ? { ...u, isPending: true } : { ...u, isFollowing: true, followersCount: u.followersCount + 1 }); }
    } catch (e) { Alert.alert('Oops', e.message); }
  };
  const more = () => Alert.alert(`@${u.username}`, undefined, [
    { text: u.isBlocked ? 'Unblock' : 'Block', style: 'destructive', onPress: async () => { try { u.isBlocked ? await api.del(`/users/${u._id}/block`) : await api.post(`/users/${u._id}/block`); load(); } catch (e) { Alert.alert('Oops', e.message); } } },
    { text: 'Report', onPress: () => api.post(`/users/${u._id}/report`, { reason: 'Reported from profile' }).then(() => Alert.alert('Thanks', 'We will review this account.')).catch((e) => Alert.alert('Oops', e.message)) },
    { text: 'Cancel', style: 'cancel' },
  ]);

  if (error && !u) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}><ErrorState message={error} onRetry={() => load()} /></SafeAreaView>;
  if (!u) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: 20 }}><Skeleton width={90} height={90} radius={45} /><Skeleton width={160} height={18} style={{ marginTop: 16 }} /><Skeleton height={60} style={{ marginTop: 16 }} /></SafeAreaView>;

  const Stat = ({ n, label, onPress }) => <TouchableOpacity onPress={onPress} style={{ alignItems: 'center', flex: 1 }}><Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{compact(n)}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text></TouchableOpacity>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 50 }}>
        {!isTab && <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 6 }}><Ionicons name="chevron-back" size={26} color={colors.text} /></TouchableOpacity>}
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 4 }}><Text style={{ color: colors.text, fontSize: 19, fontWeight: '800' }}>{u.username}</Text>{u.isVerified && <VerifiedBadge size={18} />}{u.isPrivate && <Ionicons name="lock-closed" size={14} color={colors.muted} style={{ marginLeft: 6 }} />}</View>
        {u.isMe ? <>
          <TouchableOpacity onPress={() => navigation.navigate('FollowRequests')} style={{ padding: 6 }}><Ionicons name="person-add-outline" size={24} color={colors.text} /></TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={{ padding: 6 }}><Ionicons name="settings-outline" size={24} color={colors.text} /></TouchableOpacity>
        </> : <TouchableOpacity onPress={more} style={{ padding: 6 }}><Ionicons name="ellipsis-horizontal" size={24} color={colors.text} /></TouchableOpacity>}
      </View>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(tab, true)} tintColor={colors.primary} />}>
        <View style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Avatar user={u} size={86} showFrame ring="new" />
            <View style={{ flex: 1, flexDirection: 'row', marginLeft: 8 }}>
              <Stat n={u.postsCount} label="Posts" />
              <Stat n={u.followersCount} label="Followers" onPress={() => navigation.push('FollowList', { id: u._id, type: 'followers' })} />
              <Stat n={u.followingCount} label="Following" onPress={() => navigation.push('FollowList', { id: u._id, type: 'following' })} />
            </View>
          </View>
          <Text style={{ color: colors.text, fontWeight: '700', marginTop: 12, fontSize: 16 }}>{u.fullName}</Text>
          {u.isPremium && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(212,175,106,0.15)', borderWidth: 1, borderColor: '#D4AF6A', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 4 }}>
              <Ionicons name="sparkles" size={12} color="#D4AF6A" />
              <Text style={{ color: '#D4AF6A', fontSize: 11, fontWeight: '800', marginLeft: 4 }}>STIMZZYVIBE VIP</Text>
            </View>
          )}
          {!!u.country && (
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
              📍 {u.country} {u.language ? `· 🗣️ ${u.language}` : ''}
            </Text>
          )}
          {!!u.avatarCustomization?.mood && (
            <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(125,17,40,0.18)', borderWidth: 1, borderColor: '#A31D3B', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginTop: 6 }}>
              <Text style={{ color: '#D4AF6A', fontSize: 12, fontWeight: '700' }}>{u.avatarCustomization.mood}</Text>
            </View>
          )}
          {!!u.bio && <Text style={{ color: colors.text, marginTop: 4, lineHeight: 20 }}>{u.bio}</Text>}
          {!!u.website && <Text style={{ color: colors.accent, marginTop: 2 }}>{u.website}</Text>}
          <View style={{ flexDirection: 'row', marginTop: 14 }}>
            {u.isMe ? <>
              <OutlineButton small title="Edit profile" onPress={() => navigation.navigate('EditProfile')} style={{ flex: 1 }} />
              <GradientButton small title={u.isPremium ? "⭐ VIP Perks" : "⭐ Go Premium"} onPress={() => navigation.navigate('Premium')} style={{ flex: 1, marginLeft: 8 }} />
              <OutlineButton small title="👑 Studio" onPress={() => setCustomizerVisible(true)} style={{ marginLeft: 8 }} />
            </> : <>
              {u.isFollowing || u.isPending ? <OutlineButton small title={u.isPending ? 'Requested' : 'Following'} onPress={toggleFollow} style={{ flex: 1 }} />
                : <GradientButton small title={u.followsMe ? 'Follow back' : 'Follow'} onPress={toggleFollow} style={{ flex: 1 }} />}
              <OutlineButton small title="Message" onPress={() => navigation.navigate('Chat', { user: u })} style={{ flex: 1, marginLeft: 8 }} />
              <OutlineButton small title="📸 Snap" onPress={() => navigation.navigate('Create', { mode: 'snap', targetUser: u })} style={{ marginLeft: 6, minWidth: 64 }} />
            </>}
          </View>
        </View>
        <AvatarCustomizerModal visible={customizerVisible} onClose={() => { setCustomizerVisible(false); load(); }} />
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: colors.border }}>
          {TABS.filter((t) => !t.mine || u.isMe).map((t) => <TouchableOpacity key={t.k} onPress={() => changeTab(t.k)} style={{ flex: 1, alignItems: 'center', padding: 12, borderBottomWidth: 2, borderColor: tab === t.k ? colors.primary : 'transparent' }}><Ionicons name={t.icon} size={24} color={tab === t.k ? colors.primary : colors.muted} /></TouchableOpacity>)}
        </View>
        {!u.canViewContent ? <Empty icon="🔒" text="This account is private. Follow to see their posts." />
          : items === null ? <View style={{ padding: 2 }}><Skeleton height={300} radius={0} /></View>
          : items.length === 0 ? <Empty icon="📷" text="Nothing here yet." />
          : <Grid items={items} onPress={(it) => tab === 'videos' ? navigation.navigate('Vibes') : navigation.navigate('PostDetail', { id: it._id })} />}
      </ScrollView>
    </SafeAreaView>
  );
}
