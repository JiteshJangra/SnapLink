import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10_000,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401s globally — clear token and redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── URL endpoints ─────────────────────────────────────────────────
export const urlApi = {
  create: (data) => api.post('/urls', data).then((r) => r.data),
  list: (params) => api.get('/urls', { params }).then((r) => r.data),
  stats: (code) => api.get(`/urls/${code}/stats`).then((r) => r.data),
  delete: (code) => api.delete(`/urls/${code}`).then((r) => r.data),
};

// ── Auth endpoints ────────────────────────────────────────────────
export const authApi = {
  register: (data) => api.post('/auth/register', data).then((r) => r.data),
  login: (data) => api.post('/auth/login', data).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
};

export default api;
