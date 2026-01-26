import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Resume } from '@/types/resume';

interface ResumeState {
  resume: Resume | null;
  isReady: boolean;
}

interface ResumeActions {
  setResume: (resume: Resume) => void;
  updateResume: (updater: (draft: Resume) => void) => void;
  reset: () => void;
}

type ResumeStore = ResumeState & ResumeActions;

const initialState: ResumeState = {
  resume: null,
  isReady: false,
};

export const useResumeStore = create<ResumeStore>()(
  immer(set => ({
    ...initialState,

    setResume: resume => {
      set(state => {
        state.resume = resume;
        state.isReady = true;
      });
    },

    updateResume: updater => {
      set(state => {
        if (state.resume) {
          updater(state.resume);
        }
      });
    },

    reset: () => {
      set(initialState);
    },
  })),
);
