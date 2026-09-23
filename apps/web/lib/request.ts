import { httpErrorSchema, httpSuccessSchema } from '@resume-copilot/contracts';
import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { z } from 'zod';

const successSchema = httpSuccessSchema(z.unknown());

export class ApiRequestError extends Error {
  readonly name = 'ApiRequestError';

  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly requestId?: string,
  ) {
    super(message);
  }
}

function requestIdOf(response: AxiosResponse): string | undefined {
  const requestId: unknown = response.headers['x-request-id'];
  return typeof requestId === 'string' ? requestId : undefined;
}

function responseError(response: AxiosResponse): ApiRequestError {
  const parsed = httpErrorSchema.safeParse(response.data);
  const requestId = requestIdOf(response);
  if (!parsed.success) {
    return new ApiRequestError('Invalid server response', 'INVALID_RESPONSE', response.status, requestId);
  }
  return new ApiRequestError(
    parsed.data.error.message,
    parsed.data.error.code,
    response.status,
    requestId,
  );
}

const client = axios.create({
  baseURL: '/api',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include session cookies for same-origin business requests.
});

client.interceptors.response.use(response => {
  // Binary/download endpoints do not use the business JSON envelope.
  if (
    response.config.responseType === 'blob' ||
    response.config.responseType === 'arraybuffer' ||
    response.config.responseType === 'stream'
  ) {
    return response.data;
  }

  const parsed = successSchema.safeParse(response.data);
  if (!parsed.success) {
    throw new ApiRequestError('Invalid server response', 'INVALID_RESPONSE', response.status, requestIdOf(response));
  }
  return parsed.data.data;
}, error => {
  if (axios.isAxiosError(error) && error.response) throw responseError(error.response);
  return Promise.reject(error);
});

// Axios' default return type is AxiosResponse<T>, but the interceptor returns T.
const request = {
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return client.get<T, T>(url, config);
  },
  post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return client.post<T, T>(url, data, config);
  },
  patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return client.patch<T, T>(url, data, config);
  },
  put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return client.put<T, T>(url, data, config);
  },
  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return client.delete<T, T>(url, config);
  },
};

export default request;
