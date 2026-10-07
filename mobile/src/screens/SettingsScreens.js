import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api, fileFromAsset, upload } from '../services/api';
import { Header, Input, GradientButton, OutlineButton, Avatar, SelectInput } from '../components/UI';
import AvatarCustomizerModal from '../components/AvatarCustomizerModal';
import { palette } from '../theme';
import { COUNTRIES, getDefaultLanguage, TRANSLATION_LANGUAGES } from '../data/locales';

export function SettingsScreen({ navigation }) {
  const { colors, mode, setMode } = useTheme();
  const { user, setUser, logout, refreshUser } = useAuth();
  const [translatorEnabled, setTranslatorEnabled] = useState(false);
  const [defaultLanguage, setDefaultLanguage] = useState('English');
  const [langModalVisible, setLangModalVisible] = useState(false);

  const patch = async (body) => {
    try {
      const r = await api.put('/users/me', body);
      setUser(r.user);
    } catch (e) {
      Alert.alert('Could not save', e.message);
    }
  };

  const setTranslator = async (enabled) => {
    try {
      await AsyncStorage.setItem('translatorEnabled', enabled ? 'true' : 'false');
      setTranslatorEnabled(enabled);
    } catch (e) {
      Alert.alert('Could not save', e.message || 'Translator setting could not be saved.');
    }
  };

  const setDefLanguage = async (lang) => {
    try {
      await AsyncStorage.setItem('translationTarget', lang);
      setDefaultLanguage(lang);
    } catch (e) {
      Alert.alert('Could not save', e.message || 'Language choice could not be saved.');
    }
  };

  React.useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('translatorEnabled'),
      AsyncStorage.getItem('translationTarget'),
    ]).then(([enabled, target]) => {
      setTranslatorEnabled(enabled === 'true');
      if (target) setDefaultLanguage(target);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      refreshUser().catch((e) => {
        if (active) Alert.alert('Could not refresh account', e.message);
      });
      return () => {
        active = false;
      };
    }, [refreshUser])
  );

  const Section = ({ title, children }) => (
    <View style={{ marginTop: 22 }}>
      <Text style={{ color: colors.muted, fontWeight: '800', fontSize: 12, marginBottom: 6, paddingHorizontal: 16 }}>
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );

  const Row = ({ label, value, onPress, icon, danger, right }) => (
    <TouchableOpacity
      disabled={!onPress}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.border + '40',
      }}
    >
      {icon && <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.primary} style={{ width: 28 }} />}
      <Text style={{ flex: 1, color: danger ? colors.danger : colors.text, fontSize: 16 }}>{label}</Text>
      {right || (value ? <Text style={{ color: colors.muted, marginRight: 4 }}>{value}</Text> : null)}
      {onPress && !right && <Ionicons name="chevron-forward" size={18} color={colors.muted} />}
    </TouchableOpacity>
  );

  const Sw = ({ label, value, onChange, icon }) => (
    <Row
      icon={icon}
      label={label}
      right={<Switch value={!!value} onValueChange={onChange} trackColor={{ true: colors.primary }} />}
    />
  );

  const np = user.notificationPrefs || {};

  const changePassword = () => {
    Alert.prompt
      ? Alert.prompt(
          'Change password',
          'Enter current password, then new password.',
          (cur) =>
            Alert.prompt(
              'New password',
              'Minimum 8 characters',
              (nw) =>
                api
                  .put('/auth/change-password', { currentPassword: cur, newPassword: nw })
                  .then(() => Alert.alert('Done ✅', 'Password changed successfully.'))
                  .catch((e) => Alert.alert('Error', e.message)),
              'secure-text'
            ),
          'secure-text'
        )
      : navigation.navigate('ForgotPassword');
  };

  const loginActivity = () => {
    const list = user.loginActivity || [];
    Alert.alert(
      'Login Activity',
      list.slice(0, 5).map((a) => `${new Date(a.at).toLocaleString()}\n${(a.device || 'Mobile App').slice(0, 45)}`).join('\n\n') ||
        'No recent login activity logged.'
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Settings" navigation={navigation} />
      <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
        {/* StimzzyVibe Premium */}
        <Section title="StimzzyVibe Premium">
          <Row
            icon="diamond"
            label="StimzzyVibe VIP ⭐"
            value={user.isPremium ? 'Active Member' : 'Subscribe'}
            onPress={() => navigation.navigate('Premium')}
          />
        </Section>

        {/* Translation System */}
        <Section title="Translation 🌍">
          <Sw
            icon="language-outline"
            label="Message & Post Translator"
            value={translatorEnabled}
            onChange={setTranslator}
          />
          {translatorEnabled && (
            <Row
              icon="globe-outline"
              label="Default Target Language"
              value={defaultLanguage}
              onPress={() => setLangModalVisible(true)}
            />
          )}
        </Section>

        {/* Account Settings */}
        <Section title="Account">
          <Row icon="person-outline" label="Edit profile" onPress={() => navigation.navigate('EditProfile')} />
          <Row icon="mail-outline" label="Email" value={user.email} />
          <Row icon="globe-outline" label="Country" value={user.country || 'Nigeria'} onPress={() => navigation.navigate('EditProfile')} />
          <Row icon="chatbox-ellipses-outline" label="Language" value={user.language || 'English'} onPress={() => navigation.navigate('EditProfile')} />
          <Row icon="key-outline" label="Change password" onPress={changePassword} />
        </Section>

        {/* Privacy */}
        <Section title="Privacy">
          <Sw icon="lock-closed-outline" label="Private account" value={user.isPrivate} onChange={(v) => patch({ isPrivate: v })} />
          <Row
            icon="chatbubbles-outline"
            label="Who can message me"
            value={user.privacy?.messages || 'everyone'}
            onPress={() =>
              patch({
                privacy: {
                  messages: { everyone: 'followers', followers: 'none', none: 'everyone' }[user.privacy?.messages || 'everyone'],
                },
              })
            }
          />
          <Row
            icon="radio-button-on-outline"
            label="Who can see my stories"
            value={user.privacy?.stories || 'everyone'}
            onPress={() =>
              patch({
                privacy: {
                  stories: { everyone: 'followers', followers: 'close_friends', close_friends: 'everyone' }[user.privacy?.stories || 'everyone'],
                },
              })
            }
          />
          <Sw
            icon="eye-outline"
            label="Read receipts"
            value={user.privacy?.readReceipts !== false}
            onChange={(v) => patch({ privacy: { readReceipts: v } })}
          />
          <Sw
            icon="pulse-outline"
            label="Activity status (Online)"
            value={user.privacy?.activityStatus !== false}
            onChange={(v) => patch({ privacy: { activityStatus: v } })}
          />
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          {[
            { k: 'messages', l: 'Messages' },
            { k: 'likes', l: 'Likes' },
            { k: 'comments', l: 'Comments' },
            { k: 'followers', l: 'New Followers' },
            { k: 'stories', l: 'Story Views' },
            { k: 'rizz', l: 'Rizz Bot Alerts' },
          ].map(({ k, l }) => (
            <Sw
              key={k}
              label={l}
              value={np[k] !== false}
              onChange={(v) => patch({ notificationPrefs: { [k]: v } })}
            />
          ))}
        </Section>

        {/* Appearance */}
        <Section title="Appearance">
          <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginTop: 6 }}>
            {['light', 'dark', 'system'].map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setMode(m)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  padding: 12,
                  marginRight: m !== 'system' ? 8 : 0,
                  borderRadius: 12,
                  backgroundColor: mode === m ? colors.primary : colors.card,
                }}
              >
                <Text style={{ color: mode === m ? '#fff' : colors.text, fontWeight: '700', textTransform: 'capitalize' }}>
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {/* Security */}
        <Section title="Security">
          <Sw
            icon="shield-checkmark-outline"
            label="Two-factor authentication"
            value={user.twoFactorEnabled}
            onChange={(v) => patch({ twoFactorEnabled: v })}
          />
          <Row icon="time-outline" label="Login activity" onPress={loginActivity} />
          <Row
            icon="phone-portrait-outline"
            label="Logout all devices"
            onPress={() =>
              Alert.alert('Log out everywhere?', 'This will sign out all active sessions on other phones.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Logout all',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await api.post('/auth/logout-all');
                    } catch {}
                    logout(false);
                  },
                },
              ])
            }
          />
        </Section>

        {/* Administration & About */}
        <Section title="About & Admin">
          <Row icon="information-circle-outline" label="About StimzzyVibe" onPress={() => Alert.alert('StimzzyVibe', 'Connect. Share. Vibe. 🚀\nVersion 2.0.0 (Burgundy Edition)')} />
          {user.role === 'admin' && (
            <Row icon="speedometer-outline" label="Admin Dashboard" onPress={() => navigation.navigate('Admin')} />
          )}
          <Row icon="log-out-outline" label="Log out" danger onPress={() => logout()} />
        </Section>
      </ScrollView>

      {/* Language Selector Modal for Translator */}
      {langModalVisible && (
        <SelectInput
          icon="language-outline"
          label="Default Translation Language"
          placeholder="Select default language"
          value={defaultLanguage}
          options={TRANSLATION_LANGUAGES}
          onSelect={(lang) => {
            setDefLanguage(lang);
            setLangModalVisible(false);
          }}
        />
      )}
    </SafeAreaView>
  );
}

export function EditProfileScreen({ navigation }) {
  const { colors } = useTheme();
  const { user, setUser } = useAuth();
  const [f, setF] = useState({
    fullName: user.fullName || '',
    username: user.username || '',
    bio: user.bio || '',
    website: user.website || '',
    phone: user.phone || '',
    country: user.country || 'Nigeria',
    language: user.language || 'English',
    dob: user.dateOfBirth ? String(user.dateOfBirth).slice(0, 10) : '',
  });
  const [avatar, setAvatar] = useState(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vibeStudioVisible, setVibeStudioVisible] = useState(false);

  const pickImage = async (fromCamera = false) => {
    try {
      let r;
      if (fromCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return Alert.alert('Permission needed', 'Allow camera access to take a profile picture.');
        r = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      } else {
        r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      }
      if (r.canceled || !r.assets?.length) return;
      setAvatar(r.assets[0]);
      setRemoveAvatar(false);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Could not pick image.');
    }
  };

  const handleAvatarOptions = () => {
    Alert.alert('Profile Picture', 'Change your circular profile picture:', [
      { text: 'Take New Photo', onPress: () => pickImage(true) },
      { text: 'Choose from Gallery', onPress: () => pickImage(false) },
      {
        text: 'Remove Profile Picture',
        style: 'destructive',
        onPress: () => {
          setAvatar(null);
          setRemoveAvatar(true);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const form = new FormData();
      Object.entries(f).forEach(([key, value]) => form.append(key, value || ''));
      if (removeAvatar) {
        form.append('removeAvatar', 'true');
      } else if (avatar) {
        form.append('avatar', fileFromAsset(avatar, 'avatar'));
      }
      const result = await upload('PUT', '/users/me', form);
      if (!result.user) throw new Error('Could not update profile.');
      setUser(result.user);
      Alert.alert('Saved ✅', 'Profile updated successfully.');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Could not save profile', error?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Edit profile" navigation={navigation} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <TouchableOpacity onPress={handleAvatarOptions} style={{ alignItems: 'center' }}>
              {removeAvatar ? (
                <View
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    backgroundColor: colors.card,
                    borderWidth: 2,
                    borderColor: colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="person-outline" size={44} color={colors.muted} />
                </View>
              ) : avatar ? (
                <Image
                  source={{ uri: avatar.uri }}
                  style={{ width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: palette.gold }}
                />
              ) : (
                <Avatar user={user} size={100} showFrame ring="new" />
              )}
              <Text style={{ color: colors.primary, fontWeight: '700', marginTop: 8 }}>
                {avatar ? 'New Photo Selected · Tap to Change' : 'Tap to Change or Snap Photo'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setVibeStudioVisible(true)}
              style={{
                marginTop: 12,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: 'rgba(125,17,40,0.18)',
                borderWidth: 1,
                borderColor: palette.gold,
              }}
            >
              <Text style={{ color: palette.gold, fontSize: 13, fontWeight: '700' }}>👑 Open Stimzzy Vibe Studio</Text>
            </TouchableOpacity>
          </View>

          <AvatarCustomizerModal visible={vibeStudioVisible} onClose={() => setVibeStudioVisible(false)} />

          <Input placeholder="Full name" value={f.fullName} onChangeText={(v) => setF({ ...f, fullName: v })} />
          <Input placeholder="Username" autoCapitalize="none" value={f.username} onChangeText={(v) => setF({ ...f, username: v })} />
          <Input placeholder="Bio" value={f.bio} onChangeText={(v) => setF({ ...f, bio: v })} multiline maxLength={200} />
          <Input placeholder="Website" autoCapitalize="none" value={f.website} onChangeText={(v) => setF({ ...f, website: v })} />
          <Input placeholder="Phone" keyboardType="phone-pad" value={f.phone} onChangeText={(v) => setF({ ...f, phone: v })} />
          <Input placeholder="Date of birth (YYYY-MM-DD)" value={f.dob} onChangeText={(v) => setF({ ...f, dob: v })} />

          <SelectInput
            icon="globe-outline"
            label="Country"
            placeholder="Country"
            value={f.country}
            options={COUNTRIES}
            onSelect={(country) => {
              setF({ ...f, country, language: getDefaultLanguage(country) });
            }}
          />

          <SelectInput
            icon="language-outline"
            label="Preferred Language"
            placeholder="Language"
            value={f.language}
            options={TRANSLATION_LANGUAGES}
            onSelect={(language) => setF({ ...f, language })}
          />

          <GradientButton title="Save Changes" onPress={save} loading={saving} style={{ marginTop: 12 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
