import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Image, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api, fileFromAsset } from '../services/api';
import { GradientButton, OutlineButton, Input, SelectInput } from '../components/UI';
import BrandWordmark from '../components/BrandWordmark';
import { palette } from '../theme';
import { COUNTRIES, getDefaultLanguage, TRANSLATION_LANGUAGES } from '../data/locales';

export function WelcomeScreen({ navigation }) {
  return (
    <LinearGradient colors={[palette.midnight, palette.graphite, '#34261D']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, padding: 28, justifyContent: 'space-between' }}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <BrandWordmark />
          <View style={{ width: 48, height: 2, backgroundColor: palette.gold, marginTop: 12 }} />
          <Text style={{ fontSize: 26, color: palette.pearl, marginTop: 24, lineHeight: 36, fontWeight: '600' }}>Connect.{'\n'}Share.{'\n'}Vibe.</Text>
          <Text style={{ color: palette.smoke, marginTop: 16 }}>🤖 Now with Rizz Bot: never run out of things to say.</Text>
        </View>
        <GradientButton title="Create Account" onPress={() => navigation.navigate('Register')} />
        <OutlineButton title="Login" onPress={() => navigation.navigate('Login')} style={{ marginTop: 12, borderColor: '#fff' }} />
      </SafeAreaView>
    </LinearGradient>
  );
}

const Screen = ({ children, title, subtitle, navigation }) => {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 12 }}><Ionicons name="chevron-back" size={28} color={colors.text} /></TouchableOpacity>
          <Text style={{ fontSize: 30, fontWeight: '800', color: colors.text }}>{title}</Text>
          <Text style={{ color: colors.muted, marginTop: 6, marginBottom: 24 }}>{subtitle}</Text>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const { colors } = useTheme();
  const [identifier, setId] = useState(''); const [password, setPw] = useState('');
  const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const submit = async () => {
    if (!identifier || !password) return setError('Enter your email/username and password.');
    setLoading(true); setError('');
    try { await login(identifier.trim(), password); } catch (e) { setError(e.message); setLoading(false); }
  };
  return (
    <Screen title="Welcome back 👋" subtitle="Log in to keep vibing." navigation={navigation}>
      <Input icon="person-outline" placeholder="Email or username" autoCapitalize="none" value={identifier} onChangeText={setId} />
      <Input icon="lock-closed-outline" placeholder="Password" secureTextEntry value={password} onChangeText={setPw} />
      {!!error && <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text>}
      <GradientButton title="Login" onPress={submit} loading={loading} />
      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={{ alignSelf: 'center', padding: 16 }}><Text style={{ color: colors.primary, fontWeight: '600' }}>Forgot password?</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('VerifyEmail')} style={{ alignSelf: 'center', marginBottom: 16 }}><Text style={{ color: colors.primary, fontWeight: '600' }}>Need to verify your email?</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.replace('Register')} style={{ alignSelf: 'center' }}><Text style={{ color: colors.muted }}>New here? <Text style={{ color: colors.primary, fontWeight: '700' }}>Create account</Text></Text></TouchableOpacity>
    </Screen>
  );
}

export function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const { colors } = useTheme();
  const [f, setF] = useState({ fullName: '', username: '', email: '', password: '', dob: '', country: '', language: '' });
  const [avatar, setAvatar] = useState(null);
  const [avatarAdded, setAvatarAdded] = useState(false);
  const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const pick = async () => {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
      if (r.canceled || !r.assets?.length) return;
      setAvatar(r.assets[0]);
      setAvatarAdded(false);
    } catch (error) {
      Alert.alert('Image picker failed', error?.message || 'Please try again.');
    }
  };
  const submit = async () => {
    if (!f.country.trim()) return setError('Enter your country.');
    if (!f.language.trim()) return setError('Enter your preferred language.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.dob)) return setError('Enter your date of birth as YYYY-MM-DD.');
    setLoading(true); setError('');
    try {
      const form = new FormData();
      form.append('fullName', f.fullName); form.append('username', f.username); form.append('email', f.email);
      form.append('password', f.password); form.append('dateOfBirth', f.dob);
      form.append('country', f.country.trim()); form.append('language', f.language.trim());
      if (avatar) form.append('avatar', fileFromAsset(avatar, 'avatar'));
      const result = await register(form);
      navigation.replace('VerifyEmail', { email: result.email || f.email.trim().toLowerCase() });
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };
  return (
    <Screen title="Join StimzzyVibe" subtitle="Create your account in a minute." navigation={navigation}>
      <TouchableOpacity onPress={pick} style={{ alignSelf: 'center', marginBottom: 20 }}>
        {avatar ? <Image source={{ uri: avatar.uri }} style={{ width: 96, height: 96, borderRadius: 48 }} />
          : <LinearGradient colors={[palette.gold, palette.bronze]} style={{ width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="camera" size={34} color="#fff" /></LinearGradient>}
        <Text style={{ color: colors.primary, textAlign: 'center', marginTop: 6, fontWeight: '600' }}>
          {avatar ? 'Cropped picture · tap to change' : 'Choose and crop profile picture'}
        </Text>
      </TouchableOpacity>
      {!!avatar && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ selected: avatarAdded }}
          onPress={() => setAvatarAdded(true)}
          disabled={avatarAdded}
          style={{
            alignSelf: 'center',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: avatarAdded ? colors.accent : colors.primary,
            borderRadius: 12,
            paddingHorizontal: 20,
            paddingVertical: 10,
            marginTop: -8,
            marginBottom: 20,
          }}
        >
          <Ionicons name={avatarAdded ? 'checkmark-circle' : 'add-circle-outline'} size={18} color={avatarAdded ? colors.accent : colors.primary} />
          <Text style={{ color: avatarAdded ? colors.accent : colors.primary, fontWeight: '700', marginLeft: 8 }}>
            {avatarAdded ? 'Picture added' : 'Add picture'}
          </Text>
        </TouchableOpacity>
      )}
      <Input icon="person-outline" placeholder="Full name" value={f.fullName} onChangeText={set('fullName')} />
      <Input icon="at" placeholder="Username" autoCapitalize="none" value={f.username} onChangeText={set('username')} />
      <Input icon="mail-outline" placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={f.email} onChangeText={set('email')} />
      <Input icon="lock-closed-outline" placeholder="Password (min 8 characters)" secureTextEntry value={f.password} onChangeText={set('password')} />
      <Input icon="calendar-outline" placeholder="Date of birth (YYYY-MM-DD)" keyboardType="numbers-and-punctuation" value={f.dob} onChangeText={set('dob')} maxLength={10} />
      <SelectInput icon="globe-outline" label="Country" placeholder="Select your country (required)" value={f.country} options={COUNTRIES} onSelect={(country) => { set('country')(country); set('language')(getDefaultLanguage(country)); }} />
      <SelectInput icon="language-outline" label="Language" placeholder="Select your preferred language (required)" value={f.language} options={TRANSLATION_LANGUAGES} onSelect={set('language')} />
      {!!error && <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text>}
      <GradientButton title="Create Account" onPress={submit} loading={loading} />
    </Screen>
  );
}

export function VerifyEmailScreen({ navigation, route }) {
  const { verifyEmail, resendVerification } = useAuth();
  const { colors } = useTheme();
  const [email, setEmail] = useState(route.params?.email || '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const verify = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await verifyEmail(email.trim(), code);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setResending(true);
    setError('');
    setMessage('');
    try {
      const result = await resendVerification(email.trim());
      setMessage(result.message || 'A new verification code has been sent.');
    } catch (e) {
      setError(e.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <Screen title="Verify your email" subtitle="Enter the 6-digit code sent to your email. It expires in 15 minutes." navigation={navigation}>
      <Input
        icon="mail-outline"
        placeholder="Email address"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!route.params?.email}
      />
      <Input
        icon="keypad-outline"
        placeholder="6-digit verification code"
        value={code}
        onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        autoComplete="one-time-code"
      />
      {!!error && <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text>}
      {!!message && <Text style={{ color: colors.muted, marginBottom: 12 }}>{message}</Text>}
      <GradientButton title="Verify email" onPress={verify} loading={loading} />
      <TouchableOpacity onPress={resend} disabled={resending} style={{ alignSelf: 'center', padding: 16, opacity: resending ? 0.6 : 1 }}>
        <Text style={{ color: colors.primary, fontWeight: '600' }}>{resending ? 'Sending code...' : 'Resend verification code'}</Text>
      </TouchableOpacity>
    </Screen>
  );
}

export function ForgotPasswordScreen({ navigation }) {
  const { colors } = useTheme();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState(''); const [token, setToken] = useState(''); const [password, setPw] = useState('');
  const [loading, setLoading] = useState(false); const [msg, setMsg] = useState('');
  const run = async () => {
    setLoading(true); setMsg('');
    try {
      if (step === 1) { await api.post('/auth/forgot-password', { email }); setStep(2); setMsg('If that email exists, a reset code was sent.'); }
      else { await api.post('/auth/reset-password', { email, token, password }); Alert.alert('Done ✅', 'Password updated. Please log in.'); navigation.navigate('Login'); }
    } catch (e) { setMsg(e.message); }
    setLoading(false);
  };
  return (
    <Screen title="Reset password" subtitle={step === 1 ? "We'll email you a 6-character code." : 'Enter the code and your new password.'} navigation={navigation}>
      <Input icon="mail-outline" placeholder="Email" autoCapitalize="none" value={email} onChangeText={setEmail} editable={step === 1} />
      {step === 2 && <><Input icon="key-outline" placeholder="Reset code" autoCapitalize="characters" value={token} onChangeText={setToken} />
        <Input icon="lock-closed-outline" placeholder="New password" secureTextEntry value={password} onChangeText={setPw} /></>}
      {!!msg && <Text style={{ color: colors.muted, marginBottom: 12 }}>{msg}</Text>}
      <GradientButton title={step === 1 ? 'Send code' : 'Reset password'} onPress={run} loading={loading} />
    </Screen>
  );
}
