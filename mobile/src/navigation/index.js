import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Loading } from '../components/UI';
import { gradient } from '../theme';

import { WelcomeScreen, LoginScreen, RegisterScreen, VerifyEmailScreen, ForgotPasswordScreen } from '../screens/AuthScreens';
import HomeScreen from '../screens/HomeScreen';
import ExploreScreen from '../screens/ExploreScreen';
import CreateScreen from '../screens/CreateScreen';
import VibesScreen from '../screens/VibesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CommentsScreen from '../screens/CommentsScreen';
import { FollowListScreen, FollowRequestsScreen, HashtagScreen, PostDetailScreen, NotificationsScreen } from '../screens/ListScreens';
import { InboxScreen, ChatScreen, SavedSnapsScreen } from '../screens/MessageScreens';
import RizzScreen from '../screens/RizzScreen';
import { SettingsScreen, EditProfileScreen } from '../screens/SettingsScreens';
import StoryViewerScreen from '../screens/StoryViewerScreen';
import AdminScreen from '../screens/AdminScreen';
import PremiumScreen from '../screens/PremiumScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function OwnProfile(props) {
  const { user } = useAuth();
  if (!user?._id) return null;
  return <ProfileScreen {...props} route={{ params: { id: user._id, isTab: true } }} />;
}

function Tabs() {
  const { colors } = useTheme();
  const icons = { Home: 'home', Explore: 'search', Vibes: 'flame', Me: 'person' };
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false, tabBarShowLabel: false,
      tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border, height: 60 },
      tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted,
      tabBarIcon: ({ focused, color }) => route.name === 'Create'
        ? <LinearGradient colors={gradient} style={{ width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: -4 }}><Ionicons name="add" size={30} color="#fff" /></LinearGradient>
        : <Ionicons name={focused ? icons[route.name] : icons[route.name] + '-outline'} size={26} color={color} />,
    })}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Create" component={CreateScreen} />
      <Tab.Screen name="Vibes" component={VibesScreen} />
      <Tab.Screen name="Me" component={OwnProfile} />
    </Tab.Navigator>
  );
}

/** Tabs + floating Rizz Bot button (prominent entry point without crowding the tab bar). */
function Main() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <Tabs />
      <TouchableOpacity onPress={() => navigation.navigate('Rizz')} activeOpacity={0.9}
        style={{ position: 'absolute', right: 16, bottom: 60 + insets.bottom + 16, shadowColor: '#800020', shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 }}>
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="sparkles" size={26} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

export default function Navigation() {
  const { colors, isDark } = useTheme();
  const { user, booting } = useAuth();
  const base = isDark ? DarkTheme : DefaultTheme;
  const theme = { ...base, colors: { ...base.colors, background: colors.bg, card: colors.bg, text: colors.text, border: colors.border, primary: colors.primary } };
  if (booting) return <View style={{ flex: 1, backgroundColor: colors.bg }}><Loading text="Loading..." /></View>;
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        {!user ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={Main} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Comments" component={CommentsScreen} />
            <Stack.Screen name="PostDetail" component={PostDetailScreen} />
            <Stack.Screen name="FollowList" component={FollowListScreen} />
            <Stack.Screen name="FollowRequests" component={FollowRequestsScreen} />
            <Stack.Screen name="Hashtag" component={HashtagScreen} />
            <Stack.Screen name="Inbox" component={InboxScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="SavedSnaps" component={SavedSnapsScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Rizz" component={RizzScreen} options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="Premium" component={PremiumScreen} />
            <Stack.Screen name="Admin" component={AdminScreen} />
            <Stack.Screen name="StoryViewer" component={StoryViewerScreen} options={{ animation: 'fade', presentation: 'fullScreenModal' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
