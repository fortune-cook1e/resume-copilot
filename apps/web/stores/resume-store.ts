import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Resume, ResumeData } from '@/types/resume';
import { updateResume as updateResumeAPI } from '@/services/resume';

interface ResumeState {
  resumeId: string | null;
  resume: ResumeData | null;
  title: string;
  isReady: boolean;
  isSaving: boolean;
  isDirty: boolean;
  saveStatus: 'saved' | 'pending' | 'saving' | 'error';
}

interface ResumeActions {
  initializeResume: (resume: Pick<Resume, 'id' | 'title' | 'data'>) => void;
  setResumeId: (id: string | null) => void;
  setResume: (resume: ResumeData) => void;
  updateResume: (updater: (draft: ResumeData) => void) => void;
  updateTitle: (title: string) => void;
  saveToServer: () => Promise<boolean>;
  reset: () => void;
}

type ResumeStore = ResumeState & ResumeActions;

const initialState: ResumeState = {
  resumeId: null,
  resume: null,
  title: '',
  isReady: false,
  isSaving: false,
  isDirty: false,
  saveStatus: 'saved',
};

// Debounce timer for auto-save
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let activeSave: Promise<boolean> | null = null;
let draftEpoch = 0;
const SAVE_DEBOUNCE_MS = 500;

export const useResumeStore = create<ResumeStore>()(
  immer((set, get) => ({
    ...initialState,

    initializeResume: detail => {
      get().reset();
      set({ resumeId: detail.id, resume: detail.data, title: detail.title, isReady: true });
    },

    setResumeId: id => {
      if (id !== get().resumeId) get().reset();
      set(state => {
        state.resumeId = id;
      });
    },

    setResume: resume => {
      set(state => {
        state.resume = resume;
        state.isReady = true;
        state.isDirty = false;
        state.saveStatus = 'saved';
      });
    },

    updateResume: updater => {
      const previous = get().resume;
      set(state => {
        if (state.resume) updater(state.resume);
      });
      if (get().resume === previous) return;
      set(state => {
        state.isDirty = true;
        if (!state.isSaving) state.saveStatus = 'pending';
      });

      // Auto-save after debounce
      if (saveTimer) clearTimeout(saveTimer);
      if (activeSave) return; // The active request drains the newest draft before resolving.
      saveTimer = setTimeout(() => {
        void get().saveToServer();
      }, SAVE_DEBOUNCE_MS);
    },

    updateTitle: title => {
      const nextTitle = title.trim();
      if (!get().resume || !nextTitle || nextTitle.length > 20 || nextTitle === get().title) return;
      set(state => {
        state.title = nextTitle;
        state.isDirty = true;
        if (!state.isSaving) state.saveStatus = 'pending';
      });
      if (saveTimer) clearTimeout(saveTimer);
      if (activeSave) return;
      saveTimer = setTimeout(() => { void get().saveToServer(); }, SAVE_DEBOUNCE_MS);
    },

    saveToServer: () => {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = null;
      if (activeSave) return activeSave;
      const { resumeId, resume, title } = get();
      if (!resumeId || !resume) return Promise.resolve(false);
      const epoch = draftEpoch;

      set(state => {
        state.isSaving = true;
        state.saveStatus = 'saving';
      });

      const task = (async () => {
        try {
          let snapshot = resume;
          let snapshotTitle = title;
          while (epoch === draftEpoch) {
            await updateResumeAPI(resumeId, {
              data: snapshot,
              ...(snapshotTitle ? { title: snapshotTitle } : {}),
            });
            if (epoch !== draftEpoch) return false;
            const latest = get();
            if (!latest.resume) return false;
            if (latest.resume === snapshot && latest.title === snapshotTitle) break;
            snapshot = latest.resume;
            snapshotTitle = latest.title;
          }
          set(state => { state.isDirty = false; state.saveStatus = 'saved'; });
          return true;
        } catch {
          if (epoch === draftEpoch) set(state => { state.isDirty = true; state.saveStatus = 'error'; });
          return false;
        } finally {
          if (epoch === draftEpoch) {
            if (saveTimer) clearTimeout(saveTimer);
            saveTimer = null;
            activeSave = null;
            set(state => { state.isSaving = false; });
          }
        }
      })();
      activeSave = task;
      return task;
    },

    reset: () => {
      draftEpoch++;
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = null;
      activeSave = null;
      set(initialState);
    },
  })),
);
