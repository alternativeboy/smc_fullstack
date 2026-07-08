import { create } from 'zustand';
import type { UsageStatus } from '@/types/usage.types';

interface UsageState {
  status: UsageStatus | null;
  setStatus: (s: UsageStatus) => void;
}

export const useUsageStore = create<UsageState>((set) => ({
  status: null,
  setStatus: (status) => set({ status }),
}));
