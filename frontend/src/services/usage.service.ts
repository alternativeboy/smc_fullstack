import { api } from './api';
import type { UsageStatus } from '@/types/usage.types';

export const usageService = {
  status: () => api<UsageStatus>('/api/usage/status'),
};
