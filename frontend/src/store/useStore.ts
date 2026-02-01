import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language } from '../i18n/translations';

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  city?: string;
  bio?: string;
  avatar?: string;
  language: string;
  is_verified: boolean;
  created_at: string;
}

interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string;
  age?: string;
  gender: string;
  color?: string;
  weight?: number;
  description?: string;
  image?: string;
  status: string;
  price?: number;
  location?: string;
  vaccinated: boolean;
  neutered: boolean;
  owner_id: string;
  created_at: string;
  likes: number;
  views: number;
}

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Language
  language: Language;
  
  // UI
  isDrawerOpen: boolean;
  
  // Pets
  myPets: Pet[];
  selectedPet: Pet | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLanguage: (lang: Language) => void;
  setDrawerOpen: (open: boolean) => void;
  setMyPets: (pets: Pet[]) => void;
  setSelectedPet: (pet: Pet | null) => void;
  logout: () => void;
  loadStoredAuth: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  language: 'en',
  isDrawerOpen: false,
  myPets: [],
  selectedPet: null,
  
  // Actions
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  
  setToken: async (token) => {
    if (token) {
      await AsyncStorage.setItem('auth_token', token);
    } else {
      await AsyncStorage.removeItem('auth_token');
    }
    set({ token });
  },
  
  setLanguage: async (language) => {
    await AsyncStorage.setItem('language', language);
    set({ language });
  },
  
  setDrawerOpen: (isDrawerOpen) => set({ isDrawerOpen }),
  
  setMyPets: (myPets) => set({ myPets }),
  
  setSelectedPet: (selectedPet) => set({ selectedPet }),
  
  logout: async () => {
    await AsyncStorage.removeItem('auth_token');
    set({ user: null, token: null, isAuthenticated: false, myPets: [] });
  },
  
  loadStoredAuth: async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const language = (await AsyncStorage.getItem('language')) as Language || 'en';
      
      if (token) {
        set({ token, language, isLoading: false });
      } else {
        set({ language, isLoading: false });
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
      set({ isLoading: false });
    }
  },
}));
