# 03: Keep a section on one page when it fits

**What to build:** A resume author can independently enable “Keep on one page” in a section's actions menu. A section that fits on one full page stays together, moving to the next page only when necessary. Oversized sections continue automatically, and combining this option with “Start on a new page” produces one deliberate fresh-page start without blank pages.

**Blocked by:** 02: Start a section on a new page.

**Status:** done

- [x] Every non-Basics section family exposes an accessible, stateful “Keep on one page” option, including built-in, optional content, typed custom, and legacy custom sections. It defaults to off and can be toggled independently of “Start on a new page,” using either pointer or keyboard interaction.
- [x] With keep-together enabled, a section that fits in the current page's remaining content area stays on that page; the setting does not force an unconditional fresh-page start.
- [x] A section that fits within one full page but not the current page's remaining content area moves as a whole to the next page without reordering it or earlier visible content.
- [x] A section taller than a full page continues automatically across pages, including when a single rich-text entry is oversized. All content remains readable, in order, and present exactly once, without clipping or repeated empty-page retries.
- [x] When both settings are enabled, apply the fresh-page start once and then keep the section together if it fits. An already-satisfied page start, a hidden section, or a section with no printable content produces no extra blank page.
- [x] Disabling keep-together restores ordinary pagination while preserving an independently enabled fresh-page setting. Temporarily hiding or emptying a section retains its saved settings without contributing page breaks.
- [x] The boolean `keepTogether` setting survives the authoritative draft, autosave, API validation and persistence, reopening, section reordering, and export. Both settings remain attached to their stable section identity.
- [x] Old documents that omit either setting retain off behavior without content loss. Invalid non-boolean keep-together values are rejected through the public validation boundary for all section families, with no new endpoint, table, or migration.
- [x] Extend the existing editor-action tests for independent menu states, compatibility, and saved settings after reorder/reopen. Retain existing save failure and export-barrier coverage without duplicating it at another layer.
- [x] Extend the same real browser/PDF suite to cover sufficient remaining space, insufficient remaining space, oversized content, both options enabled, and inactive/already-satisfied breaks. Compare actual preview and PDF page placement and content bounds after saving and reopening the same revision; do not accept matching page counts alone.

## Comments

- Parent requirements: Section pagination spec. This ticket depends on ticket 02 because its observable acceptance includes both controls working together, not merely the keep-together rule in isolation. Ticket 01 is already a transitive prerequisite and is not repeated as a direct blocker.
- Use TDD for conditional keep-together, oversized fallback, and combined-rule regressions. Reuse the feature's browser/PDF seam and existing component suites; do not create a separate final testing-only ticket or one suite per renderer.
- Keep the project's containers stopped and use an explicitly isolated setup for any real persistence checks. Record unavailable integration evidence honestly and leave affected acceptance criteria pending rather than marking the feature fully accepted.
- This ticket does not authorize dependency installation, migrations, infrastructure startup, commits, or pushes.

- Acceptance: the keep-together browser journey was observed failing before implementation. All 7 real Chromium browser/PDF tests passed, covering conditional moves, combined-rule PDF export, oversized fallback, mobile edit/preview, list numbering, empty/hidden content, and complete Unicode graphemes. The grapheme regression was observed failing before its fix. Existing Web tests passed 65/65; API tests passed 60/60; production Web build, workspace typechecks (including the browser suite), lint (5 existing warnings), and scoped formatting passed. The user separately authorized this isolated test-database window; synthetic pagination users were verified removed and the PostgreSQL container was restored to stopped. Other browser engines and production deployment were not exercised. No dependency installation, migration, commit, or push was performed.
