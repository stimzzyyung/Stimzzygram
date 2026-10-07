import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StyleSheet,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { upload, fileFromAsset, api } from '../services/api';
import { GradientButton, Avatar } from '../components/UI';
import { FILTERS, FILTER_LIST } from '../utils/format';
import { palette, snapGradient } from '../theme';

const { width: W, height: H } = Dimensions.get('window');

const MODES = [
  { k: 'snap', label: '📸 Quick Snap', desc: 'Disappearing photo or video' },
  { k: 'story', label: '⚡ Story', desc: 'Ephemeral 1h - 24h story' },
  { k: 'vibe', label: '🎬 Vibe', desc: 'Full screen vertical video' },
  { k: 'post', label: '🖼️ Post', desc: 'Feed gallery post' },
];

const STIMZZY_STICKERS = [
  '🍷 STIMZZY VIBE',
  '👑 VIP',
  '🔥 100%',
  '⚡ ELECTRIC',
  'NO CAP 🧢',
  'VIBE CHECK ✅',
  'LATE NIGHT 🌙',
  'SOFT LIFE 💎',
  '✨ PURE MAGIC',
  'CHILLING 🥂',
];

const STORY_DURATIONS = [
  { hours: 1, label: '1 hour ⚡' },
  { hours: 6, label: '6 hours' },
  { hours: 12, label: '12 hours' },
  { hours: 24, label: '24 hours' },
  { hours: 48, label: '2 days ⭐' },
  { hours: 72, label: '3 days ⭐' },
  { hours: 168, label: '7 days ⭐' },
];

const SNAP_TIMERS = [
  { sec: 1, label: '👀 View Once' },
  { sec: 5, label: '5s Disappearing' },
  { sec: 10, label: '10s Disappearing' },
];

export default function CreateScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { user, refreshUser } = useAuth();

  const [mode, setMode] = useState(route.params?.mode || 'snap');
  const [assets, setAssets] = useState([]);
  const [filter, setFilter] = useState('burgundy');
  const [caption, setCaption] = useState('');
  const [storyText, setStoryText] = useState('');
  const [activeStickers, setActiveStickers] = useState(['🍷 STIMZZY VIBE']);
  const [music, setMusic] = useState('');
  const [storyDuration, setStoryDuration] = useState(24);
  const [snapTimer, setSnapTimer] = useState(10);
  const [showTimeBadge, setShowTimeBadge] = useState(true);
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  // Tools overlay
  const [stickerPickerVisible, setStickerPickerVisible] = useState(false);
  const [sendToVisible, setSendToVisible] = useState(false);

  // Send To state
  const [sendToStory, setSendToStory] = useState(true);
  const [storyVisibility, setStoryVisibility] = useState('everyone');
  const [recipients, setRecipients] = useState([]);
  const [friendsList, setFriendsList] = useState([]);
  const [searchFriend, setSearchFriend] = useState('');
  const [progress, setProgress] = useState(null);
  const [location, setLocation] = useState('');

  // Post tagging
  const [tags, setTags] = useState([]);
  const [tagQ, setTagQ] = useState('');
  const [tagSug, setTagSug] = useState([]);

  useEffect(() => {
    const now = new Date();
    setCurrentTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      refreshUser()
        .then((latestUser) => {
          if (active && !latestUser.isPremium && storyDuration > 24) setStoryDuration(24);
        })
        .catch(() => {});

      // Load friends / recent conversations for quick sending
      api.get('/conversations')
        .then((res) => {
          if (!active) return;
          const convos = (res.conversations || []).map((c) => c.user).filter(Boolean);
          setFriendsList(convos);
          if (route.params?.targetUser) {
            setRecipients([route.params.targetUser._id]);
            setSendToVisible(true);
          }
        })
        .catch(() => {});

      return () => { active = false; };
    }, [refreshUser, route.params?.targetUser])
  );

  const launchCamera = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        return Alert.alert('Camera needed', 'Please allow camera access in your settings to snap photos and videos.');
      }
      const types = mode === 'vibe' ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.All;
      const r = await ImagePicker.launchCameraAsync({
        mediaTypes: types,
        quality: 0.85,
        videoMaxDuration: 60,
      });
      if (r.canceled || !r.assets?.length) return;
      setAssets(r.assets);
      if (mode === 'snap' && route.params?.targetUser) {
        setSendToVisible(true);
      }
    } catch (e) {
      Alert.alert('Camera error', e.message || 'Could not launch camera.');
    }
  };

  const launchGallery = async () => {
    try {
      const types = mode === 'vibe' ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.All;
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: types,
        allowsMultipleSelection: mode === 'post',
        selectionLimit: 10,
        quality: 0.85,
      });
      if (r.canceled || !r.assets?.length) return;
      setAssets(r.assets);
    } catch (e) {
      Alert.alert('Gallery error', e.message || 'Could not open gallery.');
    }
  };

  const toggleSticker = (stk) => {
    if (activeStickers.includes(stk)) {
      setActiveStickers((prev) => prev.filter((s) => s !== stk));
    } else {
      setActiveStickers((prev) => [...prev, stk]);
    }
  };

  const toggleRecipient = (userId) => {
    if (recipients.includes(userId)) {
      setRecipients((prev) => prev.filter((id) => id !== userId));
    } else {
      setRecipients((prev) => [...prev, userId]);
    }
  };

  const resetAll = () => {
    setAssets([]);
    setCaption('');
    setStoryText('');
    setMusic('');
    setRecipients([]);
    setProgress(null);
    setSendToVisible(false);
  };

  const submitDirectPost = async () => {
    if (!assets.length) return Alert.alert('Pick something first', 'Choose a photo or video.');
    setProgress(0);
    try {
      const form = new FormData();
      if (mode === 'post') {
        assets.forEach((a, i) => form.append('media', fileFromAsset(a, `post${i}`)));
        form.append('caption', caption);
        form.append('location', location);
        form.append('filter', filter);
        form.append('visibility', 'everyone');
        tags.forEach((t) => form.append('tags', t._id));
        await upload('POST', '/posts', form, setProgress);
        resetAll();
        navigation.navigate('Home');
      } else if (mode === 'vibe') {
        form.append('video', fileFromAsset(assets[0], 'vibe'));
        form.append('caption', caption);
        if (music) form.append('audioTitle', music);
        await upload('POST', '/videos', form, setProgress);
        resetAll();
        navigation.navigate('Vibes');
      }
    } catch (e) {
      setProgress(null);
      Alert.alert('Upload error', e.message);
    }
  };

  const submitQuickShare = async () => {
    if (!assets.length) return Alert.alert('Nothing captured', 'Take or pick a photo first.');
    if (!sendToStory && recipients.length === 0) {
      return Alert.alert('Choose a destination', 'Select "My Story" or at least one friend to send to.');
    }

    setProgress(0);
    try {
      const form = new FormData();
      form.append('media', fileFromAsset(assets[0], 'quick_share'));
      form.append('toStory', String(sendToStory));
      form.append('durationHours', String(storyDuration));
      form.append('storyVisibility', storyVisibility);
      form.append('storyText', storyText || caption);
      form.append('filter', filter);
      form.append('recipients', JSON.stringify(recipients));
      form.append('isSnap', String(mode === 'snap'));
      form.append('viewOnce', String(mode === 'snap' && snapTimer === 1));
      form.append('snapTimer', String(snapTimer));
      if (music) form.append('musicTitle', music);

      await upload('POST', '/messages/quick-share', form, setProgress);
      resetAll();
      Alert.alert('Sent! 🍷', mode === 'snap' ? 'Your snap was shared!' : 'Added to your story!');
      navigation.navigate(recipients.length > 0 ? 'Inbox' : 'Home');
    } catch (e) {
      setProgress(null);
      Alert.alert('Send failed', e.message || 'Please try again.');
    }
  };

  const capturedItem = assets[0];
  const activeOverlayColor = FILTERS[filter];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0A0306' }} edges={['top', 'bottom']}>
      {/* Top Camera Navigation & Mode Tabs */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconCircle}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8 }}>
          {MODES.map((m) => {
            const isSel = mode === m.k;
            return (
              <TouchableOpacity
                key={m.k}
                onPress={() => setMode(m.k)}
                style={[
                  styles.modePill,
                  isSel && { backgroundColor: palette.burgundy, borderColor: palette.gold },
                ]}
              >
                <Text style={[styles.modeText, isSel && { color: '#fff', fontWeight: '800' }]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Viewfinder / Media Canvas Area */}
      <View style={styles.viewfinderContainer}>
        {capturedItem ? (
          <View style={styles.previewCanvas}>
            <Image source={{ uri: capturedItem.uri }} style={styles.canvasMedia} resizeMode="cover" />

            {/* Filter Color Tone Overlay */}
            {activeOverlayColor && (
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: activeOverlayColor }]} />
            )}

            {/* Live Badges & Stickers */}
            <View pointerEvents="none" style={styles.stickersOverlay}>
              {showTimeBadge && (
                <View style={styles.timeBadgeContainer}>
                  <Text style={styles.timeBadgeText}>{currentTimeStr} 🍷</Text>
                </View>
              )}

              {activeStickers.map((stk, i) => (
                <View key={i} style={styles.stickerChip}>
                  <Text style={styles.stickerChipText}>{stk}</Text>
                </View>
              ))}

              {!!storyText && (
                <View style={styles.captionBanner}>
                  <Text style={styles.captionBannerText}>{storyText}</Text>
                </View>
              )}
            </View>

            {/* Right Side Editing Tools for Captured Media */}
            <View style={styles.rightTools}>
              <TouchableOpacity onPress={() => setStickerPickerVisible(true)} style={styles.toolBtn}>
                <Ionicons name="happy-outline" size={26} color="#fff" />
                <Text style={styles.toolLabel}>Stickers</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowTimeBadge(!showTimeBadge)} style={styles.toolBtn}>
                <Ionicons name="time-outline" size={26} color={showTimeBadge ? palette.gold : '#fff'} />
                <Text style={styles.toolLabel}>Clock</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setAssets([])} style={styles.toolBtn}>
                <Ionicons name="trash-outline" size={26} color="#FF6B6B" />
                <Text style={styles.toolLabel}>Retake</Text>
              </TouchableOpacity>
            </View>

            {/* Text Overlay Input Field */}
            {(mode === 'snap' || mode === 'story') && (
              <View style={styles.quickTextInputContainer}>
                <TextInput
                  placeholder="Add a text caption banner..."
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  value={storyText}
                  onChangeText={setStoryText}
                  style={styles.quickTextInput}
                  maxLength={100}
                />
              </View>
            )}
          </View>
        ) : (
          /* Viewfinder Camera Launcher Screen */
          <View style={styles.emptyViewfinder}>
            <LinearGradient
              colors={['#1F050C', '#0D0206']}
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.viewfinderCenter}>
              <View style={styles.cameraAuraCircle}>
                <Text style={{ fontSize: 52 }}>{mode === 'vibe' ? '🎬' : '📸'}</Text>
              </View>
              <Text style={styles.viewfinderTitle}>
                {mode === 'snap'
                  ? 'Quick Snap Studio'
                  : mode === 'story'
                  ? 'Stimzzy Story'
                  : mode === 'vibe'
                  ? 'Short Vibe Video'
                  : 'Feed Post'}
              </Text>
              <Text style={styles.viewfinderDesc}>
                {mode === 'snap'
                  ? 'Shoot temporary photos & videos with fun burgundy filters'
                  : 'Capture and share with friends in real-time'}
              </Text>

              <TouchableOpacity onPress={launchCamera} activeOpacity={0.85} style={styles.viewfinderActionBtn}>
                <LinearGradient colors={snapGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.viewfinderBtnGrad}>
                  <Ionicons name="camera" size={22} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.viewfinderBtnText}>Open Camera View</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Interactive Filters Carousel Strip */}
      <View style={styles.filterStripContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 }}>
          {FILTER_LIST.map((f) => {
            const isSel = filter === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                onPress={() => setFilter(f.id)}
                style={[
                  styles.filterPill,
                  isSel && { borderColor: palette.gold, backgroundColor: `${palette.burgundy}60` },
                ]}
              >
                <Text style={{ fontSize: 18 }}>{f.icon}</Text>
                <Text style={[styles.filterLabel, isSel && { color: palette.gold, fontWeight: '800' }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Bottom Shutter & Controls Bar */}
      <View style={styles.shutterBar}>
        <TouchableOpacity onPress={launchGallery} style={styles.sideControlBtn}>
          <Ionicons name="images" size={28} color="#fff" />
          <Text style={styles.sideControlText}>Gallery</Text>
        </TouchableOpacity>

        {capturedItem ? (
          <TouchableOpacity
            onPress={() => {
              if (mode === 'post' || mode === 'vibe') {
                submitDirectPost();
              } else {
                setSendToVisible(true);
              }
            }}
            activeOpacity={0.9}
            style={styles.sendBigBtn}
          >
            <LinearGradient colors={snapGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sendBigGrad}>
              <Text style={styles.sendBigText}>{mode === 'post' ? 'Share Post' : mode === 'vibe' ? 'Post Vibe' : 'Send To'}</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 6 }} />
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={launchCamera} activeOpacity={0.85} style={styles.shutterRing}>
            <LinearGradient colors={snapGradient} style={styles.shutterInner} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => {
            if (capturedItem) {
              setSendToVisible(true);
            } else {
              launchCamera();
            }
          }}
          style={styles.sideControlBtn}
        >
          <Ionicons name={capturedItem ? 'send' : 'camera-reverse'} size={28} color={palette.gold} />
          <Text style={styles.sideControlText}>{capturedItem ? 'Send' : 'Flip'}</Text>
        </TouchableOpacity>
      </View>

      {/* Sticker Selector Modal */}
      <Modal visible={stickerPickerVisible} transparent animationType="slide" onRequestClose={() => setStickerPickerVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.stickerSheet, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Stimzzy Filters & Stickers</Text>
              <TouchableOpacity onPress={() => setStickerPickerVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.stickerGrid}>
              {STIMZZY_STICKERS.map((stk) => {
                const isAct = activeStickers.includes(stk);
                return (
                  <TouchableOpacity
                    key={stk}
                    onPress={() => toggleSticker(stk)}
                    style={[
                      styles.stickerSelectItem,
                      {
                        backgroundColor: isAct ? palette.burgundy : colors.card,
                        borderColor: isAct ? palette.gold : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.stickerSelectText, { color: isAct ? '#fff' : colors.text }]}>
                      {stk}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* "Send To" / Quick Share Sheet Modal */}
      <Modal visible={sendToVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSendToVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <View style={styles.sendSheetHeader}>
              <TouchableOpacity onPress={() => setSendToVisible(false)} style={{ padding: 6 }}>
                <Ionicons name="close" size={26} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Send To 🚀</Text>
              <View style={{ width: 32 }} />
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {/* Story Destination Option */}
              <View style={[styles.sendSectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TouchableOpacity
                  onPress={() => setSendToStory(!sendToStory)}
                  style={styles.storyToggleRow}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <LinearGradient colors={snapGradient} style={styles.storyIconBadge}>
                      <Ionicons name="flash" size={18} color="#fff" />
                    </LinearGradient>
                    <View style={{ marginLeft: 12 }}>
                      <Text style={[styles.cardTitle, { color: colors.text }]}>Your Story</Text>
                      <Text style={[styles.cardSub, { color: colors.muted }]}>
                        {sendToStory ? `Expires in ${storyDuration}h` : 'Tap to share on story'}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={sendToStory ? 'checkbox' : 'square-outline'}
                    size={26}
                    color={sendToStory ? palette.burgundyLight : colors.muted}
                  />
                </TouchableOpacity>

                {sendToStory && (
                  <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderColor: colors.border }}>
                    <Text style={[styles.subSectionTitle, { color: colors.muted }]}>Story Duration (Ephemeral Timer)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                      {STORY_DURATIONS.map((dur) => {
                        const isPremiumNeeded = dur.hours > 24;
                        const isSel = storyDuration === dur.hours;
                        return (
                          <TouchableOpacity
                            key={dur.hours}
                            onPress={() => {
                              if (isPremiumNeeded && !user?.isPremium) {
                                return Alert.alert('Premium Feature', 'Durations longer than 24 hours require Stimzzy Premium.');
                              }
                              setStoryDuration(dur.hours);
                            }}
                            style={[
                              styles.durationPill,
                              { backgroundColor: isSel ? palette.burgundy : colors.bg, borderColor: isSel ? palette.gold : colors.border },
                            ]}
                          >
                            <Text style={[styles.durationText, { color: isSel ? '#fff' : colors.text }]}>
                              {dur.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Snap Timer for Direct Snaps */}
              {mode === 'snap' && (
                <View style={[styles.sendSectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.subSectionTitle, { color: colors.muted }]}>Disappearing Snap Timer</Text>
                  <View style={{ flexDirection: 'row', marginTop: 8 }}>
                    {SNAP_TIMERS.map((st) => {
                      const isSel = snapTimer === st.sec;
                      return (
                        <TouchableOpacity
                          key={st.sec}
                          onPress={() => setSnapTimer(st.sec)}
                          style={[
                            styles.timerPill,
                            { backgroundColor: isSel ? palette.burgundy : colors.bg, borderColor: isSel ? palette.gold : colors.border },
                          ]}
                        >
                          <Text style={[styles.timerPillText, { color: isSel ? '#fff' : colors.text }]}>
                            {st.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Direct Send to Friends */}
              <View style={[styles.sendSectionCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 14 }]}>
                <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 8 }]}>Direct Snaps to Friends</Text>
                <TextInput
                  placeholder="Search friends..."
                  placeholderTextColor={colors.muted}
                  value={searchFriend}
                  onChangeText={setSearchFriend}
                  style={[styles.friendSearchInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                />

                {friendsList
                  .filter((f) => (f.username || '').toLowerCase().includes(searchFriend.toLowerCase()))
                  .map((friend) => {
                    const isSelected = recipients.includes(friend._id);
                    return (
                      <TouchableOpacity
                        key={friend._id}
                        onPress={() => toggleRecipient(friend._id)}
                        style={styles.friendRow}
                      >
                        <Avatar user={friend} size={42} showFrame />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={[styles.friendName, { color: colors.text }]}>@{friend.username}</Text>
                          {!!friend.fullName && (
                            <Text style={[styles.friendSub, { color: colors.muted }]}>{friend.fullName}</Text>
                          )}
                        </View>
                        <Ionicons
                          name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                          size={24}
                          color={isSelected ? palette.burgundyLight : colors.muted}
                        />
                      </TouchableOpacity>
                    );
                  })}
                {friendsList.length === 0 && (
                  <Text style={{ color: colors.muted, textAlign: 'center', paddingVertical: 14 }}>
                    Start chats with friends to quick-snap them here!
                  </Text>
                )}
              </View>

              {progress !== null && (
                <View style={{ marginTop: 14 }}>
                  <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' }}>
                    <View style={{ width: `${Math.round(progress * 100)}%`, height: 6, backgroundColor: palette.burgundyLight }} />
                  </View>
                  <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 4, fontSize: 12 }}>
                    Sending snap... {Math.round(progress * 100)}%
                  </Text>
                </View>
              )}

              {/* Send Button */}
              <TouchableOpacity onPress={submitQuickShare} activeOpacity={0.9} style={styles.confirmSendBtn}>
                <LinearGradient colors={snapGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.confirmSendGrad}>
                  <Text style={styles.confirmSendText}>
                    Send ({recipients.length > 0 ? `${recipients.length} friends` : ''}{sendToStory && recipients.length > 0 ? ' + Story' : sendToStory ? 'Story' : ''})
                  </Text>
                  <Ionicons name="paper-plane" size={20} color="#fff" style={{ marginLeft: 8 }} />
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  modePill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    marginRight: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modeText: {
    color: '#ddd',
    fontSize: 13,
    fontWeight: '600',
  },
  viewfinderContainer: {
    flex: 1,
    marginHorizontal: 12,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  emptyViewfinder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinderCenter: {
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  cameraAuraCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(125,17,40,0.3)',
    borderWidth: 2,
    borderColor: palette.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  viewfinderTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  viewfinderDesc: {
    color: '#aaa',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  viewfinderActionBtn: {
    marginTop: 22,
    borderRadius: 24,
    overflow: 'hidden',
  },
  viewfinderBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  viewfinderBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  previewCanvas: {
    flex: 1,
  },
  canvasMedia: {
    width: '100%',
    height: '100%',
  },
  stickersOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeBadgeContainer: {
    position: 'absolute',
    top: 20,
    left: 16,
    backgroundColor: 'rgba(74,8,23,0.85)',
    borderWidth: 1,
    borderColor: palette.gold,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  timeBadgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 1,
  },
  stickerChip: {
    backgroundColor: 'rgba(125,17,40,0.9)',
    borderWidth: 1.5,
    borderColor: palette.gold,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  stickerChipText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  captionBanner: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 10,
    maxWidth: '90%',
  },
  captionBannerText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  rightTools: {
    position: 'absolute',
    right: 12,
    top: 16,
    alignItems: 'center',
  },
  toolBtn: {
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  toolLabel: {
    color: '#fff',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  quickTextInputContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  quickTextInput: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    color: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    fontSize: 14,
  },
  filterStripContainer: {
    paddingVertical: 10,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    marginRight: 8,
    backgroundColor: 'rgba(20,5,10,0.6)',
  },
  filterLabel: {
    color: '#ccc',
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '600',
  },
  shutterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  sideControlBtn: {
    alignItems: 'center',
    minWidth: 54,
  },
  sideControlText: {
    color: '#ccc',
    fontSize: 11,
    marginTop: 4,
  },
  shutterRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  sendBigBtn: {
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: palette.burgundyGlow,
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  sendBigGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 26,
    paddingVertical: 14,
  },
  sendBigText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  stickerSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 16,
    maxHeight: '60%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  stickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  stickerSelectItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    marginRight: 8,
    marginBottom: 10,
  },
  stickerSelectText: {
    fontSize: 14,
    fontWeight: '700',
  },
  sendSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sendSectionCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
  },
  storyToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  storyIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSub: {
    fontSize: 12,
    marginTop: 2,
  },
  subSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  durationPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '700',
  },
  timerPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
  },
  timerPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  friendSearchInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 10,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  friendName: {
    fontSize: 14,
    fontWeight: '700',
  },
  friendSub: {
    fontSize: 12,
  },
  confirmSendBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 18,
    marginBottom: 30,
  },
  confirmSendGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  confirmSendText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
