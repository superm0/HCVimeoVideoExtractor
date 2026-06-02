import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Settings } from '../types';
import { generateId } from '../utils/formatters';

interface AuthState {
  user: User | null;
  settings: Settings;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInAsGuest: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  updateSettings: (data: Partial<Settings>) => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

const DEFAULT_SETTINGS: Settings = {
  distanceUnit: 'km',
  volumeUnit: 'liters',
  currency: 'USD',
  currencySymbol: '$',
  theme: 'system',
  notifications: true,
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  settings: DEFAULT_SETTINGS,
  isLoading: true,
  isAuthenticated: false,

  loadFromStorage: async () => {
    try {
      const [userData, settingsData] = await Promise.all([
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('settings'),
      ]);
      const user = userData ? JSON.parse(userData) : null;
      const settings = settingsData ? JSON.parse(settingsData) : DEFAULT_SETTINGS;
      set({ user, settings, isAuthenticated: !!user, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  signInAsGuest: async () => {
    const user: User = {
      id: generateId(),
      name: 'Guest User',
      provider: 'guest',
      createdAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem('user', JSON.stringify(user));
    set({ user, isAuthenticated: true });
  },

  signInWithGoogle: async () => {
    // In production, integrate expo-auth-session with Google OAuth
    // For demo, create a mock Google user
    const user: User = {
      id: `google_${generateId()}`,
      name: 'Google User',
      email: 'user@gmail.com',
      provider: 'google',
      createdAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem('user', JSON.stringify(user));
    set({ user, isAuthenticated: true });
  },

  signInWithApple: async () => {
    // In production, use expo-apple-authentication
    const user: User = {
      id: `apple_${generateId()}`,
      name: 'Apple User',
      provider: 'apple',
      createdAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem('user', JSON.stringify(user));
    set({ user, isAuthenticated: true });
  },

  signInWithFacebook: async () => {
    // In production, integrate Facebook SDK via expo-auth-session
    const user: User = {
      id: `fb_${generateId()}`,
      name: 'Facebook User',
      provider: 'facebook',
      createdAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem('user', JSON.stringify(user));
    set({ user, isAuthenticated: true });
  },

  signOut: async () => {
    await AsyncStorage.removeItem('user');
    set({ user: null, isAuthenticated: false });
  },

  updateUser: async (data) => {
    const user = { ...get().user!, ...data };
    await AsyncStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },

  updateSettings: async (data) => {
    const settings = { ...get().settings, ...data };
    await AsyncStorage.setItem('settings', JSON.stringify(settings));
    set({ settings });
  },
}));
