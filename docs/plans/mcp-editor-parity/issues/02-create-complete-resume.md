# 02 Create a complete resume

**Blocked by:** 01 Read the complete resume, for end-to-end read-back verification.

**Status:** done (local acceptance)

A connected user can create a private resume with any content and design supported by the editor.

- [x] A single request can save Basics, built-in and custom sections, layout, and design. The editor API and MCP read return the same values.
- [x] Omitted fields use existing defaults and the server generates new entry IDs. A retry returns the original draft.
