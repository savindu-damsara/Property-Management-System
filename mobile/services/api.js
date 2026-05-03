import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Constants from 'expo-constants';
import { Platform } from 'react-native';

const debuggerHost = Constants.expoConfig?.hostUri;
const ipAddress = debuggerHost ? debuggerHost.split(':')[0] : (Platform.OS === 'android' ? '10.0.2.2' : '192.168.1.8');

// Explicit hardcode derived from IP config to securely force physical dev device connections.
export const BASE_URL = `https://property-management-system-production-f7ed.up.railway.app`;

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

// Robust Fetch wrapper to securely pipe Expo boundary streams (e.g content:// descriptors) on Android 
const fetchFormData = async (endpoint, method, formData) => {
    const token = await AsyncStorage.getItem('token');
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}/api${endpoint}`, {
        method,
        headers, // Omits implicit Content-Type to correctly inject boundary blocks natively
        body: formData
    });

    if (!res.ok) {
        let errStr = 'Request failed';
        try { const err = await res.json(); errStr = err.message || errStr; } catch (e) { }
        throw { response: { data: { message: errStr } } };
    }
    return { data: await res.json() };
};

// Auth
export const authAPI = {
    register: (data) => fetchFormData('/auth/register', 'POST', data),
    login: (data) => api.post('/auth/login', data),
    getMe: () => api.get('/auth/me'),
    updateProfile: (data) => fetchFormData('/auth/profile', 'PUT', data),
    changePassword: (data) => api.put('/auth/password', data),
    deleteAccount: (data) => api.delete('/auth/delete', { data }),
    getNotifications: () => api.get('/auth/notifications'),
    clearNotification: (type) => api.patch(`/auth/notifications/clear/${type}`),
};

// Properties
export const propertiesAPI = {
    getAll: (params) => api.get('/properties', { params }),
    getMine: () => api.get('/properties/mine'),
    getById: (id) => api.get(`/properties/${id}`),
    create: (formData) => fetchFormData('/properties', 'POST', formData),
    update: (id, formData) => fetchFormData(`/properties/${id}`, 'PUT', formData),
    delete: (id) => api.delete(`/properties/${id}`),
};

// Appointments
export const appointmentsAPI = {
    create: (formData) => fetchFormData('/appointments', 'POST', formData),
    getAll: () => api.get('/appointments'),
    getById: (id) => api.get(`/appointments/${id}`),
    updateStatus: (id, data) => api.patch(`/appointments/${id}/status`, data),
    requestChange: (id, data) => api.patch(`/appointments/${id}/change-request`, data),
    approveChangeRequest: (id, data) => api.patch(`/appointments/${id}/change-request/status`, data),
    delete: (id) => api.delete(`/appointments/${id}`),
    requestCancel: (id, data) => api.patch(`/appointments/${id}/cancel-request`, data || {}),
    editDirectly: (id, data) => api.patch(`/appointments/${id}/edit`, data),
    ownerCancel: (id, data) => api.patch(`/appointments/${id}/owner-cancel`, data),
};

// Leases
export const leasesAPI = {
    create: (formData) => fetchFormData('/leases', 'POST', formData),
    getAll: () => api.get('/leases'),
    getById: (id) => api.get(`/leases/${id}`),
    update: (id, formData) => fetchFormData(`/leases/${id}`, 'PUT', formData),
    editDirectly: (id, formData) => fetchFormData(`/leases/${id}/edit`, 'PATCH', formData),
    delete: (id) => api.delete(`/leases/${id}`),
    approve: (id, data) => api.patch(`/leases/${id}/approve`, data),
    requestTermination: (id, data) => api.patch(`/leases/${id}/terminate-request`, data),
    ownerTerminate: (id, data) => api.patch(`/leases/${id}/owner-terminate`, data),
};

// Bills
export const billsAPI = {
    create: (formData) => fetchFormData('/bills', 'POST', formData),
    getAll: (params) => api.get('/bills', { params }),
    getById: (id) => api.get(`/bills/${id}`),
    approve: (id, data) => api.patch(`/bills/${id}/approve`, data),
    // Tenant direct mutations (pending_approval only)
    edit: (id, formData) => fetchFormData(`/bills/${id}`, 'PATCH', formData),
    remove: (id) => api.delete(`/bills/${id}`),
    // Tenant requests for approved bills
    requestEdit: (id, formData) => fetchFormData(`/bills/${id}/request-edit`, 'PATCH', formData),
    requestDelete: (id, data) => api.patch(`/bills/${id}/request-delete`, data),
    // Owner approve/reject requests
    approveEdit: (id, data) => api.patch(`/bills/${id}/approve-edit`, data),
    approveDelete: (id, data) => api.patch(`/bills/${id}/approve-delete`, data),
};

// Maintenance
export const maintenanceAPI = {
    create: (formData) => fetchFormData('/maintenance', 'POST', formData),
    getAll: (params) => api.get('/maintenance', { params }),
    getById: (id) => api.get(`/maintenance/${id}`),
    approve: (id, data) => api.patch(`/maintenance/${id}/approve`, data),

    // Direct actions (pending approval)
    editDirectly: (id, formData) => fetchFormData(`/maintenance/${id}/edit`, 'PUT', formData),
    deleteDirectly: (id) => api.delete(`/maintenance/${id}/delete`),

    // Request workflows (approved/in_progress)
    requestEdit: (id, formData) => fetchFormData(`/maintenance/${id}/request-edit`, 'POST', formData),
    requestDelete: (id, data) => api.post(`/maintenance/${id}/request-delete`, data),
    approveEdit: (id, data) => api.patch(`/maintenance/${id}/approve-edit`, data),
    approveDelete: (id, data) => api.patch(`/maintenance/${id}/approve-delete`, data),

    // Owner cancel
    ownerCancel: (id, data) => api.patch(`/maintenance/${id}/owner-cancel`, data),
};

// Notices
export const noticesAPI = {
    create: (formData) => fetchFormData('/notices', 'POST', formData),
    getAll: (params) => api.get('/notices', { params }),
    getById: (id) => api.get(`/notices/${id}`),
    update: (id, formData) => fetchFormData(`/notices/${id}`, 'PUT', formData),
    delete: (id) => api.delete(`/notices/${id}`),
};

export default api;
