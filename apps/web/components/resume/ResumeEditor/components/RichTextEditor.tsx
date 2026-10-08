'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TurndownService from 'turndown';
import { marked } from 'marked';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const markdownToHtml = (markdown: string) => (marked.parse(markdown || '') as string) || '';

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const lastValueRef = useRef(value);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkError, setLinkError] = useState(false);
  const linkInputId = useId();
  const turndownService = useMemo(() => new TurndownService({ bulletListMarker: '-' }), []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),
    ],
    content: markdownToHtml(value),
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-label': 'Summary',
        'aria-multiline': 'true',
        class:
          'min-h-28 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const markdown = turndownService.turndown(html).trim();
      lastValueRef.current = markdown;
      onChange(markdown);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (value === lastValueRef.current) return;
    editor.commands.setContent(markdownToHtml(value), false);
    lastValueRef.current = value;
  }, [editor, value]);

  const openLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    setLinkUrl(previousUrl || '');
    setLinkError(false);
  };

  return (
    <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
      <div className="space-y-2">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-muted/30 px-2 py-1.5">
          <Button
            type="button"
            variant={editor?.isActive('bold') ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            disabled={!editor}
          >
            Bold
          </Button>
          <Button
            type="button"
            variant={editor?.isActive('italic') ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            disabled={!editor}
          >
            Italic
          </Button>
          <Button
            type="button"
            variant={editor?.isActive('bulletList') ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            disabled={!editor}
          >
            Bullet
          </Button>
          <Button
            type="button"
            variant={editor?.isActive('orderedList') ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            disabled={!editor}
          >
            Numbered
          </Button>
          <DialogTrigger asChild><Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={openLink}
            disabled={!editor}
          >
            Link
          </Button></DialogTrigger>
        </div>

        {placeholder && !editor?.getText() && (
          <div className="text-sm text-muted-foreground">{placeholder}</div>
        )}

        <EditorContent editor={editor} />
      </div>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit link</DialogTitle>
          <DialogDescription>Apply a URL to the selected text. Leave it empty to remove an existing link.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={event => {
          event.preventDefault();
          if (!editor) return;
          const href = linkUrl.trim();
          const chain = editor.chain().focus().extendMarkRange('link');
          const applied = href ? chain.setLink({ href }).run() : chain.unsetLink().run();
          if (!applied) { setLinkError(true); return; }
          setLinkOpen(false);
        }}>
          <div className="space-y-2">
            <Label htmlFor={linkInputId}>URL</Label>
            <Input id={linkInputId} inputMode="url" autoComplete="off" value={linkUrl} onChange={event => { setLinkUrl(event.target.value); setLinkError(false); }} placeholder="https://example.com" autoFocus />
            {linkError ? <p role="alert" className="text-sm text-destructive">Could not apply this link. Check the URL and try again.</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLinkOpen(false)}>Cancel</Button>
            <Button type="submit">{linkUrl.trim() ? 'Apply link' : 'Remove link'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
