import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const resolveBackendUrl = () => {
  if (BACKEND_URL) return BACKEND_URL;
  if (typeof window !== 'undefined' && window.location) {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:8000`;
  }
  return '';
};

const toWsBase = (httpBase: string) => {
  if (!httpBase) return '';
  if (httpBase.startsWith('https://')) return httpBase.replace('https://', 'wss://');
  if (httpBase.startsWith('http://')) return httpBase.replace('http://', 'ws://');
  return httpBase;
};

const api = axios.create({
  baseURL: `${resolveBackendUrl()}/api`,
  timeout: 12000,
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

  resendVerification: (email: string) =>
    api.post('/auth/resend-verification', { email }),
  
  verify: (userId: string, code: string) =>
    api.post(`/auth/verify?user_id=${userId}&code=${code}`),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (data: { email: string; code: string; new_password: string }) =>
    api.post('/auth/reset-password', data),
  
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  
  getMe: () => api.get('/auth/me'),
  
  updateProfile: (data: any) => api.put('/auth/update', data),

  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post('/auth/change-password', data),

  deleteAccount: (password?: string) =>
    api.post('/auth/delete-account', { password }),
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
  getAll: (params?: { item_type?: string }) => api.get('/favorites', { params }),
  add: (item_type: string, item_id: string) => api.post(`/favorites/${item_type}/${item_id}`),
  remove: (item_type: string, item_id: string) => api.delete(`/favorites/${item_type}/${item_id}`),
};

// Health Records API
export const healthAPI = {
  create: (data: any) => api.post('/health-records', data),
  getByPetId: (petId: string) => api.get(`/health-records/${petId}`),
  delete: (recordId: string) => api.delete(`/health-records/${recordId}`),
};

// Pet Tags API
export const petTagsAPI = {
  register: (data: { pet_id: string; tag_code: string }) => api.post('/pet-tags', data),
  getByPetId: (petId: string) => api.get(`/pet-tags/${petId}`),
  setStatus: (petId: string, is_active: boolean) => api.put(`/pet-tags/${petId}/status`, { is_active }),
  scan: (tagCode: string) => api.get(`/pet-tags/scan/${tagCode}`),
  reportScan: (tagCode: string, data: any) => api.post(`/pet-tags/scan/${tagCode}/report`, data),
  getScans: (petId: string) => api.get(`/pet-tags/${petId}/scans`),
};

// Sponsorship API
export const sponsorshipAPI = {
  create: (data: any) => api.post('/sponsorships', data),
  getByPetId: (petId: string) => api.get(`/sponsorships/pet/${petId}`),
  getMy: () => api.get('/sponsorships/my'),
};

// Marketplace API
export const marketplaceAPI = {
  create: (data: any) => api.post('/marketplace/listings', data),
  update: (id: string, data: any) => api.put(`/marketplace/listings/${id}`, data),
  remove: (id: string) => api.delete(`/marketplace/listings/${id}`),
  setStatus: (id: string, status: 'active' | 'sold' | 'archived') =>
    api.put(`/marketplace/listings/${id}/status`, { status }),
  getAll: (params?: { category?: string; q?: string; city?: string; min_price?: number; max_price?: number }) =>
    api.get('/marketplace/listings', { params }),
  getById: (id: string) => api.get(`/marketplace/listings/${id}`),
  getMy: () => api.get('/marketplace/listings/my'),
  report: (id: string, reason?: string, notes?: string) =>
    api.post(`/marketplace/listings/${id}/report`, { reason, notes }),
};

export const careAPI = {
  createRequest: (data: any) => api.post('/care-requests', data),
  getTimeline: (id: string) => api.get(`/care-requests/${id}/timeline`),
  getVetQueue: (params?: { status?: string }) => api.get('/vet/care-requests', { params }),
  updateVetRequest: (id: string, data: any) => api.put(`/vet/care-requests/${id}`, data),
  getClinicQueue: () => api.get('/clinic/care-requests'),
  getClinicVets: () => api.get('/clinic/vets'),
  updateClinicRequest: (id: string, data: any) => api.put(`/clinic/care-requests/${id}`, data),
};

export const adminMarketplaceAPI = {
  getListings: () => api.get('/admin/marketplace/listings'),
  getReports: () => api.get('/admin/marketplace/reports'),
  setListingStatus: (id: string, status: 'active' | 'sold' | 'archived') =>
    api.put(`/admin/marketplace/listings/${id}/status`, { status }),
};

export const marketOwnerAPI = {
  getOverview: () => api.get('/market-owner/overview'),
};

export const roleRequestAPI = {
  create: (target_role: 'vet' | 'market_owner' | 'care_clinic', reason?: string) =>
    api.post('/role-requests', { target_role, reason }),
  getMy: () => api.get('/role-requests/my'),
  getAdminAll: () => api.get('/admin/role-requests'),
  review: (id: string, action: 'approve' | 'reject') =>
    api.put(`/admin/role-requests/${id}`, { action }),
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
  
  getById: (id: string) => api.get(`/appointments/${id}`),
  
  cancel: (id: string) => api.put(`/appointments/${id}/cancel`),
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

  getById: (id: string) => api.get(`/lost-found/${id}`),
};

// Community API
export const communityAPI = {
  create: (data: any) => api.post('/community', data),
  
  getAll: (params?: { type?: string }) =>
    api.get('/community', { params }),

  getById: (id: string) => api.get(`/community/post/${id}`),

  reportPost: (postId: string, reason?: string, notes?: string) =>
    api.post(`/community/${postId}/report`, { reason, notes }),

  blockUser: (userId: string) => api.post(`/community/users/${userId}/block`),
  unblockUser: (userId: string) => api.delete(`/community/users/${userId}/block`),
  getBlockedUsers: () => api.get('/community/blocked-users'),

  enablePostNotify: (postId: string) => api.post(`/community/${postId}/notify`),
  disablePostNotify: (postId: string) => api.delete(`/community/${postId}/notify`),
  getNotifySubscriptions: () => api.get('/community/notifications/subscriptions'),
  
  like: (id: string) => api.post(`/community/${id}/like`),
  
  getComments: (postId: string) => api.get(`/community/${postId}/comments`),
  
  addComment: (postId: string, content: string, parent_comment_id?: string) =>
    api.post(`/community/${postId}/comments`, { content, parent_comment_id }),

  likeComment: (commentId: string) =>
    api.post(`/community/comments/${commentId}/like`),
};

// User Settings API
export const settingsAPI = {
  get: () => api.get('/user-settings'),
  update: (data: any) => api.put('/user-settings', data),
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

  markRead: (conversationId: string) =>
    api.post(`/conversations/${conversationId}/read`),
  
  sendMessage: (conversationId: string, content: string) =>
    api.post(`/conversations/${conversationId}/messages`, null, { params: { content } }),
};

// Map Locations API
export const mapAPI = {
  getLocations: (params?: { type?: string; city?: string; lat?: number; lng?: number }) =>
    api.get('/map-locations', { params }),
};

// Payment API
export const paymentAPI = {
  getConfig: () => api.get('/payments/config'),
  
  processPayment: (data: {
    amount: number;
    payment_method: string;
    card_number?: string;
    card_expiry?: string;
    card_cvc?: string;
    order_id?: string;
    appointment_id?: string;
    sponsorship_id?: string;
    points_to_use?: number;
  }) => api.post('/payments/process', data),
  
  confirmPayment: (paymentId: string) => api.post(`/payments/confirm/${paymentId}`),
  
  getHistory: () => api.get('/payments/history'),
};

// Loyalty Points API
export const loyaltyAPI = {
  getPoints: () => api.get('/loyalty/points'),
  
  getTransactions: () => api.get('/loyalty/transactions'),
  
  awardBonus: (points: number, description: string) =>
    api.post('/loyalty/bonus', null, { params: { points, description } }),
};

export const getChatWebSocketUrl = async () => {
  const token = await AsyncStorage.getItem('auth_token');
  if (!token) return null;
  const wsBase = toWsBase(resolveBackendUrl());
  if (!wsBase) return null;
  return `${wsBase}/ws/chat?token=${encodeURIComponent(token)}`;
};

export default api;
