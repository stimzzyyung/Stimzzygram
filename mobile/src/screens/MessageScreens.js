import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api, fileFromAsset } from '../services/api';
import { getSocket } from '../services/socket';
import { Avatar, Header, Loading, ErrorState, Empty, VerifiedBadge, FloatingReactionBurst, GradientButton, OutlineButton } from '../components/UI';
import { timeAgo } from '../utils/format';
import { TRANSLATION_LANGUAGES } from '../data/locales';
import InlineVideoPlayer from '../components/InlineVideoPlayer';
import { palette, gradient, burgundyGradient } from '../theme';

const REACTIONS = ['❤️', '😂', '😮', '😢', '🔥', '👍'];

function formatBytes(bytes) {
  if (!bytes) return 'File';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function InboxScreen({ navigation }) {
  const { colors } = useTheme();
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);
  const [online, setOnline] = useState({});
  const [search, setSearch] = useState('');
  const [createGroupVisible, setCreateGroupVisible] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupPic, setGroupPic] = useState(null);
  const [friends, setFriends] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  const load = useCallback(() => {
    setError(null);
    api
      .get('/conversations')
      .then((r) => setList(r.conversations))
      .catch((e) => setError(e.message));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const onMsg = () => load();
    const onPres = (p) => setOnline((o) => ({ ...o, [p.userId]: p.online }));
    s.on('message:new', onMsg);
    s.on('presence', onPres);
    s.on('conversation:new', onMsg);
    s.on('conversation:update', onMsg);
    return () => {
      s.off('message:new', onMsg);
      s.off('presence', onPres);
      s.off('conversation:new', onMsg);
      s.off('conversation:update', onMsg);
    };
  }, [load]);

  // Check presence for direct conversation users
  useEffect(() => {
    const s = getSocket();
    if (list && s) {
      const userIds = list.filter((c) => c.type !== 'group' && c.user).map((c) => c.user._id);
      if (userIds.length) {
        s.emit('presence:check', userIds, (r) => {
          if (Array.isArray(r)) {
            setOnline(Object.fromEntries(r.map((x) => [x.userId, x.online])));
          }
        });
      }
    }
  }, [list]);

  const openCreateGroupModal = async () => {
    try {
      const res = await api.get('/search/users?q=');
      setFriends(res.users || []);
    } catch {
      // Fallback: list of recent contacts
      const contacts = (list || []).filter((c) => c.type !== 'group' && c.user).map((c) => c.user);
      setFriends(contacts);
    }
    setGroupName('');
    setGroupDesc('');
    setGroupPic(null);
    setSelectedMembers([]);
    setCreateGroupVisible(true);
  };

  const pickGroupImage = async () => {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (r.canceled || !r.assets?.length) return;
      setGroupPic(r.assets[0]);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      return Alert.alert('Group Name Required', 'Please enter a name for the group.');
    }
    setCreatingGroup(true);
    try {
      const form = new FormData();
      form.append('name', groupName.trim());
      form.append('description', groupDesc.trim());
      form.append('memberIds', JSON.stringify(selectedMembers));
      if (groupPic) {
        form.append('picture', fileFromAsset(groupPic, 'group'));
      }
      const res = await api.form('POST', '/conversations/group', form);
      setCreateGroupVisible(false);
      load();
      navigation.navigate('Chat', { conversation: res.conversation });
    } catch (e) {
      Alert.alert('Could not create group', e.message);
    } finally {
      setCreatingGroup(false);
    }
  };

  const filteredList = (list || []).filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    if (c.type === 'group') {
      return c.groupInformation?.name?.toLowerCase().includes(q);
    }
    return (
      c.user?.username?.toLowerCase().includes(q) ||
      c.user?.fullName?.toLowerCase().includes(q)
    );
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header with Group Creation */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 52 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 6 }}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, color: colors.text, fontSize: 20, fontWeight: '800', marginLeft: 8 }}>
          Messages & Groups
        </Text>
        <TouchableOpacity
          onPress={openCreateGroupModal}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.primary + '20',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.primary,
          }}
        >
          <Ionicons name="people" size={17} color={colors.primary} style={{ marginRight: 4 }} />
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>+ Group</Text>
        </TouchableOpacity>
      </View>

      {/* Telegram-style Search Bar */}
      <View style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.card,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Ionicons name="search" size={18} color={colors.muted} style={{ marginRight: 8 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search conversations, friends, and groups..."
            placeholderTextColor={colors.muted}
            style={{ flex: 1, color: colors.text, fontSize: 15 }}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {error && !list ? (
        <ErrorState message={error} onRetry={load} />
      ) : !list ? (
        <Loading text="Loading chats..." />
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={(c) => c._id}
          ListEmptyComponent={
            <Empty
              icon="💬"
              text={search ? 'No matching chats found.' : 'No messages yet.\nStart a private chat or create a group!'}
            />
          }
          renderItem={({ item: c }) => {
            const isGroup = c.type === 'group';
            const title = isGroup ? c.groupInformation?.name || 'Group Chat' : c.user?.username;
            const subtitle = c.lastMessage?.deleted
              ? 'Message deleted'
              : c.lastMessage?.isSnap
              ? '🔥 Stimzzy Snap'
              : c.lastMessage?.text ||
                (c.lastMessage?.mediaType === 'document'
                  ? `📄 ${c.lastMessage?.fileInfo?.fileName || 'Document'}`
                  : c.lastMessage?.mediaType
                  ? `📎 ${c.lastMessage.mediaType}`
                  : 'Start chatting...');

            return (
              <TouchableOpacity
                onPress={() =>
                  isGroup
                    ? navigation.navigate('Chat', { conversation: c })
                    : navigation.navigate('Chat', { user: c.user, conversationId: c._id })
                }
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderBottomWidth: 0.5,
                  borderBottomColor: colors.border + '30',
                }}
              >
                {/* Avatar with group or online badge */}
                <View>
                  {isGroup ? (
                    c.groupInformation?.picture ? (
                      <Image
                        source={{ uri: c.groupInformation.picture }}
                        style={{ width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: palette.gold }}
                      />
                    ) : (
                      <LinearGradient
                        colors={burgundyGradient}
                        style={{
                          width: 54,
                          height: 54,
                          borderRadius: 27,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 2,
                          borderColor: palette.gold,
                        }}
                      >
                        <Ionicons name="people" size={26} color="#fff" />
                      </LinearGradient>
                    )
                  ) : (
                    <>
                      <Avatar user={c.user} size={54} showFrame />
                      {online[c.user?._id] && (
                        <View
                          style={{
                            position: 'absolute',
                            right: 0,
                            bottom: 0,
                            width: 14,
                            height: 14,
                            borderRadius: 7,
                            backgroundColor: '#22C55E',
                            borderWidth: 2,
                            borderColor: colors.bg,
                          }}
                        />
                      )}
                    </>
                  )}
                </View>

                {/* Content */}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{title}</Text>
                    {isGroup ? (
                      <View
                        style={{
                          backgroundColor: colors.card,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 6,
                          marginLeft: 6,
                          borderWidth: 0.5,
                          borderColor: colors.border,
                        }}
                      >
                        <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '700' }}>
                          {c.participants?.length || 0} members
                        </Text>
                      </View>
                    ) : (
                      c.user?.isVerified && <VerifiedBadge />
                    )}
                  </View>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: c.unread ? colors.text : colors.muted,
                      fontWeight: c.unread ? '700' : '400',
                      marginTop: 3,
                      fontSize: 14,
                    }}
                  >
                    {subtitle}
                  </Text>
                </View>

                {/* Right Meta */}
                <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                  <Text style={{ color: colors.muted, fontSize: 11 }}>{timeAgo(c.updatedAt)}</Text>
                  {c.unread > 0 && (
                    <View
                      style={{
                        backgroundColor: colors.primary,
                        minWidth: 20,
                        height: 20,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: 6,
                        paddingHorizontal: 6,
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{c.unread}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Create Group Chat Modal */}
      <Modal visible={createGroupVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Create Group Chat</Text>
              <TouchableOpacity onPress={() => setCreateGroupVisible(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Group Photo */}
              <TouchableOpacity onPress={pickGroupImage} style={{ alignSelf: 'center', marginBottom: 16 }}>
                {groupPic ? (
                  <Image source={{ uri: groupPic.uri }} style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: palette.gold }} />
                ) : (
                  <LinearGradient colors={burgundyGradient} style={{ width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="camera" size={32} color="#fff" />
                  </LinearGradient>
                )}
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 6 }}>
                  {groupPic ? 'Change Group Photo' : 'Upload Group Photo'}
                </Text>
              </TouchableOpacity>

              <TextInput
                value={groupName}
                onChangeText={setGroupName}
                placeholder="Group Name (e.g., Weekend Vibers 🍷)"
                placeholderTextColor={colors.muted}
                style={[styles.modalInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              />

              <TextInput
                value={groupDesc}
                onChangeText={setGroupDesc}
                placeholder="Group Description (optional)"
                placeholderTextColor={colors.muted}
                multiline
                style={[styles.modalInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border, height: 70 }]}
              />

              <Text style={{ color: colors.text, fontWeight: '700', marginTop: 10, marginBottom: 8 }}>
                Select Members ({selectedMembers.length} selected):
              </Text>

              {friends.map((f) => {
                const selected = selectedMembers.includes(f._id);
                return (
                  <TouchableOpacity
                    key={f._id}
                    onPress={() => {
                      if (selected) {
                        setSelectedMembers((curr) => curr.filter((id) => id !== f._id));
                      } else {
                        setSelectedMembers((curr) => [...curr, f._id]);
                      }
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 8,
                      borderBottomWidth: 0.5,
                      borderBottomColor: colors.border + '40',
                    }}
                  >
                    <Avatar user={f} size={38} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={{ color: colors.text, fontWeight: '700' }}>{f.username}</Text>
                      <Text style={{ color: colors.muted, fontSize: 12 }}>{f.fullName}</Text>
                    </View>
                    <Ionicons
                      name={selected ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={selected ? colors.primary : colors.muted}
                    />
                  </TouchableOpacity>
                );
              })}

              <GradientButton title="Create Group" onPress={handleCreateGroup} loading={creatingGroup} style={{ marginTop: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function VoiceBubble({ uri, color }) {
  const [sound, setSound] = useState(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => () => { sound?.unloadAsync(); }, [sound]);

  const toggle = async () => {
    if (sound) {
      playing ? await sound.pauseAsync() : await sound.playAsync();
      return;
    }
    const { sound: s } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true },
      (st) => {
        setPlaying(st.isPlaying);
        if (st.didJustFinish) s.setPositionAsync(0);
      }
    );
    setSound(s);
  };

  return (
    <TouchableOpacity onPress={toggle} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
      <Ionicons name={playing ? 'pause-circle' : 'play-circle'} size={32} color={color} />
      <View style={{ marginLeft: 8 }}>
        <Text style={{ color, fontWeight: '700', fontSize: 14 }}>Voice Message</Text>
        <Text style={{ color, fontSize: 11, opacity: 0.8 }}>{playing ? 'Playing...' : 'Tap to listen'}</Text>
      </View>
    </TouchableOpacity>
  );
}

export function ChatScreen({ navigation, route }) {
  const otherUser = route.params.user;
  const passedConvo = route.params.conversation;
  const passedConvoId = route.params.conversationId || passedConvo?._id;
  const draftReply = route.params.draftReply;

  const { colors } = useTheme();
  const { user: me } = useAuth();

  const [conversation, setConversation] = useState(passedConvo || null);
  const [convoId, setConvoId] = useState(passedConvoId || null);
  const [messages, setMessages] = useState(null);
  const [error, setError] = useState(null);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [typing, setTyping] = useState(false);
  const [online, setOnline] = useState(false);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(null);
  const [recordingUri, setRecordingUri] = useState(null);

  // In-chat Search
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Translation
  const [translatorEnabled, setTranslatorEnabled] = useState(false);
  const [defaultLanguage, setDefaultLanguage] = useState('English');
  const [translations, setTranslations] = useState({});
  const [translatingMsgId, setTranslatingMsgId] = useState(null);
  const [langPickerVisible, setLangPickerVisible] = useState(false);
  const [activeTranslateMsg, setActiveTranslateMsg] = useState(null);

  // Attachment Sheet
  const [attachSheetVisible, setAttachSheetVisible] = useState(false);

  // Forwarding Sheet
  const [forwardModalVisible, setForwardModalVisible] = useState(false);
  const [forwardingMsg, setForwardingMsg] = useState(null);
  const [allConversations, setAllConversations] = useState([]);

  // Group Info Sheet
  const [groupInfoVisible, setGroupInfoVisible] = useState(false);

  // Snap viewer
  const [activeSnap, setActiveSnap] = useState(null);
  const [snapCountdown, setSnapCountdown] = useState(10);
  const snapInterval = useRef(null);

  const listRef = useRef();
  const typingTimer = useRef();

  const isGroup = conversation?.type === 'group';
  const chatTitle = isGroup
    ? conversation?.groupInformation?.name || 'Group Chat'
    : otherUser?.username || 'Chat';

  // Load translator settings
  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([
        AsyncStorage.getItem('translatorEnabled'),
        AsyncStorage.getItem('translationTarget'),
      ]).then(([enabled, target]) => {
        if (!active) return;
        setTranslatorEnabled(enabled === 'true');
        if (target) setDefaultLanguage(target);
      });
      return () => {
        active = false;
      };
    }, [])
  );

  // Load thread
  const loadThread = useCallback(async () => {
    setError(null);
    try {
      let res;
      if (convoId) {
        res = await api.get(`/messages/conversation/${convoId}`);
      } else if (otherUser?._id) {
        res = await api.get(`/messages/with/${otherUser._id}`);
      }
      if (res) {
        setMessages(res.messages || []);
        if (res.conversationId) setConvoId(res.conversationId);
        if (res.conversation) setConversation(res.conversation);
        if (res.conversationId) {
          api.post(`/conversations/${res.conversationId}/read`).catch(() => {});
        }
      }
    } catch (e) {
      setError(e.message);
    }
  }, [convoId, otherUser?._id]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  useEffect(() => {
    if (typeof draftReply !== 'string') return;
    setText(draftReply);
    navigation.setParams({ draftReply: undefined });
  }, [draftReply, navigation]);

  // Socket setup
  useEffect(() => {
    const s = getSocket();
    if (!s) return;

    if (!isGroup && otherUser?._id) {
      s.emit('presence:check', [otherUser._id], (r) => setOnline(!!r?.[0]?.online));
    }

    const onNew = (m) => {
      if (String(m.conversation) === String(convoId)) {
        setMessages((curr) => (curr?.some((x) => x._id === m._id) ? curr : [...(curr || []), m]));
        if (convoId && String(m.sender._id || m.sender) !== String(me._id)) {
          api.post(`/conversations/${convoId}/read`).catch(() => {});
        }
      }
    };

    const onUpd = (m) => {
      setMessages((curr) => curr?.map((x) => (x._id === m._id ? { ...x, ...m } : x)));
    };

    const onTyping = (p) => {
      if (!isGroup && p.from === otherUser?._id) setTyping(p.isTyping);
    };

    const onPres = (p) => {
      if (!isGroup && p.userId === otherUser?._id) setOnline(p.online);
    };

    const onRead = (p) => {
      if (p.conversationId === convoId) {
        setMessages((curr) =>
          curr?.map((x) => ({ ...x, status: 'read', readBy: [...new Set([...(x.readBy || []), p.by])] }))
        );
      }
    };

    s.on('message:new', onNew);
    s.on('message:update', onUpd);
    s.on('typing', onTyping);
    s.on('presence', onPres);
    s.on('message:read', onRead);

    return () => {
      s.off('message:new', onNew);
      s.off('message:update', onUpd);
      s.off('typing', onTyping);
      s.off('presence', onPres);
      s.off('message:read', onRead);
    };
  }, [convoId, isGroup, otherUser?._id, me._id]);

  const handleTextChange = (t) => {
    setText(t);
    if (!isGroup && otherUser?._id) {
      getSocket()?.emit('typing', { to: otherUser._id, isTyping: true });
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        getSocket()?.emit('typing', { to: otherUser._id, isTyping: false });
      }, 1500);
    }
  };

  const sendMessage = async (mediaFile, options = {}) => {
    if (!mediaFile && !text.trim()) return;
    if (sending) return;

    // Check if editing existing message
    if (editingMessage) {
      try {
        const res = await api.put(`/messages/${editingMessage._id}/edit`, { text: text.trim() });
        setMessages((curr) => curr?.map((x) => (x._id === editingMessage._id ? res.message : x)));
        setEditingMessage(null);
        setText('');
      } catch (e) {
        Alert.alert('Edit failed', e.message);
      }
      return;
    }

    setSending(true);
    const form = new FormData();
    if (convoId) {
      form.append('conversationId', convoId);
    } else if (otherUser?._id) {
      form.append('to', otherUser._id);
    }
    if (text.trim()) form.append('text', text.trim());
    if (replyTo) form.append('replyTo', replyTo._id);
    if (mediaFile) form.append('media', mediaFile);
    if (options.isSnap) form.append('isSnap', 'true');
    if (options.viewOnce) form.append('viewOnce', 'true');
    if (options.snapTimer) form.append('snapTimer', String(options.snapTimer));

    try {
      const res = await api.form('POST', '/messages', form);
      setMessages((curr) => (curr?.some((x) => x._id === res.message._id) ? curr : [...(curr || []), res.message]));
      setText('');
      setReplyTo(null);
      if (!convoId && res.message.conversation) {
        setConvoId(res.message.conversation);
      }
    } catch (e) {
      Alert.alert('Message failed', e.message);
    } finally {
      setSending(false);
    }
  };

  // Image & Video picker
  const pickMedia = async () => {
    setAttachSheetVisible(false);
    try {
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.85,
      });
      if (r.canceled || !r.assets?.length) return;
      sendMessage(fileFromAsset(r.assets[0], 'chat'));
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  // View Once photo/video picker
  const pickViewOnceMedia = async () => {
    setAttachSheetVisible(false);
    try {
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.85,
      });
      if (r.canceled || !r.assets?.length) return;
      sendMessage(fileFromAsset(r.assets[0], 'view_once'), { isSnap: true, viewOnce: true, snapTimer: 1 });
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  // Document/File sender simulation with asset picker
  const pickDocument = async () => {
    setAttachSheetVisible(false);
    try {
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
      });
      if (r.canceled || !r.assets?.length) return;
      const asset = r.assets[0];
      const docFile = {
        uri: asset.uri,
        name: asset.fileName || 'Stimzzy_Document.pdf',
        type: 'application/pdf',
      };
      sendMessage(docFile);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) return Alert.alert('Mic required', 'Please enable microphone access.');
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(rec);
    } catch (e) {
      Alert.alert('Recording error', e.message);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (uri) {
        sendMessage({
          uri,
          name: `voice_${Date.now()}.m4a`,
          type: 'audio/m4a',
        });
      }
    } catch (e) {
      Alert.alert('Audio error', e.message);
    }
  };

  // Reactions & Actions
  const handleReact = (msgId, emoji) => {
    api.post(`/messages/${msgId}/react`, { emoji }).catch(() => {});
  };

  const openActionMenu = (msg) => {
    const mine = String(msg.sender?._id || msg.sender) === String(me._id);
    Alert.alert('Message Options', undefined, [
      {
        text: 'Reply',
        onPress: () => setReplyTo(msg),
      },
      {
        text: 'Forward',
        onPress: () => {
          setForwardingMsg(msg);
          api.get('/conversations').then((r) => setAllConversations(r.conversations || []));
          setForwardModalVisible(true);
        },
      },
      {
        text: 'Copy Text',
        onPress: async () => {
          if (msg.text) {
            await Clipboard.setStringAsync(msg.text);
            Alert.alert('Copied', 'Message copied to clipboard.');
          }
        },
      },
      ...(translatorEnabled && msg.text
        ? [
            {
              text: 'Translate',
              onPress: () => {
                setActiveTranslateMsg(msg);
                setLangPickerVisible(true);
              },
            },
          ]
        : []),
      ...(mine && !msg.deleted
        ? [
            {
              text: 'Edit Message',
              onPress: () => {
                setEditingMessage(msg);
                setText(msg.text);
              },
            },
            {
              text: 'Delete Message',
              style: 'destructive',
              onPress: () => {
                api.del(`/messages/${msg._id}`).catch((e) => Alert.alert('Error', e.message));
              },
            },
          ]
        : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // In-line translation for an individual message
  const triggerTranslation = async (msg, targetLang) => {
    setTranslatingMsgId(msg._id);
    try {
      const res = await api.post('/messages/translate', {
        text: msg.text,
        targetLanguage: targetLang || defaultLanguage,
        messageId: msg._id,
      });
      setTranslations((curr) => ({ ...curr, [msg._id]: res.translation }));
    } catch (e) {
      Alert.alert('Translation error', e.message);
    } finally {
      setTranslatingMsgId(null);
    }
  };

  // Snap / View Once viewer
  const openSnap = (m) => {
    if (m.snapBurned || m.snapOpened) {
      return Alert.alert('Media Expired', 'This View Once media has already been opened and disappeared.');
    }
    setActiveSnap(m);
    const isViewOnce = m.viewOnce || m.snapTimer === 1;
    const timer = isViewOnce ? 15 : Number(m.snapTimer || 10);
    setSnapCountdown(timer);
    api.post(`/messages/${m._id}/open-snap`).catch(() => {});
    clearInterval(snapInterval.current);
    let timeLeft = timer;
    snapInterval.current = setInterval(() => {
      timeLeft -= 1;
      setSnapCountdown(timeLeft);
      if (timeLeft <= 0) {
        clearInterval(snapInterval.current);
        api.post(`/messages/${m._id}/burn-snap`).catch(() => {});
        setMessages((curr) =>
          curr?.map((x) => (x._id === m._id ? { ...x, snapOpened: true, snapBurned: true, mediaUrl: '' } : x))
        );
        setActiveSnap(null);
      }
    }, 1000);
  };

  const filteredMessages = (messages || []).filter((m) => {
    if (!searchQuery.trim()) return true;
    return m.text?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Helper to open Rizz Bot directly from chat
  const openRizzHelper = () => {
    const lastOtherMsg = [...(messages || [])].reverse().find((m) => String(m.sender?._id || m.sender) !== String(me._id));
    navigation.navigate('Rizz', {
      incomingMessage: lastOtherMsg?.text || '',
      targetChatKey: route.key,
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Top Navigation Bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>

        {/* Chat Avatar & Info */}
        <TouchableOpacity
          onPress={() => (isGroup ? setGroupInfoVisible(true) : navigation.navigate('Profile', { id: otherUser?._id }))}
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 6 }}
        >
          {isGroup ? (
            conversation?.groupInformation?.picture ? (
              <Image source={{ uri: conversation.groupInformation.picture }} style={{ width: 40, height: 40, borderRadius: 20 }} />
            ) : (
              <LinearGradient colors={burgundyGradient} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="people" size={20} color="#fff" />
              </LinearGradient>
            )
          ) : (
            <Avatar user={otherUser} size={40} showFrame />
          )}

          <View style={{ marginLeft: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>{chatTitle}</Text>
              {!isGroup && otherUser?.isVerified && <VerifiedBadge size={14} />}
            </View>
            <Text style={{ color: online || isGroup ? '#22C55E' : colors.muted, fontSize: 12 }}>
              {isGroup
                ? `${conversation?.participants?.length || 0} members · Tap for info`
                : online
                ? 'online'
                : typing
                ? 'typing...'
                : 'offline'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Action icons: Rizz Bot & Search */}
        <TouchableOpacity
          onPress={openRizzHelper}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(125,17,40,0.18)',
            borderWidth: 1,
            borderColor: palette.gold,
            paddingHorizontal: 8,
            paddingVertical: 5,
            borderRadius: 14,
            marginRight: 8,
          }}
        >
          <Ionicons name="sparkles" size={15} color={palette.gold} />
          <Text style={{ color: palette.gold, fontSize: 11, fontWeight: '800', marginLeft: 4 }}>Rizz</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setSearchOpen(!searchOpen)} style={{ padding: 6 }}>
          <Ionicons name="search" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* In-chat Search Input */}
      {searchOpen && (
        <View style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.card, borderBottomWidth: 1, borderColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="search" size={18} color={colors.muted} style={{ marginRight: 6 }} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search in this chat..."
              placeholderTextColor={colors.muted}
              autoFocus
              style={{ flex: 1, color: colors.text, fontSize: 14 }}
            />
            <TouchableOpacity onPress={() => setSearchOpen(false)}>
              <Ionicons name="close" size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Messages List */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {error && !messages ? (
          <ErrorState message={error} onRetry={loadThread} />
        ) : !messages ? (
          <Loading text="Loading messages..." />
        ) : (
          <FlatList
            ref={listRef}
            data={filteredMessages}
            keyExtractor={(m) => m._id}
            contentContainerStyle={{ padding: 12, paddingBottom: 16 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item: m }) => {
              const mine = String(m.sender?._id || m.sender) === String(me._id);
              const bubbleBg = mine ? colors.bubbleMine : colors.card;
              const textColor = mine ? '#fff' : colors.text;
              const translated = translations[m._id] || (m.translatedContent && m.translatedContent[defaultLanguage]);

              // Status Icon
              const statusIcon =
                m.status === 'read' ? 'checkmark-done' : m.status === 'delivered' ? 'checkmark-done' : 'checkmark';
              const statusColor = m.status === 'read' ? palette.gold : '#94A3B8';

              return (
                <View
                  style={{
                    alignSelf: mine ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    marginVertical: 4,
                  }}
                >
                  {/* Sender Name in Group */}
                  {isGroup && !mine && (
                    <Text style={{ color: palette.gold, fontSize: 11, fontWeight: '700', marginLeft: 8, marginBottom: 2 }}>
                      {m.sender?.username || 'Member'}
                    </Text>
                  )}

                  {/* Forwarded Header */}
                  {m.forwardedFrom && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2, paddingHorizontal: 6 }}>
                      <Ionicons name="arrow-redo" size={13} color={colors.muted} style={{ marginRight: 4 }} />
                      <Text style={{ color: colors.muted, fontSize: 11, fontStyle: 'italic' }}>
                        Forwarded from @{m.forwardedFrom?.username || 'user'}
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    activeOpacity={0.88}
                    onLongPress={() => openActionMenu(m)}
                    style={{
                      backgroundColor: bubbleBg,
                      borderRadius: 18,
                      padding: 10,
                      borderWidth: mine ? 0 : 1,
                      borderColor: colors.border,
                    }}
                  >
                    {/* Quoted Reply */}
                    {m.replyTo && (
                      <View
                        style={{
                          backgroundColor: 'rgba(0,0,0,0.2)',
                          borderLeftWidth: 3,
                          borderColor: palette.gold,
                          borderRadius: 6,
                          padding: 6,
                          marginBottom: 6,
                        }}
                      >
                        <Text style={{ color: palette.gold, fontSize: 11, fontWeight: '700' }}>Reply</Text>
                        <Text numberOfLines={1} style={{ color: mine ? '#fff' : colors.text, fontSize: 12 }}>
                          {m.replyTo.text || 'Media attachment'}
                        </Text>
                      </View>
                    )}

                    {/* View Once or Disappearing Snap Message */}
                    {(m.isSnap || m.viewOnce) ? (
                      <TouchableOpacity
                        onPress={() => openSnap(m)}
                        disabled={m.snapBurned || m.snapOpened}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: 10,
                          backgroundColor: (m.snapBurned || m.snapOpened)
                            ? 'rgba(0,0,0,0.35)'
                            : (m.viewOnce || m.snapTimer === 1 ? 'rgba(212,175,106,0.2)' : 'rgba(249,115,22,0.2)'),
                          borderRadius: 14,
                          borderWidth: 1,
                          borderColor: (m.snapBurned || m.snapOpened)
                            ? 'rgba(255,255,255,0.1)'
                            : (m.viewOnce || m.snapTimer === 1 ? palette.gold : '#F97316'),
                        }}
                      >
                        <View style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: (m.snapBurned || m.snapOpened)
                            ? 'rgba(255,255,255,0.1)'
                            : (m.viewOnce || m.snapTimer === 1 ? palette.gold : '#F97316'),
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Ionicons
                            name={(m.snapBurned || m.snapOpened) ? "checkmark" : (m.viewOnce || m.snapTimer === 1 ? "eye" : "flame")}
                            size={20}
                            color="#fff"
                          />
                        </View>
                        <View style={{ marginLeft: 10 }}>
                          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>
                            {(m.snapBurned || m.snapOpened)
                              ? (m.viewOnce || m.snapTimer === 1 ? '👀 Opened (View Once)' : '🔥 Snap Burned & Expired')
                              : (m.viewOnce || m.snapTimer === 1 ? '1️⃣ View Once Photo' : '🔥 Tap to View Snap')}
                          </Text>
                          <Text style={{ color: (m.snapBurned || m.snapOpened) ? '#94A3B8' : '#FDE68A', fontSize: 11, fontWeight: '600' }}>
                            {(m.snapBurned || m.snapOpened)
                              ? 'Media disappeared'
                              : (m.viewOnce || m.snapTimer === 1 ? 'Disappears after viewing' : `${m.snapTimer || 10}s timer`)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ) : null}

                    {/* Image Attachment */}
                    {m.mediaUrl && m.mediaType === 'image' && !m.isSnap && !m.viewOnce && (
                      <Image
                        source={{ uri: m.mediaUrl }}
                        style={{ width: 220, height: 220, borderRadius: 12, marginBottom: m.text ? 6 : 0 }}
                      />
                    )}

                    {/* Video Attachment */}
                    {m.mediaUrl && m.mediaType === 'video' && !m.isSnap && !m.viewOnce && (
                      <InlineVideoPlayer
                        source={{ uri: m.mediaUrl }}
                        style={{ width: 220, height: 260, borderRadius: 12, marginBottom: m.text ? 6 : 0 }}
                      />
                    )}

                    {/* Voice Message */}
                    {m.mediaUrl && m.mediaType === 'audio' && (
                      <VoiceBubble uri={m.mediaUrl} color={mine ? '#fff' : colors.primary} />
                    )}

                    {/* Document / File Card */}
                    {m.mediaUrl && (m.mediaType === 'document' || m.mediaType === 'file') && (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: 'rgba(0,0,0,0.18)',
                          borderRadius: 12,
                          padding: 10,
                          marginBottom: m.text ? 6 : 0,
                        }}
                      >
                        <Ionicons name="document-text" size={32} color={palette.gold} />
                        <View style={{ marginLeft: 10, flex: 1 }}>
                          <Text numberOfLines={1} style={{ color: textColor, fontWeight: '700', fontSize: 14 }}>
                            {m.fileInfo?.fileName || 'Document.pdf'}
                          </Text>
                          <Text style={{ color: textColor, opacity: 0.75, fontSize: 12 }}>
                            {formatBytes(m.fileInfo?.fileSize)}
                          </Text>
                        </View>
                        <Ionicons name="arrow-down-circle" size={24} color={textColor} />
                      </View>
                    )}

                    {/* Message Text */}
                    {!!m.text && (
                      <Text style={{ color: textColor, fontSize: 15, lineHeight: 21 }}>
                        {m.deleted ? '🚫 This message was deleted' : m.text}
                      </Text>
                    )}

                    {/* In-Line Translate Button specified by Requirement 11 */}
                    {translatorEnabled && !m.deleted && !!m.text && (
                      <View style={{ marginTop: 6, paddingTop: 4, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.15)' }}>
                        <TouchableOpacity
                          onPress={() => {
                            setActiveTranslateMsg(m);
                            setLangPickerVisible(true);
                          }}
                          style={{ flexDirection: 'row', alignItems: 'center' }}
                        >
                          <Ionicons name="language" size={14} color={mine ? palette.gold : colors.primary} style={{ marginRight: 4 }} />
                          <Text style={{ color: mine ? palette.gold : colors.primary, fontSize: 12, fontWeight: '700' }}>
                            {translatingMsgId === m._id ? 'Translating...' : 'Translate ▼'}
                          </Text>
                        </TouchableOpacity>

                        {/* Translated Content Dropdown Box */}
                        {!!translated && (
                          <View
                            style={{
                              backgroundColor: 'rgba(0,0,0,0.22)',
                              padding: 6,
                              borderRadius: 8,
                              marginTop: 4,
                            }}
                          >
                            <Text style={{ color: palette.gold, fontSize: 10, fontWeight: '800' }}>
                              TRANSLATED ({defaultLanguage}):
                            </Text>
                            <Text style={{ color: textColor, fontSize: 14, fontStyle: 'italic', marginTop: 2 }}>
                              {translated}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Meta: Timestamp, Edited flag, Status */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 }}>
                      {m.isEdited && (
                        <Text style={{ color: textColor, opacity: 0.65, fontSize: 10, marginRight: 5, fontStyle: 'italic' }}>
                          edited
                        </Text>
                      )}
                      <Text style={{ color: textColor, opacity: 0.65, fontSize: 10 }}>
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      {mine && (
                        <Ionicons
                          name={statusIcon}
                          size={13}
                          color={statusColor}
                          style={{ marginLeft: 4 }}
                        />
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Reaction Pills */}
                  {m.reactions?.length > 0 && (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignSelf: mine ? 'flex-end' : 'flex-start',
                        marginTop: -6,
                        marginRight: mine ? 6 : 0,
                        marginLeft: mine ? 0 : 6,
                        backgroundColor: colors.card,
                        borderRadius: 12,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      {m.reactions.map((r, i) => (
                        <Text key={i} style={{ fontSize: 12, marginHorizontal: 1 }}>{r.emoji}</Text>
                      ))}
                    </View>
                  )}
                </View>
              );
            }}
          />
        )}

        {/* Replying or Editing Banner */}
        {(replyTo || editingMessage) && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 8,
              backgroundColor: colors.card,
              borderTopWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Ionicons name={editingMessage ? 'pencil' : 'arrow-undo'} size={18} color={colors.primary} style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>
                {editingMessage ? 'Editing message' : `Replying to @${replyTo?.sender?.username || 'message'}`}
              </Text>
              <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12 }}>
                {editingMessage ? editingMessage.text : replyTo?.text || 'Attachment'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => { setReplyTo(null); setEditingMessage(null); setText(''); }} style={{ padding: 4 }}>
              <Ionicons name="close" size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom Messaging Input Bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 8,
            backgroundColor: colors.bg,
            borderTopWidth: 1,
            borderColor: colors.border,
          }}
        >
          {/* Attachment Button */}
          <TouchableOpacity onPress={() => setAttachSheetVisible(true)} style={{ padding: 6 }}>
            <Ionicons name="add-circle" size={28} color={colors.primary} />
          </TouchableOpacity>

          {/* Text Input */}
          <TextInput
            value={text}
            onChangeText={handleTextChange}
            placeholder={editingMessage ? 'Edit your message...' : 'Write a message...'}
            placeholderTextColor={colors.muted}
            multiline
            style={{
              flex: 1,
              backgroundColor: colors.card,
              color: colors.text,
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 9,
              maxHeight: 100,
              marginHorizontal: 4,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          />

          {/* Voice Record / Send Button */}
          {text.trim() || editingMessage ? (
            <TouchableOpacity onPress={() => sendMessage()} disabled={sending}>
              <LinearGradient
                colors={gradient}
                style={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="send" size={19} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPressIn={startRecording}
              onPressOut={stopRecording}
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: recording ? colors.danger : colors.card,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: recording ? colors.danger : colors.border,
              }}
            >
              <Ionicons name={recording ? 'radio' : 'mic'} size={22} color={recording ? '#fff' : colors.text} />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Attachment Sheet Modal */}
      <Modal visible={attachSheetVisible} transparent animationType="fade">
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setAttachSheetVisible(false)}
          style={styles.modalOverlay}
        >
          <View style={[styles.sheetContent, { backgroundColor: colors.card }]}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: 14 }}>
              Add Attachment
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <TouchableOpacity onPress={pickMedia} style={styles.sheetItem}>
                <View style={[styles.sheetIconCircle, { backgroundColor: 'rgba(125,17,40,0.2)' }]}>
                  <Ionicons name="image" size={26} color={palette.burgundyLight} />
                </View>
                <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700', marginTop: 6 }}>Photo/Video</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={pickViewOnceMedia} style={styles.sheetItem}>
                <View style={[styles.sheetIconCircle, { backgroundColor: 'rgba(212,175,106,0.25)' }]}>
                  <Ionicons name="eye" size={26} color={palette.gold} />
                </View>
                <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700', marginTop: 6 }}>View Once</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={pickDocument} style={styles.sheetItem}>
                <View style={[styles.sheetIconCircle, { backgroundColor: 'rgba(59,130,246,0.2)' }]}>
                  <Ionicons name="document-text" size={26} color="#3B82F6" />
                </View>
                <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700', marginTop: 6 }}>Document</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setAttachSheetVisible(false);
                  navigation.navigate('Create', { mode: 'snap', targetUser: otherUser });
                }}
                style={styles.sheetItem}
              >
                <View style={[styles.sheetIconCircle, { backgroundColor: 'rgba(249,115,22,0.2)' }]}>
                  <Ionicons name="flame" size={26} color="#F97316" />
                </View>
                <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700', marginTop: 6 }}>Stimzzy Snap</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Language Picker Modal for Translation */}
      <Modal visible={langPickerVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Translate Message Into</Text>
              <TouchableOpacity onPress={() => setLangPickerVisible(false)}>
                <Ionicons name="close" size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 350 }}>
              {TRANSLATION_LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang}
                  onPress={() => {
                    setLangPickerVisible(false);
                    if (activeTranslateMsg) triggerTranslation(activeTranslateMsg, lang);
                  }}
                  style={{
                    paddingVertical: 12,
                    borderBottomWidth: 0.5,
                    borderBottomColor: colors.border + '40',
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: 15 }}>{lang}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Forward Message Modal */}
      <Modal visible={forwardModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <Text style={{ color: colors.text, fontSize: 19, fontWeight: '800' }}>Forward Message</Text>
              <TouchableOpacity onPress={() => setForwardModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 350 }}>
              {allConversations.map((c) => {
                const targetTitle = c.type === 'group' ? c.groupInformation?.name : c.user?.username;
                return (
                  <TouchableOpacity
                    key={c._id}
                    onPress={async () => {
                      setForwardModalVisible(false);
                      try {
                        await api.post('/messages/forward', {
                          messageId: forwardingMsg._id,
                          conversationId: c._id,
                        });
                        Alert.alert('Forwarded ✅', `Message forwarded to ${targetTitle}.`);
                      } catch (e) {
                        Alert.alert('Forward error', e.message);
                      }
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 10,
                      borderBottomWidth: 0.5,
                      borderBottomColor: colors.border + '40',
                    }}
                  >
                    <Ionicons name={c.type === 'group' ? 'people' : 'person'} size={24} color={colors.primary} style={{ marginRight: 10 }} />
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{targetTitle}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Group Info Modal */}
      <Modal visible={groupInfoVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Group Info</Text>
              <TouchableOpacity onPress={() => setGroupInfoVisible(false)}>
                <Ionicons name="close" size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                {conversation?.groupInformation?.picture ? (
                  <Image source={{ uri: conversation.groupInformation.picture }} style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: palette.gold }} />
                ) : (
                  <LinearGradient colors={burgundyGradient} style={{ width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="people" size={32} color="#fff" />
                  </LinearGradient>
                )}
                <Text style={{ color: colors.text, fontWeight: '800', fontSize: 18, marginTop: 8 }}>
                  {conversation?.groupInformation?.name}
                </Text>
                {!!conversation?.groupInformation?.description && (
                  <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 4 }}>
                    {conversation.groupInformation.description}
                  </Text>
                )}
              </View>

              <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>
                Members ({conversation?.participants?.length || 0}):
              </Text>
              {(conversation?.participants || []).map((p) => {
                const isAdmin = conversation?.groupInformation?.admins?.some((a) => (a._id || a) === (p._id || p));
                return (
                  <View key={p._id || p} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: colors.border + '30' }}>
                    <Avatar user={p} size={36} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={{ color: colors.text, fontWeight: '700' }}>{p.username || 'Member'}</Text>
                      {isAdmin && <Text style={{ color: palette.gold, fontSize: 11, fontWeight: '800' }}>👑 ADMIN</Text>}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Stimzzy Snap & View Once Fullscreen Overlay */}
      {activeSnap && (
        <Modal visible transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
            {/* Header with Title & Done button */}
            <View style={{ position: 'absolute', top: 50, left: 16, right: 16, zIndex: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                <Ionicons
                  name={(activeSnap.viewOnce || activeSnap.snapTimer === 1) ? "eye" : "flame"}
                  size={20}
                  color={(activeSnap.viewOnce || activeSnap.snapTimer === 1) ? palette.gold : "#F97316"}
                />
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', marginLeft: 6 }}>
                  {(activeSnap.viewOnce || activeSnap.snapTimer === 1) ? 'VIEW ONCE' : 'STIMZZY SNAP'}
                </Text>
                {!(activeSnap.viewOnce || activeSnap.snapTimer === 1) && (
                  <Text style={{ color: '#FDE68A', fontSize: 13, fontWeight: '800', marginLeft: 6 }}>
                    {snapCountdown}s
                  </Text>
                )}
              </View>

              <TouchableOpacity
                onPress={() => {
                  clearInterval(snapInterval.current);
                  api.post(`/messages/${activeSnap._id}/burn-snap`).catch(() => {});
                  setMessages((curr) =>
                    curr?.map((x) => (x._id === activeSnap._id ? { ...x, snapOpened: true, snapBurned: true, mediaUrl: '' } : x))
                  );
                  setActiveSnap(null);
                }}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.25)',
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 16,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>Done</Text>
              </TouchableOpacity>
            </View>

            {activeSnap.mediaType === 'video' ? (
              <InlineVideoPlayer source={{ uri: activeSnap.mediaUrl }} style={{ width: '100%', height: '80%' }} autoPlay />
            ) : (
              <Image source={{ uri: activeSnap.mediaUrl }} style={{ width: '100%', height: '80%', resizeMode: 'contain' }} />
            )}
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    maxHeight: '85%',
  },
  modalInput: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    fontSize: 15,
  },
  sheetContent: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 22,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  sheetItem: {
    alignItems: 'center',
  },
  sheetIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
