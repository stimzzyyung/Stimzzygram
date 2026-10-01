import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Image, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api, fileFromAsset } from '../services/api';
import { GradientButton, OutlineButton, Input } from '../components/UI';
import { palette } from '../theme';

export function WelcomeScreen({ navigation }) {
  return (
    <LinearGradient colors={[palette.navy, '#1B1145', palette.purple]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, padding: 28, justifyContent: 'space-between' }}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={{ fontSize: 44, fontWeight: '900', color: '#fff', letterSpacing: 1 }}>STIMZZY'S<Text style={{ color: palette.cyan }}>GRAM</Text></Text>
          <Text style={{ fontSize: 26, color: '#E9D5FF', marginTop: 18, lineHeight: 36, fontWeight: '600' }}>Connect.{'\n'}Share.{'\n'}Vibe.</Text>
          <Text style={{ color: '#C4B5FD', marginTop: 16 }}>🤖 Now with Rizz Bot: never run out of things to say.</Text>
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
      <TouchableOpacity onPress={() => navigation.replace('Register')} style={{ alignSelf: 'center' }}><Text style={{ color: colors.muted }}>New here? <Text style={{ color: colors.primary, fontWeight: '700' }}>Create account</Text></Text></TouchableOpacity>
    </Screen>
  );
}

export function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const { colors } = useTheme();
  const [f, setF] = useState({ fullName: '', username: '', email: '', password: '', dob: '' });
  const [avatar, setAvatar] = useState(null);
  const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const pick = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!r.canceled) setAvatar(r.assets[0]);
  };
  const submit = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.dob)) return setError('Enter your date of birth as YYYY-MM-DD.');
    setLoading(true); setError('');
    const form = new FormData();
    form.append('fullName', f.fullName); form.append('username', f.username); form.append('email', f.email);
    form.append('password', f.password); form.append('dateOfBirth', f.dob);
    if (avatar) form.append('avatar', fileFromAsset(avatar, 'avatar'));
    try { await register(form); } catch (e) { setError(e.message); setLoading(false); }
  };
  return (
    <Screen title="Join Stimzzy'sgram" subtitle="Create your account in a minute." navigation={navigation}>
      <TouchableOpacity onPress={pick} style={{ alignSelf: 'center', marginBottom: 20 }}>
        {avatar ? <Image source={{ uri: avatar.uri }} style={{ width: 96, height: 96, borderRadius: 48 }} />
          : <LinearGradient colors={[palette.purple, palette.cyan]} style={{ width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="camera" size={34} color="#fff" /></LinearGradient>}
        <Text style={{ color: colors.primary, textAlign: 'center', marginTop: 6, fontWeight: '600' }}>Profile picture</Text>
      </TouchableOpacity>
      <Input icon="person-outline" placeholder="Full name" value={f.fullName} onChangeText={set('fullName')} />
      <Input icon="at" placeholder="Username" autoCapitalize="none" value={f.username} onChangeText={set('username')} />
      <Input icon="mail-outline" placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={f.email} onChangeText={set('email')} />
      <Input icon="lock-closed-outline" placeholder="Password (min 8 characters)" secureTextEntry value={f.password} onChangeText={set('password')} />
      <Input icon="calendar-outline" placeholder="Date of birth (YYYY-MM-DD)" keyboardType="numbers-and-punctuation" value={f.dob} onChangeText={set('dob')} maxLength={10} />
      {!!error && <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text>}
      <GradientButton title="Create Account" onPress={submit} loading={loading} />
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
