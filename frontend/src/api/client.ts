import axios from 'axios';

const rawBaseURL = import.meta.env.VITE_API_BASE_URL?.trim();
const baseURL = rawBaseURL?.replace(/\/+$, '') || '/api';

export const api = axios.create({
  baseURL,
});

let onUnauthorized: (() => void) | undefined;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const hasAuthHeader = Boolean(error.config?.headers?.Authorization);
    if (status === 401 && hasAuthHeader && onUnauthorized) {
      onUnauthorized();
    }
    return Promise.reject(error);
  }
);

export function setAuthToken(token?: string) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

export function setUnauthorizedHandler(handler?: () => void) {
  onUnauthorized = handler;
}
