import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity, Alert, Image, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api, fileFromAsset, upload } from '../services/api';
import { Header, Input, GradientButton, Avatar } from '../components/UI';

export function SettingsScreen({ navigation }) {
  const { colors, mode, setMode } = useTheme();
  const { user, setUser, logout, refreshUser } = useAuth();
  const patch = async (body) => { try { const r = await api.put('/users/me', body); setUser(r.user); } catch (e) { Alert.alert('Could not save', e.message); } };
  const requestPremium = async () => {
    try {
      const result = await api.post('/users/me/premium-request', {});
      setUser((current) => ({ ...current, ...result.user }));
      Alert.alert('Request sent', 'An admin will review your Premium request.');
    } catch (e) {
      Alert.alert('Could not request Premium', e.message);
    }
  };
  const [translatorEnabled, setTranslatorEnabled] = useState(false);
  const setTranslator = async (enabled) => {
    try {
      await AsyncStorage.setItem('translatorEnabled', enabled ? 'true' : 'false');
      setTranslatorEnabled(enabled);
    } catch (e) {
      Alert.alert('Could not save', e.message || 'The translator setting could not be saved.');
    }
  };
  React.useEffect(() => {
    AsyncStorage.getItem('translatorEnabled')
      .then((value) => setTranslatorEnabled(value === 'true'))
      .catch((e) => Alert.alert('Could not load setting', e.message || 'The translator setting could not be loaded.'));
  }, []);
  useFocusEffect(useCallback(() => {
    let active = true;
    refreshUser().catch((e) => { if (active) Alert.alert('Could not refresh account status', e.message); });
    return () => { active = false; };
  }, [refreshUser]));
  const cycle = (key, current) => { const order = ['everyone', 'followers', 'none']; return order[(order.indexOf(current) + 1) % 3]; };

  const Section = ({ title, children }) => <View style={{ marginTop: 22 }}><Text style={{ color: colors.muted, fontWeight: '800', fontSize: 12, marginBottom: 6, paddingHorizontal: 16 }}>{title.toUpperCase()}</Text>{children}</View>;
  const Row = ({ label, value, onPress, icon, danger, right }) => (
    <TouchableOpacity disabled={!onPress} onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}>
      {icon && <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.text} style={{ width: 28 }} />}
      <Text style={{ flex: 1, color: danger ? colors.danger : colors.text, fontSize: 16 }}>{label}</Text>
      {right || (value ? <Text style={{ color: colors.muted }}>{value}</Text> : null)}
      {onPress && !right && <Ionicons name="chevron-forward" size={18} color={colors.muted} style={{ marginLeft: 6 }} />}
    </TouchableOpacity>
  );
  const Sw = ({ label, value, onChange }) => <Row label={label} right={<Switch value={!!value} onValueChange={onChange} trackColor={{ true: colors.primary }} />} />;
  const privRow = (label, key) => <Row label={label} value={user.privacy?.[key] || 'everyone'} onPress={() => patch({ privacy: { [key]: cycle(key, user.privacy?.[key] || 'everyone') } })} />;
  const np = user.notificationPrefs || {};
  const changePassword = () => Alert.prompt ? Alert.prompt('Change password', 'Enter your current password, then your new one on the next prompt.', (cur) => Alert.prompt('New password', 'At least 8 characters', (nw) => api.put('/auth/change-password', { currentPassword: cur, newPassword: nw }).then(() => Alert.alert('Done ✅', 'Password changed.')).catch((e) => Alert.alert('Oops', e.message)), 'secure-text'), 'secure-text')
    : Alert.alert('Change password', 'Use "Forgot password" on the login screen to set a new password (Android prompt not built in).');
  const loginActivity = () => Alert.alert('Login activity', (user.loginActivity || []).slice(0, 5).map((a) => `${new Date(a.at).toLocaleString()}\n${(a.device || 'Unknown device').slice(0, 40)}`).join('\n\n') || 'No activity yet.');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Settings" navigation={navigation} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Section title="Translator">
          <Sw label="Enable message translator" value={translatorEnabled} onChange={setTranslator} />
        </Section>
        <Section title="Account">
          <Row icon="person-outline" label="Edit profile" onPress={() => navigation.navigate('EditProfile')} />
          <Row icon="key-outline" label="Change password" onPress={changePassword} />
          <Row icon="mail-outline" label="Email" value={user.email} />
          <Row icon="call-outline" label="Phone" value={user.phone || 'Add'} onPress={() => navigation.navigate('EditProfile')} />
        </Section>
        <Section title="Premium">
          <Row
            icon="star-outline"
            label="Longer-lasting stories"
            value={user.isPremium ? 'Active · up to 7 days' : user.premiumRequested ? 'Request pending' : 'Request Premium'}
            onPress={!user.isPremium && !user.premiumRequested ? requestPremium : undefined}
          />
        </Section>
        <Section title="Privacy">
          <Sw label="Private account" value={user.isPrivate} onChange={(v) => patch({ isPrivate: v })} />
          {privRow('Who can message me', 'messages')}{privRow('Who can comment', 'comments')}{privRow('Who can mention me', 'mentions')}{privRow('Who can tag me', 'tags')}
          <Row label="Story visibility" value={user.privacy?.stories || 'everyone'} onPress={() => patch({ privacy: { stories: { everyone: 'followers', followers: 'close_friends', close_friends: 'everyone' }[user.privacy?.stories || 'everyone'] } })} />
        </Section>
        <Section title="Notifications">
          {['likes', 'comments', 'followers', 'messages', 'rizz'].map((k) => <Sw key={k} label={k[0].toUpperCase() + k.slice(1).replace('rizz', 'Rizz Bot')} value={np[k] !== false} onChange={(v) => patch({ notificationPrefs: { [k]: v } })} />)}
        </Section>
        <Section title="Appearance">
          <View style={{ flexDirection: 'row', paddingHorizontal: 16 }}>
            {['light', 'dark', 'system'].map((m) => <TouchableOpacity key={m} onPress={() => setMode(m)} style={{ flex: 1, alignItems: 'center', padding: 12, marginRight: m !== 'system' ? 8 : 0, borderRadius: 12, backgroundColor: mode === m ? colors.primary : colors.card }}>
              <Text style={{ color: mode === m ? '#fff' : colors.text, fontWeight: '700', textTransform: 'capitalize' }}>{m}</Text></TouchableOpacity>)}
          </View>
        </Section>
        <Section title="Security">
          <Sw label="Two-factor authentication" value={user.twoFactorEnabled} onChange={(v) => patch({ twoFactorEnabled: v })} />
          <Row icon="time-outline" label="Login activity" onPress={loginActivity} />
          <Row icon="phone-portrait-outline" label="Logout all devices" onPress={() => Alert.alert('Log out everywhere?', undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Logout all', style: 'destructive', onPress: async () => { try { await api.post('/auth/logout-all'); } catch {} logout(false); } }])} />
        </Section>
        <Section title="Other">
          <Row icon="help-circle-outline" label="Help" onPress={() => Alert.alert('Help', 'Email support@stimzzysgram.app')} />
          <Row icon="information-circle-outline" label="About StimzzyVibe" onPress={() => Alert.alert('StimzzyVibe', 'Connect. Share. Vibe. 🚀\nVersion 1.0.0')} />
          <Row icon="document-text-outline" label="Terms" onPress={() => Alert.alert('Terms', 'Add your Terms of Service URL here.')} />
          <Row icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => Alert.alert('Privacy Policy', 'Add your Privacy Policy URL here.')} />
          {user.role === 'admin' && <Row icon="speedometer-outline" label="Admin dashboard" onPress={() => navigation.navigate('Admin')} />}
          <Row icon="log-out-outline" label="Log out" danger onPress={() => logout()} />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

export function EditProfileScreen({ navigation }) {
  const { colors } = useTheme(); const { user, setUser } = useAuth();
  const [f, setF] = useState({ fullName: user.fullName, username: user.username, bio: user.bio, website: user.website, phone: user.phone });
  const [avatar, setAvatar] = useState(null); const [saving, setSaving] = useState(false);
  const pick = async () => {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
      if (r.canceled || !r.assets?.length) return;
      setAvatar(r.assets[0]);
    } catch (error) {
      Alert.alert('Image picker failed', error?.message || 'Please try again.');
    }
  };
  const save = async () => {
    if (saving) return;
    if (avatar && !avatar.uri) {
      Alert.alert('Photo unavailable', 'Please choose the profile photo again.');
      return;
    }
    setSaving(true);
    try {
      const form = new FormData();
      Object.entries(f).forEach(([key, value]) => form.append(key, value || ''));
      if (avatar) form.append('avatar', fileFromAsset(avatar, 'avatar'));
      const result = await upload('PUT', '/users/me', form);
      if (!result.user) throw new Error('The server did not return your updated profile. Please try again.');
      setUser(result.user);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Could not save profile', error?.message || 'Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Edit profile" navigation={navigation} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={pick} style={{ alignItems: 'center', marginBottom: 20 }}>
            {avatar ? <Image key={avatar.uri} source={{ uri: avatar.uri }} style={{ width: 96, height: 96, borderRadius: 48 }} /> : <Avatar user={user} size={96} />}
            <Text style={{ color: colors.primary, fontWeight: '700', marginTop: 8 }}>{avatar ? 'Photo selected · tap to change' : 'Choose profile photo'}</Text>
            {!!avatar && <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>Save changes to upload it to your profile.</Text>}
          </TouchableOpacity>
          <Input placeholder="Full name" value={f.fullName} onChangeText={(v) => setF({ ...f, fullName: v })} />
          <Input placeholder="Username" autoCapitalize="none" value={f.username} onChangeText={(v) => setF({ ...f, username: v })} />
          <Input placeholder="Bio" value={f.bio} onChangeText={(v) => setF({ ...f, bio: v })} multiline maxLength={200} />
          <Input placeholder="Website" autoCapitalize="none" value={f.website} onChangeText={(v) => setF({ ...f, website: v })} />
          <Input placeholder="Phone" keyboardType="phone-pad" value={f.phone} onChangeText={(v) => setF({ ...f, phone: v })} />
          <GradientButton title="Save changes" onPress={save} loading={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
