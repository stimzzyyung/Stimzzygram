import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  Animated,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Avatar, FloatingReactionBurst } from '../components/UI';
import { timeAgo, FILTERS } from '../utils/format';
import { palette, snapGradient } from '../theme';

const { width: W } = Dimensions.get('window');
const REACTS = ['🔥', '🍷', '👑', '⚡', '❤️', '😂', '🚀', '😍'];

export default function StoryViewerScreen({ navigation, route }) {
  const { groups, index: startIndex } = route.params;
  const { user } = useAuth();
  const [gi, setGi] = useState(startIndex);
  const [si, setSi] = useState(0);
  const [reply, setReply] = useState('');
  const [paused, setPaused] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [burstEmoji, setBurstEmoji] = useState('🔥');
  const [viewersModalVisible, setViewersModalVisible] = useState(false);

  const progress = useRef(new Animated.Value(0)).current;
  const anim = useRef(null);
  const group = groups[gi];
  const story = group?.stories[si];
  const mine = group?.user._id === user._id;

  const next = () => {
    if (si < group.stories.length - 1) {
      setSi(si + 1);
    } else if (gi < groups.length - 1) {
      setGi(gi + 1);
      setSi(0);
    } else {
      navigation.goBack();
    }
  };

  const prev = () => {
    if (si > 0) {
      setSi(si - 1);
    } else if (gi > 0) {
      setGi(gi - 1);
      setSi(0);
    }
  };

  useEffect(() => {
    if (!story) return;
    if (!mine) api.post(`/stories/${story._id}/view`).catch(() => {});
    progress.setValue(0);
    anim.current = Animated.timing(progress, { toValue: 1, duration: 5000, useNativeDriver: false });
    if (!paused) anim.current.start(({ finished }) => finished && next());
    return () => anim.current?.stop();
  }, [gi, si, paused]);

  const sendReply = async () => {
    if (!reply.trim()) return;
    try {
      await api.post(`/stories/${story._id}/reply`, { text: reply.trim() });
      setReply('');
      Alert.alert('Sent 🍷', 'Your reply was sent as a direct message.');
    } catch (e) {
      Alert.alert('Oops', e.message);
    }
    setPaused(false);
  };

  const handleReact = (emoji) => {
    setBurstEmoji(emoji);
    setBurstKey((prev) => prev + 1);
    api.post(`/stories/${story._id}/react`, { emoji }).catch(() => {});
  };

  const del = () => {
    Alert.alert('Delete story?', 'This story will be removed permanently.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.del(`/stories/${story._id}`);
            navigation.goBack();
          } catch (e) {
            Alert.alert('Oops', e.message);
          }
        },
      },
    ]);
  };

  if (!story) return null;

  // Calculate remaining time
  const msLeft = new Date(story.expiresAt).getTime() - Date.now();
  const hoursLeft = Math.max(1, Math.round(msLeft / (1000 * 60 * 60)));
  const filterOverlayColor = story.filter && FILTERS[story.filter];

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* Media Player */}
      {story.mediaType === 'video' ? (
        <Video source={{ uri: story.mediaUrl }} style={{ flex: 1 }} resizeMode={ResizeMode.CONTAIN} shouldPlay={!paused} isLooping />
      ) : (
        <Image source={{ uri: story.mediaUrl }} style={{ flex: 1 }} resizeMode="contain" />
      )}

      {/* Applied Filter Overlay */}
      {filterOverlayColor && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: filterOverlayColor }]} />
      )}

      {/* Tap Zones to go Back / Forward */}
      <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row' }}>
        <TouchableOpacity style={{ flex: 1 }} onPress={prev} onLongPress={() => setPaused(true)} onPressOut={() => setPaused(false)} />
        <TouchableOpacity style={{ flex: 2 }} onPress={next} onLongPress={() => setPaused(true)} onPressOut={() => setPaused(false)} />
      </View>

      {/* Text & Stickers Center Overlay */}
      {(story.text || story.stickers?.length > 0) && (
        <View pointerEvents="none" style={{ position: 'absolute', top: '38%', alignSelf: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
          {!!story.text && (
            <View style={{ backgroundColor: 'rgba(74,8,23,0.85)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: palette.gold, marginBottom: 10 }}>
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' }}>{story.text}</Text>
            </View>
          )}
          {story.stickers?.length > 0 && <Text style={{ fontSize: 44 }}>{story.stickers.join(' ')}</Text>}
        </View>
      )}

      {/* Floating Animated Reaction Burst Particles */}
      <FloatingReactionBurst triggerKey={burstKey} emoji={burstEmoji} />

      {/* Top Header & Progress Bars */}
      <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0 }} pointerEvents="box-none">
        <View style={{ flexDirection: 'row', paddingHorizontal: 8, paddingTop: 6 }}>
          {group.stories.map((s, i) => (
            <View key={s._id} style={{ flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 2, borderRadius: 2, overflow: 'hidden' }}>
              <Animated.View
                style={{
                  height: 3,
                  backgroundColor: palette.gold,
                  width: i < si ? '100%' : i === si ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) : '0%',
                }}
              />
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}>
          <Avatar user={group.user} size={38} showFrame />
          <View style={{ marginLeft: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{group.user.username}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.7)', marginLeft: 8, fontSize: 12 }}>{timeAgo(story.createdAt)}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <Text style={{ color: palette.gold, fontSize: 11, fontWeight: '700' }}>⚡ Expires in {hoursLeft}h</Text>
              {!!group.user.avatarCustomization?.mood && (
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginLeft: 6 }}>
                  · {group.user.avatarCustomization.mood}
                </Text>
              )}
            </View>
          </View>

          <View style={{ flex: 1 }} />
          {mine && (
            <TouchableOpacity onPress={del} style={{ padding: 6 }}>
              <Ionicons name="trash-outline" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 6 }}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Music Tag */}
      {story.music?.title && (
        <View style={{ position: 'absolute', top: 120, left: 16, backgroundColor: 'rgba(74,8,23,0.75)', borderWidth: 1, borderColor: palette.gold, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 14 }}>
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>🎵 {story.music.title}</Text>
        </View>
      )}

      {/* Bottom Interactive Area */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <SafeAreaView edges={['bottom']}>
          {mine ? (
            <TouchableOpacity
              onPress={() => {
                setPaused(true);
                setViewersModalVisible(true);
              }}
              style={{ alignItems: 'center', paddingVertical: 14, backgroundColor: 'rgba(0,0,0,0.6)' }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="eye" size={18} color={palette.gold} style={{ marginRight: 6 }} />
                <Text style={{ color: '#fff', fontWeight: '800' }}>
                  {story.viewersCount || 0} views {story.reactions?.length > 0 ? `· ${story.reactions.length} reacts` : ''}
                </Text>
              </View>
              <Text style={{ color: palette.gold, fontSize: 11, marginTop: 2 }}>Tap to see viewer analytics</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ padding: 12, backgroundColor: 'rgba(0,0,0,0.55)' }}>
              {/* Floating One-Tap Reaction Bar */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 6, marginBottom: 10 }}>
                {REACTS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => handleReact(emoji)}
                    activeOpacity={0.65}
                    style={{ marginHorizontal: 6, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ fontSize: 24 }}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Direct Story Reply Input */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                  value={reply}
                  onChangeText={setReply}
                  onFocus={() => setPaused(true)}
                  onBlur={() => setPaused(false)}
                  placeholder={`Reply to ${group.user.username}...`}
                  placeholderTextColor="rgba(255,255,255,0.65)"
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    borderRadius: 24,
                    color: '#fff',
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.3)',
                    fontSize: 14,
                  }}
                />
                <TouchableOpacity onPress={sendReply} style={{ padding: 10, marginLeft: 6 }}>
                  <Ionicons name="send" size={24} color={palette.gold} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </SafeAreaView>
      </KeyboardAvoidingView>

      {/* Story Viewers & Reactions Modal */}
      <Modal visible={viewersModalVisible} transparent animationType="slide" onRequestClose={() => { setViewersModalVisible(false); setPaused(false); }}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <View style={{ backgroundColor: '#1A0A10', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '60%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>Story Views & Reactions</Text>
              <TouchableOpacity onPress={() => { setViewersModalVisible(false); setPaused(false); }}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={{ color: palette.gold, fontSize: 13, marginBottom: 12 }}>
              👁️ {story.viewersCount || 0} Total Viewers · ⚡ Expires in {hoursLeft} hours
            </Text>

            {story.reactions?.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: '#ddd', fontSize: 13, fontWeight: '700', marginBottom: 6 }}>Reactions:</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {story.reactions.map((r, i) => (
                    <View key={i} style={{ backgroundColor: 'rgba(125,17,40,0.4)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4, marginRight: 6, marginBottom: 6 }}>
                      <Text style={{ fontSize: 18 }}>{r.emoji}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <Text style={{ color: '#aaa', fontSize: 12, textAlign: 'center', marginTop: 10 }}>
              Stimzzy Stories automatically expire after your chosen duration.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}
