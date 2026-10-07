import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import useAsync from '../hooks/useAsync';
import { Header, Loading, ErrorState, Empty, OutlineButton, Avatar } from '../components/UI';

const TABS = ['stats', 'reports', 'subscriptions', 'pricing', 'users', 'hashtags'];

export default function AdminScreen({ navigation }) {
  const { colors } = useTheme();
  const [tab, setTab] = useState('stats');
  const [q, setQ] = useState('');
  const [newBasePrice, setNewBasePrice] = useState('2000');
  const [updatingPrice, setUpdatingPrice] = useState(false);

  const { data, loading, error, reload } = useAsync(() => {
    if (tab === 'subscriptions') return api.get('/admin/subscriptions');
    if (tab === 'pricing') return api.get('/admin/pricing-config');
    if (tab === 'reports') return api.get('/admin/reports');
    if (tab === 'stats') return api.get('/admin/stats');
    if (tab === 'users') return api.get(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`);
    if (tab === 'hashtags') return api.get(`/admin/hashtags${q ? `?q=${encodeURIComponent(q)}` : ''}`);
    return Promise.resolve({});
  }, [tab, q]);

  const act = async (fn, successMsg) => {
    try {
      await fn();
      if (successMsg) Alert.alert('Success', successMsg);
      reload();
    } catch (e) {
      Alert.alert('Oops', e.message);
    }
  };

  const handleUpdatePrice = async () => {
    const val = parseInt(newBasePrice, 10);
    if (!val || val <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid base price in NGN.');
      return;
    }
    setUpdatingPrice(true);
    try {
      await api.put('/admin/pricing-config', { basePriceNGN: val });
      Alert.alert('Price Updated', `Base StimzzyVibe Premium price set to ₦${val.toLocaleString()} NGN.`);
      reload();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setUpdatingPrice(false);
    }
  };

  const Card = ({ children, style }) => (
    <View style={[{ backgroundColor: colors.card, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border }, style]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Admin Dashboard" navigation={navigation} />
      
      {/* Horizontal Tab Navigation */}
      <View style={{ borderBottomWidth: 1, borderColor: colors.border }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8 }}>
          {TABS.map((t) => {
            const active = tab === t;
            const labels = {
              stats: '📊 Stats',
              reports: '🚨 Reports',
              subscriptions: '⭐ Subscriptions',
              pricing: '💵 Pricing',
              users: '👥 Users',
              hashtags: '# Hashtags',
            };
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setTab(t)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderBottomWidth: 2,
                  borderColor: active ? colors.primary : 'transparent',
                }}
              >
                <Text style={{
                  color: active ? colors.primary : colors.muted,
                  fontWeight: active ? '800' : '600',
                  fontSize: 14,
                }}>
                  {labels[t] || t}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Search Input for searchable tabs */}
      {(tab === 'users' || tab === 'hashtags') && (
        <View style={{ marginHorizontal: 12, marginTop: 10 }}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={`Search ${tab}...`}
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            style={{
              backgroundColor: colors.card,
              color: colors.text,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          />
        </View>
      )}

      {loading ? (
        <Loading text="Loading admin data..." />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
          {/* STATS TAB */}
          {tab === 'stats' && (
            <View>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 12 }}>
                Platform Telemetry & Overview
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                {data.stats && Object.entries({
                  'Total Users': 'totalUsers',
                  'Active (24h)': 'activeUsers',
                  'New (7d)': 'newUsers',
                  'Total Posts': 'totalPosts',
                  'Total Videos': 'totalVideos',
                  'Open Reports': 'openReports',
                  'Flagged Posts': 'flagged',
                }).map(([label, k]) => (
                  <View
                    key={k}
                    style={{
                      width: '48%',
                      backgroundColor: colors.card,
                      borderRadius: 14,
                      padding: 14,
                      marginBottom: 10,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ color: colors.primary, fontSize: 26, fontWeight: '900' }}>
                      {data.stats[k] || 0}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600', marginTop: 4 }}>
                      {label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* REPORTS TAB */}
          {tab === 'reports' && (
            data.reports && data.reports.length > 0 ? (
              data.reports.map((r) => (
                <Card key={r._id}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: colors.primary, fontWeight: '800', textTransform: 'uppercase', fontSize: 12 }}>
                      {r.targetType}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 11 }}>
                      by @{r.reporter?.username || 'user'}
                    </Text>
                  </View>
                  <Text style={{ color: colors.text, fontWeight: '700', marginTop: 6 }}>
                    Reason: <Text style={{ color: '#E11D48' }}>{r.reason}</Text>
                  </Text>
                  {!!r.targetMedia && (
                    <Image source={{ uri: r.targetMedia }} style={{ width: '100%', height: 140, borderRadius: 10, marginVertical: 8 }} />
                  )}
                  {!!r.targetPreview && (
                    <Text style={{ color: colors.muted, fontStyle: 'italic', marginVertical: 4 }} numberOfLines={3}>
                      "{r.targetPreview}"
                    </Text>
                  )}
                  <View style={{ flexDirection: 'row', marginTop: 10, justifyContent: 'flex-end' }}>
                    {r.targetType !== 'user' && (
                      <OutlineButton
                        small
                        danger
                        title="Delete Content"
                        onPress={() => act(() => api.put(`/admin/reports/${r._id}`, { action: 'remove_content' }), 'Content deleted')}
                        style={{ marginRight: 8 }}
                      />
                    )}
                    <OutlineButton
                      small
                      title="Dismiss Report"
                      onPress={() => act(() => api.put(`/admin/reports/${r._id}`, { action: 'dismiss' }), 'Report dismissed')}
                    />
                  </View>
                </Card>
              ))
            ) : (
              <Empty icon="🛡️" text="Clean board! No open reports." />
            )
          )}

          {/* SUBSCRIPTIONS TAB */}
          {tab === 'subscriptions' && (
            <View>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 12 }}>
                Active & Past Subscriptions
              </Text>
              {data.subscriptions && data.subscriptions.length > 0 ? (
                data.subscriptions.map((sub) => (
                  <Card key={sub._id}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Avatar user={sub.userId} size={36} />
                        <View style={{ marginLeft: 10 }}>
                          <Text style={{ color: colors.text, fontWeight: '700' }}>
                            @{sub.userId?.username || 'user'}
                          </Text>
                          <Text style={{ color: colors.muted, fontSize: 11 }}>
                            {sub.userId?.email}
                          </Text>
                        </View>
                      </View>
                      <View style={{
                        backgroundColor: sub.status === 'active' ? '#10B98120' : '#E11D4820',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 8,
                      }}>
                        <Text style={{
                          color: sub.status === 'active' ? '#10B981' : '#E11D48',
                          fontSize: 11,
                          fontWeight: '800',
                          textTransform: 'uppercase',
                        }}>
                          {sub.status}
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderColor: colors.border }}>
                      <Text style={{ color: colors.muted, fontSize: 12 }}>
                        Plan: <Text style={{ color: colors.text, fontWeight: '600' }}>{sub.plan}</Text>
                      </Text>
                      <Text style={{ color: colors.muted, fontSize: 12 }}>
                        Paid: <Text style={{ color: '#D4AF6A', fontWeight: '800' }}>{sub.currency} {sub.amount}</Text>
                      </Text>
                      <Text style={{ color: colors.muted, fontSize: 12 }}>
                        Via: <Text style={{ color: colors.text, fontWeight: '600' }}>{sub.paymentProvider}</Text>
                      </Text>
                    </View>
                  </Card>
                ))
              ) : (
                <Empty icon="⭐" text="No recorded subscriptions yet." />
              )}
            </View>
          )}

          {/* PRICING TAB */}
          {tab === 'pricing' && (
            <View>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 6 }}>
                StimzzyVibe Premium Pricing Manager
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 14 }}>
                Base subscription price in Nigerian Naira (NGN). Dynamic FX engine automatically converts to user's local currency.
              </Text>

              <Card>
                <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
                  BASE PRICE (NGN)
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput
                    value={newBasePrice}
                    onChangeText={setNewBasePrice}
                    keyboardType="numeric"
                    style={{
                      flex: 1,
                      backgroundColor: colors.bg,
                      color: colors.text,
                      borderRadius: 10,
                      padding: 12,
                      fontSize: 18,
                      fontWeight: '800',
                      borderWidth: 1,
                      borderColor: colors.border,
                      marginRight: 10,
                    }}
                  />
                  <TouchableOpacity
                    onPress={handleUpdatePrice}
                    disabled={updatingPrice}
                    style={{
                      backgroundColor: colors.primary,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 10,
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '800' }}>
                      {updatingPrice ? 'Saving...' : 'Update'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>

              {data.config && (
                <View style={{ marginTop: 12 }}>
                  <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800', marginBottom: 8 }}>
                    Live Auto-Conversion Rates (Base: ₦{data.config.baseNGN?.toLocaleString() || '2,000'})
                  </Text>
                  {data.config.supportedCurrencies && Object.entries(data.config.supportedCurrencies).map(([curr, info]) => {
                    const price = Math.max(1, Math.round(data.config.baseNGN * info.rate));
                    return (
                      <Card key={curr} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 }}>
                        <Text style={{ color: colors.text, fontWeight: '700' }}>
                          {info.symbol} {curr} ({info.name})
                        </Text>
                        <Text style={{ color: '#D4AF6A', fontWeight: '800', fontSize: 15 }}>
                          {info.symbol}{price.toLocaleString()}
                        </Text>
                      </Card>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* USERS TAB */}
          {tab === 'users' && (
            data.users && data.users.length > 0 ? (
              data.users.map((u) => (
                <Card key={u._id}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Avatar user={u} size={42} />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>
                          {u.username}
                        </Text>
                        {u.isVerified && <Text style={{ marginLeft: 4 }}>✔️</Text>}
                        {u.isSuspended && <Text style={{ marginLeft: 4 }}>⛔</Text>}
                        {u.isPremium && <Text style={{ marginLeft: 4 }}>⭐</Text>}
                      </View>
                      <Text style={{ color: colors.muted, fontSize: 12 }}>{u.email}</Text>
                      {u.country && (
                        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>
                          {u.country} · {u.language || 'English'}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', marginTop: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <OutlineButton
                      small
                      title={u.isSuspended ? 'Unsuspend' : 'Suspend'}
                      onPress={() => act(() => api.put(`/admin/users/${u._id}/suspend`, { suspend: !u.isSuspended }), u.isSuspended ? 'User unsuspended' : 'User suspended')}
                      style={{ marginRight: 6, marginBottom: 4 }}
                    />
                    <OutlineButton
                      small
                      title={u.isVerified ? 'Unverify' : 'Verify'}
                      onPress={() => act(() => api.put(`/admin/users/${u._id}/verify`, { verified: !u.isVerified }), 'Verification toggled')}
                      style={{ marginRight: 6, marginBottom: 4 }}
                    />
                    <OutlineButton
                      small
                      danger
                      title="Ban / Delete"
                      onPress={() => Alert.alert('Delete account?', `@${u.username} and all content will be removed.`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => act(() => api.del(`/admin/users/${u._id}`), 'User deleted') }
                      ])}
                      style={{ marginBottom: 4 }}
                    />
                  </View>
                </Card>
              ))
            ) : (
              <Empty icon="👥" text="No users found matching query." />
            )
          )}

          {/* HASHTAGS TAB */}
          {tab === 'hashtags' && (
            data.hashtags && data.hashtags.length > 0 ? (
              data.hashtags.map((h) => (
                <Card key={h._id}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>
                      #{h.name} <Text style={{ color: colors.muted, fontSize: 12 }}>({h.count} posts)</Text> {h.isBanned ? '🚫' : ''}
                    </Text>
                    <OutlineButton
                      small
                      danger={!h.isBanned}
                      title={h.isBanned ? 'Unban' : 'Ban'}
                      onPress={() => act(() => api.put(`/admin/hashtags/${h._id}/ban`, { banned: !h.isBanned }), h.isBanned ? 'Hashtag unbanned' : 'Hashtag banned')}
                    />
                  </View>
                </Card>
              ))
            ) : (
              <Empty icon="#" text="No hashtags found." />
            )
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
