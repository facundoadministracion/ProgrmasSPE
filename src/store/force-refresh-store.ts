import { create } from 'zustand';

interface ForceRefreshState {
  refreshId: number;
  triggerRefresh: () => void;
}

export const useForceRefreshStore = create<ForceRefreshState>((set) => ({
  refreshId: 0,
  triggerRefresh: () => set((state) => ({ refreshId: state.refreshId + 1 })),
}));