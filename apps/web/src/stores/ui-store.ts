import { create } from 'zustand';

export const THEME_STORAGE_KEY = 'turfxi-theme';
export const SIDEBAR_COLLAPSED_STORAGE_KEY = 'kalikkanundo-sidebar-collapsed';

export function getStoredSidebarCollapsed(): boolean {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
      if (saved !== null) {
        return saved === 'true';
      }
    } catch {
      // Ignore localStorage access failures
    }
  }
  return false;
}

export function getStoredTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    } catch {
      // Ignore localStorage access failures
    }
    if (document.documentElement.classList.contains('light')) {
      return 'light';
    }
    if (document.documentElement.classList.contains('dark')) {
      return 'dark';
    }
  }
  return 'dark';
}

export function applyThemeToDom(theme: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
    root.setAttribute('data-theme', 'dark');
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
    root.setAttribute('data-theme', 'light');
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore localStorage access failures
  }
}

// Synchronize DOM on script execution in browser
if (typeof window !== 'undefined') {
  applyThemeToDom(getStoredTheme());
}

export interface UIState {
  // Navigation & theme
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  collapsed: boolean;
  theme: 'light' | 'dark';
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;

  // Modals
  activeModal: string | null;
  openModal: (modalId: string) => void;
  closeModal: () => void;

  // Formation & Match UI drafts
  selectedTeamSide: 'A' | 'B' | 'single';
  setSelectedTeamSide: (side: 'A' | 'B' | 'single') => void;
  pitchDraftPositions: Record<string, { x: number; y: number }>;
  setDraftPosition: (userId: string, coord: { x: number; y: number }) => void;
  clearDraftPositions: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  sidebarCollapsed: getStoredSidebarCollapsed(),
  get collapsed() {
    return this.sidebarCollapsed;
  },
  theme: getStoredTheme(),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () =>
    set((state) => {
      const next = !state.sidebarCollapsed;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(next));
        } catch {
          // ignore storage errors
        }
      }
      return { sidebarCollapsed: next, sidebarOpen: !state.sidebarOpen };
    }),
  setSidebarCollapsed: (collapsed) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(collapsed));
      } catch {
        // ignore storage errors
      }
    }
    set({ sidebarCollapsed: collapsed });
  },
  toggleSidebarCollapsed: () =>
    set((state) => {
      const next = !state.sidebarCollapsed;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(next));
        } catch {
          // ignore storage errors
        }
      }
      return { sidebarCollapsed: next };
    }),
  setTheme: (theme) => {
    applyThemeToDom(theme);
    set({ theme });
  },
  toggleTheme: () =>
    set((state) => {
      const nextTheme = state.theme === 'light' ? 'dark' : 'light';
      applyThemeToDom(nextTheme);
      return { theme: nextTheme };
    }),

  // Modals
  activeModal: null,
  openModal: (modalId) => set({ activeModal: modalId }),
  closeModal: () => set({ activeModal: null }),

  // Lineup / Formation Drafts
  selectedTeamSide: 'A',
  setSelectedTeamSide: (side) => set({ selectedTeamSide: side }),
  pitchDraftPositions: {},
  setDraftPosition: (userId, coord) =>
    set((state) => ({
      pitchDraftPositions: {
        ...state.pitchDraftPositions,
        [userId]: coord,
      },
    })),
  clearDraftPositions: () => set({ pitchDraftPositions: {} }),
}));
