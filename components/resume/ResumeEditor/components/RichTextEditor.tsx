'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TurndownService from 'turndown';
import { marked } from 'marked';
import { Button } from '@/components/ui/button';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const markdownToHtml = (markdown: string) => (marked.parse(markdown || '') as string) || '';

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const lastValueRef = useRef(value);
  const turndownService = useMemo(() => new TurndownService({ bulletListMarker: '-' }), []);

  const editor = useEditor({
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

  const setLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Enter URL', previousUrl || '');
    if (url === null) return;
    if (!url) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={editor?.isActive('bold') ? 'default' : 'outline'}
          size="sm"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          disabled={!editor}
        >
          Bold
        </Button>
        <Button
          type="button"
          variant={editor?.isActive('italic') ? 'default' : 'outline'}
          size="sm"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          disabled={!editor}
        >
          Italic
        </Button>
        <Button
          type="button"
          variant={editor?.isActive('bulletList') ? 'default' : 'outline'}
          size="sm"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          disabled={!editor}
        >
          Bullet
        </Button>
        <Button
          type="button"
          variant={editor?.isActive('orderedList') ? 'default' : 'outline'}
          size="sm"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          disabled={!editor}
        >
          Numbered
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={setLink} disabled={!editor}>
          Link
        </Button>
      </div>

      {placeholder && !editor?.getText() && (
        <div className="text-sm text-muted-foreground">{placeholder}</div>
      )}

      <EditorContent editor={editor} />
    </div>
  );
}
