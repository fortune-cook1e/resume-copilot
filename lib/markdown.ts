'use client';

import DOMPurify from 'dompurify';
import { marked } from 'marked';

export const renderMarkdown = (markdown: string) => {
  const rawHtml = marked.parse(markdown || '') as string;

  if (typeof window === 'undefined') {
    return rawHtml;
  }

  return DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });
};
