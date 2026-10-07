import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Image, Alert, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api, upload, fileFromAsset } from '../services/api';
import { GradientButton } from './UI';
import { palette } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const AVATAR_FRAMES = [
  { id: 'burgundy_flame', label: 'Stimzzy Velvet', colors: ['#4A0817', '#7D1128', '#C22D52'], icon: '🍷' },
  { id: 'royal_gold', label: 'Royal 24K', colors: ['#8A6538', '#D4AF6A', '#FBE2A7'], icon: '👑' },
  { id: 'neon_wine', label: 'Neon Wine', colors: ['#7D1128', '#E11D48', '#FFA4C2'], icon: '⚡' },
  { id: 'diamond_frost', label: 'Diamond Ice', colors: ['#0369A1', '#06B6D4', '#BAE6FD'], icon: '💎' },
  { id: 'rose_sparkle', label: 'Rose Gold', colors: ['#9D174D', '#F472B6', '#FCE7F3'], icon: '🌹' },
  { id: 'noir_stealth', label: 'Noir Stealth', colors: ['#1A0A10', '#33121B', '#662035'], icon: '🕶️' },
];

export const AVATAR_ACCESSORIES = [
  { id: '', label: 'None', icon: '✕' },
  { id: '👑', label: 'Crown', icon: '👑' },
  { id: '😎', label: 'VIP Shades', icon: '😎' },
  { id: '🍷', label: 'Wine Vibe', icon: '🍷' },
  { id: '✨', label: 'Sparkles', icon: '✨' },
  { id: '⚡', label: 'Electric', icon: '⚡' },
  { id: '🎧', label: 'Headphones', icon: '🎧' },
  { id: '🧢', label: 'Street Cap', icon: '🧢' },
  { id: '🔥', label: 'Flame', icon: '🔥' },
];

export const VIBE_MOODS = [
  { mood: '🍷 Sipping & Vibeing', label: 'Sipping & Vibeing' },
  { mood: '🔥 In the Zone', label: 'In the Zone' },
  { mood: '👑 VIP Status', label: 'VIP Status' },
  { mood: '⚡ Electric Energy', label: 'Electric Energy' },
  { mood: '💎 Living Soft Life', label: 'Living Soft Life' },
  { mood: '🌙 Midnight Aesthetic', label: 'Midnight Aesthetic' },
  { mood: '🚀 Next Level', label: 'Next Level' },
  { mood: '✨ Main Character', label: 'Main Character' },
  { mood: '💯 Always Authentic', label: 'Always Authentic' },
];

export const PRESET_AVATARS = [
  { id: 'burgundy_luxe', uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80', label: 'Velvet Chic' },
  { id: 'urban_king', uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80', label: 'Urban King' },
  { id: 'golden_glow', uri: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80', label: 'Golden Queen' },
  { id: 'midnight_dapper', uri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80', label: 'Dapper Vibe' },
  { id: 'rose_noir', uri: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&auto=format&fit=crop&q=80', label: 'Rose Noir' },
  { id: 'cyber_icon', uri: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80', label: 'Cyber Icon' },
  { id: 'luxury_glam', uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80', label: 'Luxury Glam' },
  { id: 'street_style', uri: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=300&auto=format&fit=crop&q=80', label: 'Street Flair' },
];

export default function AvatarCustomizerModal({ visible, onClose }) {
  const { colors } = useTheme();
  const { user, setUser } = useAuth();

  const currentCustom = user?.avatarCustomization || {};
  const [frame, setFrame] = useState(currentCustom.frame || 'burgundy_flame');
  const [accessory, setAccessory] = useState(currentCustom.accessory || '👑');
  const [mood, setMood] = useState(currentCustom.mood || '🍷 Sipping & Vibeing');
  const [selectedAvatarUri, setSelectedAvatarUri] = useState(user?.avatar || '');
  const [pickedFile, setPickedFile] = useState(null);
  const [tab, setTab] = useState('look'); // 'look' | 'frame' | 'accessory' | 'mood'
  const [saving, setSaving] = useState(false);

  const activeFrameObj = AVATAR_FRAMES.find((f) => f.id === frame) || AVATAR_FRAMES[0];

  const pickCustomPhoto = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (res.canceled || !res.assets?.length) return;
      setPickedFile(res.assets[0]);
      setSelectedAvatarUri(res.assets[0].uri);
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not pick photo');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const customizationData = {
        frame,
        accessory,
        mood,
        auraColor: activeFrameObj.colors[1],
        style: 'stimzzy_vibe',
      };

      if (pickedFile) {
        const form = new FormData();
        form.append('avatar', fileFromAsset(pickedFile, 'avatar'));
        form.append('avatarCustomization', JSON.stringify(customizationData));
        const res = await upload('PUT', '/users/me', form);
        if (res.user) setUser(res.user);
      } else {
        const body = {
          avatarCustomization: customizationData,
        };
        if (selectedAvatarUri && selectedAvatarUri !== user?.avatar) {
          body.avatar = selectedAvatarUri;
        }
        const res = await api.put('/users/me', body);
        if (res.user) setUser(res.user);
      }
      Alert.alert('Vibe Saved! 🍷', 'Your custom avatar identity is now live across StimzzyVibe.');
      onClose();
    } catch (e) {
      Alert.alert('Could not save', e.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
            <Ionicons name="close" size={26} color={colors.text} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.title, { color: colors.text }]}>Stimzzy Vibe Studio</Text>
            <Text style={[styles.subtitle, { color: palette.gold }]}>Custom Avatar & Identity</Text>
          </View>
          <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.saveBtn, { backgroundColor: palette.burgundy }]}>
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>

        {/* Live Avatar Preview Area */}
        <View style={[styles.previewArea, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <LinearGradient
            colors={activeFrameObj.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarOuterRing}
          >
            <View style={[styles.avatarInnerContainer, { backgroundColor: colors.bg }]}>
              {selectedAvatarUri ? (
                <Image source={{ uri: selectedAvatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: palette.burgundy }]}>
                  <Text style={styles.avatarInitial}>
                    {(user?.username || 'S').slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            {/* Accessory Overlay Badge */}
            {!!accessory && (
              <View style={[styles.accessoryBadge, { borderColor: colors.bg }]}>
                <Text style={{ fontSize: 24 }}>{accessory}</Text>
              </View>
            )}
          </LinearGradient>

          {/* User Name & Custom Mood Tag */}
          <Text style={[styles.previewUsername, { color: colors.text }]}>@{user?.username || 'stimzzy'}</Text>
          {!!mood && (
            <View style={[styles.moodTag, { backgroundColor: `${palette.burgundy}30`, borderColor: palette.burgundyLight }]}>
              <Text style={[styles.moodText, { color: palette.gold }]}>{mood}</Text>
            </View>
          )}
        </View>

        {/* Tabs for customization */}
        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          {[
            { id: 'look', label: 'Look', icon: 'person' },
            { id: 'frame', label: 'Frames', icon: 'aperture' },
            { id: 'accessory', label: 'Add-ons', icon: 'sparkles' },
            { id: 'mood', label: 'Mood', icon: 'chatbubble-ellipses' },
          ].map((t) => (
            <TouchableOpacity
              key={t.id}
              onPress={() => setTab(t.id)}
              style={[
                styles.tabItem,
                tab === t.id && [styles.activeTabItem, { borderBottomColor: palette.burgundyLight }],
              ]}
            >
              <Ionicons
                name={t.icon}
                size={18}
                color={tab === t.id ? palette.gold : colors.muted}
              />
              <Text style={[styles.tabLabel, { color: tab === t.id ? palette.gold : colors.muted }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Customization Options Content */}
        <ScrollView contentContainerStyle={styles.optionsContent}>
          {tab === 'look' && (
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Choose Avatar Photo or Character</Text>
              <TouchableOpacity
                onPress={pickCustomPhoto}
                style={[styles.uploadCard, { borderColor: palette.burgundy, backgroundColor: `${palette.burgundy}15` }]}
              >
                <Ionicons name="camera-reverse" size={28} color={palette.gold} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={[styles.uploadCardTitle, { color: colors.text }]}>Upload Your Own Photo</Text>
                  <Text style={[styles.uploadCardSub, { color: colors.muted }]}>Pick from gallery or take a selfie</Text>
                </View>
              </TouchableOpacity>

              <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>Or Choose a Stimzzy Stylized Character:</Text>
              <View style={styles.presetGrid}>
                {PRESET_AVATARS.map((p) => {
                  const isSelected = selectedAvatarUri === p.uri;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => {
                        setPickedFile(null);
                        setSelectedAvatarUri(p.uri);
                      }}
                      style={[
                        styles.presetItem,
                        isSelected && [styles.selectedPreset, { borderColor: palette.gold }],
                      ]}
                    >
                      <Image source={{ uri: p.uri }} style={styles.presetImage} />
                      <Text style={[styles.presetLabel, { color: colors.text }]} numberOfLines={1}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {tab === 'frame' && (
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Signature Stimzzy Rings & Glows</Text>
              <View style={styles.frameGrid}>
                {AVATAR_FRAMES.map((f) => {
                  const isSelected = frame === f.id;
                  return (
                    <TouchableOpacity
                      key={f.id}
                      onPress={() => setFrame(f.id)}
                      style={[
                        styles.frameCard,
                        { backgroundColor: colors.card, borderColor: isSelected ? palette.gold : colors.border },
                      ]}
                    >
                      <LinearGradient
                        colors={f.colors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.frameThumbnail}
                      >
                        <Text style={{ fontSize: 18 }}>{f.icon}</Text>
                      </LinearGradient>
                      <Text style={[styles.frameCardText, { color: colors.text }]}>{f.label}</Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={18} color={palette.gold} style={styles.checkIcon} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {tab === 'accessory' && (
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Avatar Badge & Accessories</Text>
              <View style={styles.accGrid}>
                {AVATAR_ACCESSORIES.map((acc) => {
                  const isSelected = accessory === acc.id;
                  return (
                    <TouchableOpacity
                      key={acc.id || 'none'}
                      onPress={() => setAccessory(acc.id)}
                      style={[
                        styles.accCard,
                        {
                          backgroundColor: isSelected ? `${palette.burgundy}40` : colors.card,
                          borderColor: isSelected ? palette.gold : colors.border,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 32 }}>{acc.icon}</Text>
                      <Text style={[styles.accLabel, { color: colors.text }]}>{acc.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {tab === 'mood' && (
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Set Your Current Vibe Mood</Text>
              {VIBE_MOODS.map((m) => {
                const isSelected = mood === m.mood;
                return (
                  <TouchableOpacity
                    key={m.mood}
                    onPress={() => setMood(m.mood)}
                    style={[
                      styles.moodRow,
                      {
                        backgroundColor: isSelected ? `${palette.burgundy}35` : colors.card,
                        borderColor: isSelected ? palette.burgundyLight : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.moodRowText, { color: colors.text }]}>{m.mood}</Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={palette.gold} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconBtn: {
    padding: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  previewArea: {
    alignItems: 'center',
    paddingVertical: 20,
    marginHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 4,
  },
  avatarOuterRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInnerContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '800',
  },
  accessoryBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  previewUsername: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
  },
  moodTag: {
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  moodText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    marginTop: 14,
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabItem: {
    borderBottomWidth: 2,
  },
  tabLabel: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '700',
  },
  optionsContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 10,
  },
  uploadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  uploadCardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  uploadCardSub: {
    fontSize: 12,
    marginTop: 2,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  presetItem: {
    width: (SCREEN_WIDTH - 48) / 4,
    alignItems: 'center',
    marginBottom: 14,
    padding: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPreset: {
    borderWidth: 2,
  },
  presetImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  presetLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  frameGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  frameCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  frameThumbnail: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  frameCardText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  checkIcon: {
    marginLeft: 4,
  },
  accGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  accCard: {
    width: (SCREEN_WIDTH - 52) / 3,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  accLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  moodRowText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
