import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// export const BASE_URL = 'http://10.0.2.2:5000'; // Android emulator localhost
// export const BASE_URL = 'http://localhost:5000'; // iOS simulator
export const BASE_URL = 'http://172.28.21.133:5000'; // Local Wi-Fi IP for physical devices

const api = axios.create({
    baseURL: `${BASE_URL}/api`,
    timeout: 15000,
});

// Attach JWT token to every request
api.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Auth
export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    getMe: () => api.get('/auth/me'),
    updateProfile: (data) => api.put('/auth/profile', data),
};

// Properties
export const propertiesAPI = {
    getAll: (params) => api.get('/properties', { params }),
    getMine: () => api.get('/properties/mine'),
    getById: (id) => api.get(`/properties/${id}`),
    create: (formData) => api.post('/properties', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    update: (id, formData) => api.put(`/properties/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    delete: (id) => api.delete(`/properties/${id}`),
};

// Appointments
export const appointmentsAPI = {
    create: (formData) => api.post('/appointments', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    getAll: () => api.get('/appointments'),
    getById: (id) => api.get(`/appointments/${id}`),
    updateStatus: (id, data) => api.patch(`/appointments/${id}/status`, data),
    requestChange: (id, data) => api.patch(`/appointments/${id}/change-request`, data),
    approveChangeRequest: (id, data) => api.patch(`/appointments/${id}/change-request/status`, data),
};

// Leases
export const leasesAPI = {
    create: (formData) => api.post('/leases', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    getAll: () => api.get('/leases'),
    getById: (id) => api.get(`/leases/${id}`),
    update: (id, formData) => api.put(`/leases/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    delete: (id) => api.delete(`/leases/${id}`),
    approve: (id, data) => api.patch(`/leases/${id}/approve`, data),
};

// Bills
export const billsAPI = {
    create: (formData) => api.post('/bills', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    getAll: (params) => api.get('/bills', { params }),
    getById: (id) => api.get(`/bills/${id}`),
    approve: (id, data) => api.patch(`/bills/${id}/approve`, data),
};

// Maintenance
export const maintenanceAPI = {
    create: (formData) => api.post('/maintenance', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    getAll: (params) => api.get('/maintenance', { params }),
    getById: (id) => api.get(`/maintenance/${id}`),
    update: (id, formData) => api.put(`/maintenance/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    delete: (id) => api.delete(`/maintenance/${id}`),
    approve: (id, data) => api.patch(`/maintenance/${id}/approve`, data),
};

// Notices
export const noticesAPI = {
    create: (formData) => api.post('/notices', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    getAll: (params) => api.get('/notices', { params }),
    getById: (id) => api.get(`/notices/${id}`),
    update: (id, formData) => api.put(`/notices/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    delete: (id) => api.delete(`/notices/${id}`),
};

export default api;
