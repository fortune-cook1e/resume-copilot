# 02: Start a section on a new page

**What to build:** A resume author can enable or disable “Start on a new page” in a section's existing actions menu, see that section start on a fresh preview page, and retain the same choice after saving, reopening, reordering, and PDF export.

**Blocked by:** 01: Automatic pagination with matching preview and PDF.

**Status:** done

- [x] Every non-Basics section family exposes an accessible, stateful “Start on a new page” menu option, including built-in, optional content, typed custom, and legacy custom sections. The option can be operated with the keyboard and defaults to off.
- [x] Enabling the option starts the printable section on a fresh page even when the preceding page has sufficient remaining space. Disabling it restores ordinary flow after preceding content.
- [x] A section that already starts on a fresh page does not receive another break. Hidden sections, empty sections, and sections containing only hidden or unfinished non-printable entries create no break or blank page.
- [x] A forced-start section longer than a full page continues automatically onto subsequent pages. The setting constrains only its start; following sections continue in document order and use available space normally.
- [x] Dragging or using existing keyboard/menu ordering controls preserves the setting on the same section identity. Basics remains fixed and has no pagination option. No page-assignment controls or empty-page management are added.
- [x] The authoritative draft stores the boolean `startOnNewPage` setting through the existing autosave path. Authenticated API validation, persistence, read responses, and export preserve it without losing existing content or section order.
- [x] Old documents that omit the setting behave as off. Invalid non-boolean values are rejected through the public validation boundary. No new endpoint, table, or database migration is introduced.
- [x] Temporarily hiding or emptying a section suppresses its pagination effect without clearing its saved setting; making it printable again restores the configured behavior.
- [x] Extend the existing editor-action tests to cover the checked state and settings surviving reorder, schema-parsed save, and reopening across representative section families. Reuse existing fixtures and suites rather than adding a test file per section.
- [x] Extend the feature's real browser/PDF journey to toggle the option, save and reopen, reorder the section, and export the same revision. Actual preview and PDF section start pages agree, including the hidden/empty and already-at-page-start cases. Keep the existing save-before-export barrier intact.

## Comments

- Parent requirements: Section pagination spec. Ticket 01 supplies actual pagination, readiness, and preview/PDF parity; this ticket adds the first persisted author-controlled rule across the same complete workflow.
- Use TDD for fresh-page semantics and compatibility regressions. Prove physical page placement through the existing feature rendering suite; a saved boolean or print CSS class is insufficient evidence by itself.
- Keep the project's containers stopped and preserve the isolated-test-data requirement. If live persistence/export acceptance cannot run, report it separately from component or independent rendering evidence and leave those acceptance criteria pending.
- This ticket does not authorize dependency installation, migrations, infrastructure startup, commits, or pushes.

- Acceptance: the fresh-page menu and visually empty rich-text cases were observed failing before implementation/fix. All 5 real browser/PDF tests passed, including authenticated save/reopen/reorder/download and hidden-section restoration. Editor-action tests passed 32/32, including four section families; API tests passed 60/60 against the isolated test database; Web/API typechecks and scoped formatting passed.
