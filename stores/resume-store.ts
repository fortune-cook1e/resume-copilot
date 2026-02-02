import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ResumeData } from '@/types/resume';

interface ResumeState {
  resume: ResumeData | null;
  isReady: boolean;
}

interface ResumeActions {
  setResume: (resume: ResumeData) => void;
  updateResume: (updater: (draft: ResumeData) => void) => void;
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
