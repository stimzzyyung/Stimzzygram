import React, { useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import useAsync from '../hooks/useAsync';
import { Avatar, Header, Loading, ErrorState, Empty } from '../components/UI';
import { timeAgo } from '../utils/format';

/** route.params: { id, kind: 'posts' | 'videos' } */
export default function CommentsScreen({ navigation, route }) {
  const { id, kind = 'posts' } = route.params;
  const { colors } = useTheme();
  const { user } = useAuth();
  const { data, setData, loading, error, reload } = useAsync(() => api.get(`/${kind}/${id}/comments`).then((r) => r.comments), [id]);
  const [text, setText] = useState(''); const [sending, setSending] = useState(false); const [replyTo, setReplyTo] = useState(null);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try { const r = await api.post(`/${kind}/${id}/comments`, { text: text.trim(), parent: replyTo?._id }); setData((d) => [...(d || []), r.comment]); setText(''); setReplyTo(null); }
    catch (e) { Alert.alert('Could not comment', e.message); }
    setSending(false);
  };
  const remove = (c) => Alert.alert('Delete comment?', undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => {
    try { await api.del(`/${kind}/${id}/comments/${c._id}`); setData((d) => d.filter((x) => x._id !== c._id && x.parent !== c._id)); } catch (e) { Alert.alert('Oops', e.message); } } }]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Comments" navigation={navigation} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {loading ? <Loading text="Loading comments..." /> : error ? <ErrorState message={error} onRetry={reload} /> : (
          <FlatList data={data} keyExtractor={(c) => c._id} contentContainerStyle={{ padding: 14 }}
            ListEmptyComponent={<Empty icon="💬" text="No comments yet. Start the conversation!" />}
            renderItem={({ item: c }) => (
              <View style={{ flexDirection: 'row', marginBottom: 16, marginLeft: c.parent ? 36 : 0 }}>
                <Avatar user={c.author} size={c.parent ? 26 : 34} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ color: colors.text, lineHeight: 20 }}><Text style={{ fontWeight: '700' }}>{c.author.username} </Text>{c.text}</Text>
                  <View style={{ flexDirection: 'row', marginTop: 4 }}>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>{timeAgo(c.createdAt)}</Text>
                    <TouchableOpacity onPress={() => { setReplyTo(c.parent ? { _id: c.parent, author: c.author } : c); setText(`@${c.author.username} `); }}><Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', marginLeft: 14 }}>Reply</Text></TouchableOpacity>
                  </View>
                </View>
                {c.author._id === user._id && <TouchableOpacity onPress={() => remove(c)} hitSlop={10}><Ionicons name="trash-outline" size={18} color={colors.muted} /></TouchableOpacity>}
              </View>
            )} />
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10, borderTopWidth: 1, borderColor: colors.border }}>
          <Avatar user={user} size={34} />
          <TextInput value={text} onChangeText={setText} placeholder={replyTo ? `Replying to @${replyTo.author.username}...` : 'Add a comment...'} placeholderTextColor={colors.muted}
            style={{ flex: 1, color: colors.text, marginHorizontal: 10, paddingVertical: 10, fontSize: 15 }} />
          <TouchableOpacity onPress={send} disabled={!text.trim() || sending}><Text style={{ color: colors.primary, fontWeight: '800', opacity: text.trim() ? 1 : 0.4 }}>{sending ? '...' : 'Post'}</Text></TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
