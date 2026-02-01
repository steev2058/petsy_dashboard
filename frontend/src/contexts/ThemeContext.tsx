import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Light theme colors
export const LightColors = {
  primary: '#FF6B35',
  primaryDark: '#E55A24',
  secondary: '#4ECDC4',
  accent: '#FFE66D',
  background: '#FFFFFF',
  backgroundDark: '#F5F5F5',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  text: '#2D3436',
  textSecondary: '#636E72',
  textLight: '#B2BEC3',
  error: '#FF6B6B',
  success: '#00B894',
  warning: '#FDCB6E',
  border: '#DFE6E9',
  white: '#FFFFFF',
  black: '#000000',
  gradient: ['#FF6B35', '#FF8E53'],
  tabBar: '#FFFFFF',
  tabBarBorder: '#E0E0E0',
  inputBackground: '#F5F5F5',
  skeleton: '#E0E0E0',
  skeletonHighlight: '#F5F5F5',
};

// Dark theme colors
export const DarkColors = {
  primary: '#FF8E53',
  primaryDark: '#FF6B35',
  secondary: '#4ECDC4',
  accent: '#FFE66D',
  background: '#121212',
  backgroundDark: '#1E1E1E',
  surface: '#1E1E1E',
  card: '#2D2D2D',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textLight: '#808080',
  error: '#FF6B6B',
  success: '#00D4A0',
  warning: '#FFD93D',
  border: '#3D3D3D',
  white: '#FFFFFF',
  black: '#000000',
  gradient: ['#FF8E53', '#FF6B35'],
  tabBar: '#1E1E1E',
  tabBarBorder: '#3D3D3D',
  inputBackground: '#2D2D2D',
  skeleton: '#2D2D2D',
  skeletonHighlight: '#3D3D3D',
};

type ThemeMode = 'light' | 'dark' | 'system';
type ThemeColors = typeof LightColors;

interface ThemeContextType {
  isDark: boolean;
  themeMode: ThemeMode;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  themeMode: 'system',
  colors: LightColors,
  setThemeMode: () => {},
  toggleTheme: () => {},
});

const THEME_STORAGE_KEY = '@petsy_theme_mode';

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved theme preference
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
        setThemeModeState(savedMode as ThemeMode);
      }
    } catch (error) {
      console.log('Error loading theme preference:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.log('Error saving theme preference:', error);
    }
  };

  const toggleTheme = () => {
    const newMode = isDark ? 'light' : 'dark';
    setThemeMode(newMode);
  };

  // Determine if dark mode is active
  const isDark = themeMode === 'system' 
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const colors = isDark ? DarkColors : LightColors;

  return (
    <ThemeContext.Provider value={{ isDark, themeMode, colors, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
