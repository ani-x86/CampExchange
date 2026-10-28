import { create } from 'zustand';

export type NavigationDirection = 'forward' | 'back';

interface UiState {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  toggleSidebar: () => void;
  
  navigationDirection: NavigationDirection;
  setNavigationDirection: (direction: NavigationDirection) => void;

  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;

  shortcutsHelpOpen: boolean;
  setShortcutsHelpOpen: (open: boolean) => void;
  toggleShortcutsHelp: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) =>
    set((state) => ({
      sidebarCollapsed: typeof collapsed === 'function' ? collapsed(state.sidebarCollapsed) : collapsed,
    })),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  navigationDirection: 'forward',
  setNavigationDirection: (direction) => set({ navigationDirection: direction }),

  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  toggleCommandPalette: () => set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),

  shortcutsHelpOpen: false,
  setShortcutsHelpOpen: (open) => set({ shortcutsHelpOpen: open }),
  toggleShortcutsHelp: () => set((state) => ({ shortcutsHelpOpen: !state.shortcutsHelpOpen })),
}));
