# 03: Read the requested parts of a resume

**Parent:** [ChatGPT MCP for resumes](../spec.md)

**What to build:** A connected client can read a chosen resume by ID and request only the content needed for its task.

**Blocked by:** [01: Authorize a connection and list resumes](01-connect-and-list-resumes.md).

**Status:** done (local acceptance)

- [x] A metadata-only read returns the selected resume's ID, title and current version. A content read returns the requested supported sections, fields or specific entries with stable IDs.
- [x] Email, phone, address and other personal contact fields are omitted from all read results. Unknown or unsupported selections do not broaden the response.
- [x] Both public and private owned resumes can be read. An unknown ID and a resume owned by someone else produce the same missing-resource response.
- [x] Isolated HTTP integration tests verify scope enforcement, field projection and omission with two accounts and a resume that contains contact details.

Omit `sections` for metadata or pass `{ summary: true, projects: { fields: ['summary'], entryIds: ['project-id'] } }` to select content. The other supported sections are `experience`, `education`, and `skills`. An oversized projection returns a tool error asking for a narrower selection.
