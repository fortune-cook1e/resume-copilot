import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ResumeData } from '@/types/resume';
import { updateResume as updateResumeAPI } from '@/services/resume';

interface ResumeState {
  resumeId: string | null;
  resume: ResumeData | null;
  isReady: boolean;
  isSaving: boolean;
}

interface ResumeActions {
  setResumeId: (id: string | null) => void;
  setResume: (resume: ResumeData) => void;
  updateResume: (updater: (draft: ResumeData) => void) => void;
  saveToServer: () => void;
  reset: () => void;
}

type ResumeStore = ResumeState & ResumeActions;

const initialState: ResumeState = {
  resumeId: null,
  resume: null,
  isReady: false,
  isSaving: false,
};

// Debounce timer for auto-save
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let draftEpoch = 0;
const SAVE_DEBOUNCE_MS = 1000;

export const useResumeStore = create<ResumeStore>()(
  immer((set, get) => ({
    ...initialState,

    setResumeId: id => {
      set(state => {
        state.resumeId = id;
      });
    },

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

      // Auto-save after debounce
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        get().saveToServer();
      }, SAVE_DEBOUNCE_MS);
    },

    saveToServer: async () => {
      const { resumeId, resume, isSaving } = get();
      if (!resumeId || !resume || isSaving) return;
      const epoch = draftEpoch;

      set(state => {
        state.isSaving = true;
      });

      try {
        await updateResumeAPI(resumeId, { data: resume });
      } catch (error) {
        if (epoch === draftEpoch) console.error('Failed to save resume:', error);
      } finally {
        if (epoch === draftEpoch) set(state => {
          state.isSaving = false;
        });
      }
    },

    reset: () => {
      draftEpoch++;
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = null;
      set(initialState);
    },
  })),
);
