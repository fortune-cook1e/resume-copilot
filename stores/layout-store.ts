import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface LayoutState {
  leftSidebarSize: number;
  rightSidebarSize: number;
}

interface LayoutActions {
  setLeftSidebarSize: (size: number) => void;
  setRightSidebarSize: (size: number) => void;
}

type LayoutStore = LayoutState & LayoutActions;

export const useLayoutStore = create<LayoutStore>()(
  persist(
    set => ({
      leftSidebarSize: 40,
      rightSidebarSize: 60,

      setLeftSidebarSize: size => set({ leftSidebarSize: size }),
      setRightSidebarSize: size => set({ rightSidebarSize: size }),
    }),
    {
      name: 'resume-layout',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
