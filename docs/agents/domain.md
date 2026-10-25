# Domain documentation

Use a single shared domain context for Web, API, and contracts. Separate workspaces do not imply separate domain models.

Start with `docs/handoff.md` and the applicable `AGENTS.md`. For behavior changes, read `docs/product.en.md` and the relevant documents in `docs/designs/`; verify implementation facts against the current code.

Read `docs/glossary.md` and relevant decisions in `docs/adr/` if they exist. Their absence is not a blocker; do not create empty glossary files, ADR directories, or additional domain documentation as part of ordinary skill use. Keep any newly requested domain documents under `docs/`.

Use the project's established terms and surface conflicts with existing design decisions. Generic skill guidance does not replace NestJS responsibilities, Web state ownership, shared contract boundaries, or the project's risk-based testing strategy.
