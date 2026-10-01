import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio, Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api, fileFromAsset } from '../services/api';
import { getSocket } from '../services/socket';
import { Avatar, Header, Loading, ErrorState, Empty, VerifiedBadge } from '../components/UI';
import { timeAgo } from '../utils/format';

export function InboxScreen({ navigation }) {
  const { colors } = useTheme();
  const [list, setList] = useState(null); const [error, setError] = useState(null); const [online, setOnline] = useState({});
  const load = useCallback(() => { setError(null); api.get('/conversations').then((r) => setList(r.conversations)).catch((e) => setError(e.message)); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => {
    const s = getSocket(); if (!s) return;
    const onMsg = () => load(); const onPres = (p) => setOnline((o) => ({ ...o, [p.userId]: p.online }));
    s.on('message:new', onMsg); s.on('presence', onPres);
    return () => { s.off('message:new', onMsg); s.off('presence', onPres); };
  }, [load]);
  useEffect(() => { const s = getSocket(); list && s?.emit('presence:check', list.map((c) => c.user._id), (r) => setOnline(Object.fromEntries(r.map((x) => [x.userId, x.online])))); }, [list?.length]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Messages" navigation={navigation} />
      {error && !list ? <ErrorState message={error} onRetry={load} /> : !list ? <Loading text="Loading messages..." /> : (
        <FlatList data={list} keyExtractor={(c) => c._id} ListEmptyComponent={<Empty icon="💌" text={'No messages yet.\nVisit a profile and tap Message to start chatting.'} />}
          renderItem={({ item: c }) => (
            <TouchableOpacity onPress={() => navigation.navigate('Chat', { user: c.user })} style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}>
              <View><Avatar user={c.user} size={54} />{online[c.user._id] && <View style={{ position: 'absolute', right: 0, bottom: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: '#22C55E', borderWidth: 2, borderColor: colors.bg }} />}</View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={{ color: colors.text, fontWeight: '700' }}>{c.user.username}</Text>{c.user.isVerified && <VerifiedBadge />}</View>
                <Text numberOfLines={1} style={{ color: c.unread ? colors.text : colors.muted, fontWeight: c.unread ? '700' : '400', marginTop: 2 }}>{c.lastMessage?.deleted ? 'Message deleted' : c.lastMessage?.text || (c.lastMessage?.mediaType ? `📎 ${c.lastMessage.mediaType}` : '')}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: colors.muted, fontSize: 12 }}>{timeAgo(c.updatedAt)}</Text>
                {c.unread > 0 && <View style={{ backgroundColor: colors.primary, minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 6 }}><Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{c.unread}</Text></View>}
              </View>
            </TouchableOpacity>
          )} />
      )}
    </SafeAreaView>
  );
}

const REACTIONS = ['❤️', '😂', '😮', '😢', '🔥', '👍'];

function VoiceBubble({ uri, color }) {
  const [sound, setSound] = useState(null); const [playing, setPlaying] = useState(false);
  useEffect(() => () => { sound?.unloadAsync(); }, [sound]);
  const toggle = async () => {
    if (sound) { playing ? await sound.pauseAsync() : await sound.playAsync(); return; }
    const { sound: s } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true }, (st) => { setPlaying(st.isPlaying); if (st.didJustFinish) s.setPositionAsync(0); });
    setSound(s);
  };
  return <TouchableOpacity onPress={toggle} style={{ flexDirection: 'row', alignItems: 'center' }}><Ionicons name={playing ? 'pause-circle' : 'play-circle'} size={34} color={color} /><Text style={{ color, marginLeft: 6 }}>Voice message</Text></TouchableOpacity>;
}

export function ChatScreen({ navigation, route }) {
  const other = route.params.user;
  const { colors } = useTheme(); const { user: me } = useAuth();
  const [messages, setMessages] = useState(null); const [convoId, setConvoId] = useState(null); const [error, setError] = useState(null);
  const [text, setText] = useState(''); const [replyTo, setReplyTo] = useState(null); const [typing, setTyping] = useState(false);
  const [online, setOnline] = useState(false); const [sending, setSending] = useState(false); const [recording, setRecording] = useState(null);
  const listRef = useRef(); const typingTimer = useRef();

  const load = useCallback(async () => {
    setError(null);
    try { const r = await api.get(`/messages/with/${other._id}`); setMessages(r.messages); setConvoId(r.conversationId); if (r.conversationId) api.post(`/conversations/${r.conversationId}/read`).catch(() => {}); }
    catch (e) { setError(e.message); }
  }, [other._id]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const s = getSocket(); if (!s) return;
    s.emit('presence:check', [other._id], (r) => setOnline(!!r?.[0]?.online));
    const onNew = (m) => {
      if (![m.sender._id, m.sender].includes(other._id) && m.sender._id !== me._id) return;
      setMessages((ms) => (ms?.some((x) => x._id === m._id) ? ms : [...(ms || []), m]));
      setConvoId((c) => { c && m.sender._id === other._id && api.post(`/conversations/${c}/read`).catch(() => {}); return c; });
    };
    const onUpd = (m) => setMessages((ms) => ms?.map((x) => (x._id === m._id ? { ...x, ...m } : x)));
    const onTyping = (p) => p.from === other._id && setTyping(p.isTyping);
    const onPres = (p) => p.userId === other._id && setOnline(p.online);
    const onRead = (p) => p.by === other._id && setMessages((ms) => ms?.map((x) => ({ ...x, readBy: [...new Set([...(x.readBy || []), other._id])] })));
    s.on('message:new', onNew); s.on('message:update', onUpd); s.on('typing', onTyping); s.on('presence', onPres); s.on('message:read', onRead);
    return () => { s.off('message:new', onNew); s.off('message:update', onUpd); s.off('typing', onTyping); s.off('presence', onPres); s.off('message:read', onRead); };
  }, [other._id]);

  const onChange = (t) => { setText(t); getSocket()?.emit('typing', { to: other._id, isTyping: true }); clearTimeout(typingTimer.current); typingTimer.current = setTimeout(() => getSocket()?.emit('typing', { to: other._id, isTyping: false }), 1500); };

  const send = async (media) => {
    if (!media && !text.trim()) return;
    setSending(true);
    const form = new FormData();
    form.append('to', other._id); if (text.trim()) form.append('text', text.trim()); if (replyTo) form.append('replyTo', replyTo._id); if (media) form.append('media', media);
    try { const r = await api.form('POST', '/messages', form); setMessages((ms) => (ms?.some((x) => x._id === r.message._id) ? ms : [...(ms || []), r.message])); setText(''); setReplyTo(null); }
    catch (e) { Alert.alert('😕 Message failed', e.message); }
    setSending(false);
  };
  const pickMedia = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.7 });
    if (!r.canceled) send(fileFromAsset(r.assets[0], 'chat'));
  };
  const toggleRecord = async () => {
    try {
      if (recording) { await recording.stopAndUnloadAsync(); const uri = recording.getURI(); setRecording(null); await Audio.setAudioModeAsync({ allowsRecordingIOS: false }); send({ uri, name: 'voice.m4a', type: 'audio/m4a' }); return; }
      const p = await Audio.requestPermissionsAsync(); if (!p.granted) return Alert.alert('Microphone needed', 'Allow microphone access to send voice messages.');
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY); setRecording(rec);
    } catch { Alert.alert('Recording failed', 'Please try again.'); setRecording(null); }
  };
  const actions = (m) => {
    const mine = (m.sender._id || m.sender) === me._id; if (m.deleted) return;
    Alert.alert('Message', undefined, [
      ...REACTIONS.map((emoji) => ({ text: emoji, onPress: () => api.post(`/messages/${m._id}/react`, { emoji }).catch(() => {}) })),
      { text: 'Reply', onPress: () => setReplyTo(m) },
      ...(mine ? [{ text: 'Delete', style: 'destructive', onPress: () => api.del(`/messages/${m._id}`).catch((e) => Alert.alert('Oops', e.message)) }] : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header navigation={navigation} title={other.username} right={<Text style={{ color: typing ? colors.accent : online ? '#22C55E' : colors.muted, fontSize: 12, marginRight: 12 }}>{typing ? 'typing...' : online ? '● Online' : 'Offline'}</Text>} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {error && !messages ? <ErrorState message={error} onRetry={load} /> : !messages ? <Loading text="Loading chat..." /> : (
          <FlatList ref={listRef} data={messages} keyExtractor={(m) => m._id} contentContainerStyle={{ padding: 12 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={<Empty icon="👋" text={`Say hi to ${other.username}!`} />}
            renderItem={({ item: m, index }) => {
              const mine = (m.sender._id || m.sender) === me._id;
              const fg = mine ? '#fff' : colors.text;
              const seen = mine && m.readBy?.includes(other._id);
              const isLastMine = mine && index === messages.map((x) => (x.sender._id || x.sender) === me._id).lastIndexOf(true);
              return (
                <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
                  <TouchableOpacity activeOpacity={0.8} onLongPress={() => actions(m)} style={{ maxWidth: '78%', backgroundColor: mine ? colors.bubbleMine : colors.bubbleTheirs, borderRadius: 18, padding: m.mediaType === 'image' ? 4 : 12 }}>
                    {!!m.replyTo && <View style={{ borderLeftWidth: 3, borderColor: colors.accent, paddingLeft: 8, marginBottom: 6, opacity: 0.8 }}><Text style={{ color: fg, fontSize: 12 }} numberOfLines={1}>{m.replyTo.text || `📎 ${m.replyTo.mediaType}`}</Text></View>}
                    {m.deleted ? <Text style={{ color: fg, fontStyle: 'italic', opacity: 0.7 }}>Message deleted</Text> : <>
                      {m.mediaType === 'image' && <Image source={{ uri: m.mediaUrl }} style={{ width: 220, height: 220, borderRadius: 14 }} />}
                      {m.mediaType === 'video' && <Video source={{ uri: m.mediaUrl }} style={{ width: 220, height: 220, borderRadius: 14 }} useNativeControls resizeMode={ResizeMode.COVER} />}
                      {m.mediaType === 'audio' && <VoiceBubble uri={m.mediaUrl} color={fg} />}
                      {!!m.text && <Text style={{ color: fg, fontSize: 16 }}>{m.text}</Text>}
                    </>}
                  </TouchableOpacity>
                  {m.reactions?.length > 0 && <Text style={{ marginTop: -6, backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 6, overflow: 'hidden' }}>{m.reactions.map((r) => r.emoji).join('')}</Text>}
                  {isLastMine && <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>{seen ? 'Seen ✓✓' : 'Sent ✓'}</Text>}
                </View>
              );
            }} />
        )}
        {replyTo && <View style={{ flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: colors.card }}><Text style={{ flex: 1, color: colors.muted }} numberOfLines={1}>Replying to: {replyTo.text || `📎 ${replyTo.mediaType}`}</Text><TouchableOpacity onPress={() => setReplyTo(null)}><Ionicons name="close" size={20} color={colors.muted} /></TouchableOpacity></View>}
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 8, borderTopWidth: 1, borderColor: colors.border }}>
          <TouchableOpacity onPress={pickMedia} style={{ padding: 6 }}><Ionicons name="image-outline" size={26} color={colors.primary} /></TouchableOpacity>
          <TouchableOpacity onPress={toggleRecord} style={{ padding: 6 }}><Ionicons name={recording ? 'stop-circle' : 'mic-outline'} size={26} color={recording ? colors.danger : colors.primary} /></TouchableOpacity>
          <TextInput value={text} onChangeText={onChange} placeholder={recording ? 'Recording... tap ⏹ to send' : 'Message...'} placeholderTextColor={colors.muted} editable={!recording}
            style={{ flex: 1, backgroundColor: colors.card, color: colors.text, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: 6 }} />
          <TouchableOpacity onPress={() => send()} disabled={sending || !text.trim()} style={{ padding: 6, opacity: text.trim() ? 1 : 0.4 }}><Ionicons name="send" size={24} color={colors.primary} /></TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
