import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, upload, setUnauthorizedHandler } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

const Ctx = createContext();
export const useAuth = () => useContext(Ctx);

async function registerPush() {
  try {
    const Notifications = require('expo-notifications');
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    const token = (await Notifications.getExpoPushTokenAsync()).data;
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
  const register = async (form) => { const d = await upload('POST', '/auth/register', form); await start(d.token, d.user); };
  const refreshUser = async () => { const { user: u } = await api.get('/auth/me'); setUser(u); };

  return <Ctx.Provider value={{ user, setUser, booting, login, register, logout, refreshUser }}>{children}</Ctx.Provider>;
}
