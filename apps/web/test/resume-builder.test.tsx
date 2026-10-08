import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useResumeStore } from '@/stores/resume-store';
import { defaultResumeData } from '@resume-copilot/contracts';
import type { ResumeData } from '@resume-copilot/contracts';
import BuilderToolbar from '@/components/resume/BuilderToolbar';
import Controls from '@/components/resume/ResumeBuilder/Controls';

const api = vi.hoisted(() => ({ update: vi.fn(), export: vi.fn(), push: vi.fn() }));
const camera = vi.hoisted(() => ({
  scale: 0.74, listeners: new Set<() => void>(), transform: vi.fn(),
  instance: { wrapperComponent: null as HTMLElement | null },
}));
vi.mock('@/services/resume', () => ({ updateResume: api.update, exportResumePDF: api.export }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: api.push }) }));
// The third-party zoom SDK returns new helper functions on each render.
vi.mock('react-zoom-pan-pinch', async () => {
  const { useSyncExternalStore } = await import('react');
  return {
    useControls: () => ({
      instance: camera.instance,
      setTransform: (...args: number[]) => camera.transform(...args),
      zoomIn: () => { camera.scale += 0.1; camera.listeners.forEach(listener => listener()); },
      zoomOut: () => { camera.scale -= 0.1; camera.listeners.forEach(listener => listener()); },
    }),
    useTransformComponent: (selector: (context: { state: { scale: number } }) => number) => useSyncExternalStore(
      listener => { camera.listeners.add(listener); return () => { camera.listeners.delete(listener); }; },
      () => selector({ state: { scale: camera.scale } }),
    ),
  };
});

beforeEach(() => {
  vi.useFakeTimers();
  const store = useResumeStore.getState();
  store.setResumeId('resume-one');
  store.setResume(structuredClone(defaultResumeData) as ResumeData);
});

afterEach(() => {
  cleanup();
  useResumeStore.getState().reset();
  vi.clearAllTimers();
  vi.useRealTimers();
  api.update.mockReset();
  api.export.mockReset();
  api.push.mockReset();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  camera.listeners.clear();
  camera.transform.mockReset();
  camera.instance.wrapperComponent = null;
  camera.scale = 0.74;
});

it('keeps a user-selected preview zoom when the zoom SDK rerenders its controls', () => {
  const wrapper = document.createElement('div');
  Object.defineProperties(wrapper, { clientWidth: { value: 1040 }, clientHeight: { value: 936 } });
  camera.instance.wrapperComponent = wrapper;
  camera.transform.mockImplementation((_x: number, _y: number, scale: number) => {
    camera.scale = scale;
    camera.listeners.forEach(listener => listener());
  });
  vi.stubGlobal('ResizeObserver', class {
    constructor(private callback: () => void) {}
    observe() { this.callback(); }
    disconnect() {}
  });
  render(<Controls />);
  fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
  expect(screen.getByText('84%')).toBeTruthy();
});

describe('leaving and exporting the builder draft', () => {
  it('does not export or leave when the latest draft cannot be saved', async () => {
    api.update.mockRejectedValue(new Error('offline'));
    useResumeStore.getState().updateResume(draft => { draft.basics.name = 'Unsaved draft'; });
    render(<BuilderToolbar onBusyChange={() => {}} />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Download PDF' })); });
    expect(api.export).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('could not be saved');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Back to resumes' })); });
    expect(api.push).not.toHaveBeenCalled();
    expect(useResumeStore.getState().resume?.basics.name).toBe('Unsaved draft');
  });

  it('downloads only after the latest pending save completes and prevents double download', async () => {
    let finish!: () => void;
    api.update.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
    api.export.mockResolvedValue(new Blob(['test'], { type: 'application/pdf' }));
    const BaseURL = URL;
    vi.stubGlobal('URL', class extends BaseURL {
      static createObjectURL = vi.fn(() => 'blob:test-pdf');
      static revokeObjectURL = vi.fn();
    });
    const download = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    useResumeStore.getState().updateResume(draft => { draft.basics.name = 'Latest draft'; });
    render(<BuilderToolbar onBusyChange={() => {}} />);
    const button = screen.getByRole('button', { name: 'Download PDF' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(api.export).not.toHaveBeenCalled();
    await act(async () => finish());
    expect(api.export).toHaveBeenCalledExactlyOnceWith('Latest draft', 'resume-one');
    expect(download).toHaveBeenCalledTimes(1);
  });

  it('discards an old export result after the authenticated workspace unmounts', async () => {
    let finish!: (blob: Blob) => void;
    api.export.mockImplementationOnce(() => new Promise<Blob>(resolve => { finish = resolve; }));
    const download = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const view = render(<BuilderToolbar onBusyChange={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
    view.unmount();
    useResumeStore.getState().reset();
    await act(async () => finish(new Blob(['test'])));
    expect(download).not.toHaveBeenCalled();
  });
});

describe('saving the editable resume', () => {
  it('persists the latest edit even when its debounce fires during a slow save', async () => {
    let finish!: () => void;
    api.update
      .mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }))
      .mockResolvedValueOnce(undefined);
    useResumeStore.getState().updateResume(draft => { draft.basics.name = 'First edit'; });
    const saving = useResumeStore.getState().saveToServer();
    useResumeStore.getState().updateResume(draft => { draft.basics.name = 'Latest edit'; });
    await vi.advanceTimersByTimeAsync(1500);
    expect(api.update).toHaveBeenCalledTimes(1);
    finish();
    await saving;
    expect(api.update).toHaveBeenLastCalledWith('resume-one', {
      data: expect.objectContaining({ basics: expect.objectContaining({ name: 'Latest edit' }) }),
    });
    expect(api.update).toHaveBeenCalledTimes(2);
    expect(useResumeStore.getState().isSaving).toBe(false);
  });

  it('lets export or navigation wait for an already active save', async () => {
    let finish!: () => void;
    api.update.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
    useResumeStore.getState().updateResume(draft => { draft.basics.name = 'Ready for export'; });
    const first = useResumeStore.getState().saveToServer();
    let flushed = false;
    const flush = Promise.resolve(useResumeStore.getState().saveToServer()).then(() => { flushed = true; });
    await Promise.resolve();
    expect(flushed).toBe(false);
    finish();
    await Promise.all([first, flush]);
    expect(flushed).toBe(true);
    expect(api.update).toHaveBeenCalledTimes(1);
  });

  it('keeps a failed draft visibly unsaved and retries it explicitly', async () => {
    api.update.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined);
    useResumeStore.getState().updateResume(draft => { draft.basics.name = 'Keep this draft'; });
    expect(await useResumeStore.getState().saveToServer()).toBe(false);
    expect(useResumeStore.getState()).toMatchObject({ isDirty: true, saveStatus: 'error', isSaving: false });
    expect(useResumeStore.getState().resume?.basics.name).toBe('Keep this draft');
    await vi.advanceTimersByTimeAsync(5000);
    expect(api.update).toHaveBeenCalledTimes(1);
    expect(await useResumeStore.getState().saveToServer()).toBe(true);
    expect(useResumeStore.getState()).toMatchObject({ isDirty: false, saveStatus: 'saved' });
  });

  it('never saves a newly opened document into the previous document after a late response', async () => {
    let finish!: () => void;
    api.update.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
    useResumeStore.getState().updateResume(draft => { draft.basics.name = 'Previous account'; });
    const previousSave = useResumeStore.getState().saveToServer();
    useResumeStore.getState().updateResume(draft => { draft.basics.name = 'Queued old edit'; });
    useResumeStore.getState().setResumeId('resume-two');
    useResumeStore.getState().setResume(structuredClone(defaultResumeData) as ResumeData);
    finish();
    await previousSave;
    await vi.advanceTimersByTimeAsync(1500);
    expect(api.update).toHaveBeenCalledTimes(1);
    expect(useResumeStore.getState()).toMatchObject({
      resumeId: 'resume-two', isSaving: false, isDirty: false, saveStatus: 'saved',
    });
    expect(useResumeStore.getState().resume?.basics.name).toBe('');
  });

  it('saves the latest document title together with edits made during a request', async () => {
    useResumeStore.getState().initializeResume({
      id: 'resume-one', title: 'Original title', data: structuredClone(defaultResumeData) as ResumeData,
    });
    let finish!: () => void;
    api.update.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }))
      .mockResolvedValueOnce(undefined);
    useResumeStore.getState().updateTitle('First title');
    const saving = useResumeStore.getState().saveToServer();
    useResumeStore.getState().updateTitle('Latest title');
    useResumeStore.getState().updateResume(draft => { draft.basics.name = 'Latest name'; });
    finish();
    expect(await saving).toBe(true);
    expect(api.update).toHaveBeenLastCalledWith('resume-one', {
      title: 'Latest title',
      data: expect.objectContaining({ basics: expect.objectContaining({ name: 'Latest name' }) }),
    });
  });
});
