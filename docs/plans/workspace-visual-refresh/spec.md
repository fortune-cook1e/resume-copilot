# Home, sign-in, and Dashboard visual refresh

## Problem statement

The homepage gives visitors several lines of explanation before they see the product. The sign-in page feels disconnected from the homepage. In the Dashboard, repeated labels and descriptions compete with the resumes users came to open.

## Solution

Home and sign-in follow the shared ORYZO palette and existing dog logo. The homepage explains the workflow through a character-driven illustrated story, with one creation action at the end of the story. Dashboard theme adoption remains a separate step.

The subsequent ORYZO rollout follows [the application design system](../../../apps/web/DESIGN.md). The homepage uses its scoped dark palette, Inter typography, dashed separators and six original hand-drawn illustrations derived from the approved story concept. Sign-in now uses the same theme with a restrained resume collage, a focused Google action and preserved pending/error/ChatGPT continuation states. Dashboard adoption follows separately.

## User stories

1. As a visitor, I want to see what Resume Copilot makes and how to start at a glance.
2. As a returning user, I want the homepage action to take me to my resumes when I am already signed in.
3. As a mobile visitor, I want to sign in without scrolling past a decorative preview.
4. As a user connecting ChatGPT, I want to know why I am being asked to sign in and continue to the existing consent flow.
5. As a user managing several resumes, I want to scan their templates, names, and edit dates quickly.
6. As a user managing a resume, I want to open it from its card and find secondary actions in one menu.

## Implementation decisions

- **Homepage**. Address users of MCP-capable AI tools, with ChatGPT labelled as an example. The approved six-scene story shows one character struggling with a blank resume, discovering Resume Copilot, connecting an AI tool, entering a frontend-developer prompt, receiving a resume, then choosing a template and exporting PDF. Original generated illustrations use consistent black ink, ivory paper and small orange accents; six local WebP assets total about 1.2 MB. Only the opening scene has a visible compact heading; subsequent scene headings are screen-reader-only. Preserve the existing dog logo, GitHub link, session-aware header entry and a single **Create your resume** action in the final scene. Desktop native scrolling blends the scenes without capturing the wheel; the fixed bottom bar and numbered steps are removed. Inactive scenes leave the accessibility tree. Mobile, short screens, reduced motion and no-JavaScript rendering keep all six scenes in document order; the ending link works without JavaScript. The illustrations make no MCP connections, writes or downloads. Guest and authenticated entry destinations remain unchanged.
- **Sign-in**. Put **Sign in** and **Continue with Google** to the right of a collage of overlapping resume sheets and one prompt showing the ChatGPT connection on desktop. Use the Google mark on the button. Hide the preview on mobile. Keep loading and error feedback, and show a short explanation when sign-in starts from ChatGPT.
- **Dashboard**. Refresh shared navigation and the Resumes page. Use an auto-filling responsive grid with compact cards capped at 300px wide and 20px horizontal gaps with a portrait sheet in A4 proportions, a thin border, and a light shadow. Show the actual first PDF page, using the same document, fonts, theme, photo and pagination as the editor and export. Show a skeleton while generating and a document icon on failure; a blank resume remains a blank sheet. Show the actual name and last edited time below each thumbnail. Make the card's main link open the editor and put existing management actions in a separate, keyboard-accessible menu. Keep **New resume** prominent, including in the empty state.
- Reuse existing shadcn/ui controls and preserve keyboard focus, responsive navigation, and necessary loading, empty, and error feedback. Keep the refreshed styles scoped to the affected screens.
- The owner-scoped list adds an optional template identifier and bounded text preview. It excludes hidden sections and entries and stops at a manual page break. The list still omits the full document. Near-visible cards fetch their owner-authorized detail and lazily load the browser renderer. One serial queue bounds layout and rasterization to one job at a time. Cache bounded 840px first-page images in TanStack Query for five minutes, keyed by account, resume ID and saved timestamp; identity changes clear authenticated caches. Each job owns and releases its hidden document, workers and canvas, and observes cancellation and a render deadline. Independent documents receive explicit data without modifying the active editor draft. No server PDF service, storage migration, dependency or persistent thumbnail store is added. This follows [Reactive Resume’s thumbnail approach](https://github.com/reactive-resume/reactive-resume/blob/main/apps/web/src/features/documents/resume-thumbnail.tsx).
- Keep Profile and ChatGPT connection content and flows as they are. Their routes inherit the refreshed Dashboard navigation. Keep the editor UI and PDF layout unchanged; the shared document gains an explicit independent-data input for covers.

## Acceptance

- Review desktop and mobile layouts for hierarchy, legibility, overflow, and a clear primary action. Check the Dashboard with an empty list and with multiple resumes across different templates.
- Verify all six scenes and image files, native forward / reverse scrolling, complete artwork visibility, a creation entry appearing only in the final animated scene, reduced-motion / mobile / no-JavaScript fallbacks, and both session-state entry destinations. Extend the existing browser journey where needed to verify homepage routing in both session states, Google sign-in entry, resume creation, and opening an existing resume. Use the existing authentication coverage for errors and the ChatGPT continuation path.
- Verify the card link and action menu separately by keyboard. Confirm the cover shows the candidate’s own content and selected template. Verify the cover is a populated first-page image in A4 proportions, responsive sizing, serial generation, cancellation and editor draft isolation. Existing filters, tags and list controls remain outside this card-only follow-up.
