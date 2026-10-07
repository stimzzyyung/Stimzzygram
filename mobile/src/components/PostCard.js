import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Animated,
  Alert,
  Share,
  Dimensions,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Avatar, VerifiedBadge } from './UI';
import { timeAgo, FILTERS } from '../utils/format';
import InlineVideoPlayer from './InlineVideoPlayer';
import { TRANSLATION_LANGUAGES } from '../data/locales';
import { palette } from '../theme';

const W = Dimensions.get('window').width;

function PostCard({ post, navigation, onDeleted, isActive = false }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [p, setP] = useState(post);
  const [page, setPage] = useState(0);
  const [fullscreenVideo, setFullscreenVideo] = useState(null);
  const [shareToUserModal, setShareToUserModal] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [sendingPost, setSendingPost] = useState(false);

  // Translation state
  const [translatorEnabled, setTranslatorEnabled] = useState(false);
  const [defaultLanguage, setDefaultLanguage] = useState('English');
  const [translatedCaption, setTranslatedCaption] = useState(null);
  const [translating, setTranslating] = useState(false);
  const [langPickerVisible, setLangPickerVisible] = useState(false);

  const scale = useRef(new Animated.Value(1)).current;
  const pop = () =>
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.4, useNativeDriver: true, speed: 40 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }),
    ]).start();

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('translatorEnabled'),
      AsyncStorage.getItem('translationTarget'),
    ]).then(([enabled, target]) => {
      setTranslatorEnabled(enabled === 'true');
      if (target) setDefaultLanguage(target);
    });
  }, []);

  const toggleLike = async () => {
    const liked = !p.liked;
    pop();
    setP((x) => ({ ...x, liked, likesCount: x.likesCount + (liked ? 1 : -1) }));
    try {
      liked ? await api.post(`/posts/${p._id}/like`) : await api.del(`/posts/${p._id}/like`);
    } catch {
      setP((x) => ({ ...x, liked: !liked, likesCount: x.likesCount + (liked ? -1 : 1) }));
    }
  };

  const toggleSave = async () => {
    const saved = !p.saved;
    setP((x) => ({ ...x, saved }));
    try {
      saved ? await api.post(`/posts/${p._id}/save`) : await api.del(`/posts/${p._id}/save`);
    } catch {
      setP((x) => ({ ...x, saved: !saved }));
    }
  };

  const shareExternally = () =>
    Share.share({
      message: `Check out @${p.author.username}'s post on StimzzyVibe 🚀\n${p.caption || ''}`,
    });

  const openSendToUserModal = async () => {
    try {
      const res = await api.get('/conversations');
      setConversations(res.conversations || []);
      setShareToUserModal(true);
    } catch (e) {
      shareExternally();
    }
  };

  const sendPostToConvo = async (convo) => {
    setSendingPost(true);
    try {
      const postUrlPreview = p.media?.[0]?.url || '';
      await api.post('/messages', {
        conversationId: convo._id,
        text: `Shared post from @${p.author.username}: "${p.caption || ''}"\n${postUrlPreview}`,
      });
      setShareToUserModal(false);
      Alert.alert('Sent 🚀', 'Post shared to chat.');
    } catch (e) {
      Alert.alert('Send error', e.message);
    } finally {
      setSendingPost(false);
    }
  };

  const translateCaption = async (targetLang) => {
    if (!p.caption) return;
    setTranslating(true);
    try {
      const res = await api.post('/messages/translate', {
        text: p.caption,
        targetLanguage: targetLang || defaultLanguage,
      });
      setTranslatedCaption({ text: res.translation, lang: targetLang || defaultLanguage });
    } catch (e) {
      Alert.alert('Translation failed', e.message);
    } finally {
      setTranslating(false);
    }
  };

  const more = () => {
    const mine = p.author._id === user._id;
    Alert.alert('Post options', undefined, [
      mine
        ? {
            text: 'Delete post',
            style: 'destructive',
            onPress: async () => {
              try {
                await api.del(`/posts/${p._id}`);
                onDeleted?.(p._id);
              } catch (e) {
                Alert.alert('Oops', e.message);
              }
            },
          }
        : {
            text: 'Report post',
            onPress: () =>
              Alert.alert(
                'Report post',
                'Why are you reporting this?',
                ['Spam', 'Inappropriate content', 'Harassment'].map((reason) => ({
                  text: reason,
                  onPress: () =>
                    api
                      .post(`/posts/${p._id}/report`, { reason })
                      .then(() => Alert.alert('Thanks', 'We will review this post.'))
                      .catch((e) => Alert.alert('Oops', e.message)),
                })).concat([{ text: 'Cancel', style: 'cancel' }])
              ),
          },
      { text: 'Send to friend', onPress: openSendToUserModal },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const renderCaption = () =>
    (p.caption || '').split(/(#[\p{L}\p{N}_]+|@[a-z0-9._]+)/giu).map((part, i) =>
      /^#/.test(part) ? (
        <Text key={i} style={{ color: colors.accent, fontWeight: '600' }} onPress={() => navigation.push('Hashtag', { name: part.slice(1) })}>
          {part}
        </Text>
      ) : /^@/.test(part) ? (
        <Text key={i} style={{ color: colors.primary, fontWeight: '600' }} onPress={() => navigation.push('Profile', { id: part.slice(1) })}>
          {part}
        </Text>
      ) : (
        part
      )
    );

  const overlay = FILTERS[p.filter];

  return (
    <View style={{ marginBottom: 20 }}>
      {/* Post Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 }}>
        <TouchableOpacity onPress={() => navigation.push('Profile', { id: p.author._id })} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Avatar user={p.author} size={40} showFrame />
          <View style={{ marginLeft: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{p.author.username}</Text>
              {p.author.isVerified && <VerifiedBadge />}
            </View>
            {!!p.location && <Text style={{ color: colors.muted, fontSize: 11 }}>📍 {p.location}</Text>}
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={more} hitSlop={12} style={{ padding: 4 }}>
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Media Carousel */}
      <View>
        <Animated.FlatList
          data={p.media}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / W))}
          renderItem={({ item, index }) => (
            <TouchableOpacity activeOpacity={1} onLongPress={toggleLike} delayLongPress={250}>
              {item.type === 'video' ? (
                <View>
                  <InlineVideoPlayer
                    source={{ uri: item.url }}
                    style={{ width: W, height: W * 1.18 }}
                    enabled={isActive && page === index}
                    autoPlay
                  />
                  {/* Fullscreen Button */}
                  <TouchableOpacity
                    onPress={() => setFullscreenVideo(item.url)}
                    style={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="expand" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <Image source={{ uri: item.url }} style={{ width: W, height: W * 1.18, backgroundColor: colors.card }} />
              )}
              {overlay && (
                <View pointerEvents="none" style={{ position: 'absolute', inset: 0, top: 0, bottom: 0, left: 0, right: 0, backgroundColor: overlay }} />
              )}
            </TouchableOpacity>
          )}
        />
        {p.media.length > 1 && (
          <View
            style={{
              position: 'absolute',
              top: 10,
              right: 12,
              backgroundColor: 'rgba(0,0,0,0.6)',
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
              {page + 1}/{p.media.length}
            </Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 10 }}>
        <TouchableOpacity onPress={toggleLike} hitSlop={8}>
          <Animated.View style={{ transform: [{ scale }] }}>
            <Ionicons name={p.liked ? 'heart' : 'heart-outline'} size={28} color={p.liked ? '#F43F5E' : colors.text} />
          </Animated.View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.push('Comments', { id: p._id, kind: 'posts' })} style={{ marginLeft: 16 }} hitSlop={8}>
          <Ionicons name="chatbubble-outline" size={25} color={colors.text} />
        </TouchableOpacity>

        {/* Send to friend / Share button */}
        <TouchableOpacity onPress={openSendToUserModal} style={{ marginLeft: 16 }} hitSlop={8}>
          <Ionicons name="paper-plane-outline" size={25} color={colors.text} />
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        <TouchableOpacity onPress={toggleSave} hitSlop={8}>
          <Ionicons name={p.saved ? 'bookmark' : 'bookmark-outline'} size={25} color={p.saved ? colors.primary : colors.text} />
        </TouchableOpacity>
      </View>

      {/* Likes & Caption */}
      <View style={{ paddingHorizontal: 14, paddingTop: 8 }}>
        <Text style={{ color: colors.text, fontWeight: '700' }}>
          {p.likesCount} {p.likesCount === 1 ? 'like' : 'likes'}
        </Text>

        {!!p.caption && (
          <View style={{ marginTop: 4 }}>
            <Text style={{ color: colors.text, lineHeight: 20 }}>
              <Text style={{ fontWeight: '700' }}>{p.author.username} </Text>
              {renderCaption()}
            </Text>

            {/* Individual Post Translation specified by Requirement 11 */}
            {translatorEnabled && (
              <View style={{ marginTop: 4 }}>
                <TouchableOpacity
                  onPress={() => setLangPickerVisible(true)}
                  style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 2 }}
                >
                  <Ionicons name="language" size={13} color={palette.gold} style={{ marginRight: 4 }} />
                  <Text style={{ color: palette.gold, fontSize: 12, fontWeight: '700' }}>
                    {translating ? 'Translating...' : 'Translate ▼'}
                  </Text>
                </TouchableOpacity>

                {translatedCaption && (
                  <View
                    style={{
                      backgroundColor: colors.card,
                      padding: 8,
                      borderRadius: 8,
                      marginTop: 4,
                      borderLeftWidth: 3,
                      borderColor: palette.gold,
                    }}
                  >
                    <Text style={{ color: palette.gold, fontSize: 10, fontWeight: '800' }}>
                      TRANSLATION ({translatedCaption.lang}):
                    </Text>
                    <Text style={{ color: colors.text, fontSize: 13, fontStyle: 'italic', marginTop: 2 }}>
                      {translatedCaption.text}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {p.commentsCount > 0 && (
          <TouchableOpacity onPress={() => navigation.push('Comments', { id: p._id, kind: 'posts' })}>
            <Text style={{ color: colors.muted, marginTop: 4 }}>View all {p.commentsCount} comments</Text>
          </TouchableOpacity>
        )}

        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>
          {timeAgo(p.createdAt).toUpperCase()}
        </Text>
      </View>

      {/* Send to Another User Modal */}
      <Modal visible={shareToUserModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, maxHeight: '60%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Send post to chat</Text>
              <TouchableOpacity onPress={() => setShareToUserModal(false)}>
                <Ionicons name="close" size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {conversations.map((c) => {
                const targetTitle = c.type === 'group' ? c.groupInformation?.name : c.user?.username;
                return (
                  <TouchableOpacity
                    key={c._id}
                    onPress={() => sendPostToConvo(c)}
                    disabled={sendingPost}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 12,
                      borderBottomWidth: 0.5,
                      borderBottomColor: colors.border + '30',
                    }}
                  >
                    <Avatar user={c.user} size={40} />
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15, marginLeft: 12, flex: 1 }}>
                      {targetTitle}
                    </Text>
                    <Ionicons name="send" size={18} color={colors.primary} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity onPress={shareExternally} style={{ paddingVertical: 14, alignItems: 'center', marginTop: 10 }}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>Share via other apps...</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Language Selector Modal for Post Translation */}
      <Modal visible={langPickerVisible} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.bg, borderRadius: 20, padding: 18, maxHeight: '70%', borderWidth: 1, borderColor: colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Translate Caption Into</Text>
              <TouchableOpacity onPress={() => setLangPickerVisible(false)}>
                <Ionicons name="close" size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {TRANSLATION_LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang}
                  onPress={() => {
                    setLangPickerVisible(false);
                    translateCaption(lang);
                  }}
                  style={{ paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.border + '40' }}
                >
                  <Text style={{ color: colors.text, fontSize: 15 }}>{lang}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Fullscreen Video Modal */}
      {fullscreenVideo && (
        <Modal visible transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center' }}>
            <TouchableOpacity
              onPress={() => setFullscreenVideo(null)}
              style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8 }}
            >
              <Ionicons name="close" size={30} color="#fff" />
            </TouchableOpacity>
            <InlineVideoPlayer source={{ uri: fullscreenVideo }} style={{ width: '100%', height: '80%' }} autoPlay />
          </View>
        </Modal>
      )}
    </View>
  );
}

export default React.memo(PostCard, (a, b) => a.post === b.post && a.isActive === b.isActive);
