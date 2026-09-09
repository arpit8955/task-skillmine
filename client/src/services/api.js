import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

export const eventsApi = {
  create: (data) => api.post('/events', data),
  list: (params) => api.get('/events', { params }),
  getById: (id) => api.get(`/events/${id}`),
};

export const approvalsApi = {
  list: (params) => api.get('/approvals', { params }),
  getById: (id) => api.get(`/approvals/${id}`),
  approve: (id, data = {}) => api.post(`/approvals/${id}/approve`, data),
  reject: (id, data = {}) => api.post(`/approvals/${id}/reject`, data),
};

export const systemApi = {
  health: () => api.get('/health'),
  dashboard: () => api.get('/dashboard'),
  activity: (params) => api.get('/activity', { params }),
  audit: (params) => api.get('/audit', { params }),
};

export default api;
