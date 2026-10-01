import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import Navigation from './src/navigation';

function Inner() {
  const { isDark } = useTheme();
  return (<><StatusBar style={isDark ? 'light' : 'dark'} /><Navigation /></>);
}
export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider><AuthProvider><Inner /></AuthProvider></ThemeProvider>
    </SafeAreaProvider>
  );
}
