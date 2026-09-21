import type { ResumeData } from '@/types/resume';

/** Extract a flat skill list from the resume data JSON */
export function extractSkills(data: ResumeData): string[] {
  const skills: string[] = [];

  // From skills module
  const skillItems = data?.modules?.skills?.items ?? [];
  for (const group of skillItems) {
    if (Array.isArray(group.keywords)) {
      skills.push(...group.keywords);
    }
    if (group.name) skills.push(group.name);
  }

  // From experience technical environments (if present)
  const expItems = data?.modules?.experience?.items ?? [];
  for (const exp of expItems) {
    const keywords = (exp as Record<string, unknown>).keywords;
    if (Array.isArray(keywords)) skills.push(...(keywords as string[]));
  }

  return [...new Set(skills.map(s => s.toLowerCase().trim()).filter(Boolean))];
}

/** Rough total years of experience derived from experience entries */
export function extractYears(data: ResumeData): number {
  const expItems = data?.modules?.experience?.items ?? [];
  // Fallback: count number of experience entries × 1.5 as rough estimate
  // A more accurate approach requires date parsing per entry
  return expItems.length * 1.5;
}

/**
 * Build a plain-text representation of the entire resume for AI matching.
 * Serializes: basics → skills → experience → education → projects → custom modules.
 */
export function buildResumeText(data: ResumeData): string {
  const parts: string[] = [];

  // Basics
  const b = data?.basics;
  if (b) {
    const basics = [b.name, b.headline, b.location].filter(Boolean).join(' | ');
    if (basics) parts.push(basics);
  }

  // Skills
  const skillItems = data?.modules?.skills?.items ?? [];
  if (skillItems.length) {
    const lines = skillItems
      .map(g => [g.name, ...(g.keywords ?? [])].filter(Boolean).join(', '))
      .filter(Boolean);
    if (lines.length) parts.push('Skills:\n' + lines.join('\n'));
  }

  // Experience
  const expItems = data?.modules?.experience?.items ?? [];
  if (expItems.length) {
    const lines = expItems.map(exp => {
      const header = [exp.position, exp.company, exp.location, exp.date]
        .filter(Boolean)
        .join(' | ');
      return [header, exp.summary].filter(Boolean).join('\n');
    });
    parts.push('Experience:\n' + lines.join('\n\n'));
  }

  // Education
  const eduItems = data?.modules?.education?.items ?? [];
  if (eduItems.length) {
    const lines = eduItems.map(edu => {
      const header = [edu.major, edu.university, edu.location, edu.date]
        .filter(Boolean)
        .join(' | ');
      return [header, edu.summary].filter(Boolean).join('\n');
    });
    parts.push('Education:\n' + lines.join('\n\n'));
  }

  // Projects
  const projectItems = data?.modules?.projects?.items ?? [];
  if (projectItems.length) {
    const lines = projectItems.map(p => {
      const header = [p.name, p.description, p.date].filter(Boolean).join(' | ');
      return [header, p.summary].filter(Boolean).join('\n');
    });
    parts.push('Projects:\n' + lines.join('\n\n'));
  }

  // Custom modules
  const modules = data?.modules ?? {};
  for (const [key, mod] of Object.entries(modules)) {
    if (!key.startsWith('custom-') || !mod?.visible) continue;
    const items = (mod as { name?: string; items?: Array<Record<string, unknown>> }).items ?? [];
    if (!items.length) continue;
    const lines = items.map(item => {
      const header = [item.name, item.description, item.location, item.date]
        .filter(Boolean)
        .join(' | ');
      return [header, item.summary].filter(Boolean).join('\n');
    });
    parts.push(`${(mod as { name?: string }).name ?? key}:\n` + lines.join('\n\n'));
  }

  return parts.join('\n\n');
}
