import { api } from './client';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  userId: string;
  email: string;
  token: string;
  message?: string;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', payload);
  if (!data.success) {
    throw new Error(data.message || 'Invalid credentials');
  }
  return data;
}
