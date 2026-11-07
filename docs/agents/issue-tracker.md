# Issue tracker: Local Markdown

Specs and tickets live in local Markdown files. Publishing means writing these files; it does not mean creating remote issues.

## Locations

- Feature spec: `docs/plans/<feature-slug>/spec.md`.
- Tickets: `docs/plans/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01` in dependency order, one file per ticket.
- Fetch a spec or ticket by reading its referenced file. Resolve a bare ticket number within the named feature; ask if it is ambiguous.

## Ticket format

Each ticket records its title, the observable outcome, acceptance criteria, `Blocked by:`, and `Status:`. Use `ready-for-agent` for an approved task, `in-progress` during implementation, `blocked` when a stated dependency prevents progress, and `done` only after acceptance checks pass. These are local status values, not remote labels; no triage-label file is required.

Record blocking dependencies by ticket number and title, or `None`. Start only a ticket whose blockers are done. An approved ticket is a Delivery Slice; implement one agreed ticket at a time rather than automatically proceeding through the task graph.

Append relevant follow-up discussion under `## Comments`. Do not close or modify a parent spec merely because its tickets have been drafted.

## Ownership

- The feature spec records agreed requirements and scope.
- Each ticket owns its acceptance criteria, dependencies, and status.
- Existing product and design documents describe the product and implemented design; update affected documents when behavior changes, without copying the ticket list into them.
- `docs/handoff.md` remains the current stage, verification, blockers, and next-action summary, linking to relevant artifacts.

Create specs and tickets only when requested or as part of an explicitly invoked planning workflow. Planning does not authorize production changes, commits, pushes, or remote publication.
