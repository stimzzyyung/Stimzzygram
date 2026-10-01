import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Animated, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { gradient } from '../theme';
import { initials, thumb } from '../utils/format';

export function GradientButton({ title, onPress, loading, disabled, style, small }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} disabled={loading || disabled} style={[{ opacity: disabled ? 0.5 : 1 }, style]}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.btn, small && s.btnSmall]}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={[s.btnText, small && { fontSize: 14 }]}>{title}</Text>}
      </LinearGradient>
    </TouchableOpacity>
  );
}

export function OutlineButton({ title, onPress, style, danger, small }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[s.btn, small && s.btnSmall, { borderWidth: 1.5, borderColor: danger ? colors.danger : colors.primary }, style]}>
      <Text style={[s.btnText, { color: danger ? colors.danger : colors.primary }, small && { fontSize: 14 }]}>{title}</Text>
    </TouchableOpacity>
  );
}

export function Input({ icon, style, error, ...props }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={[s.input, { backgroundColor: colors.card, borderColor: error ? colors.danger : colors.border }, style]}>
        {icon && <Ionicons name={icon} size={20} color={colors.muted} style={{ marginRight: 10 }} />}
        <TextInput placeholderTextColor={colors.muted} style={{ flex: 1, color: colors.text, fontSize: 16, paddingVertical: 12 }} {...props} />
      </View>
      {!!error && <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>{error}</Text>}
    </View>
  );
}

export function Avatar({ user, size = 40, ring, style }) {
  const { colors } = useTheme();
  const inner = user?.avatar ? (
    <Image source={{ uri: thumb(user.avatar, Math.ceil(size * 3)) }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.card }} />
  ) : (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.42 }}>{initials(user?.username || user?.fullName)}</Text>
    </View>
  );
  if (!ring) return <View style={style}>{inner}</View>;
  const outer = size + 8;
  return (
    <LinearGradient colors={ring === 'seen' ? [colors.border, colors.border] : gradient} style={[{ width: outer, height: outer, borderRadius: outer / 2, alignItems: 'center', justifyContent: 'center' }, style]}>
      <View style={{ padding: 2, backgroundColor: colors.bg, borderRadius: outer / 2 }}>{inner}</View>
    </LinearGradient>
  );
}

export const VerifiedBadge = ({ size = 14 }) => <Ionicons name="checkmark-circle" size={size} color="#06B6D4" style={{ marginLeft: 3 }} />;

export function Skeleton({ width = '100%', height = 16, radius = 8, style }) {
  const { colors } = useTheme();
  const a = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([Animated.timing(a, { toValue: 1, duration: 700, useNativeDriver: true }), Animated.timing(a, { toValue: 0.4, duration: 700, useNativeDriver: true })]));
    loop.start(); return () => loop.stop();
  }, []);
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: colors.skeleton, opacity: a }, style]} />;
}

export function PostSkeleton() {
  return (
    <View style={{ padding: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <Skeleton width={40} height={40} radius={20} /><Skeleton width={120} height={14} style={{ marginLeft: 10 }} />
      </View>
      <Skeleton height={320} radius={16} /><Skeleton width="60%" height={14} style={{ marginTop: 12 }} />
    </View>
  );
}

export function ErrorState({ message, onRetry, loadingText }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Text style={{ color: colors.text, fontSize: 16, textAlign: 'center', lineHeight: 24 }}>{message || '😕 Something went wrong.\n\nPlease check your internet connection and try again.'}</Text>
      {onRetry && <GradientButton title="Try again" onPress={onRetry} small style={{ marginTop: 20, minWidth: 140 }} />}
    </View>
  );
}

export const Empty = ({ icon = '✨', text }) => {
  const { colors } = useTheme();
  return <View style={{ alignItems: 'center', padding: 40 }}><Text style={{ fontSize: 40 }}>{icon}</Text><Text style={{ color: colors.muted, marginTop: 8, textAlign: 'center' }}>{text}</Text></View>;
};

export function Loading({ text }) {
  const { colors } = useTheme();
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.primary} size="large" />{text && <Text style={{ color: colors.muted, marginTop: 12 }}>{text}</Text>}</View>;
}

export function Header({ title, navigation, right }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 52, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border }}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}><Ionicons name="chevron-back" size={26} color={colors.text} /></TouchableOpacity>
      <Text style={{ flex: 1, color: colors.text, fontSize: 18, fontWeight: '700', marginLeft: 4 }} numberOfLines={1}>{title}</Text>
      {right}
    </View>
  );
}

const s = StyleSheet.create({
  btn: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  btnSmall: { minHeight: 44, borderRadius: 12, paddingHorizontal: 16 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  input: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingHorizontal: 14 },
});
