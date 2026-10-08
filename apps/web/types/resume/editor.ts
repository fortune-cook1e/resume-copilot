import type { Modules } from './modules';

// Transient UI state, never part of the saved resume.
export type EditorSelection = { sectionId: 'basics' | keyof Modules; itemId?: string };
export interface EditorSelectionProps {
  selection?: EditorSelection | null;
  onSelect?: (selection: EditorSelection | null) => void;
}
