import axios from 'axios';

const envBase = import.meta.env.VITE_API_BASE_URL;
const trimmedBase = envBase?.replace(/\/$/, '');

// Ensure the base URL always targets the backend's `/api` prefix, whether the
// environment variable includes it or not. This prevents 404s when users set a
// host/port (e.g. http://localhost:4000) without the `/api` path that the
// server exposes.
const baseURL = trimmedBase
  ? trimmedBase.endsWith('/api')
    ? trimmedBase
    : `${trimmedBase}/api`
  : '/api';

export const api = axios.create({
  baseURL,
});

export function setAuthToken(token?: string) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}
