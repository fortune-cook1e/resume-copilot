# Section pagination

The editor's primary rendering path now uses Forme in a browser Worker. PDF.js displays the same PDF bytes used for download. Browser-generated PDFs keep each list marker with the start of its item, including when a long item continues on another page. Existing pagination flags and draft save semantics still define the expected behavior. The DOM layout and Chromium path described below applies to the standalone print route and compatibility rendering.

## Problem Statement

Resume authors cannot currently control where sections begin on a new PDF page or keep a short section together. The builder presents one growing document with a guide at the first A4 boundary, while Chromium determines PDF pagination separately. Authors cannot reliably judge the final page boundaries from the preview.

Authors need section-level control over page breaks, automatic continuation for long content, and a preview whose pages match the exported PDF. They should not need to maintain page assignments as their content changes.

## Solution

Keep the existing ordered section list. Add two independent, stateful options to each section's actions menu:

- **Keep on one page**: keep the section together when it can fit within one page's printable content area. If the current page has insufficient remaining space, move the whole section to the next page. If the section itself exceeds one page, allow it to continue across pages.
- **Start on a new page**: begin the section on a fresh page, even when the preceding page has room. If the section is already at the start of a page, do not insert an additional blank page. This setting constrains the section's start, not its total length.

Both options default to off and may be enabled together. Section order and content continue to determine the document flow. Following sections fill available space in that flow unless their own rules require a break.

The right-hand preview displays separate A4 pages vertically from top to bottom in a fixed, centered document view. Mouse-wheel input scrolls this area without changing zoom, and dragging does not pan the document. The bottom minus/plus buttons adjust zoom, Fit shows the whole page within the current viewport, and the current percentage remains visible. The “A4 · Live preview” caption is not shown. Content automatically continues across pages without clipping or loss, and preview page boundaries match the exported PDF. Basics stays at the beginning of the first page and is not movable. The author does not create empty pages or assign sections to numbered pages.

## User Stories

1. As a resume author, I want to see each actual page separately in the preview, so that I can judge the document before exporting it.
2. As a resume author, I want preview pages arranged vertically in reading order, so that I can review a multi-page resume naturally.
3. As a resume author, I want a section to start on a new page even when the previous page has space, so that I can choose a deliberate transition in my resume.
4. As a resume author, I want to turn off a section's forced page break, so that the section can flow after the preceding content again.
5. As a resume author, I want to keep a section together when it fits within a single page, so that a short section is not unnecessarily split.
6. As a resume author, I want a kept-together section to stay on the current page when it fits, so that I do not waste usable space.
7. As a resume author, I want a kept-together section to move to the next page when the remaining space is insufficient, so that the whole section remains readable together.
8. As a resume author, I want an oversized section to continue across pages despite its keep-together setting, so that all my content remains visible.
9. As a resume author, I want to combine the two settings, so that a section can deliberately start on a fresh page and remain together when possible.
10. As a resume author, I want long content to continue automatically onto subsequent pages, so that I do not need to assign each section to a page manually.
11. As a resume author, I want to control both options through the existing section actions menu, so that pagination controls are available where I already manage sections.
12. As a resume author, I want each menu option to show whether it is enabled, so that I can understand the section's current behavior.
13. As a keyboard user, I want to operate pagination options through the accessible section menu, so that I can adjust layout without dragging or using a pointer.
14. As a resume author, I want to reorder whole sections using the existing ordering controls, so that I can change the document's structure.
15. As a resume author, I want a section's pagination settings to remain attached to it after reordering, so that changing its position does not silently reset its layout rules.
16. As a resume author, I want pagination settings to survive autosave and reopening the resume, so that my layout decisions are retained.
17. As a resume author, I want pagination settings to work for built-in, typed custom, and legacy custom sections, so that all my existing sections can use the same controls.
18. As a resume author, I want hidden sections to contribute neither content nor page breaks, so that hidden information does not create blank pages.
19. As a resume author, I want sections without printable content to contribute no page breaks, so that empty drafts do not disrupt the document.
20. As a resume author, I want a section already at a page boundary to avoid another forced break, so that I do not get an unexpected blank page.
21. As a resume author, I want Basics to appear only at the beginning of the first page and stay outside section ordering, so that my name and contact information retain their established position.
22. As a resume author, I want edits that change content height to update page boundaries, so that the preview remains useful while I write.
23. As a resume author, I want the exported PDF to contain the same content, order, and page boundaries as the preview of the same saved revision, so that the document I download matches what I reviewed.
24. As an existing resume owner, I want resumes without pagination settings to remain editable with both options off, so that adopting this feature does not introduce forced breaks or remove existing content.
25. As a resume author, I want export to continue waiting for my latest draft to save and to stop when saving fails, so that I do not download an older layout by mistake.
26. As a resume author, I want pagination to preserve links, rich text, and preview selection behavior, so that multi-page layout does not reduce the editor's existing usefulness.

## Implementation Decisions

- **Document ownership:** the shared resume contract owns the two boolean section settings, named `keepTogether` and `startOnNewPage`. They are backward-compatible additions on sections, including built-in, optional content, typed custom, and legacy custom sections. Missing values mean off; invalid non-boolean values are rejected through the existing validation boundary. Existing section identity, item schemas, and optional global section order remain intact.
- **Persistence:** keep the current resume document and authenticated create/read/update/export interfaces. The API validates the extended shared contract and persists it in the existing document data. No new endpoint, database table, database migration, or page-assignment resource is required for these settings.
- **Draft ownership:** the existing Zustand resume draft remains authoritative. Menu actions update that draft through the normal mutation and autosave path. The feature does not add a separate page store or a second editable copy of section content.
- **Derived pages:** physical pages and section fragments are rendering results derived from content, section order, typography, available A4 space, and the two settings. Do not persist physical page numbers, page containers, or duplicated sections as authoring state.
- **Menu interaction:** expose both options as independently checked menu actions on non-Basics sections. Enable and disable them without changing section content, visibility, or order. Preserve existing drag ordering, keyboard ordering, and move-up/down actions; do not introduce a move-to-page control or a separate page-management panel.
- **Ordering:** settings belong to stable section identities. Reordering changes the section's place in the flow and preserves both settings. Pagination never moves a section ahead of earlier visible content merely to fill a gap.
- **Break precedence:** ignore hidden sections and sections that produce no printable body content before applying pagination rules. An empty section heading alone does not warrant a page. For a printable section, honor a forced fresh-page start once, then keep the section together if it fits within one full page. Applying both rules must not create two consecutive breaks. A section already starting on a fresh page receives no additional break.
- **Empty and hidden content:** use the document's existing visibility and printable-content rules, including item visibility and unfinished entries. Inactive settings may remain saved on a hidden or empty section; they have no pagination effect until the section has visible printable content again.
- **Automatic overflow:** both options permit continuation when a section is taller than a full page's available content area. Preserve readable text and document order across fragments without clipping, duplication, lost text, or repeated empty-page retries. Ordinary line and block flow determines automatic continuation; individual entries are not manually assigned to pages.
- **Basics:** retain the existing Basics position before the ordered sections, only on the first page. Basics has no pagination menu or ordering handle. It does not repeat as a continuation-page header.
- **Shared rendering responsibility:** the Web document, page presentation, builder preview, and print surface must use one pagination responsibility and compatible layout inputs. Keep the existing reliable template, A4 size, and typography. Preview-only gaps and shadows must not change the content area or appear as extra PDF space. A print-only page-break rule combined with an independently growing screen document is insufficient to satisfy parity.
- **Rendering readiness:** page boundaries must be computed from final font metrics and current content, and recomputed when layout inputs change. The existing print-readiness contract must cover completed pagination and required font/layout readiness before the API captures the PDF. Merely mounting a nonempty document is not evidence that pagination has settled.
- **PDF ownership:** the API continues to own Chromium PDF generation using the Web print surface. The existing save-before-export barrier remains in force. The same saved revision and layout inputs must produce the preview's page count and section boundaries in the PDF.
- **Existing interactions:** pagination fragments must preserve section/item identity for preview selection and editing. The preview uses native scrolling with reserved space for the scaled document and no wheel/pinch zoom or drag-to-pan handler. Initialize the scale to fit the available width when the preview becomes measurable, then change it through the bottom minus/plus and Fit controls; Fit returns to the top of the fitted document, while resizing keeps the chosen scale. Zoom must not mutate saved settings or change A4 document geometry, and the shared source document remains stable during zoom updates.
- **Implementation mechanism:** use native browser layout to measure fragments against a fixed A4 content area. Keep the shared React document as the authoritative rendering source; derive visible pages from a detached snapshot using DOM ranges that retain ancestor markup. Choose word or complete grapheme boundaries for text continuation, retain ordered-list values, and forward preview selection through stable section/item identities. Preview and print use the same page projection. This reuses existing browser and Chromium facilities without a new rendering engine, runtime dependency, background service, or separate PDF template.

## Testing Decisions

- **Confirmed test boundary:** the user approved a real browser/PDF rendering acceptance boundary as the primary proof, with focused additions to existing component tests for distinct state, empty-content, and compatibility rules. This is not a request for a test file per component or production class.
- **Good tests observe behavior:** operate the public section controls, inspect the saved/reopened resume, observe actual page allocation and visible content, and inspect a real generated PDF. Do not treat a CSS class, a boolean in isolation, an internal helper call, or a mocked PDF response as proof of pagination.
- **Primary seam:** use the existing browser journey configuration for the editor-to-preview-to-export workflow. Keep the feature's new browser coverage together in one suite, with synthetic resume content and deterministic layout inputs. The representative journey enables settings, reorders a section, waits for save, reopens the resume, reviews vertically stacked pages, and exports the same revision.
- **Physical-page proof:** compare page count, unique content-marker placement, section start pages, and continuation order between the preview and the actual PDF. Verify that content stays within the page's content bounds and appears exactly once. A page-count assertion alone, a screen screenshot alone, or mocked layout heights are insufficient.
- **Distinct layout cases:** cover a short section with enough remaining space, a short section that only fits on the next page, a forced new-page start despite available space, both settings enabled, a section longer than a full page, hidden/empty content, and an already-satisfied page break. Include an oversized rich-text entry so an entry boundary cannot hide a clipping defect. These may share fixtures and the primary rendering seam rather than becoming separate unit/component/HTTP copies of the same assertions.
- **Existing component seam:** extend the editor-action suite that already checks section ordering, schema-parsed save payloads, draft reinitialization, and the shared print document. Cover independent menu checked states, persistence through reorder/save/reopen, and compatibility across section families. Reuse its current synthetic fixtures and public controls instead of adding parallel store tests for the same behavior.
- **Existing save/export seam:** retain the builder suite's coverage of failed saves, waiting for pending saves, and preventing stale or duplicate export. Add a pagination-specific assertion only if it catches a distinct regression those existing tests do not protect.
- **Viewport interaction seam:** use the real browser to verify wheel scrolling without scale changes, no drag panning, button zoom, Fit reset, the current percentage, retained scale on resize, and absence of the removed caption. A read-only public API fixture may supply synthetic content for this presentation-only scenario when the isolated database is unavailable; this does not establish authentication or persistence correctness. This replaces the former SDK-specific mocked zoom test.
- **Validation and compatibility:** exercise the public resume parsing/update boundary with old documents that omit both settings, documents using built-in and custom sections, and malformed setting types. Reuse existing contract-consuming tests where possible. Confirm no content or section-order information is lost during parsing and save/read round trips.
- **Runtime distinction:** current editor tests use a DOM simulation and mocked services; existing API PDF tests mock the renderer. Neither proves physical pagination or real persistence. The existing browser configuration starts Web but does not by itself supply authenticated API/database fixtures. Full acceptance requires an explicitly isolated setup and actual PDF rendering; fixture-only rendering checks must be reported separately from end-to-end persistence/export checks.
- **Environment constraints:** keep this project's intentionally stopped containers stopped. Planning does not authorize starting infrastructure, installing dependencies, or using another project's database. Rendering evidence that can be collected independently may proceed during implementation; database-backed acceptance remains deferred until the project's own explicitly selected isolated test setup is available. Never mark full acceptance passed while a required real integration check is deferred.
- **Future implementation checks:** apply TDD to the new pagination behavior and regressions at the appropriate observable seam. Run affected Web tests, shared-contract consumers, typechecking, lint, scoped formatting, and the separate browser journey. Include a production build when print routing, client/server boundaries, dependencies, or build configuration change. Re-run database/API integration only in its isolated test environment; documentation planning itself requires no application test run.

## Out of Scope

- Creating, deleting, or reordering manually authored page containers or intentionally inserting empty pages.
- Assigning a section to a numbered page or providing a “Move to page X” action.
- Manually splitting one section's entries among pages, moving individual entries across sections, or creating duplicate continuation sections in saved data.
- Moving Basics, adding pagination controls to Basics, or repeating Basics on subsequent pages.
- New templates, multi-column layout controls, paper sizes, typography controls, page-number labels, or pixel-for-pixel reproduction of the reference application.
- Replacing the rendering engine or adding dependencies without a separately justified and authorized decision.
- Changes to authentication, resource ownership, autosave recovery, undo/redo, experience-library features, or Codex/MCP collaboration.
- Dependency installation, database migrations, infrastructure startup, commits, pushes, or deployment as part of writing this spec.

## Further Notes

- The requirements come from the confirmed interview and supplied section-menu screenshot. “Behavior consistent with Reactive Resume” is scoped to the rules in this document; it does not import every feature of that application.
- The distinction between the two settings is intentional: keep-together is conditional on available space, while a fresh-page start is deliberate even when content would otherwise fit.
- Existing resumes retain their content, order, and default lack of forced breaks. Their preview will gain real page boundaries; this is not a promise of identical pixels to the previous unpaginated screen surface.
- Preview/PDF agreement is a completion requirement, not an assumption justified by sharing a React component. The current single growing page and early print-ready signal need explicit rendering evidence before this feature can be accepted.
- Requirements and the testing boundary were confirmed in the conversation on 2026-10-26. The implementation mechanism above records the subsequent rendering decision; each delivery ticket owns its acceptance evidence and status.
- This spec does not select any subsequent editor feature. Keep further work within the local Markdown tracker workflow.
