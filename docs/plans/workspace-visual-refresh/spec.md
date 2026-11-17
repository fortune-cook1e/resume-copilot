# Home, sign-in, and Dashboard visual refresh

## Problem statement

The homepage gives visitors several lines of explanation before they see the product. The sign-in page feels disconnected from the homepage. In the Dashboard, repeated labels and descriptions compete with the resumes users came to open.

## Solution

Use a shared warm-white palette, dark text, a single accent color, and the existing dog logo. Give each screen one prominent action and use resume previews to show what the product makes.

## User stories

1. As a visitor, I want to see what Resume Copilot makes and how to start at a glance.
2. As a returning user, I want the homepage action to take me to my resumes when I am already signed in.
3. As a mobile visitor, I want to sign in without scrolling past a decorative preview.
4. As a user connecting ChatGPT, I want to know why I am being asked to sign in and continue to the existing consent flow.
5. As a user managing several resumes, I want to scan their templates, names, and edit dates quickly.
6. As a user managing a resume, I want to open it from its card and find secondary actions in one menu.

## Implementation decisions

- **Homepage**. Lead with ChatGPT editing through Resume Copilot MCP. Show a fictional one-page Onyx resume with summary, work, projects, education, and skills. On desktop, put the sample to the left of the headline and fit common laptop heights without an extra scroll. On mobile, put the headline first. The interactive demo compares the original Field Notes description with the two bullets saved through MCP. The demonstration does not make network calls. Keep **Build a resume** as the primary action. Keep the logo, GitHub link, and sign-in entry in the header. Route the primary action to sign-in for guests and to the resume list for signed-in users. Remove development notices and repeated explanatory copy.
- **Sign-in**. Put **Sign in** and **Continue with Google** to the right of a collage of overlapping resume sheets and one prompt showing the ChatGPT connection on desktop. Use the Google mark on the button. Hide the preview on mobile. Keep loading and error feedback, and show a short explanation when sign-in starts from ChatGPT.
- **Dashboard**. Refresh shared navigation and the Resumes page. Use a compact, responsive grid with a portrait sheet in A4 proportions, a thin border, and a light shadow. Show each resume’s own name, headline, and first visible sections on the sheet. Use the selected template and theme to style the cover. Show a document icon if there is no cover content. Show the actual name and last edited time below each thumbnail. Make the card's main link open the editor and put existing management actions in a separate, keyboard-accessible menu. Keep **New resume** prominent, including in the empty state.
- Reuse existing shadcn/ui controls and preserve keyboard focus, responsive navigation, and necessary loading, empty, and error feedback. Keep the refreshed styles scoped to the affected screens.
- The owner-scoped list adds an optional template identifier and bounded text preview. It excludes hidden sections and entries and stops at a manual page break. The preview uses HTML and a crop, with no PDF render or separate detail request per card. The list omits the full document, and storage needs no migration.
- Keep Profile and ChatGPT connection content and flows as they are. Their routes inherit the refreshed Dashboard navigation. Keep the resume editor, resume document, and PDF export outside this change.

## Acceptance

- Review desktop and mobile layouts for hierarchy, legibility, overflow, and a clear primary action. Check the Dashboard with an empty list and with multiple resumes across different templates.
- Extend the existing browser journey where needed to verify homepage routing in both session states, Google sign-in entry, resume creation, and opening an existing resume. Use the existing authentication coverage for errors and the ChatGPT continuation path.
- Verify the card link and action menu separately by keyboard. Confirm the cover shows the candidate’s own content and selected template. Verify that the Dashboard grid does not render PDFs.
