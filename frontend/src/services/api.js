import axios from 'axios';
import { toast } from 'react-toastify';

// Use relative URL so it works on ANY domain (localhost, cloudflare, production)
// The nginx proxy routes /api/* to the backend
const getBaseURL = () => {
  if (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL !== 'http://localhost/api') {
    return process.env.REACT_APP_API_URL;
  }
  // Use relative URL - works on any domain
  return '/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle responses globally
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const message = error.response?.data?.message || error.response?.data?.error || 'Something went wrong';
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } else if (error.response?.status === 429) {
      toast.warning('Too many requests — please wait a moment before trying again.', { toastId: 'rate-limit' });
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again.');
    }
    return Promise.reject({ ...error, message });
  }
);

export default api;
