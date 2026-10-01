import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Avatar, Skeleton } from './UI';

export default function StoryBar({ groups, loading, navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  if (loading) return <View style={{ flexDirection: 'row', padding: 12 }}>{[1, 2, 3, 4].map((i) => <Skeleton key={i} width={64} height={64} radius={32} style={{ marginRight: 12 }} />)}</View>;
  const mine = groups.find((g) => g.user._id === user._id);
  const others = groups.filter((g) => g.user._id !== user._id);
  return (
    <FlatList horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 12 }}
      data={[{ me: true }, ...others]} keyExtractor={(g, i) => g.user?._id || 'me' + i}
      renderItem={({ item }) => item.me ? (
        <TouchableOpacity style={{ alignItems: 'center', marginRight: 14 }} onPress={() => mine ? navigation.navigate('StoryViewer', { groups: [mine, ...others], index: 0 }) : navigation.navigate('Create', { mode: 'story' })}>
          <View>
            <Avatar user={user} size={60} ring={mine ? 'new' : undefined} />
            <View style={{ position: 'absolute', right: -2, bottom: -2, backgroundColor: colors.primary, borderRadius: 11, width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.bg }}>
              <Ionicons name="add" size={14} color="#fff" /></View>
          </View>
          <Text style={{ color: colors.text, fontSize: 12, marginTop: 4 }}>Your story</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={{ alignItems: 'center', marginRight: 14 }} onPress={() => navigation.navigate('StoryViewer', { groups: [mine, ...others].filter(Boolean), index: (mine ? 1 : 0) + others.indexOf(item) })}>
          <Avatar user={item.user} size={60} ring={item.allViewed ? 'seen' : 'new'} />
          <Text style={{ color: colors.text, fontSize: 12, marginTop: 4, maxWidth: 70 }} numberOfLines={1}>{item.user.username}</Text>
        </TouchableOpacity>
      )} />
  );
}
