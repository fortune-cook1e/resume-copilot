# 04: Create a private resume from chat

**Parent:** [ChatGPT MCP for resumes](../spec.md)

**What to build:** After the client confirms a write, a connected user can create a blank or prefilled private resume and open it in the existing editor.

**Blocked by:** [01: Authorize a connection and list resumes](01-connect-and-list-resumes.md).

**Status:** done (local acceptance)

- [x] A title-only request creates a blank resume. A valid prefilled request saves the user-supplied structured content with existing defaults for missing values.
- [x] The server sets ownership and private visibility. The response contains the ID, title, version and editor link and omits contact values.
- [x] Invalid input and read-only grants cannot create records. Retrying the same operation with the same key and input returns the original result. Reusing that key with different input fails.
- [x] The saved document is visible to its owner through the existing resume API and editor. Verify persistence and access control using the isolated D1 HTTP seam.

Isolated D1 verified that concurrent retries create one resume, a delayed retry after deletion does not restore it, and read-only credentials remain read-only after a new write grant. The local Chromium check opened a prefilled resume using the tool's editor link. ChatGPT client confirmation remains part of [Ticket 06](06-accept-chatgpt-private-plugin.md).
