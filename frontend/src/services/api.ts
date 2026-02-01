import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  signup: (data: { email: string; name: string; password: string; phone?: string }) =>
    api.post('/auth/signup', data),
  
  verify: (userId: string, code: string) =>
    api.post(`/auth/verify?user_id=${userId}&code=${code}`),
  
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  
  getMe: () => api.get('/auth/me'),
  
  updateProfile: (data: any) => api.put('/auth/update', data),
};

// Pets API
export const petsAPI = {
  getAll: (params?: { status?: string; species?: string; city?: string; gender?: string }) =>
    api.get('/pets', { params }),
  
  getMyPets: () => api.get('/pets/my'),
  
  getById: (id: string) => api.get(`/pets/${id}`),
  
  create: (data: any) => api.post('/pets', data),
  
  update: (id: string, data: any) => api.put(`/pets/${id}`, data),
  
  delete: (id: string) => api.delete(`/pets/${id}`),
  
  like: (id: string) => api.post(`/pets/${id}/like`),
};

// Favorites API
export const favoritesAPI = {
  getAll: () => api.get('/favorites'),
};

// Health Records API
export const healthAPI = {
  create: (data: any) => api.post('/health-records', data),
  
  getByPetId: (petId: string) => api.get(`/health-records/${petId}`),
};

// Vets API
export const vetsAPI = {
  getAll: (params?: { city?: string; specialty?: string }) =>
    api.get('/vets', { params }),
  
  getById: (id: string) => api.get(`/vets/${id}`),
};

// Appointments API
export const appointmentsAPI = {
  create: (data: any) => api.post('/appointments', data),
  
  getAll: () => api.get('/appointments'),
};

// Products API
export const productsAPI = {
  getAll: (params?: { category?: string; pet_type?: string }) =>
    api.get('/products', { params }),
  
  getById: (id: string) => api.get(`/products/${id}`),
};

// Emergency API
export const emergencyAPI = {
  getContacts: (city?: string) =>
    api.get('/emergency-contacts', { params: { city } }),
};

// Messages API
export const messagesAPI = {
  send: (data: { receiver_id: string; subject: string; content: string; pet_id?: string }) =>
    api.post('/messages', data),
  
  getAll: () => api.get('/messages'),
  
  markRead: (id: string) => api.put(`/messages/${id}/read`),
};

// Lost & Found API
export const lostFoundAPI = {
  create: (data: any) => api.post('/lost-found', data),
  
  getAll: (params?: { type?: string; status?: string }) =>
    api.get('/lost-found', { params }),
};

// Community API
export const communityAPI = {
  create: (data: any) => api.post('/community', data),
  
  getAll: (params?: { type?: string }) =>
    api.get('/community', { params }),
  
  like: (id: string) => api.post(`/community/${id}/like`),
};

// AI API
export const aiAPI = {
  ask: (query: string, context?: string) =>
    api.post('/ai/assistant', null, { params: { query, context } }),
};

// Orders API (Cart/Checkout)
export const ordersAPI = {
  create: (data: {
    items: Array<{ product_id: string; name: string; price: number; quantity: number; image?: string }>;
    total: number;
    shipping_address: string;
    shipping_city: string;
    shipping_phone: string;
    payment_method?: string;
    notes?: string;
  }) => api.post('/orders', data),
  
  getAll: () => api.get('/orders'),
  
  getById: (id: string) => api.get(`/orders/${id}`),
};

// Conversations API (Chat)
export const conversationsAPI = {
  create: (data: { other_user_id: string; pet_id?: string; initial_message: string }) =>
    api.post('/conversations', data),
  
  getAll: () => api.get('/conversations'),
  
  getMessages: (conversationId: string) =>
    api.get(`/conversations/${conversationId}/messages`),
  
  sendMessage: (conversationId: string, content: string) =>
    api.post(`/conversations/${conversationId}/messages`, null, { params: { content } }),
};

// Map Locations API
export const mapAPI = {
  getLocations: (params?: { type?: string; city?: string; lat?: number; lng?: number }) =>
    api.get('/map-locations', { params }),
};

// Updated Appointments API
export const appointmentsAPI = {
  create: (data: any) => api.post('/appointments', data),
  
  getAll: () => api.get('/appointments'),
  
  getById: (id: string) => api.get(`/appointments/${id}`),
  
  cancel: (id: string) => api.put(`/appointments/${id}/cancel`),
};

export default api;
