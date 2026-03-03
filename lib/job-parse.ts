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
 * Build a plain-text representation of the resume for semantic matching.
 * Combines: basics headline + experience summaries + project summaries.
 */
export function buildResumeText(data: ResumeData): string {
  const parts: string[] = [];

  // Basics headline
  const headline = data?.basics?.headline;
  if (headline) parts.push(headline);

  // Experience: "position at company — summary"
  const expItems = data?.modules?.experience?.items ?? [];
  for (const exp of expItems) {
    const line = [exp.position, exp.company, exp.summary].filter(Boolean).join(' ');
    if (line) parts.push(line);
  }

  // Projects: "name — description — summary"
  const projectItems = data?.modules?.projects?.items ?? [];
  for (const project of projectItems) {
    const line = [project.name, project.description, project.summary]
      .filter(Boolean)
      .join(' ');
    if (line) parts.push(line);
  }

  return parts.join('\n');
}
