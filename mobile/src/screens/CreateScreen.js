import React, { useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { upload, fileFromAsset, api } from '../services/api';
import { GradientButton, Avatar } from '../components/UI';
import { FILTERS } from '../utils/format';

const MODES = [{ k: 'post', label: 'Post' }, { k: 'story', label: 'Story' }, { k: 'vibe', label: 'Vibe' }];
const VIS = [{ k: 'everyone', label: '🌍 Everyone' }, { k: 'followers', label: '👥 Followers' }, { k: 'close_friends', label: '💚 Close friends' }];
const STICKERS = ['🔥', '😂', '😍', '💜', '✨', '🎉', '😎', '🚀', '💀', '🥹'];

export default function CreateScreen({ navigation, route }) {
  const { colors } = useTheme();
  const [mode, setMode] = useState(route.params?.mode || 'post');
  const [assets, setAssets] = useState([]);
  const [caption, setCaption] = useState(''); const [location, setLocation] = useState('');
  const [filter, setFilter] = useState('none'); const [visibility, setVisibility] = useState('everyone');
  const [storyText, setStoryText] = useState(''); const [stickers, setStickers] = useState([]); const [music, setMusic] = useState('');
  const [tagQ, setTagQ] = useState(''); const [tagSug, setTagSug] = useState([]); const [tags, setTags] = useState([]);
  const [progress, setProgress] = useState(null);

  const types = mode === 'vibe' ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.All;
  const gallery = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: types, allowsMultipleSelection: mode === 'post', selectionLimit: 10, quality: 0.8, allowsEditing: mode !== 'post' });
    if (!r.canceled) setAssets(r.assets);
  };
  const cropOne = async () => { // crop image (single)
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
    if (!r.canceled) setAssets(r.assets);
  };
  const camera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return Alert.alert('Camera permission needed', 'Enable camera access in your settings.');
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: types, quality: 0.8, videoMaxDuration: 60 });
    if (!r.canceled) setAssets(r.assets);
  };
  const searchTags = async (t) => {
    setTagQ(t);
    if (t.length < 2) return setTagSug([]);
    try { setTagSug((await api.get(`/search/suggest?q=${encodeURIComponent(t)}`)).users); } catch {}
  };

  const reset = () => { setAssets([]); setCaption(''); setLocation(''); setFilter('none'); setStoryText(''); setStickers([]); setMusic(''); setTags([]); setProgress(null); };
  const submit = async () => {
    if (!assets.length) return Alert.alert('Pick something first', 'Choose a photo or video.');
    const form = new FormData();
    let path;
    if (mode === 'post') {
      path = '/posts';
      assets.forEach((a, i) => form.append('media', fileFromAsset(a, `post${i}`)));
      form.append('caption', caption); form.append('location', location); form.append('filter', filter); form.append('visibility', visibility);
      tags.forEach((t) => form.append('tags', t._id));
    } else if (mode === 'story') {
      path = '/stories'; form.append('media', fileFromAsset(assets[0], 'story')); form.append('text', storyText); form.append('visibility', visibility);
      stickers.forEach((s) => form.append('stickers', s)); if (music) form.append('musicTitle', music);
    } else {
      path = '/videos'; form.append('video', fileFromAsset(assets[0], 'vibe')); form.append('caption', caption); if (music) form.append('audioTitle', music);
    }
    setProgress(0);
    try { await upload('POST', path, form, setProgress); reset(); navigation.navigate(mode === 'vibe' ? 'Vibes' : 'Home'); }
    catch (e) { setProgress(null); Alert.alert('Upload failed', e.message + '\n\nYour draft is still here, try again.'); }
  };

  const chip = (active) => ({ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, backgroundColor: active ? colors.primary : colors.card });
  const chipText = (active) => ({ color: active ? '#fff' : colors.text, fontWeight: '600' });
  const first = assets[0];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', padding: 10 }}>
          {MODES.map((m) => <TouchableOpacity key={m.k} onPress={() => { setMode(m.k); setAssets([]); }} style={chip(mode === m.k)}><Text style={chipText(mode === m.k)}>{m.label}</Text></TouchableOpacity>)}
        </View>
        <ScrollView contentContainerStyle={{ padding: 14 }} keyboardShouldPersistTaps="handled">
          {first ? (
            <View>
              <View>
                <Image source={{ uri: first.uri }} style={{ width: '100%', height: 320, borderRadius: 16, backgroundColor: colors.card }} resizeMode="cover" />
                {FILTERS[filter] && <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 16, backgroundColor: FILTERS[filter] }} />}
                {mode === 'story' && <Text style={{ position: 'absolute', bottom: 20, alignSelf: 'center', color: '#fff', fontSize: 24, fontWeight: '800', textShadowColor: '#000', textShadowRadius: 6 }}>{storyText} {stickers.join('')}</Text>}
                <TouchableOpacity onPress={() => setAssets([])} style={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 16, padding: 6 }}><Ionicons name="close" size={18} color="#fff" /></TouchableOpacity>
                {assets.length > 1 && <Text style={{ position: 'absolute', bottom: 10, right: 12, color: '#fff', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, borderRadius: 10, overflow: 'hidden' }}>+{assets.length - 1} more</Text>}
              </View>
              {mode === 'post' && first.type !== 'video' && <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                {Object.keys(FILTERS).map((f) => <TouchableOpacity key={f} onPress={() => setFilter(f)} style={chip(filter === f)}><Text style={chipText(filter === f)}>{f}</Text></TouchableOpacity>)}
              </ScrollView>}
            </View>
          ) : (
            <View style={{ alignItems: 'center', padding: 30, borderRadius: 20, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border }}>
              <Text style={{ fontSize: 44 }}>{mode === 'vibe' ? '🎬' : '📸'}</Text>
              <Text style={{ color: colors.text, fontWeight: '700', marginTop: 8 }}>{mode === 'vibe' ? 'Pick a short video' : mode === 'story' ? 'Add to your story' : 'Share a photo or video'}</Text>
              <View style={{ flexDirection: 'row', marginTop: 16 }}>
                <GradientButton small title="Gallery" onPress={gallery} style={{ marginRight: 8 }} />
                <GradientButton small title="Camera" onPress={camera} style={{ marginRight: 8 }} />
                {mode === 'post' && <TouchableOpacity onPress={cropOne} style={[chip(false), { justifyContent: 'center' }]}><Text style={chipText(false)}>✂️ Crop</Text></TouchableOpacity>}
              </View>
            </View>
          )}

          {mode === 'story' ? (
            <View style={{ marginTop: 16 }}>
              <TextInput placeholder="Add text to your story..." placeholderTextColor={colors.muted} value={storyText} onChangeText={setStoryText} style={{ backgroundColor: colors.card, color: colors.text, borderRadius: 12, padding: 12 }} maxLength={80} />
              <Text style={{ color: colors.muted, marginTop: 12, marginBottom: 6 }}>Stickers & emojis</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{STICKERS.map((s) => <TouchableOpacity key={s} onPress={() => setStickers((x) => x.includes(s) ? x.filter((y) => y !== s) : [...x, s])} style={{ padding: 8, margin: 3, borderRadius: 12, backgroundColor: stickers.includes(s) ? colors.primary : colors.card }}><Text style={{ fontSize: 24 }}>{s}</Text></TouchableOpacity>)}</View>
              <TextInput placeholder="🎵 Music title (optional)" placeholderTextColor={colors.muted} value={music} onChangeText={setMusic} style={{ backgroundColor: colors.card, color: colors.text, borderRadius: 12, padding: 12, marginTop: 12 }} />
            </View>
          ) : (
            <View style={{ marginTop: 16 }}>
              <TextInput placeholder="Write a caption... use #hashtags and @mentions" placeholderTextColor={colors.muted} value={caption} onChangeText={setCaption} multiline maxLength={2200}
                style={{ backgroundColor: colors.card, color: colors.text, borderRadius: 12, padding: 12, minHeight: 90, textAlignVertical: 'top' }} />
              {mode === 'post' ? (<>
                <TextInput placeholder="📍 Add location" placeholderTextColor={colors.muted} value={location} onChangeText={setLocation} style={{ backgroundColor: colors.card, color: colors.text, borderRadius: 12, padding: 12, marginTop: 10 }} />
                <TextInput placeholder="👤 Tag people (search username)" placeholderTextColor={colors.muted} value={tagQ} onChangeText={searchTags} autoCapitalize="none" style={{ backgroundColor: colors.card, color: colors.text, borderRadius: 12, padding: 12, marginTop: 10 }} />
                {tagSug.map((u) => <TouchableOpacity key={u._id} onPress={() => { setTags((t) => t.find((x) => x._id === u._id) ? t : [...t, u]); setTagQ(''); setTagSug([]); }} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}><Avatar user={u} size={30} /><Text style={{ color: colors.text, marginLeft: 8 }}>{u.username}</Text></TouchableOpacity>)}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>{tags.map((u) => <TouchableOpacity key={u._id} onPress={() => setTags((t) => t.filter((x) => x._id !== u._id))} style={chip(true)}><Text style={chipText(true)}>@{u.username} ✕</Text></TouchableOpacity>)}</View>
              </>) : <TextInput placeholder="🎵 Audio title (optional)" placeholderTextColor={colors.muted} value={music} onChangeText={setMusic} style={{ backgroundColor: colors.card, color: colors.text, borderRadius: 12, padding: 12, marginTop: 10 }} />}
            </View>
          )}

          {mode !== 'vibe' && <View style={{ marginTop: 16 }}>
            <Text style={{ color: colors.muted, marginBottom: 6 }}>Who can see this?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>{VIS.map((v) => <TouchableOpacity key={v.k} onPress={() => setVisibility(v.k)} style={chip(visibility === v.k)}><Text style={chipText(visibility === v.k)}>{v.label}</Text></TouchableOpacity>)}</ScrollView>
          </View>}

          {progress !== null && <View style={{ marginTop: 20 }}>
            <View style={{ height: 8, backgroundColor: colors.card, borderRadius: 4, overflow: 'hidden' }}><View style={{ width: `${Math.round(progress * 100)}%`, height: 8, backgroundColor: colors.primary }} /></View>
            <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 6 }}>Uploading... {Math.round(progress * 100)}%</Text>
          </View>}
          <GradientButton title={mode === 'post' ? 'Share post' : mode === 'story' ? 'Share to story' : 'Post vibe'} onPress={submit} loading={progress !== null} disabled={!assets.length} style={{ marginTop: 20, marginBottom: 30 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
