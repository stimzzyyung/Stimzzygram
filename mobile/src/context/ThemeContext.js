import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { light, dark } from '../theme';

const Ctx = createContext();
export const useTheme = () => useContext(Ctx);

export function ThemeProvider({ children }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState('system'); // light | dark | system
  useEffect(() => { AsyncStorage.getItem('themeMode').then((m) => m && setModeState(m)); }, []);
  const setMode = (m) => { setModeState(m); AsyncStorage.setItem('themeMode', m); };
  const colors = (mode === 'system' ? system : mode) === 'dark' ? dark : light;
  return <Ctx.Provider value={{ colors, mode, setMode, isDark: colors.mode === 'dark' }}>{children}</Ctx.Provider>;
}
