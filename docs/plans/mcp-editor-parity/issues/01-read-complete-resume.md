# 01 Read the complete resume

**Blocked by:** None.

**Status:** done (local acceptance)

A connected user with full-read consent can choose an owned resume and read its entire document, including contacts, custom sections, design, and the current version.

- [x] A full-read token returns the complete document for owned public and private resumes.
- [x] The consent screen explains that full access includes contacts. A previously issued limited token still returns metadata or an explicitly selected projection.
- [x] Another account's resume returns the same missing-resource error as an unknown ID. The existing size limit remains enforced.

Local Worker/D1 integration passed. The final ChatGPT journey is part of Ticket 04. The test app needs to request `resumes:read_full` for full documents and obtain fresh consent.
