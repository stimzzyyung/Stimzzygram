import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api, fileFromAsset } from '../services/api';
import { getSocket } from '../services/socket';
import { Avatar, Header, Loading, ErrorState, Empty, VerifiedBadge } from '../components/UI';
import { timeAgo } from '../utils/format';
import { TRANSLATION_LANGUAGES } from '../data/locales';
import InlineVideoPlayer from '../components/InlineVideoPlayer';

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
  const [translatorEnabled, setTranslatorEnabled] = useState(false); const [translations, setTranslations] = useState({});
  const [translationModal, setTranslationModal] = useState(null); const [translationTarget, setTranslationTarget] = useState('English');
  const [languagePickerVisible, setLanguagePickerVisible] = useState(false); const [languageSearch, setLanguageSearch] = useState('');
  const [translationValue, setTranslationValue] = useState(''); const [translationBusy, setTranslationBusy] = useState(false);
  const [scheduleVisible, setScheduleVisible] = useState(false); const [scheduleDate, setScheduleDate] = useState(''); const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const listRef = useRef(); const typingTimer = useRef();

  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.all([AsyncStorage.getItem('translatorEnabled'), AsyncStorage.getItem('translationTarget')])
      .then(([enabled, target]) => {
        if (!active) return;
        setTranslatorEnabled(enabled === 'true');
        if (target && TRANSLATION_LANGUAGES.includes(target)) setTranslationTarget(target);
      })
      .catch((e) => { if (active) Alert.alert('Could not load setting', e.message || 'The translator setting could not be loaded.'); });
    return () => { active = false; };
  }, []));

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
    const onScheduledFail = (p) => Alert.alert('Scheduled message failed', p.message || 'Your scheduled message could not be sent.');
    s.on('message:new', onNew); s.on('message:update', onUpd); s.on('typing', onTyping); s.on('presence', onPres); s.on('message:read', onRead); s.on('message:scheduled:failed', onScheduledFail);
    return () => { s.off('message:new', onNew); s.off('message:update', onUpd); s.off('typing', onTyping); s.off('presence', onPres); s.off('message:read', onRead); s.off('message:scheduled:failed', onScheduledFail); };
  }, [other._id]);

  const onChange = (t) => { setText(t); getSocket()?.emit('typing', { to: other._id, isTyping: true }); clearTimeout(typingTimer.current); typingTimer.current = setTimeout(() => getSocket()?.emit('typing', { to: other._id, isTyping: false }), 1500); };

  const send = async (media) => {
    if (!media && !text.trim()) return;
    if (sending) return;
    setSending(true);
    const form = new FormData();
    form.append('to', other._id); if (text.trim()) form.append('text', text.trim()); if (replyTo) form.append('replyTo', replyTo._id); if (media) form.append('media', media);
    try { const r = await api.form('POST', '/messages', form); setMessages((ms) => (ms?.some((x) => x._id === r.message._id) ? ms : [...(ms || []), r.message])); setText(''); setReplyTo(null); }
    catch (e) { Alert.alert('😕 Message failed', e.message); }
    setSending(false);
  };
  const sendSelectedMedia = async (assets) => {
    if (!assets.length || sending) return;
    setSending(true);
    const draft = text.trim();
    let sent = 0;
    try {
      for (const asset of assets) {
        const form = new FormData();
        form.append('to', other._id);
        if (sent === 0 && draft) form.append('text', draft);
        if (sent === 0 && replyTo) form.append('replyTo', replyTo._id);
        form.append('media', fileFromAsset(asset, 'chat'));

        const result = await api.form('POST', '/messages', form);
        setMessages((current) => current?.some((message) => message._id === result.message._id)
          ? current
          : [...(current || []), result.message]);
        sent += 1;
        if (sent === 1) {
          if (draft) setText((current) => current === draft ? '' : current);
          setReplyTo(null);
        }
      }
    } catch (error) {
      const detail = error?.message || 'Please try again.';
      Alert.alert(
        sent ? 'Some media could not be sent' : 'Media send failed',
        sent ? `Sent ${sent} of ${assets.length} items. ${detail}` : detail,
      );
    } finally {
      setSending(false);
    }
  };
  const openTranslator = (source) => {
    setTranslationModal(source);
    setTranslationValue('');
    setLanguagePickerVisible(false);
    setLanguageSearch('');
  };
  const selectTranslationLanguage = async (language) => {
    setTranslationTarget(language);
    setLanguagePickerVisible(false);
    setLanguageSearch('');
    try {
      await AsyncStorage.setItem('translationTarget', language);
    } catch (e) {
      Alert.alert('Could not save language', e.message || 'Your language choice could not be saved.');
    }
  };
  const translate = async () => {
    if (!translationModal || !translationTarget.trim()) return;
    setTranslationBusy(true);
    try {
      const result = await api.post('/messages/translate', { text: translationModal.text, targetLanguage: translationTarget.trim() });
      if (translationModal.kind === 'message') {
        setTranslations((current) => ({ ...current, [translationModal.messageId]: result.translation }));
        setTranslationModal(null);
      } else {
        setTranslationValue(result.translation);
      }
    } catch (e) {
      Alert.alert('Translation failed', e.message);
    } finally {
      setTranslationBusy(false);
    }
  };
  const applyDraftTranslation = () => {
    if (translationValue) setText(translationValue);
    setTranslationModal(null);
  };
  const sendOptions = () => {
    if (!text.trim() || sending) return;
    Alert.alert('Message options', undefined, [
      ...(translatorEnabled ? [{ text: 'Translate draft', onPress: () => openTranslator({ kind: 'draft', text: text.trim() }) }] : []),
      { text: 'Schedule message', onPress: () => {
        const when = new Date(Date.now() + 2 * 60 * 1000);
        when.setSeconds(0, 0);
        setScheduleDate(`${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}-${String(when.getDate()).padStart(2, '0')}`);
        setScheduleTime(`${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}`);
        setScheduleVisible(true);
      } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };
  const scheduleMessage = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduleDate) || !/^\d{2}:\d{2}$/.test(scheduleTime)) {
      Alert.alert('Invalid date or time', 'Use YYYY-MM-DD for the date and 24-hour HH:MM for the time.');
      return;
    }
    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}:00`);
    if (!Number.isFinite(scheduledAt.getTime())
      || scheduledAt.getFullYear() !== Number(scheduleDate.slice(0, 4))
      || scheduledAt.getMonth() + 1 !== Number(scheduleDate.slice(5, 7))
      || scheduledAt.getDate() !== Number(scheduleDate.slice(8, 10))
      || scheduledAt.getHours() !== Number(scheduleTime.slice(0, 2))
      || scheduledAt.getMinutes() !== Number(scheduleTime.slice(3, 5))
      || scheduledAt <= new Date()) {
      Alert.alert('Invalid date or time', 'Choose a valid time in the future.');
      return;
    }
    setScheduleBusy(true);
    try {
      await api.post('/messages/scheduled', { to: other._id, text: text.trim(), replyTo: replyTo?._id, scheduledAt: scheduledAt.toISOString() });
      setScheduleVisible(false);
      setText('');
      setReplyTo(null);
      Alert.alert('Message scheduled', `It will be sent ${scheduledAt.toLocaleString()}.`);
    } catch (e) {
      Alert.alert('Could not schedule message', e.message);
    } finally {
      setScheduleBusy(false);
    }
  };
  const pickMedia = async () => {
    if (sending) return;
    try {
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 0.7,
      });
      if (r.canceled || !r.assets?.length) return;
      await sendSelectedMedia(r.assets);
    } catch (error) {
      Alert.alert('Image upload failed', error?.message || 'Please try again.');
    }
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
                  <View style={{ flexDirection: mine ? 'row-reverse' : 'row', alignItems: 'center', maxWidth: '100%' }}>
                    <TouchableOpacity activeOpacity={0.8} onLongPress={() => actions(m)} style={{ maxWidth: '78%', backgroundColor: mine ? colors.bubbleMine : colors.bubbleTheirs, borderRadius: 18, padding: m.mediaType === 'image' ? 4 : 12 }}>
                      {!!m.replyTo && <View style={{ borderLeftWidth: 3, borderColor: colors.accent, paddingLeft: 8, marginBottom: 6, opacity: 0.8 }}><Text style={{ color: fg, fontSize: 12 }} numberOfLines={1}>{m.replyTo.text || `📎 ${m.replyTo.mediaType}`}</Text></View>}
                      {m.deleted ? <Text style={{ color: fg, fontStyle: 'italic', opacity: 0.7 }}>Message deleted</Text> : <>
                        {m.mediaType === 'image' && <Image source={{ uri: m.mediaUrl }} style={{ width: 220, height: 220, borderRadius: 14 }} />}
                        {m.mediaType === 'video' && <InlineVideoPlayer source={{ uri: m.mediaUrl }} style={{ width: 220, height: 220, borderRadius: 14 }} autoPlay={false} isLooping={false} />}
                        {m.mediaType === 'audio' && <VoiceBubble uri={m.mediaUrl} color={fg} />}
                        {!!m.text && <Text style={{ color: fg, fontSize: 16 }}>{m.text}</Text>}
                        {!!translations[m._id] && <Text style={{ color: fg, fontSize: 15, marginTop: 8, paddingTop: 7, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.35)' }}>{translations[m._id]}</Text>}
                      </>}
                    </TouchableOpacity>
                    {translatorEnabled && !!m.text && !m.deleted && <TouchableOpacity accessibilityLabel="Translate message" onPress={() => openTranslator({ kind: 'message', text: m.text, messageId: m._id })} style={{ padding: 5, marginHorizontal: 2 }}>
                      <Ionicons name="language-outline" size={17} color={colors.muted} />
                    </TouchableOpacity>}
                  </View>
                  {m.reactions?.length > 0 && <Text style={{ marginTop: -6, backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 6, overflow: 'hidden' }}>{m.reactions.map((r) => r.emoji).join('')}</Text>}
                  {isLastMine && <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>{seen ? 'Seen ✓✓' : 'Sent ✓'}</Text>}
                </View>
              );
            }} />
        )}
        {replyTo && <View style={{ flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: colors.card }}><Text style={{ flex: 1, color: colors.muted }} numberOfLines={1}>Replying to: {replyTo.text || `📎 ${replyTo.mediaType}`}</Text><TouchableOpacity onPress={() => setReplyTo(null)}><Ionicons name="close" size={20} color={colors.muted} /></TouchableOpacity></View>}
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 8, borderTopWidth: 1, borderColor: colors.border }}>
          <TouchableOpacity accessibilityLabel="Attach up to 10 photos or videos" onPress={pickMedia} disabled={sending} style={{ padding: 6, opacity: sending ? 0.5 : 1 }}><Ionicons name="image-outline" size={26} color={colors.primary} /></TouchableOpacity>
          <TouchableOpacity onPress={toggleRecord} style={{ padding: 6 }}><Ionicons name={recording ? 'stop-circle' : 'mic-outline'} size={26} color={recording ? colors.danger : colors.primary} /></TouchableOpacity>
          <TextInput value={text} onChangeText={onChange} placeholder={recording ? 'Recording... tap ⏹ to send' : 'Message...'} placeholderTextColor={colors.muted} editable={!recording}
            style={{ flex: 1, backgroundColor: colors.card, color: colors.text, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: 6 }} />
          <TouchableOpacity accessibilityLabel="Send message. Long press for translation and scheduling options." onPress={() => send()} onLongPress={sendOptions} disabled={sending || !text.trim()} style={{ padding: 6, opacity: text.trim() ? 1 : 0.4 }}><Ionicons name="send" size={24} color={colors.primary} /></TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <Modal visible={!!translationModal} transparent animationType="fade" onRequestClose={() => setTranslationModal(null)}>
        <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.55)' }}>
          <View style={{ backgroundColor: colors.bg, borderRadius: 18, padding: 20 }}>
            {languagePickerVisible ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <TouchableOpacity accessibilityLabel="Back to translation" onPress={() => { setLanguagePickerVisible(false); setLanguageSearch(''); }} style={{ padding: 6, marginRight: 8 }}>
                    <Ionicons name="chevron-back" size={22} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Choose language</Text>
                </View>
                <TextInput value={languageSearch} onChangeText={setLanguageSearch} placeholder="Search languages" placeholderTextColor={colors.muted}
                  autoCapitalize="none" style={{ backgroundColor: colors.card, color: colors.text, borderRadius: 10, padding: 12, marginBottom: 10 }} />
                <FlatList
                  data={TRANSLATION_LANGUAGES.filter((language) => language.toLowerCase().includes(languageSearch.trim().toLowerCase()))}
                  keyExtractor={(language) => language}
                  keyboardShouldPersistTaps="handled"
                  style={{ maxHeight: 360 }}
                  ListEmptyComponent={<Text style={{ color: colors.muted, padding: 12 }}>No matching language.</Text>}
                  renderItem={({ item: language }) => (
                    <TouchableOpacity onPress={() => selectTranslationLanguage(language)} style={{ paddingVertical: 12, paddingHorizontal: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: colors.text }}>{language}</Text>
                      {translationTarget === language && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                    </TouchableOpacity>
                  )}
                />
              </>
            ) : (
              <>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>{translationModal?.kind === 'draft' ? 'Translate draft' : 'Translate message'}</Text>
                <Text style={{ color: colors.muted, marginBottom: 12 }} numberOfLines={3}>{translationModal?.text}</Text>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Target language: ${translationTarget}`} onPress={() => setLanguagePickerVisible(true)}
                  style={{ backgroundColor: colors.card, borderRadius: 10, padding: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.text }}>{translationTarget}</Text>
                  <Ionicons name="chevron-down" size={20} color={colors.muted} />
                </TouchableOpacity>
                {!!translationValue && translationModal?.kind === 'draft' && <Text style={{ color: colors.text, marginBottom: 12 }}>{translationValue}</Text>}
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                  <TouchableOpacity onPress={() => setTranslationModal(null)} style={{ padding: 10 }}><Text style={{ color: colors.muted }}>Cancel</Text></TouchableOpacity>
                  {translationModal?.kind === 'draft' && !!translationValue && <TouchableOpacity onPress={applyDraftTranslation} style={{ padding: 10 }}><Text style={{ color: colors.primary, fontWeight: '700' }}>Use translation</Text></TouchableOpacity>}
                  <TouchableOpacity onPress={translate} disabled={translationBusy || !translationTarget.trim()} style={{ padding: 10, opacity: translationBusy ? 0.5 : 1 }}><Text style={{ color: colors.primary, fontWeight: '700' }}>{translationBusy ? 'Translating...' : 'Translate'}</Text></TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
      <Modal visible={scheduleVisible} transparent animationType="fade" onRequestClose={() => setScheduleVisible(false)}>
        <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.55)' }}>
          <View style={{ backgroundColor: colors.bg, borderRadius: 18, padding: 20 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Schedule message</Text>
            <Text style={{ color: colors.muted, marginBottom: 14 }}>Enter the local date and time to send.</Text>
            <TextInput value={scheduleDate} onChangeText={setScheduleDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} keyboardType="numbers-and-punctuation"
              style={{ backgroundColor: colors.card, color: colors.text, borderRadius: 10, padding: 12, marginBottom: 10 }} />
            <TextInput value={scheduleTime} onChangeText={setScheduleTime} placeholder="HH:MM (24-hour)" placeholderTextColor={colors.muted} keyboardType="numbers-and-punctuation"
              style={{ backgroundColor: colors.card, color: colors.text, borderRadius: 10, padding: 12, marginBottom: 12 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={() => setScheduleVisible(false)} style={{ padding: 10 }}><Text style={{ color: colors.muted }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={scheduleMessage} disabled={scheduleBusy} style={{ padding: 10, opacity: scheduleBusy ? 0.5 : 1 }}><Text style={{ color: colors.primary, fontWeight: '700' }}>{scheduleBusy ? 'Scheduling...' : 'Schedule'}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
