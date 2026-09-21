'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TurndownService from 'turndown';
import { marked } from 'marked';
import { Button } from '@/components/ui/button';
import { Sparkles, Check, X, Loader2 } from 'lucide-react';
import { polishText } from '@/services/ai';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const markdownToHtml = (markdown: string) => (marked.parse(markdown || '') as string) || '';

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const lastValueRef = useRef(value);
  const turndownService = useMemo(() => new TurndownService({ bulletListMarker: '-' }), []);
  const [isPolishing, setIsPolishing] = useState(false);
  const [comparison, setComparison] = useState<{ original: string; polished: string } | null>(null);

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

  const handlePolish = async () => {
    if (!editor || isPolishing) return;
    const html = editor.getHTML();
    const markdown = turndownService.turndown(html).trim();
    if (!markdown) return;

    setIsPolishing(true);
    try {
      const polished = await polishText(markdown);
      setComparison({ original: markdown, polished });
    } catch (err) {
      console.error('AI polish failed:', err);
    } finally {
      setIsPolishing(false);
    }
  };

  const handleAccept = () => {
    if (!editor || !comparison) return;
    editor.commands.setContent(markdownToHtml(comparison.polished), false);
    lastValueRef.current = comparison.polished;
    onChange(comparison.polished);
    setComparison(null);
  };

  const handleDiscard = () => {
    setComparison(null);
  };

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
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-muted/30 px-2 py-1.5">
        <Button
          type="button"
          variant={editor?.isActive('bold') ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          disabled={!editor || !!comparison}
        >
          Bold
        </Button>
        <Button
          type="button"
          variant={editor?.isActive('italic') ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          disabled={!editor || !!comparison}
        >
          Italic
        </Button>
        <Button
          type="button"
          variant={editor?.isActive('bulletList') ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          disabled={!editor || !!comparison}
        >
          Bullet
        </Button>
        <Button
          type="button"
          variant={editor?.isActive('orderedList') ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          disabled={!editor || !!comparison}
        >
          Numbered
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={setLink}
          disabled={!editor || !!comparison}
        >
          Link
        </Button>

        <div className="ml-auto">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handlePolish}
            disabled={!editor || isPolishing || !!comparison}
            className="h-7 gap-1 px-2 text-xs text-purple-600 hover:bg-purple-50 hover:text-purple-700 disabled:opacity-40"
          >
            {isPolishing ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Polishing...
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3" />
                AI Polish
              </>
            )}
          </Button>
        </div>
      </div>

      {placeholder && !editor?.getText() && !comparison && (
        <div className="text-sm text-muted-foreground">{placeholder}</div>
      )}

      {comparison ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Before</p>
              <div
                className="min-h-28 rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1"
                dangerouslySetInnerHTML={{ __html: markdownToHtml(comparison.original) }}
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-purple-600">After (AI)</p>
              <div
                className="min-h-28 rounded-md border border-purple-200 bg-purple-50/40 px-3 py-2 text-sm [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1"
                dangerouslySetInnerHTML={{ __html: markdownToHtml(comparison.polished) }}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDiscard}
              className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              <X className="h-3.5 w-3.5" />
              Discard
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAccept}
              className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Check className="h-3.5 w-3.5" />
              Accept
            </Button>
          </div>
        </div>
      ) : (
        <EditorContent editor={editor} />
      )}
    </div>
  );
}
