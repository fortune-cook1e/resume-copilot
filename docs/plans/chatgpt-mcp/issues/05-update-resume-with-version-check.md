# 05: Edit resume text with version checks

**Parent:** [ChatGPT MCP for resumes](../spec.md)

**What to build:** A connected user can confirm a scoped text edit in chat and see the persisted result in Resume Copilot. The application detects competing edits.

**Blocked by:** [03: Read the requested parts of a resume](03-read-requested-resume-fields.md).

**Status:** done (local acceptance)

- [x] Apply a change to Summary, an existing work description or an existing project description. Match the entry by ID and preserve the rest of the document. A missing Summary can be initialized using its established defaults.
- [x] The tool accepts authorized writes to public and private owned resumes. Read-only grants, other owners, missing targets and unsupported changes cannot write.
- [x] Update the version and content atomically. After a browser save, a tool request with the previous version is rejected. Two competing edits with the same version cannot both succeed.
- [x] A browser autosave based on a revision replaced by an MCP write reports a conflict, preserves the local draft and leaves the newer stored result intact.
- [x] Verify saved content, version conflicts and write restrictions at the isolated D1 HTTP seam. Check the stale browser draft behavior through the existing editor test seam.

The isolated D1 test covers conflicts in both directions. The Chromium regression preserves the unsaved draft and opens the latest saved version in a separate tab. The real ChatGPT confirmation flow remains part of Ticket 06.
