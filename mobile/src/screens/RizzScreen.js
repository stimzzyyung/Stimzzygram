import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { palette, gradient, burgundyGradient } from '../theme';

const STYLES = [
  { k: 'flirty', l: '😏 Flirty' },
  { k: 'funny', l: '😂 Funny' },
  { k: 'confident', l: '👑 Confident' },
  { k: 'romantic', l: '❤️ Romantic' },
  { k: 'cute', l: '😊 Cute' },
  { k: 'savage', l: '💀 Savage' },
  { k: 'chill', l: '😎 Chill' },
  { k: 'smooth', l: '🔥 Smooth' },
];

const CATS = [
  { k: 'reply', icon: '💬', title: 'What should I reply?', hint: 'Paste what they sent you', ph: 'Paste their message here...' },
  { k: 'dating_reply', icon: '💘', title: 'Dating Reply', hint: 'Dating app & DM responses', ph: 'What did they say?' },
  { k: 'first_message', icon: '👋', title: 'First Message', hint: 'Catchy opener to send first', ph: 'Who are you messaging? Any details?' },
  { k: 'conversation_starter', icon: '🎯', title: 'Conversation Starter', hint: 'Break the ice with charisma', ph: 'Their interests, vibe or details...' },
  { k: 'romantic', icon: '🌹', title: 'Romantic', hint: 'Heartfelt & charming vibes', ph: 'What do you want to express?' },
  { k: 'flirty', icon: '🥂', title: 'Flirty', hint: 'Playful banter & allure', ph: 'What text are you flirting back to?' },
  { k: 'funny', icon: '🤣', title: 'Funny', hint: 'Lighthearted & hilarious comebacks', ph: 'What did they say?' },
  { k: 'confident', icon: '⚡', title: 'Confident', hint: 'Self-assured high-value energy', ph: 'Message to respond to...' },
  { k: 'savage', icon: '🔥', title: 'Savage Teasing', hint: 'Playful roasts & witty checkmates', ph: 'What did they challenge you with?' },
  { k: 'cute', icon: '✨', title: 'Cute & Wholesome', hint: 'Warm and adorable', ph: 'What do you want to say?' },
  { k: 'screenshot', icon: '📷', title: 'Screenshot Analyzer', hint: 'Upload a chat screenshot for AI analysis', ph: null },
];

function Typing() {
  const dots = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];
  useEffect(() => {
    dots.forEach((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(d, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0.3, duration: 350, useNativeDriver: true }),
        ])
      ).start()
    );
  }, []);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}>
      {dots.map((d, i) => (
        <Animated.View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette.gold, marginRight: 5, opacity: d }} />
      ))}
      <Text style={{ color: palette.gold, marginLeft: 6, fontWeight: '600' }}>Rizz Bot is cooking up replies...</Text>
    </View>
  );
}

const ResponseCard = React.memo(function ResponseCard({ text, index, colors, onInsert }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 350, delay: index * 100, useNativeDriver: true }).start();
  }, []);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Animated.View
      style={{
        opacity: a,
        transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 14,
        marginTop: 10,
        borderLeftWidth: 4,
        borderColor: palette.gold,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 16, lineHeight: 23, fontWeight: '500' }}>"{text}"</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 10 }}>
        {onInsert && (
          <TouchableOpacity
            onPress={() => onInsert(text)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.primary + '20',
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 10,
              marginRight: 8,
            }}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={15} color={colors.primary} />
            <Text style={{ color: colors.primary, marginLeft: 4, fontWeight: '700', fontSize: 13 }}>Use in Chat</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={copy}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: copied ? '#22C55E20' : colors.primary + '18',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 10,
          }}
        >
          <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={15} color={copied ? '#22C55E' : colors.primary} />
          <Text style={{ color: copied ? '#22C55E' : colors.primary, marginLeft: 5, fontWeight: '700', fontSize: 13 }}>
            {copied ? 'Copied!' : 'Copy'}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

const RizzMessageItem = React.memo(function RizzMessageItem({
  message,
  colors,
  showActions,
  onInsertReply,
  onRegenerate,
  onModifier,
}) {
  if (message.role === 'user') {
    return (
      <View
        style={{
          alignSelf: 'flex-end',
          maxWidth: '85%',
          backgroundColor: colors.bubbleMine,
          borderRadius: 18,
          padding: 14,
          marginBottom: 12,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 15 }}>{message.content}</Text>
      </View>
    );
  }

  if (message.role === 'error') {
    return (
      <View
        style={{
          alignSelf: 'flex-start',
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 14,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: colors.danger,
        }}
      >
        <Text style={{ color: colors.text }}>{message.content}</Text>
        <TouchableOpacity onPress={onRegenerate} style={{ marginTop: 8 }}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ alignSelf: 'flex-start', width: '100%', marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
        <Ionicons name="sparkles" size={16} color={palette.gold} style={{ marginRight: 6 }} />
        <Text style={{ color: palette.gold, fontSize: 13, fontWeight: '700' }}>Rizz Bot Suggestions:</Text>
      </View>

      {(Array.isArray(message.responses) ? message.responses : []).map((response, index) => (
        <ResponseCard
          key={`${message._id || 'response'}-${index}`}
          text={response}
          index={index}
          colors={colors}
          onInsert={onInsertReply}
        />
      ))}

      {showActions && (
        <View style={{ marginTop: 14 }}>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' }}>
            Tweak These Replies:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              onPress={onRegenerate}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.card,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 16,
                marginRight: 6,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Ionicons name="refresh" size={15} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Regenerate</Text>
            </TouchableOpacity>

            {[
              ['more_flirty', '😉 More Flirty'],
              ['more_funny', '😂 More Funny'],
              ['more_confident', '👑 More Confident'],
              ['make_shorter', '✂️ Make It Shorter'],
            ].map(([modifier, label]) => (
              <TouchableOpacity
                key={modifier}
                onPress={() => onModifier(modifier)}
                style={{
                  backgroundColor: colors.card,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 16,
                  marginRight: 6,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
});

export default function RizzScreen({ navigation, route }) {
  const { colors } = useTheme();
  const initialIncoming = route.params?.incomingMessage || '';
  const targetChatKey = route.params?.targetChatKey;

  const [messages, setMessages] = useState([]);
  const [style, setStyle] = useState('smooth');
  const [category, setCategory] = useState(initialIncoming ? 'reply' : 'reply');
  const [input, setInput] = useState(initialIncoming ? `"${initialIncoming}"` : '');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [convoId, setConvoId] = useState(null);
  const [showHome, setShowHome] = useState(!initialIncoming);
  const [historyLoading, setHL] = useState(true);

  const listRef = useRef();
  const lastPayload = useRef(null);
  const regenerateRef = useRef(null);
  const modifierRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const h = await api.get('/rizz/history');
        if (h.conversations?.length) {
          const c = h.conversations[0];
          const m = await api.get(`/rizz/history?conversationId=${c._id}`);
          if (Array.isArray(m.messages) && m.messages.length) {
            setMessages(m.messages);
            setConvoId(c._id);
            if (!initialIncoming) setShowHome(false);
          }
        }
      } catch {}
      setHL(false);
    })();
  }, []);

  const ask = async (payload) => {
    lastPayload.current = payload;
    setLoading(true);
    setShowHome(false);
    try {
      const r = await api.post('/rizz/chat', { ...payload, conversationId: convoId });
      setConvoId(r.conversationId);
      setMessages((m) => [
        ...m,
        {
          role: 'bot',
          responses: Array.isArray(r.responses) ? r.responses : [],
          style: payload.style,
          category: payload.category,
        },
      ]);
    } catch (error) {
      const message = error?.message || 'Please try again.';
      setMessages((m) => [
        ...m,
        {
          role: 'error',
          content: message.includes('Rizz') ? message : `🤖 Rizz Bot: ${message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const send = (overrideText, modifier) => {
    const text = (overrideText !== undefined ? overrideText : input).trim();
    if (!text && !modifier) return;
    if (text) {
      setMessages((m) => [...m, { role: 'user', content: text }]);
      setInput('');
    }
    ask({
      message: text || lastPayload.current?.message || '',
      style,
      category,
      context,
      modifier: modifier || '',
    });
  };

  const handleModifier = (modifier) => {
    if (loading) return;
    send(undefined, modifier);
  };

  const regenerate = () => {
    if (!lastPayload.current || loading) return;
    setMessages((m) => m.filter((x, i) => !(i === m.length - 1 && x.role === 'bot')));
    ask(lastPayload.current);
  };

  regenerateRef.current = regenerate;
  modifierRef.current = handleModifier;

  const onRegenerate = useCallback(() => regenerateRef.current?.(), []);
  const onModifier = useCallback((modifier) => modifierRef.current?.(modifier), []);
  const onInsertReply = useCallback((chosen) => {
    if (!targetChatKey) return;
    navigation.navigate({
      name: 'Chat',
      key: targetChatKey,
      params: { draftReply: chosen },
      merge: true,
    });
  }, [navigation, targetChatKey]);
  const renderMessage = useCallback(({ item, index }) => (
    <RizzMessageItem
      message={item}
      colors={colors}
      showActions={index === messages.length - 1 && !loading}
      onInsertReply={targetChatKey ? onInsertReply : null}
      onRegenerate={onRegenerate}
      onModifier={onModifier}
    />
  ), [colors, loading, messages.length, onInsertReply, onModifier, onRegenerate, targetChatKey]);

  const analyze = async () => {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        base64: true,
        quality: 0.6,
      });
      if (r.canceled || !r.assets?.length) return;
      const asset = r.assets[0];
      setMessages((m) => [...m, { role: 'user', content: '📷 Analyzing chat screenshot...' }]);
      ask({
        message: '',
        style,
        category: 'screenshot',
        image: { data: asset.base64, mediaType: asset.mimeType || 'image/jpeg' },
      });
    } catch (error) {
      Alert.alert('Screenshot error', error?.message || 'Could not process screenshot.');
    }
  };

  const pasteClipboard = async () => {
    const hasString = await Clipboard.hasStringAsync();
    if (hasString) {
      const clip = await Clipboard.getStringAsync();
      setInput(clip);
    } else {
      Alert.alert('Clipboard empty', 'Copy a message first, then paste it here!');
    }
  };

  const clear = () =>
    Alert.alert('Clear Rizz Bot history?', 'This will delete current suggestions.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.del('/rizz/history');
          } catch {}
          setMessages([]);
          setConvoId(null);
          setShowHome(true);
          lastPayload.current = null;
        },
      },
    ]);

  const cat = CATS.find((c) => c.k === category) || CATS[0];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Top Header */}
      <LinearGradient colors={burgundyGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="chevron-down" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 19, fontWeight: '900', letterSpacing: 0.5 }}>🤖 RIZZ BOT</Text>
            <View style={{ backgroundColor: palette.gold, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, marginLeft: 8 }}>
              <Text style={{ color: '#000', fontSize: 10, fontWeight: '800' }}>AI VIP</Text>
            </View>
          </View>
          <Text style={{ color: palette.pearl, fontSize: 12, opacity: 0.9 }}>Your personal dating & texting coach</Text>
        </View>
        <TouchableOpacity onPress={() => setShowHome(true)} style={{ padding: 6 }}>
          <Ionicons name="apps-outline" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={clear} style={{ padding: 6 }}>
          <Ionicons name="trash-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Style Chips Horizontal Bar */}
      <View style={{ borderBottomWidth: 1, borderColor: colors.border }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 8 }}>
          {STYLES.map((s) => (
            <TouchableOpacity
              key={s.k}
              onPress={() => setStyle(s.k)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 18,
                marginRight: 8,
                backgroundColor: style === s.k ? colors.primary : colors.card,
                borderWidth: 1,
                borderColor: style === s.k ? palette.gold : colors.border,
              }}
            >
              <Text style={{ color: style === s.k ? '#fff' : colors.text, fontWeight: '700', fontSize: 13 }}>{s.l}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {historyLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
        ) : showHome ? (
          <ScrollView contentContainerStyle={{ padding: 18 }}>
            <Text style={{ fontSize: 26, fontWeight: '900', color: colors.text }}>“What should I reply?”</Text>
            <Text style={{ fontSize: 15, color: colors.muted, marginTop: 4, marginBottom: 16 }}>
              Paste what they said or pick a category to get charming, clever, or funny options in seconds.
            </Text>

            {/* Quick Paste Prompt Card */}
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 18,
                padding: 16,
                marginBottom: 18,
                borderWidth: 1.5,
                borderColor: palette.gold,
              }}
            >
              <Text style={{ color: palette.gold, fontWeight: '800', fontSize: 13, textTransform: 'uppercase' }}>
                Instant Reply Helper
              </Text>
              <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', marginTop: 4 }}>
                Received a text you don't know how to answer?
              </Text>
              <TouchableOpacity
                onPress={pasteClipboard}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.primary,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 12,
                  marginTop: 12,
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="clipboard-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Paste from Clipboard & Ask</Text>
              </TouchableOpacity>
            </View>

            {CATS.map((c) => (
              <TouchableOpacity
                key={c.k}
                onPress={() => {
                  setCategory(c.k);
                  if (c.k === 'screenshot') analyze();
                  else setShowHome(false);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.card,
                  borderRadius: 16,
                  padding: 14,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ fontSize: 28 }}>{c.icon}</Text>
                <View style={{ marginLeft: 14, flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>{c.title}</Text>
                  <Text style={{ color: colors.muted, marginTop: 2, fontSize: 13 }}>{c.hint}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.muted} />
              </TouchableOpacity>
            ))}

            {!!messages.length && (
              <TouchableOpacity onPress={() => setShowHome(false)} style={{ alignItems: 'center', padding: 14 }}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>← View Current Suggestions</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item, index) => String(item._id || `${item.role}-${index}`)}
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            ListFooterComponent={loading ? <Typing /> : null}
            renderItem={renderMessage}
            initialNumToRender={8}
            maxToRenderPerBatch={6}
            windowSize={7}
            updateCellsBatchingPeriod={50}
            removeClippedSubviews={Platform.OS === 'android'}
          />
        )}

        {/* Input Bar */}
        {!showHome && (
          <View style={{ borderTopWidth: 1, borderColor: colors.border, padding: 10, backgroundColor: colors.bg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={analyze} style={{ padding: 8 }}>
                <Ionicons name="image-outline" size={26} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={pasteClipboard} style={{ padding: 6 }}>
                <Ionicons name="clipboard-outline" size={24} color={palette.gold} />
              </TouchableOpacity>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder={cat?.ph || 'Paste message or ask Rizz Bot...'}
                placeholderTextColor={colors.muted}
                multiline
                style={{
                  flex: 1,
                  backgroundColor: colors.card,
                  color: colors.text,
                  borderRadius: 20,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  maxHeight: 90,
                  marginHorizontal: 6,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              />
              <TouchableOpacity
                onPress={() => send()}
                disabled={loading || !input.trim()}
                style={{ opacity: input.trim() && !loading ? 1 : 0.4 }}
              >
                <LinearGradient
                  colors={gradient}
                  style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="send" size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
