import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Header, GradientButton, OutlineButton } from '../components/UI';
import { palette, gradient, burgundyGradient } from '../theme';

const PERKS = [
  { icon: 'star', title: 'VIP Gold & Burgundy Badge', desc: 'Distinguished verified VIP status across all posts, stories and chats' },
  { icon: 'sparkles', title: 'Stimzzy Vibe Studio', desc: 'Exclusive avatar frames, glowing auras, and custom mood badges' },
  { icon: 'hardware-chip-outline', title: 'Supercharged Rizz Bot AI', desc: 'Unlimited AI response generations with faster priority processing' },
  { icon: 'hourglass-outline', title: '7-Day Stories', desc: 'Keep your moments alive for up to 7 days instead of disappearing in 24 hours' },
  { icon: 'language-outline', title: 'Advanced Translation Suite', desc: 'Real-time multi-language translation across all chats and feed posts' },
  { icon: 'cloud-upload-outline', title: 'HD & Massive Uploads', desc: 'Send crystal-clear HD videos up to 100MB and documents/files' },
  { icon: 'happy-outline', title: 'VIP Stickers & Reactions', desc: 'Exclusive animated stickers and custom heart reaction bursts' },
  { icon: 'shield-checkmark-outline', title: '100% Ad-Free Vibe', desc: 'Zero interruptions, pure uninterrupted social connectivity' },
];

export default function PremiumScreen({ navigation }) {
  const { colors } = useTheme();
  const { user, setUser, refreshUser } = useAuth();
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('paystack');
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [pendingReference, setPendingReference] = useState('');

  const loadPricing = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/subscriptions/pricing?country=${encodeURIComponent(user?.country || 'Nigeria')}`);
      setPricing(res.pricing);
    } catch (e) {
      console.warn('Could not load pricing', e);
      // Fallback base
      setPricing({
        country: user?.country || 'Nigeria',
        amount: 2000,
        currency: 'NGN',
        symbol: '₦',
        formatted: '₦2,000',
      });
    } finally {
      setLoading(false);
    }
  }, [user?.country]);

  useEffect(() => {
    loadPricing();
  }, [loadPricing]);

  const handleSubscribe = async (provider) => {
    setSelectedProvider(provider);
    setCheckoutLoading(true);
    try {
      const res = await api.post('/subscriptions/checkout', {
        provider,
        country: user?.country || 'Nigeria',
      });
      setPendingReference(res.reference);
      setPaymentModalVisible(true);
    } catch (e) {
      Alert.alert('Checkout error', e.message || 'Could not initiate checkout.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const confirmPayment = async () => {
    setCheckoutLoading(true);
    try {
      const res = await api.post('/subscriptions/verify', {
        reference: pendingReference,
        provider: selectedProvider,
      });
      setUser((current) => ({ ...current, isPremium: true }));
      setPaymentModalVisible(false);
      await refreshUser();
      Alert.alert('👑 VIP Unlocked!', 'Welcome to StimzzyVibe Premium. All VIP features are now activated on your account.');
    } catch (e) {
      Alert.alert('Payment Verification', e.message || 'Payment could not be verified.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="StimzzyVibe Premium" navigation={navigation} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* Hero Banner */}
        <LinearGradient
          colors={burgundyGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.badgeGlow}>
            <Ionicons name="diamond" size={32} color={palette.gold} />
          </View>
          <Text style={styles.heroTitle}>StimzzyVibe VIP</Text>
          <Text style={styles.heroSubtitle}>
            Elevate your vibe with elite customization, unlimited AI power, and VIP status.
          </Text>

          {user?.isPremium ? (
            <View style={styles.activeBanner}>
              <Ionicons name="checkmark-circle" size={20} color="#22C55E" style={{ marginRight: 6 }} />
              <Text style={{ color: '#fff', fontWeight: '800' }}>Active Premium Subscription</Text>
            </View>
          ) : (
            <View style={styles.priceContainer}>
              {loading ? (
                <ActivityIndicator color={palette.gold} />
              ) : (
                <>
                  <Text style={styles.priceText}>{pricing?.formatted || '₦2,000'}</Text>
                  <Text style={styles.pricePeriod}> / month</Text>
                </>
              )}
            </View>
          )}

          {!user?.isPremium && (
            <Text style={{ color: palette.pearl, fontSize: 12, opacity: 0.85, marginTop: 4 }}>
              Converted dynamically for {user?.country || 'your region'}
            </Text>
          )}
        </LinearGradient>

        {/* Feature List */}
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 24, marginBottom: 12 }}>
          Exclusive VIP Benefits
        </Text>

        {PERKS.map((p, i) => (
          <View key={i} style={[styles.perkCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.perkIconWrapper}>
              <Ionicons name={p.icon} size={22} color={palette.gold} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{p.title}</Text>
              <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2, lineHeight: 18 }}>{p.desc}</Text>
            </View>
          </View>
        ))}

        {/* Payment Buttons */}
        {!user?.isPremium && (
          <View style={{ marginTop: 24 }}>
            <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase' }}>
              Select Payment Method
            </Text>

            {/* Nigeria / African Payment Option: Paystack */}
            <TouchableOpacity
              onPress={() => handleSubscribe('paystack')}
              style={[styles.providerButton, { backgroundColor: colors.card, borderColor: palette.burgundy }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="card-outline" size={22} color={palette.gold} style={{ marginRight: 10 }} />
                <View>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>
                    Pay with Paystack / Flutterwave
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    Cards, Bank Transfer, USSD (Nigeria & Africa)
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </TouchableOpacity>

            {/* International Payment Option: Stripe */}
            <TouchableOpacity
              onPress={() => handleSubscribe('stripe')}
              style={[styles.providerButton, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 10 }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="globe-outline" size={22} color={colors.primary} style={{ marginRight: 10 }} />
                <View>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>
                    Pay with Stripe (International)
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    Visa, Mastercard, Apple Pay, Google Pay
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Checkout Modal */}
      <Modal visible={paymentModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <LinearGradient colors={gradient} style={styles.modalIconCircle}>
                <Ionicons name="checkmark-done" size={28} color="#fff" />
              </LinearGradient>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 10 }}>
                Complete StimzzyVibe Payment
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 4 }}>
                Secure transaction processed by {selectedProvider === 'paystack' ? 'Paystack' : 'Stripe'}
              </Text>
            </View>

            <View style={{ backgroundColor: colors.card, padding: 14, borderRadius: 12, marginBottom: 18 }}>
              <View style={styles.modalRow}>
                <Text style={{ color: colors.muted }}>Plan:</Text>
                <Text style={{ color: colors.text, fontWeight: '700' }}>StimzzyVibe Premium (Monthly)</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={{ color: colors.muted }}>Amount:</Text>
                <Text style={{ color: palette.gold, fontWeight: '800', fontSize: 17 }}>
                  {pricing?.formatted || '₦2,000'}
                </Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={{ color: colors.muted }}>Reference:</Text>
                <Text style={{ color: colors.muted, fontSize: 11 }}>{pendingReference}</Text>
              </View>
            </View>

            <GradientButton title="Confirm & Activate VIP" onPress={confirmPayment} loading={checkoutLoading} />
            <OutlineButton title="Cancel" onPress={() => setPaymentModalVisible(false)} style={{ marginTop: 10 }} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    shadowColor: palette.burgundy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  badgeGlow: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: palette.gold,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
  },
  heroSubtitle: {
    fontSize: 14,
    color: palette.pearl,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 18,
  },
  priceText: {
    fontSize: 34,
    fontWeight: '900',
    color: palette.gold,
  },
  pricePeriod: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.25)',
    borderWidth: 1,
    borderColor: '#22C55E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
  },
  perkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  perkIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(125, 17, 40, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
  },
  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
});
