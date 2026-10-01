import React, { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { gradient } from '../theme';

const STYLES = [{ k: 'chill', l: '😎 Chill' }, { k: 'cute', l: '😊 Cute' }, { k: 'smooth', l: '🔥 Smooth' }, { k: 'savage', l: '💀 Savage' }, { k: 'funny', l: '😂 Funny' }, { k: 'romantic', l: '❤️ Romantic' }];
const CATS = [
  { k: 'first_message', icon: '👋', title: 'First Message', hint: 'e.g. I just followed her and don\'t know what to say', ph: 'Who are you messaging? Any details?' },
  { k: 'reply', icon: '💬', title: 'Reply Generator', hint: 'Paste what they sent you', ph: 'Paste their message here...' },
  { k: 'compliment', icon: '💜', title: 'Compliments', hint: 'Cute, romantic, funny or personality-based', ph: 'What do you like about them?' },
  { k: 'starter', icon: '🎯', title: 'Conversation Starter', hint: 'Music, movies, school, sports, travel...', ph: 'Their interests or profile details...' },
  { k: 'screenshot', icon: '📷', title: 'Screenshot Analyzer', hint: 'Upload a chat and get replies', ph: null },
];

function Typing() {
  const dots = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];
  useEffect(() => { dots.forEach((d, i) => Animated.loop(Animated.sequence([Animated.delay(i * 200), Animated.timing(d, { toValue: 1, duration: 400, useNativeDriver: true }), Animated.timing(d, { toValue: 0.3, duration: 400, useNativeDriver: true })])).start()); }, []);
  return <View style={{ flexDirection: 'row', padding: 12 }}>{dots.map((d, i) => <Animated.View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#A855F7', marginRight: 5, opacity: d }} />)}<Text style={{ color: '#94A3B8', marginLeft: 6 }}>Generating rizz...</Text></View>;
}

function ResponseCard({ text, index, colors }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(a, { toValue: 1, duration: 350, delay: index * 120, useNativeDriver: true }).start(); }, []);
  const [copied, setCopied] = useState(false);
  return (
    <Animated.View style={{ opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }], backgroundColor: colors.card, borderRadius: 14, padding: 12, marginTop: 8, borderLeftWidth: 3, borderColor: colors.primary }}>
      <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22 }}>"{text}"</Text>
      <TouchableOpacity onPress={async () => { await Clipboard.setStringAsync(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, alignSelf: 'flex-end' }}>
        <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={colors.primary} /><Text style={{ color: colors.primary, marginLeft: 4, fontWeight: '700' }}>{copied ? 'Copied' : 'Copy'}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function RizzScreen({ navigation }) {
  const { colors } = useTheme();
  const [messages, setMessages] = useState([]); // {role:'user'|'bot', content, responses, style, category}
  const [style, setStyle] = useState('smooth'); const [category, setCategory] = useState('reply');
  const [input, setInput] = useState(''); const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false); const [convoId, setConvoId] = useState(null);
  const [showHome, setShowHome] = useState(true); const [historyLoading, setHL] = useState(true);
  const listRef = useRef(); const last = useRef(null);

  useEffect(() => { // restore latest conversation (conversation history)
    (async () => {
      try {
        const h = await api.get('/rizz/history');
        if (h.conversations?.length) { const c = h.conversations[0]; const m = await api.get(`/rizz/history?conversationId=${c._id}`); if (m.messages.length) { setMessages(m.messages); setConvoId(c._id); setShowHome(false); } }
      } catch {}
      setHL(false);
    })();
  }, []);

  const ask = async (payload) => {
    last.current = payload; setLoading(true); setShowHome(false);
    try {
      const r = await api.post('/rizz/chat', { ...payload, conversationId: convoId });
      setConvoId(r.conversationId);
      setMessages((m) => [...m, { role: 'bot', responses: r.responses, style: payload.style, category: payload.category }]);
    } catch (e) { setMessages((m) => [...m, { role: 'error', content: e.message.includes('Rizz') || e.message.includes('unavailable') ? e.message : `🤖 Rizz Bot is unavailable.\n${e.message}` }]); }
    setLoading(false);
  };

  const send = () => {
    const text = input.trim(); if (!text || loading) return;
    setMessages((m) => [...m, { role: 'user', content: text }]); setInput('');
    ask({ message: text, style, category: category === 'screenshot' ? 'chat' : category, context });
  };
  const regenerate = (styleOverride) => { if (!last.current || loading) return; setMessages((m) => m.filter((x, i) => !(i === m.length - 1 && x.role === 'bot'))); ask({ ...last.current, style: styleOverride || last.current.style }); };
  const analyze = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, base64: true, quality: 0.5 });
    if (r.canceled) return;
    const a = r.assets[0];
    setMessages((m) => [...m, { role: 'user', content: '📷 Screenshot uploaded' }]);
    ask({ message: '', style, category: 'screenshot', image: { data: a.base64, mediaType: a.mimeType || 'image/jpeg' } });
  };
  const clear = () => Alert.alert('Clear chat?', 'This deletes your Rizz Bot history.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Clear', style: 'destructive', onPress: async () => { try { await api.del('/rizz/history'); } catch {} setMessages([]); setConvoId(null); setShowHome(true); last.current = null; } }]);
  const pickCat = (c) => { setCategory(c.k); if (c.k === 'screenshot') analyze(); else { setShowHome(false); } };
  const cat = CATS.find((c) => c.k === category);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}><Ionicons name="chevron-down" size={28} color="#fff" /></TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}><Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>🤖 Rizz Bot</Text><Text style={{ color: '#E0F2FE', fontSize: 12 }}>● Online</Text></View>
        <TouchableOpacity onPress={() => setShowHome(true)} style={{ padding: 6 }}><Ionicons name="apps-outline" size={24} color="#fff" /></TouchableOpacity>
        <TouchableOpacity onPress={clear} style={{ padding: 6 }}><Ionicons name="trash-outline" size={24} color="#fff" /></TouchableOpacity>
      </LinearGradient>

      <View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 10 }}>
        {STYLES.map((s) => <TouchableOpacity key={s.k} onPress={() => setStyle(s.k)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, backgroundColor: style === s.k ? colors.primary : colors.card }}><Text style={{ color: style === s.k ? '#fff' : colors.text, fontWeight: '600' }}>{s.l}</Text></TouchableOpacity>)}
      </ScrollView></View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {historyLoading ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} /> : showHome ? (
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Text style={{ fontSize: 28, fontWeight: '900', color: colors.text }}>🔥 RIZZ BOT</Text>
            <Text style={{ fontSize: 18, color: colors.text, marginTop: 6 }}>Need something smooth to say?</Text>
            <Text style={{ color: colors.muted, marginBottom: 16 }}>I'm here to help.</Text>
            {CATS.map((c) => <TouchableOpacity key={c.k} onPress={() => pickCat(c)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 14, marginBottom: 10 }}>
              <Text style={{ fontSize: 30 }}>{c.icon}</Text>
              <View style={{ marginLeft: 14, flex: 1 }}><Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>{c.title}</Text><Text style={{ color: colors.muted, marginTop: 2 }}>{c.hint}</Text></View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </TouchableOpacity>)}
            {!!messages.length && <TouchableOpacity onPress={() => setShowHome(false)} style={{ alignItems: 'center', padding: 12 }}><Text style={{ color: colors.primary, fontWeight: '700' }}>Back to my chat</Text></TouchableOpacity>}
            <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 10 }}>Rizz Bot only suggests. You choose what to send, and you send it yourself. Be respectful. 💜</Text>
          </ScrollView>
        ) : (
          <FlatList ref={listRef} data={messages} keyExtractor={(_, i) => String(i)} contentContainerStyle={{ padding: 14 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            ListFooterComponent={loading ? <Typing /> : null}
            renderItem={({ item: m, index }) => m.role === 'user' ? (
              <View style={{ alignSelf: 'flex-end', maxWidth: '82%', backgroundColor: colors.bubbleMine, borderRadius: 18, padding: 12, marginBottom: 10 }}><Text style={{ color: '#fff', fontSize: 15 }}>{m.content}</Text></View>
            ) : m.role === 'error' ? (
              <View style={{ alignSelf: 'flex-start', backgroundColor: colors.card, borderRadius: 16, padding: 12, marginBottom: 10 }}><Text style={{ color: colors.text }}>{m.content}</Text>
                <TouchableOpacity onPress={() => regenerate()}><Text style={{ color: colors.primary, fontWeight: '700', marginTop: 8 }}>Try again</Text></TouchableOpacity></View>
            ) : (
              <View style={{ alignSelf: 'flex-start', maxWidth: '92%', marginBottom: 14 }}>
                <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 2 }}>🤖 Rizz Bot · try this:</Text>
                {m.responses.map((r, i) => <ResponseCard key={i} text={r} index={i} colors={colors} />)}
                {index === messages.length - 1 && !loading && <View style={{ marginTop: 10 }}>
                  <TouchableOpacity onPress={() => regenerate()} style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 6 }}><Ionicons name="refresh" size={18} color={colors.primary} /><Text style={{ color: colors.primary, fontWeight: '700', marginLeft: 4 }}>Regenerate</Text></TouchableOpacity>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>{STYLES.filter((s) => s.k !== m.style).slice(0, 5).map((s) => <TouchableOpacity key={s.k} onPress={() => { setStyle(s.k); regenerate(s.k); }} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 6, borderWidth: 1, borderColor: colors.border }}><Text style={{ color: colors.text, fontSize: 12 }}>Make it {s.l}</Text></TouchableOpacity>)}</ScrollView>
                </View>}
              </View>
            )} />
        )}

        {!showHome && <View style={{ borderTopWidth: 1, borderColor: colors.border, padding: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>{CATS.filter((c) => c.k !== 'screenshot').map((c) => <TouchableOpacity key={c.k} onPress={() => setCategory(c.k)} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginRight: 6, backgroundColor: category === c.k ? colors.primary + '33' : 'transparent' }}><Text style={{ color: category === c.k ? colors.primary : colors.muted, fontSize: 12, fontWeight: '700' }}>{c.icon} {c.title}</Text></TouchableOpacity>)}</ScrollView>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={analyze} style={{ padding: 8 }}><Ionicons name="image-outline" size={26} color={colors.primary} /></TouchableOpacity>
            <TextInput value={input} onChangeText={setInput} placeholder={cat?.ph || 'Type your message...'} placeholderTextColor={colors.muted} multiline
              style={{ flex: 1, backgroundColor: colors.card, color: colors.text, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, maxHeight: 100, marginHorizontal: 6 }} />
            <TouchableOpacity onPress={send} disabled={loading || !input.trim()} style={{ opacity: input.trim() && !loading ? 1 : 0.4 }}>
              <LinearGradient colors={gradient} style={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="send" size={20} color="#fff" /></LinearGradient>
            </TouchableOpacity>
          </View>
        </View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
