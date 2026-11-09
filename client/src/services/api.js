import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor: attach token & businessId
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('invoicehub_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const businessId = localStorage.getItem('invoicehub_business_id');
    if (businessId) {
      config.headers['X-Business-Id'] = businessId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't loop redirect if already on login
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        localStorage.removeItem('invoicehub_token');
        localStorage.removeItem('invoicehub_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

