import { create } from 'zustand'

interface UiState {
  /** Full-screen desk-clock overlay visibility. */
  clockOpen: boolean
  openClock: () => void
  closeClock: () => void
  toggleClock: () => void
}

export const useUiStore = create<UiState>((set) => ({
  clockOpen: false,
  openClock: () => set({ clockOpen: true }),
  closeClock: () => set({ clockOpen: false }),
  toggleClock: () => set((s) => ({ clockOpen: !s.clockOpen })),
}))
