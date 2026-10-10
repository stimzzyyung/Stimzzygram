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
import { palette, gradient } from '../theme';
import { COUNTRIES, getDefaultLanguage, TRANSLATION_LANGUAGES } from '../data/locales';

export function WelcomeScreen({ navigation }) {
  const { colors } = useTheme();
  return (
    <LinearGradient colors={[palette.burgundyDark, palette.burgundyDeep, palette.midnight]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, padding: 28, justifyContent: 'space-between' }}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <BrandWordmark size={42} />
          <View style={{ width: 56, height: 3, backgroundColor: palette.gold, marginTop: 14, borderRadius: 2 }} />
          <Text style={{ fontSize: 28, color: palette.pearl, marginTop: 26, lineHeight: 38, fontWeight: '700' }}>
            Connect.{'\n'}Share.{'\n'}Vibe.
          </Text>
          <Text style={{ color: palette.smoke, marginTop: 14, fontSize: 15, lineHeight: 22 }}>
            The next-generation social experience. Powered by real-time messaging, Stories, and your personal AI Rizz Bot.
          </Text>
        </View>
        <View>
          <GradientButton title="Create Account" onPress={() => navigation.navigate('Register')} />
          <OutlineButton title="Log In" onPress={() => navigation.navigate('Login')} style={{ marginTop: 12, borderColor: palette.gold }} />
        </View>
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
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 12 }}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
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
  const [identifier, setId] = useState('');
  const [password, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!identifier || !password) return setError('Enter your email or username and password.');
    setLoading(true);
    setError('');
    try {
      await login(identifier.trim(), password);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <Screen title="Welcome back 👋" subtitle="Log in to your StimzzyVibe account." navigation={navigation}>
      <Input icon="person-outline" placeholder="Email or username" autoCapitalize="none" value={identifier} onChangeText={setId} />
      <Input icon="lock-closed-outline" placeholder="Password" secureTextEntry value={password} onChangeText={setPw} />
      {!!error && <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text>}
      
      <GradientButton title="Log In" onPress={submit} loading={loading} />

      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={{ alignSelf: 'center', padding: 14 }}>
        <Text style={{ color: colors.primary, fontWeight: '600' }}>Forgot password?</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('VerifyEmail')} style={{ alignSelf: 'center', marginBottom: 14 }}>
        <Text style={{ color: colors.primary, fontWeight: '600' }}>Verify email code</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.replace('Register')} style={{ alignSelf: 'center' }}>
        <Text style={{ color: colors.muted }}>
          Don't have an account? <Text style={{ color: colors.primary, fontWeight: '700' }}>Create account</Text>
        </Text>
      </TouchableOpacity>
    </Screen>
  );
}

export function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const { colors } = useTheme();
  const [f, setF] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    dob: '',
    country: 'Nigeria',
    language: 'English',
  });
  const [avatar, setAvatar] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));

  const pickImage = async (fromCamera = false) => {
    try {
      let r;
      if (fromCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return Alert.alert('Permission needed', 'Please allow camera access to take a profile picture.');
        r = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      } else {
        r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      }
      if (r.canceled || !r.assets?.length) return;
      setAvatar(r.assets[0]);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Could not choose photo.');
    }
  };

  const handleAvatarPress = () => {
    Alert.alert('Profile Picture', 'Choose an option for your circular profile photo:', [
      { text: 'Take Photo', onPress: () => pickImage(true) },
      { text: 'Choose from Gallery', onPress: () => pickImage(false) },
      ...(avatar ? [{ text: 'Remove Photo', style: 'destructive', onPress: () => setAvatar(null) }] : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const submit = async () => {
    if (!f.fullName.trim()) return setError('Enter your full name.');
    if (!f.username.trim()) return setError('Choose a username.');
    if (!f.email.trim()) return setError('Enter your email address.');
    if (!f.password || f.password.length < 8) return setError('Password must be at least 8 characters.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.dob)) return setError('Enter your date of birth as YYYY-MM-DD.');
    if (!f.country.trim()) return setError('Select your country.');
    if (!f.language.trim()) return setError('Select your preferred language.');

    setLoading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('fullName', f.fullName.trim());
      form.append('username', f.username.trim());
      form.append('email', f.email.trim());
      form.append('password', f.password);
      form.append('dateOfBirth', f.dob);
      form.append('country', f.country.trim());
      form.append('language', f.language.trim());
      if (avatar) form.append('avatar', fileFromAsset(avatar, 'avatar'));

      const result = await register(form);
      navigation.replace('VerifyEmail', { email: result.email || f.email.trim().toLowerCase() });
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <Screen title="Join StimzzyVibe" subtitle="Create your energetic profile in seconds." navigation={navigation}>
      {/* Profile Picture Upload & Circular Preview */}
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.8} style={{ alignItems: 'center' }}>
          {avatar ? (
            <Image
              source={{ uri: avatar.uri }}
              style={{ width: 104, height: 104, borderRadius: 52, borderWidth: 3, borderColor: palette.gold }}
            />
          ) : (
            <LinearGradient
              colors={[palette.burgundyDark, palette.burgundy, palette.gold]}
              style={{ width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="camera-outline" size={40} color="#fff" />
            </LinearGradient>
          )}
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              right: 4,
              backgroundColor: colors.primary,
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: colors.bg,
            }}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={{ color: colors.primary, marginTop: 8, fontWeight: '700', fontSize: 13 }}>
          {avatar ? 'Circular Photo Preview · Tap to change' : 'Tap to upload or snap profile photo'}
        </Text>
      </View>

      <Input icon="person-outline" placeholder="Full name" value={f.fullName} onChangeText={set('fullName')} />
      <Input icon="at" placeholder="Username (letters, numbers, dots)" autoCapitalize="none" value={f.username} onChangeText={set('username')} />
      <Input
        icon="mail-outline"
        placeholder="Email address"
        autoCapitalize="none"
        keyboardType="email-address"
        value={f.email}
        onChangeText={set('email')}
      />

      <Input icon="lock-closed-outline" placeholder="Password (minimum 8 characters)" secureTextEntry value={f.password} onChangeText={set('password')} />
      <Input
        icon="calendar-outline"
        placeholder="Date of birth (YYYY-MM-DD)"
        keyboardType="numbers-and-punctuation"
        value={f.dob}
        onChangeText={set('dob')}
        maxLength={10}
      />

      {/* Country and automatic default language selector */}
      <SelectInput
        icon="globe-outline"
        label="Country"
        placeholder="Select your country"
        value={f.country}
        options={COUNTRIES}
        onSelect={(country) => {
          set('country')(country);
          set('language')(getDefaultLanguage(country));
        }}
      />

      {/* Language selector with manual searchable dropdown */}
      <SelectInput
        icon="language-outline"
        label="Language"
        placeholder="Select your preferred language"
        value={f.language}
        options={TRANSLATION_LANGUAGES}
        onSelect={set('language')}
      />

      {!!error && <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text>}

      <GradientButton title="Create Account" onPress={submit} loading={loading} />

      <TouchableOpacity onPress={() => navigation.replace('Login')} style={{ alignSelf: 'center', marginTop: 20 }}>
        <Text style={{ color: colors.muted }}>
          Already have an account? <Text style={{ color: colors.primary, fontWeight: '700' }}>Log In</Text>
        </Text>
      </TouchableOpacity>
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
    <Screen title="Verify your email" subtitle="Enter the 6-digit code sent to your email. Expires in 15 minutes." navigation={navigation}>
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
      <GradientButton title="Verify Email" onPress={verify} loading={loading} />
      <TouchableOpacity onPress={resend} disabled={resending} style={{ alignSelf: 'center', padding: 16, opacity: resending ? 0.6 : 1 }}>
        <Text style={{ color: colors.primary, fontWeight: '600' }}>{resending ? 'Sending code...' : 'Resend verification code'}</Text>
      </TouchableOpacity>
    </Screen>
  );
}

/**
 * Complete Forgot Password System:
 * Forgot Password → Enter email → Send OTP → Verify OTP → Create new password → Confirm password → Login
 */
export function ForgotPasswordScreen({ navigation }) {
  const { colors } = useTheme();
  // step: 1 (Enter Email), 2 (Verify OTP), 3 (New Password & Confirm), 4 (Done)
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Step 1: Send OTP to registered email
  const handleSendOtp = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid registered email address.');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setMessage('A 6-digit OTP code has been sent to your email. Expires in 15 minutes.');
      setStep(2);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async () => {
    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Please enter the 6-digit OTP verification code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/verify-reset-otp', { email: email.trim(), otp: otp.trim() });
      setMessage('OTP verified! Now choose your new password.');
      setStep(3);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Create & Confirm New Password
  const handleResetPassword = async () => {
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', {
        email: email.trim(),
        otp: otp.trim(),
        password,
        confirmPassword,
      });
      Alert.alert('Password Updated ✅', 'Your password has been successfully reset. Please log in with your new password.', [
        { text: 'Log In', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      title="Forgot Password"
      subtitle={
        step === 1
          ? 'Enter your registered email address to receive a secure OTP code.'
          : step === 2
          ? 'Enter the 6-digit OTP code sent to your email.'
          : 'Create and confirm your new password.'
      }
      navigation={navigation}
    >
      {/* Step Indicator */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: step >= s ? colors.primary : colors.card,
                borderWidth: 1.5,
                borderColor: step >= s ? colors.primary : colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: step >= s ? '#fff' : colors.muted, fontWeight: '700', fontSize: 13 }}>{s}</Text>
            </View>
            {s < 3 && <View style={{ flex: 1, height: 2, backgroundColor: step > s ? colors.primary : colors.border }} />}
          </React.Fragment>
        ))}
      </View>

      {/* Step 1: Email */}
      {step === 1 && (
        <>
          <Input
            icon="mail-outline"
            placeholder="Registered email address"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          {!!error && <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text>}
          {!!message && <Text style={{ color: palette.gold, marginBottom: 12 }}>{message}</Text>}
          <GradientButton title="Send OTP" onPress={handleSendOtp} loading={loading} />
        </>
      )}

      {/* Step 2: Verify OTP */}
      {step === 2 && (
        <>
          <Input
            icon="keypad-outline"
            placeholder="Enter 6-digit OTP code"
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
          />
          {!!error && <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text>}
          {!!message && <Text style={{ color: palette.gold, marginBottom: 12 }}>{message}</Text>}
          <GradientButton title="Verify OTP" onPress={handleVerifyOtp} loading={loading} />
          <TouchableOpacity onPress={handleSendOtp} style={{ alignSelf: 'center', padding: 14 }}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>Resend OTP code</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Step 3: Create & Confirm Password */}
      {step === 3 && (
        <>
          <Input
            icon="lock-closed-outline"
            placeholder="New password (min 8 characters)"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Input
            icon="checkmark-circle-outline"
            placeholder="Confirm new password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          {!!error && <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text>}
          {!!message && <Text style={{ color: palette.gold, marginBottom: 12 }}>{message}</Text>}
          <GradientButton title="Update Password & Log In" onPress={handleResetPassword} loading={loading} />
        </>
      )}

      <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ alignSelf: 'center', marginTop: 24 }}>
        <Text style={{ color: colors.muted }}>
          Remember your password? <Text style={{ color: colors.primary, fontWeight: '700' }}>Back to Log In</Text>
        </Text>
      </TouchableOpacity>
    </Screen>
  );
}
