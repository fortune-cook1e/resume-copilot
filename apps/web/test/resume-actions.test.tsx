import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { defaultResumeData, updateResumeSchema } from '@resume-copilot/contracts';
import ModuleHeader from '@/components/resume/ResumeEditor/components/ModuleHeader';
import { useResumeStore } from '@/stores/resume-store';
import type { ResumeData } from '@/types/resume';
import { ResumeCard } from '@/components/dashboard/ResumeCard';
import RichTextEditor from '@/components/resume/ResumeEditor/components/RichTextEditor';
import ResumeEditor from '@/components/resume/ResumeEditor';
import ResumeDocument from '@/components/resume/ResumeDocument';
import type { EditorSelection } from '@/types/resume/editor';
import { resumeDataSchema as editorDataSchema } from '@/types/resume/resume';

const api = vi.hoisted(() => ({ update: vi.fn(), remove: vi.fn(), create: vi.fn() }));
vi.mock('@/services/resume', () => ({ updateResume: api.update, deleteResume: api.remove, createResume: api.create }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

beforeEach(() => {
  vi.useFakeTimers();
  api.update.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  useResumeStore.getState().reset();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});

it('retains print order through the save contract while accepting documents without ordering metadata', () => {
  const data = { ...structuredClone(defaultResumeData), sectionOrder: ['experience', 'education', 'skills', 'projects'] };
  expect(updateResumeSchema.parse({ data }).data).toEqual(data);
  expect(updateResumeSchema.parse({ data: defaultResumeData }).data).toEqual(defaultResumeData);
  expect(editorDataSchema.parse(data)).toEqual(data);
  expect(editorDataSchema.parse(defaultResumeData)).toEqual(defaultResumeData);
});

it('retains a custom section on cancel and removes it only after an accessible confirmation', async () => {
  const data = structuredClone(defaultResumeData) as ResumeData;
  data.modules['custom-volunteer'] = { id: 'custom-volunteer', name: 'Volunteering', visible: true, items: [] };
  useResumeStore.getState().initializeResume({ id: 'draft', title: 'Resume', data });
  render(<ModuleHeader moduleId="custom-volunteer" />);
  fireEvent.keyDown(screen.getByRole('button', { name: 'Volunteering section actions' }), { key: 'Enter' });
  fireEvent.click(screen.getByRole('menuitem', { name: 'Delete section' }));
  expect(screen.getByRole('alertdialog', { name: 'Delete section?' })).toBeTruthy();
  expect(useResumeStore.getState().resume?.modules['custom-volunteer']).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(useResumeStore.getState().isDirty).toBe(false);
  fireEvent.keyDown(screen.getByRole('button', { name: 'Volunteering section actions' }), { key: 'Enter' });
  fireEvent.click(screen.getByRole('menuitem', { name: 'Delete section' }));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Delete section' })); });
  expect(useResumeStore.getState().resume?.modules['custom-volunteer']).toBeUndefined();
  expect(useResumeStore.getState().isDirty).toBe(true);
});

it('cancels resume deletion without a request and retains the confirmation after an API failure', async () => {
  const onDeleted = vi.fn();
  api.remove.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined);
  render(<ResumeCard resume={{ id: 'resume-one', title: 'Frontend resume', description: '', visibility: 'private', createdAt: '2026-10-08', updatedAt: '2026-10-08' }} onDeleted={onDeleted} />);
  const openDelete = () => {
    const trigger = screen.getByRole('button', { name: 'Resume actions' });
    fireEvent.keyDown(trigger, { key: 'Enter' });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
  };
  openDelete();
  expect(screen.getByRole('alertdialog', { name: 'Delete resume?' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(api.remove).not.toHaveBeenCalled();
  openDelete();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Delete resume' })); });
  expect(screen.getByRole('alert').textContent).toContain('Could not delete');
  expect(onDeleted).not.toHaveBeenCalled();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Delete resume' })); });
  expect(api.remove).toHaveBeenCalledTimes(2);
  expect(onDeleted).toHaveBeenCalledTimes(1);
});

it('opens an accessible link editor and leaves the text unchanged when cancelled', () => {
  const onChange = vi.fn();
  render(<RichTextEditor value="Read more" onChange={onChange} />);
  fireEvent.click(screen.getByRole('button', { name: 'Link' }));
  expect(screen.getByRole('dialog', { name: 'Edit link' })).toBeTruthy();
  fireEvent.change(screen.getByRole('textbox', { name: 'URL' }), { target: { value: 'https://example.test' } });
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(onChange).not.toHaveBeenCalled();
});

it('adds a custom section without overwriting an existing section after a deletion', () => {
  const data = structuredClone(defaultResumeData) as ResumeData;
  data.modules['custom-1'] = { id: 'custom-1', name: 'Languages', visible: true, items: [] };
  data.modules['custom-3'] = { id: 'custom-3', name: 'Volunteering', visible: true, items: [] };
  useResumeStore.getState().initializeResume({ id: 'draft', title: 'Resume', data });
  render(<EditingWorkspace />);
  addCustom('Profiles');
  expect(useResumeStore.getState().resume?.modules['custom-3'].name).toBe('Volunteering');
  expect(Object.keys(useResumeStore.getState().resume!.modules).filter(id => id.startsWith('custom-'))).toHaveLength(3);
});

function addCustom(type: string) {
  fireEvent.keyDown(screen.getByRole('button', { name: 'Add section' }), { key: 'Enter' });
  fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Custom section' }), { key: 'ArrowRight' });
  const menu = screen.getByText('What goes in it?').closest('[role="menu"]') as HTMLElement;
  fireEvent.click(within(menu).getByRole('menuitem', { name: type }));
}

function EditingWorkspace() {
  const [selection, onSelect] = useState<EditorSelection | null>({ sectionId: 'basics' });
  return <><ResumeEditor selection={selection} onSelect={onSelect} /><div data-testid="preview"><ResumeDocument selection={selection} onSelect={onSelect} /></div></>;
}

it('offers the complete section catalog and saves a new language in the same draft used by preview and print', async () => {
  useResumeStore.getState().initializeResume({ id: 'draft', title: 'Resume', data: structuredClone(defaultResumeData) as ResumeData });
  render(<EditingWorkspace />);
  fireEvent.keyDown(screen.getByRole('button', { name: 'Add section' }), { key: 'Enter' });
  for (const title of ['Summary', 'Profiles', 'Experience', 'Education', 'Projects', 'Skills', 'Languages', 'Interests', 'Awards', 'Certifications', 'Publications', 'Volunteer', 'References']) {
    expect(screen.getByRole('menuitem', { name: title })).toBeTruthy();
  }
  fireEvent.click(screen.getByRole('menuitem', { name: 'Languages' }));
  fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'Swedish' } });
  fireEvent.change(screen.getByLabelText('Fluency'), { target: { value: 'Professional' } });
  expect(within(screen.getByTestId('preview')).getByRole('button', { name: 'Edit Swedish' }).textContent).toContain('Professional');
  await act(async () => { await vi.advanceTimersByTimeAsync(600); });
  const saved = updateResumeSchema.parse(api.update.mock.calls[0][1]);
  expect(saved.data?.modules.languages).toMatchObject({ items: [{ language: 'Swedish', fluency: 'Professional' }] });
});

it('keeps an unnamed entry editable but out of preview and print until content is entered', () => {
  useResumeStore.getState().initializeResume({ id: 'draft', title: 'Resume', data: structuredClone(defaultResumeData) as ResumeData });
  render(<EditingWorkspace />);
  fireEvent.keyDown(screen.getByRole('button', { name: 'Add section' }), { key: 'Enter' });
  fireEvent.click(screen.getByRole('menuitem', { name: 'Education' }));
  expect(screen.getByLabelText('School')).toBeTruthy();
  expect(within(screen.getByTestId('preview')).queryByText('Education')).toBeNull();
  fireEvent.change(screen.getByLabelText('School'), { target: { value: 'Example University' } });
  expect(within(screen.getByTestId('preview')).getByText('Education')).toBeTruthy();
});

it.each([
  ['Profiles', 'Network', 'GitHub', 'Username', 'example-dev', 'profiles'],
  ['Awards', 'Title', 'Design award', 'Awarder', 'Example Association', 'awards'],
  ['Certifications', 'Title', 'Cloud certification', 'Issuer', 'Example Academy', 'certifications'],
  ['Publications', 'Title', 'Example paper', 'Publisher', 'Example Journal', 'publications'],
  ['Volunteer', 'Organization', 'Example Foundation', 'Location', 'Stockholm', 'volunteer'],
  ['References', 'Name', 'Alex Example', 'Position', 'Engineering Manager', 'references'],
])('persists %s fields and renders the saved section in the print document', async (title, primary, value, secondary, detail, id) => {
  useResumeStore.getState().initializeResume({ id: 'draft', title: 'Resume', data: structuredClone(defaultResumeData) as ResumeData });
  const editor = render(<EditingWorkspace />);
  fireEvent.keyDown(screen.getByRole('button', { name: 'Add section' }), { key: 'Enter' });
  fireEvent.click(screen.getByRole('menuitem', { name: title }));
  fireEvent.change(screen.getByLabelText(primary), { target: { value } });
  fireEvent.change(screen.getByLabelText(secondary), { target: { value: detail } });
  fireEvent.change(screen.getByLabelText('Website'), { target: { value: 'https://example.test' } });
  await act(async () => { await vi.advanceTimersByTimeAsync(600); });
  const saved = updateResumeSchema.parse(api.update.mock.calls[0][1]).data as ResumeData;
  expect(saved.modules[id as keyof ResumeData['modules']]?.items).toHaveLength(1);
  editor.unmount();
  useResumeStore.getState().initializeResume({ id: 'draft', title: 'Resume', data: saved });
  const print = render(<ResumeDocument />);
  expect(within(print.container).getByText(value)).toBeTruthy();
  expect(within(print.container).getByText(detail)).toBeTruthy();
  expect(within(print.container).getByRole('link', { name: 'Link' }).getAttribute('href')).toBe('https://example.test');
});

it('edits keyword-based custom content without changing the built-in Skills section', async () => {
  const data = structuredClone(defaultResumeData) as ResumeData;
  data.modules.skills.items = [{ id: 'skill', visible: true, name: 'Frontend', level: 'Advanced', keywords: ['React'] }];
  useResumeStore.getState().initializeResume({ id: 'draft', title: 'Resume', data });
  const editor = render(<EditingWorkspace />);
  addCustom('Interests');
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Photography' } });
  fireEvent.change(screen.getByLabelText('Keywords'), { target: { value: 'Nature, Travel' } });
  fireEvent.keyDown(screen.getByLabelText('Keywords'), { key: 'Enter' });
  expect(useResumeStore.getState().resume?.modules.skills.items[0].keywords).toEqual(['React']);
  await act(async () => { await vi.advanceTimersByTimeAsync(600); });
  const saved = updateResumeSchema.parse(api.update.mock.calls[0][1]).data as ResumeData;
  editor.unmount();
  useResumeStore.getState().initializeResume({ id: 'draft', title: 'Resume', data: saved });
  const print = render(<ResumeDocument />);
  expect(within(print.container).getByText('Photography')).toBeTruthy();
  expect(within(print.container).getByText('Nature · Travel')).toBeTruthy();
});

it('reorders sections and entries by keyboard, then restores their print order from the saved document', async () => {
  const data = structuredClone(defaultResumeData) as ResumeData;
  data.modules.education.items = [{ id: 'school', visible: true, university: 'Example University', major: '', location: '', date: '', summary: '' }];
  data.modules.experience.items = ['First Studio', 'Second Studio'].map((company, index) => ({ id: 'job-' + index, visible: true, company, position: '', location: '', date: '', summary: '' }));
  useResumeStore.getState().initializeResume({ id: 'draft', title: 'Resume', data });
  const editor = render(<EditingWorkspace />);
  fireEvent.keyDown(screen.getByRole('button', { name: 'Experience', expanded: false }), { key: 'ArrowUp', altKey: true });
  expect(within(screen.getByTestId('preview')).getAllByRole('heading', { level: 2 }).map(node => node.textContent)).toEqual(['Experience', 'Education']);
  fireEvent.click(screen.getByRole('button', { name: 'Toggle Experience' }));
  fireEvent.keyDown(screen.getByRole('button', { name: 'Second Studio', expanded: false }), { key: 'ArrowUp', altKey: true });
  expect(within(screen.getByTestId('preview')).getAllByRole('button').map(node => node.getAttribute('aria-label'))).toEqual(['Edit basics', 'Edit Second Studio', 'Edit First Studio', 'Edit Example University']);
  await act(async () => { await vi.advanceTimersByTimeAsync(600); });
  const saved = updateResumeSchema.parse(api.update.mock.calls[0][1]).data as ResumeData;
  editor.unmount();
  useResumeStore.getState().initializeResume({ id: 'draft', title: 'Resume', data: saved });
  const print = render(<ResumeDocument />);
  expect(within(print.container).getAllByRole('heading', { level: 2 }).map(node => node.textContent)).toEqual(['Experience', 'Education']);
  expect(print.container.textContent!.indexOf('Second Studio')).toBeLessThan(print.container.textContent!.indexOf('First Studio'));
  expect(print.container.querySelector('[role="button"]')).toBeNull();
});

it('selects an entry from the preview, edits the authoritative draft inline, and retains edits when switching sections', async () => {
  const data = structuredClone(defaultResumeData) as ResumeData;
  data.modules.experience.items = [{ id: 'job', visible: true, company: 'Example Studio', position: 'Engineer', location: '', date: '', summary: '' }];
  data.modules.skills.items = [{ id: 'skill', visible: true, name: 'Frontend', level: 'Advanced', keywords: ['React'] }];
  useResumeStore.getState().initializeResume({ id: 'draft', title: 'Resume', data });
  render(<EditingWorkspace />);
  expect(screen.queryByLabelText('Company')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Edit Example Studio' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.change(screen.getByLabelText('Company'), { target: { value: 'Updated Studio' } });
  expect(useResumeStore.getState().resume?.modules.experience.items[0].company).toBe('Updated Studio');
  expect(screen.getByRole('button', { name: 'Edit Updated Studio' }).getAttribute('aria-pressed')).toBe('true');
  fireEvent.keyDown(screen.getByRole('button', { name: 'Edit Frontend' }), { key: 'Enter' });
  expect(screen.queryByLabelText('Company')).toBeNull();
  fireEvent.change(screen.getByLabelText('Keywords'), { target: { value: 'TypeScript' } });
  fireEvent.keyDown(screen.getByLabelText('Keywords'), { key: 'Enter' });
  expect(useResumeStore.getState().resume?.modules.skills.items[0].keywords).toEqual(['React', 'TypeScript']);
  fireEvent.click(screen.getByRole('button', { name: 'Edit Updated Studio' }));
  expect((screen.getByLabelText('Company') as HTMLInputElement).value).toBe('Updated Studio');
  await act(async () => { await vi.advanceTimersByTimeAsync(600); });
  expect(api.update).toHaveBeenCalledTimes(1);
  expect(api.update.mock.calls[0][1].data.modules.experience.items[0].company).toBe('Updated Studio');
});

it('adds typed entries directly to each section and keeps their inline values in the shared draft', () => {
  useResumeStore.getState().initializeResume({ id: 'draft', title: 'Resume', data: structuredClone(defaultResumeData) as ResumeData });
  render(<EditingWorkspace />);
  for (const [section, label, value] of [['Education', 'School', 'Example University'], ['Projects', 'Name', 'Example Project'], ['Skills', 'Name', 'Languages'], ['Experience', 'Company', 'Example Studio']]) {
    fireEvent.keyDown(screen.getByRole('button', { name: 'Add section' }), { key: 'Enter' });
    fireEvent.click(screen.getByRole('menuitem', { name: section }));
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
    expect(within(screen.getByTestId('preview')).getByRole('button', { name: `Edit ${value}` })).toBeTruthy();
  }
  addCustom('Volunteer');
  fireEvent.change(screen.getByLabelText('Organization'), { target: { value: 'Volunteer work' } });
  fireEvent.change(screen.getByLabelText('Website'), { target: { value: 'https://example.test' } });
  expect(within(screen.getByTestId('preview')).getByRole('button', { name: 'Edit Volunteer work' })).toBeTruthy();
  expect(within(screen.getByTestId('preview')).getByRole('link', { name: 'Link' }).getAttribute('href')).toBe('https://example.test');
});

it('keeps selection controls out of the print document and hides entries without losing saved content', () => {
  const data = structuredClone(defaultResumeData) as ResumeData;
  data.modules.experience.items = [{ id: 'job', visible: true, company: 'Example Studio', position: 'Engineer', location: '', date: '', summary: '' }];
  useResumeStore.getState().initializeResume({ id: 'draft', title: 'Resume', data });
  const print = render(<ResumeDocument />);
  expect(print.container.querySelector('[role="button"]')).toBeNull();
  expect(print.container.querySelector('.resume-preview-block')).toBeNull();
  print.unmount();
  render(<EditingWorkspace />);
  fireEvent.click(screen.getByRole('button', { name: 'Edit Example Studio' }));
  fireEvent.keyDown(screen.getByRole('button', { name: 'Open menu' }), { key: 'Enter' });
  fireEvent.click(screen.getByRole('menuitem', { name: 'Hide' }));
  expect(within(screen.getByTestId('preview')).queryByText('Example Studio')).toBeNull();
  expect(useResumeStore.getState().resume?.modules.experience.items[0].company).toBe('Example Studio');
  expect(useResumeStore.getState().resume?.modules.experience.items[0].visible).toBe(false);
});
