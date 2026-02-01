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
  is_admin: boolean;
  role: string;
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

interface CartItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
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
  
  // Cart
  cart: CartItem[];
  cartTotal: number;
  
  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLanguage: (lang: Language) => void;
  setDrawerOpen: (open: boolean) => void;
  setMyPets: (pets: Pet[]) => void;
  setSelectedPet: (pet: Pet | null) => void;
  logout: () => void;
  loadStoredAuth: () => Promise<void>;
  
  // Cart Actions
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
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
  cart: [],
  cartTotal: 0,
  
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
    set({ user: null, token: null, isAuthenticated: false, myPets: [], cart: [], cartTotal: 0 });
  },
  
  loadStoredAuth: async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const language = (await AsyncStorage.getItem('language')) as Language || 'en';
      const cartData = await AsyncStorage.getItem('cart');
      const cart = cartData ? JSON.parse(cartData) : [];
      const cartTotal = cart.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0);
      
      if (token) {
        set({ token, language, isLoading: false, cart, cartTotal });
      } else {
        set({ language, isLoading: false, cart, cartTotal });
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
      set({ isLoading: false });
    }
  },
  
  // Cart Actions
  addToCart: async (item) => {
    const { cart } = get();
    const existingIndex = cart.findIndex((i) => i.product_id === item.product_id);
    
    let newCart;
    if (existingIndex >= 0) {
      newCart = [...cart];
      newCart[existingIndex].quantity += 1;
    } else {
      newCart = [...cart, { ...item, quantity: 1 }];
    }
    
    const cartTotal = newCart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    await AsyncStorage.setItem('cart', JSON.stringify(newCart));
    set({ cart: newCart, cartTotal });
  },
  
  removeFromCart: async (productId) => {
    const { cart } = get();
    const newCart = cart.filter((i) => i.product_id !== productId);
    const cartTotal = newCart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    await AsyncStorage.setItem('cart', JSON.stringify(newCart));
    set({ cart: newCart, cartTotal });
  },
  
  updateCartQuantity: async (productId, quantity) => {
    const { cart } = get();
    const newCart = cart.map((i) =>
      i.product_id === productId ? { ...i, quantity: Math.max(0, quantity) } : i
    ).filter((i) => i.quantity > 0);
    const cartTotal = newCart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    await AsyncStorage.setItem('cart', JSON.stringify(newCart));
    set({ cart: newCart, cartTotal });
  },
  
  clearCart: async () => {
    await AsyncStorage.removeItem('cart');
    set({ cart: [], cartTotal: 0 });
  },
}));
