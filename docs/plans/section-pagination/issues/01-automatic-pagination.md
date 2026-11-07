# 01: Automatic pagination with matching preview and PDF

**What to build:** A resume author can edit a long resume, review separate A4 pages stacked vertically, save and reopen the document, and export a PDF with the same content and page boundaries. Long sections and individual rich-text entries continue automatically across pages without losing content. This establishes the shared pagination behavior before adding author-controlled page breaks.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Short content occupies one A4 page; longer content produces separate A4 pages arranged vertically in the preview, with no unnecessary empty trailing page.
- [x] A section longer than one full page continues across pages in reading order. A single rich-text entry longer than one page also continues without clipping, duplication, missing text, or repeated blank-page generation.
- [x] Built-in, optional content, typed custom, and legacy custom sections retain their current content, visibility, and global order. Hidden sections and unfinished entries without printable content contribute no printed content or empty pages.
- [x] Basics remains at the beginning of the first page, outside section ordering, and does not repeat as a continuation-page header.
- [x] Editing content recomputes page boundaries from settled layout and font metrics. Zooming or resizing the preview changes presentation without changing the A4 content geometry or saved document.
- [x] Section and entry selection still opens the correct editor after pagination; rich-text formatting and links remain intact across continuation pages.
- [x] Preview and print use the same pagination responsibility and layout inputs. PDF capture waits for required fonts and current pagination to settle; preview gaps and shadows do not become extra PDF space.
- [x] A real browser journey saves a synthetic long resume, reopens it through the existing persistence boundary, and exports the same revision. Compare the preview and actual PDF using page count, unique content-marker placement, section boundaries, continuation order, and page content bounds. Every expected marker appears exactly once.
- [x] Existing resumes with no pagination settings remain editable and printable in their established content order. Existing save-before-export failure and pending-save behavior continue to pass their relevant checks.
- [x] The shared rendering mechanism is demonstrated with representative overflow content before being extended across all section renderers. The result uses the current dependable template and existing document/API ownership without introducing stored physical page assignments.

## Comments

- Parent requirements: Section pagination spec. This slice delivers automatic document flow; the two section-menu controls are delivered by the subsequent tickets.
- Use TDD at the observable rendering seam. Establish one browser suite for the feature and extend it in subsequent tickets; do not introduce a parallel mocked pagination suite that duplicates its physical-page assertions. Existing component suites should cover only distinct state or interaction regressions.
- Keep the project's intentionally stopped containers stopped. Use synthetic content and an explicitly selected isolated test setup for persistence checks. Independent rendering evidence can be collected first, but fixture-only checks or a mocked PDF response do not satisfy real save/reopen/export acceptance. Leave required acceptance criteria pending if that environment is unavailable.
- This ticket does not authorize installing dependencies, replacing the rendering engine, running migrations, starting containers, committing, or pushing. If existing facilities cannot establish preview/PDF parity, report the specific evidence and required decision before expanding the implementation.

- Acceptance: real Chromium/PDF rendering, authenticated save/reopen/download, long-to-short reflow, and ordered-list continuation passed in 3 browser tests against the isolated test database. Initial missing pages and restarted list numbering were observed failing before implementation/fix. Existing Web tests passed 61/61; Web production build, typecheck, lint (5 existing warnings), and scoped formatting passed. No migration or dependency installation was performed.
