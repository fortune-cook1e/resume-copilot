// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SignOutButton } from '@/components/dashboard/SignOutButton';
import { SESSION_CHANGE_KEY } from '@/lib/authenticated-state';
import { useResumeStore } from '@/stores/resume-store';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Authentication } from '@/components/authentication';

const state = vi.hoisted(() => ({
  session: { data: null as object | null, isPending: true, error: null as Error | null },
  replace: vi.fn(),
  refresh: vi.fn(),
  signOut: vi.fn(),
  refetch: vi.fn(),
  save: vi.fn(),
}));
vi.mock('@/lib/auth-client', () => ({ useSession: () => ({ ...state.session, refetch: state.refetch }), signOut: state.signOut }));
vi.mock('@/services/resume', () => ({ updateResume: state.save }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: state.replace, refresh: state.refresh }) }));

afterEach(() => {
  cleanup();
  localStorage.clear();
  state.replace.mockClear();
  state.refresh.mockClear();
  state.signOut.mockReset();
  state.refetch.mockReset();
  state.save.mockReset();
  useResumeStore.getState().reset();
  state.session = { data: null, isPending: true, error: null };
});

describe('authenticated page after hydration', () => {
  it('clears private state and hides content when the session expires', async () => {
    const client = new QueryClient();
    client.setQueryData(['private'], 'retained');
    useResumeStore.getState().setResumeId('draft');
    const view = render(<QueryClientProvider client={client}><Authentication>Private workspace</Authentication></QueryClientProvider>);
    expect(screen.getByText('Private workspace')).toBeTruthy();

    state.session = { data: null, isPending: false, error: null };
    view.rerender(<QueryClientProvider client={client}><Authentication>Private workspace</Authentication></QueryClientProvider>);
    expect(screen.queryByText('Private workspace')).toBeNull();
    await waitFor(() => expect(state.replace).toHaveBeenCalledWith('/login'));
    expect(client.getQueryData(['private'])).toBeUndefined();
    expect(useResumeStore.getState().resumeId).toBeNull();
  });

  it('does not remount private content if a late session response arrives after sign-out', () => {
    const client = new QueryClient();
    state.session = { data: null, isPending: false, error: null };
    const view = render(<QueryClientProvider client={client}><Authentication>Old workspace</Authentication></QueryClientProvider>);
    state.session = { data: { user: { id: 'owner' } }, isPending: false, error: null };
    view.rerender(<QueryClientProvider client={client}><Authentication>Old workspace</Authentication></QueryClientProvider>);
    expect(screen.queryByText('Old workspace')).toBeNull();
  });

  it('hides private content while revalidating a cross-tab notice', async () => {
    const client = new QueryClient();
    let finish!: () => void;
    state.refetch.mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
    state.session = { data: { user: { id: 'owner' } }, isPending: false, error: null };
    render(<QueryClientProvider client={client}><Authentication>Private workspace</Authentication></QueryClientProvider>);
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: SESSION_CHANGE_KEY, newValue: 'updated' })));
    expect(state.refetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Private workspace')).toBeNull();
    expect(state.replace).not.toHaveBeenCalled();
    await act(async () => finish());
    expect(screen.getByText('Private workspace')).toBeTruthy();
  });

  it('hides and clears previous-user state before rendering a different account', async () => {
    const client = new QueryClient();
    client.setQueryData(['private'], 'previous user');
    useResumeStore.getState().setResumeId('previous-draft');
    state.session = { data: { user: { id: 'new-owner' } }, isPending: false, error: null };
    render(<QueryClientProvider client={client}><Authentication expectedUserId="old-owner">Old workspace</Authentication></QueryClientProvider>);
    expect(screen.queryByText('Old workspace')).toBeNull();
    await waitFor(() => expect(state.refresh).toHaveBeenCalledTimes(1));
    expect(client.getQueryData(['private'])).toBeUndefined();
    expect(useResumeStore.getState().resumeId).toBeNull();
  });

  it('keeps the user on the page with their draft when sign-out fails', async () => {
    const client = new QueryClient();
    client.setQueryData(['private'], 'retained');
    useResumeStore.getState().setResumeId('draft');
    state.signOut.mockResolvedValue({ data: null, error: { message: 'failed' } });
    render(<QueryClientProvider client={client}><SignOutButton /></QueryClientProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Could not sign out'));
    expect(state.replace).not.toHaveBeenCalled();
    expect(client.getQueryData(['private'])).toBe('retained');
    expect(useResumeStore.getState().resumeId).toBe('draft');
    expect(localStorage.getItem(SESSION_CHANGE_KEY)).toBeNull();
  });

  it('clears old-user state only after confirmed sign-out and prevents double submission', async () => {
    const client = new QueryClient();
    client.setQueryData(['private'], 'retained');
    useResumeStore.getState().setResumeId('draft');
    let finish!: (value: object) => void;
    state.signOut.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    render(<QueryClientProvider client={client}><SignOutButton /></QueryClientProvider>);
    const button = screen.getByRole('button', { name: 'Sign out' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(state.signOut).toHaveBeenCalledTimes(1);
    expect(state.replace).not.toHaveBeenCalled();
    finish({ data: { success: true }, error: null });
    await waitFor(() => expect(state.replace).toHaveBeenCalledWith('/login'));
    expect(client.getQueryData(['private'])).toBeUndefined();
    expect(useResumeStore.getState().resumeId).toBeNull();
    expect(localStorage.getItem(SESSION_CHANGE_KEY)).toBeTruthy();
  });

  it('ignores a previous user’s late save completion after a new draft starts', async () => {
    let finishFirst!: () => void;
    let finishSecond!: () => void;
    state.save
      .mockImplementationOnce(() => new Promise<void>(resolve => { finishFirst = resolve; }))
      .mockImplementationOnce(() => new Promise<void>(resolve => { finishSecond = resolve; }));
    const store = useResumeStore.getState();
    store.setResumeId('previous-draft');
    store.setResume({} as Parameters<typeof store.setResume>[0]);
    const first = store.saveToServer();
    store.reset();
    useResumeStore.getState().setResumeId('new-draft');
    useResumeStore.getState().setResume({} as Parameters<typeof store.setResume>[0]);
    const second = useResumeStore.getState().saveToServer();
    finishFirst();
    await first;
    expect(useResumeStore.getState().isSaving).toBe(true);
    finishSecond();
    await second;
    expect(useResumeStore.getState().isSaving).toBe(false);
  });

  it('does not sign out when the session check fails', () => {
    state.session = { data: null, isPending: false, error: new Error('network failure') };
    render(<QueryClientProvider client={new QueryClient()}><Authentication>Private workspace</Authentication></QueryClientProvider>);
    expect(screen.getByRole('alert').textContent).toContain('Authentication temporarily unavailable');
    expect(screen.queryByText('Private workspace')).toBeNull();
    expect(state.replace).not.toHaveBeenCalled();
  });
});
