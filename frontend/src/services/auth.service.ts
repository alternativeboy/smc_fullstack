import { api } from './api';
import type { AuthResponse, User } from '@/types/auth.types';

export const authService = {
  register: (email: string, password: string, displayName: string) =>
    api<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    }),
  login: (email: string, password: string) =>
    api<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => api('/api/auth/logout', { method: 'POST' }),
  me: () => api<User>('/api/auth/me'),
};
