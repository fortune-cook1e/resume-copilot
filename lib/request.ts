import axios from 'axios';

const request = axios.create({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // send cookies with every request (for better-auth session)
});

// Request interceptor
request.interceptors.request.use(
  config => {
    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

// Response interceptor
request.interceptors.response.use(
  response => {
    return response;
  },
  error => {
    // Handle 401 - redirect to login
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default request;
