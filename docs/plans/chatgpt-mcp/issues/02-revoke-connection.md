# 02: Revoke the ChatGPT connection

**Parent:** [ChatGPT MCP for resumes](../spec.md)

**What to build:** A signed-in user can see the active connection in website settings and disconnect it.

**Blocked by:** [01: Authorize a connection and list resumes](01-connect-and-list-resumes.md).

**Status:** done (local acceptance)

- [x] Settings shows the connected client and its granted access. A user can revoke only a grant belonging to their own account.
- [x] After disconnect succeeds, a previously issued access token cannot list resumes and refresh is denied. Another user's grant and the ordinary browser session still work.
- [x] Reconnecting requires fresh consent. Tokens from the revoked connection remain invalid.
- [x] Cover the authorization and revocation behavior at the isolated D1 HTTP seam. Check the settings interaction in the browser.

The isolated D1 HTTP test also verifies that an authorization code issued before disconnect cannot be exchanged after reconnecting. The Chromium check covers viewing permissions, canceling, confirming, and reloading the profile after disconnect.
