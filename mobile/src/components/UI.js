import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Animated, Image, StyleSheet, Modal, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { gradient } from '../theme';
import { initials, thumb } from '../utils/format';

export function GradientButton({ title, onPress, loading, disabled, style, small }) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} disabled={loading || disabled} style={[{ opacity: disabled ? 0.5 : 1 }, style]}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.btn, small && s.btnSmall, s.primaryGlow]}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={[s.btnText, small && { fontSize: 14 }]}>{title}</Text>}
      </LinearGradient>
    </TouchableOpacity>
  );
}

export function OutlineButton({ title, onPress, style, danger, small }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        s.btn,
        small && s.btnSmall,
        {
          borderWidth: 1.5,
          borderColor: danger ? colors.danger : colors.primary,
          backgroundColor: danger ? `${colors.danger}12` : `${colors.primary}14`,
        },
        style,
      ]}
    >
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

export function SelectInput({ icon, label, value, placeholder, options, onSelect }) {
  const { colors } = useTheme();
  const [visible, setVisible] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const close = () => {
    setVisible(false);
    setSearch('');
  };
  const filteredOptions = options.filter((option) => option.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || placeholder}`}
        onPress={() => setVisible(true)}
        style={[s.input, { minHeight: 50, marginBottom: 12, backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Ionicons name={icon} size={20} color={colors.muted} style={{ marginRight: 10 }} />
        <Text style={{ flex: 1, color: value ? colors.text : colors.muted, fontSize: 16, paddingVertical: 12 }} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.muted} />
      </TouchableOpacity>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
        <View style={{ flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View style={{ maxHeight: '85%', backgroundColor: colors.bg, borderRadius: 18, padding: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ color: colors.text, fontSize: 19, fontWeight: '700' }}>Choose {label.toLowerCase()}</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close list" onPress={close} hitSlop={10} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={`Search ${label.toLowerCase()}`}
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              style={{ backgroundColor: colors.card, color: colors.text, borderRadius: 10, padding: 12, marginBottom: 10 }}
            />
            <FlatList
              data={filteredOptions}
              keyExtractor={(option) => option}
              keyboardShouldPersistTaps="handled"
              style={{ flexGrow: 0, maxHeight: 480 }}
              ListEmptyComponent={<Text style={{ color: colors.muted, padding: 12 }}>No matches found.</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ selected: value === item }}
                  onPress={() => { onSelect(item); close(); }}
                  style={{ minHeight: 46, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}
                >
                  <Text style={{ color: colors.text, fontSize: 16 }}>{item}</Text>
                  {value === item && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const FRAME_GRADIENTS = {
  burgundy_flame: ['#4A0817', '#7D1128', '#C22D52'],
  royal_gold: ['#8A6538', '#D4AF6A', '#FBE2A7'],
  neon_wine: ['#7D1128', '#E11D48', '#FFA4C2'],
  diamond_frost: ['#0369A1', '#06B6D4', '#BAE6FD'],
  rose_sparkle: ['#9D174D', '#F472B6', '#FCE7F3'],
  noir_stealth: ['#1A0A10', '#33121B', '#662035'],
};

export function Avatar({ user, size = 40, ring, showFrame = false, style }) {
  const { colors } = useTheme();
  const custom = user?.avatarCustomization;
  const customFrameColors = custom?.frame && FRAME_GRADIENTS[custom.frame] ? FRAME_GRADIENTS[custom.frame] : gradient;
  const accessory = custom?.accessory;

  const inner = user?.avatar ? (
    <Image source={{ uri: thumb(user.avatar, Math.ceil(size * 3)) }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.card }} />
  ) : (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.42 }}>{initials(user?.username || user?.fullName)}</Text>
    </View>
  );

  const shouldRenderRing = ring || (showFrame && custom?.frame);
  const ringColors = ring === 'seen' ? [colors.border, colors.border] : customFrameColors;
  const outer = size + 8;

  const content = shouldRenderRing ? (
    <LinearGradient colors={ringColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: outer, height: outer, borderRadius: outer / 2, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ padding: 2, backgroundColor: colors.bg, borderRadius: outer / 2 }}>{inner}</View>
    </LinearGradient>
  ) : inner;

  return (
    <View style={[{ width: shouldRenderRing ? outer : size, height: shouldRenderRing ? outer : size }, style]}>
      {content}
      {!!accessory && size >= 40 && (
        <View style={{ position: 'absolute', top: -3, right: -3, width: size * 0.4, height: size * 0.4, borderRadius: (size * 0.4) / 2, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.bg }}>
          <Text style={{ fontSize: size * 0.22 }}>{accessory}</Text>
        </View>
      )}
    </View>
  );
}

export function FloatingReactionBurst({ triggerKey, emoji }) {
  const [particles, setParticles] = React.useState([]);

  React.useEffect(() => {
    if (!emoji || !triggerKey) return;
    const id = Date.now() + Math.random();
    const anim = new Animated.Value(0);
    const newParticle = { id, emoji, anim, xOffset: (Math.random() - 0.5) * 80 };

    setParticles((prev) => [...prev.slice(-8), newParticle]);

    Animated.timing(anim, {
      toValue: 1,
      duration: 1600,
      useNativeDriver: true,
    }).start(() => {
      setParticles((prev) => prev.filter((p) => p.id !== id));
    });
  }, [triggerKey]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {particles.map((p) => {
        const translateY = p.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -320],
        });
        const opacity = p.anim.interpolate({
          inputRange: [0, 0.7, 1],
          outputRange: [1, 0.9, 0],
        });
        const scale = p.anim.interpolate({
          inputRange: [0, 0.2, 1],
          outputRange: [0.5, 1.4, 1],
        });

        return (
          <Animated.View
            key={p.id}
            style={{
              position: 'absolute',
              bottom: 80,
              alignSelf: 'center',
              transform: [{ translateY }, { translateX: p.xOffset }, { scale }],
              opacity,
            }}
          >
            <Text style={{ fontSize: 44 }}>{p.emoji}</Text>
          </Animated.View>
        );
      })}
    </View>
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
  primaryGlow: {
    shadowColor: '#D4AF6A',
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  input: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingHorizontal: 14 },
});
