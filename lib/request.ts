import { ApiResponse, ResponseCode } from '@/lib/api-response';
import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

const request = axios.create({
  baseURL: baseURL + '/api',
  timeout: 60000,
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

// Response interceptor — unwraps data so callers receive it directly
request.interceptors.response.use(
  response => {
    const body = response.data;

    // Unified API responses: { code, msg, data }
    // Unwrap and return inner `data` directly
    if (body && typeof body === 'object' && 'code' in body) {
      const apiRes = body as ApiResponse;
      if (apiRes.code !== ResponseCode.SUCCESS) {
        return Promise.reject(new Error(apiRes.msg || 'Request failed'));
      }
      // Return inner data directly — callers get the payload without extra unwrapping
      return apiRes.data;
    }

    // Non-standard responses (binary/blob, better-auth, etc.) — return raw data
    return response.data;
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
