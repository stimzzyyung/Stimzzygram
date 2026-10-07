import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { api, upload, setUnauthorizedHandler } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

const Ctx = createContext();
export const useAuth = () => useContext(Ctx);

async function registerPush() {
  try {
    const Notifications = require('expo-notifications');
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId
      || Constants.easConfig?.projectId
      || Constants.expoConfig?.projectId;
    if (!projectId) return;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await api.put('/users/me', { pushToken: token });
  } catch { /* push isn't available in every environment (e.g. some Expo Go versions) */ }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true); // "remember login session"

  const start = useCallback(async (token, u) => {
    await AsyncStorage.setItem('token', token);
    setUser(u);
    connectSocket(token);
    registerPush();
  }, []);

  const logout = useCallback(async (callServer = true) => {
    if (callServer) { try { await api.post('/auth/logout'); } catch {} }
    await AsyncStorage.removeItem('token');
    disconnectSocket();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => logout(false));
    (async () => {
      const token = await AsyncStorage.getItem('token');
      if (token) { try { const { user: u } = await api.get('/auth/me'); await start(token, u); } catch {} }
      setBooting(false);
    })();
  }, []);

  const login = async (identifier, password) => { const d = await api.post('/auth/login', { identifier, password }); await start(d.token, d.user); };
  const googleLogin = async (payload) => {
    const d = await api.post('/auth/google', payload);
    await start(d.token, d.user);
    return d.user;
  };
  const register = async (form) => upload('POST', '/auth/register', form);
  const verifyEmail = async (email, code) => {
    const d = await api.post('/auth/verify-email', { email, code });
    await start(d.token, d.user);
  };
  const resendVerification = (email) => api.post('/auth/resend-verification', { email });
  const refreshUser = useCallback(async () => { const { user: u } = await api.get('/auth/me'); setUser(u); return u; }, []);

  return <Ctx.Provider value={{ user, setUser, booting, login, googleLogin, register, verifyEmail, resendVerification, logout, refreshUser }}>{children}</Ctx.Provider>;
}
