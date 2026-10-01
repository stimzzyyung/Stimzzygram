import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, TouchableOpacity, TextInput, Animated, Dimensions, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Avatar } from '../components/UI';
import { timeAgo } from '../utils/format';

const { width: W } = Dimensions.get('window');
const REACTS = ['❤️', '😂', '😮', '🔥', '👏'];

export default function StoryViewerScreen({ navigation, route }) {
  const { groups, index: startIndex } = route.params;
  const { user } = useAuth();
  const [gi, setGi] = useState(startIndex); const [si, setSi] = useState(0);
  const [reply, setReply] = useState(''); const [paused, setPaused] = useState(false);
  const progress = useRef(new Animated.Value(0)).current; const anim = useRef(null);
  const group = groups[gi]; const story = group?.stories[si]; const mine = group?.user._id === user._id;

  const next = () => { if (si < group.stories.length - 1) setSi(si + 1); else if (gi < groups.length - 1) { setGi(gi + 1); setSi(0); } else navigation.goBack(); };
  const prev = () => { if (si > 0) setSi(si - 1); else if (gi > 0) { setGi(gi - 1); setSi(0); } };

  useEffect(() => {
    if (!story) return;
    if (!mine) api.post(`/stories/${story._id}/view`).catch(() => {});
    progress.setValue(0);
    anim.current = Animated.timing(progress, { toValue: 1, duration: 5000, useNativeDriver: false });
    if (!paused) anim.current.start(({ finished }) => finished && next());
    return () => anim.current?.stop();
  }, [gi, si, paused]);

  const sendReply = async () => { if (!reply.trim()) return; try { await api.post(`/stories/${story._id}/reply`, { text: reply.trim() }); setReply(''); Alert.alert('Sent', 'Your reply was sent as a message.'); } catch (e) { Alert.alert('Oops', e.message); } setPaused(false); };
  const react = (emoji) => api.post(`/stories/${story._id}/react`, { emoji }).then(() => Alert.alert(emoji, 'Reaction sent')).catch((e) => Alert.alert('Oops', e.message));
  const del = () => Alert.alert('Delete story?', undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { try { await api.del(`/stories/${story._id}`); navigation.goBack(); } catch (e) { Alert.alert('Oops', e.message); } } }]);
  if (!story) return null;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {story.mediaType === 'video' ? <Video source={{ uri: story.mediaUrl }} style={{ flex: 1 }} resizeMode={ResizeMode.CONTAIN} shouldPlay={!paused} isLooping /> : <Image source={{ uri: story.mediaUrl }} style={{ flex: 1 }} resizeMode="contain" />}
      <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row' }}>
        <TouchableOpacity style={{ flex: 1 }} onPress={prev} onLongPress={() => setPaused(true)} onPressOut={() => setPaused(false)} />
        <TouchableOpacity style={{ flex: 2 }} onPress={next} onLongPress={() => setPaused(true)} onPressOut={() => setPaused(false)} />
      </View>
      {(story.text || story.stickers?.length > 0) && <View pointerEvents="none" style={{ position: 'absolute', top: '42%', alignSelf: 'center', alignItems: 'center' }}>
        {!!story.text && <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800', textAlign: 'center', textShadowColor: '#000', textShadowRadius: 8, paddingHorizontal: 20 }}>{story.text}</Text>}
        {story.stickers?.length > 0 && <Text style={{ fontSize: 46 }}>{story.stickers.join(' ')}</Text>}</View>}
      <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0 }} pointerEvents="box-none">
        <View style={{ flexDirection: 'row', paddingHorizontal: 8, paddingTop: 6 }}>
          {group.stories.map((s, i) => <View key={s._id} style={{ flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.35)', marginHorizontal: 2, borderRadius: 2, overflow: 'hidden' }}>
            <Animated.View style={{ height: 3, backgroundColor: '#fff', width: i < si ? '100%' : i === si ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) : '0%' }} /></View>)}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}>
          <Avatar user={group.user} size={36} /><Text style={{ color: '#fff', fontWeight: '700', marginLeft: 8 }}>{group.user.username}</Text><Text style={{ color: '#ddd', marginLeft: 8 }}>{timeAgo(story.createdAt)}</Text>
          <View style={{ flex: 1 }} />
          {mine && <TouchableOpacity onPress={del} style={{ padding: 6 }}><Ionicons name="trash-outline" size={24} color="#fff" /></TouchableOpacity>}
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 6 }}><Ionicons name="close" size={28} color="#fff" /></TouchableOpacity>
        </View>
      </SafeAreaView>
      {story.music?.title && <Text style={{ position: 'absolute', top: 110, left: 16, color: '#fff', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' }}>🎵 {story.music.title}</Text>}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <SafeAreaView edges={['bottom']}>
          {mine ? <Text style={{ color: '#fff', textAlign: 'center', padding: 14 }}>👁 {story.viewersCount || 0} views</Text> : (
            <View style={{ padding: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 8 }}>{REACTS.map((e) => <TouchableOpacity key={e} onPress={() => react(e)} style={{ marginHorizontal: 8 }}><Text style={{ fontSize: 28 }}>{e}</Text></TouchableOpacity>)}</View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput value={reply} onChangeText={setReply} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)} placeholder={`Reply to ${group.user.username}...`} placeholderTextColor="#ccc"
                  style={{ flex: 1, borderWidth: 1, borderColor: '#fff', borderRadius: 24, color: '#fff', paddingHorizontal: 16, paddingVertical: 10 }} />
                <TouchableOpacity onPress={sendReply} style={{ padding: 10 }}><Ionicons name="send" size={24} color="#fff" /></TouchableOpacity>
              </View>
            </View>)}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}
