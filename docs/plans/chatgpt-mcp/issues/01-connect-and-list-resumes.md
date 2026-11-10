# 01: Authorize a connection and list resumes

**Parent:** [ChatGPT MCP for resumes](../spec.md)

**What to build:** A private MCP client can discover the public service, sign in through the existing Resume Copilot account, grant access, and retrieve its own resume titles and IDs.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] The public entry point and local route expose MCP and OAuth discovery, with a registered ChatGPT client and exact callback. Verify the relevant client configuration and Worker compatibility.
- [x] The browser consent flow reuses Google login and shows which client requests access and what account-level permissions it receives. A denied request grants nothing.
- [x] An authorized client with read scope gets a bounded list of owned titles and IDs. A second account's resumes and resume contents do not appear.
- [x] Invalid, expired and wrong-resource tokens fail. An incorrect PKCE verifier, invalid redirect and replayed authorization code fail. An active grant can refresh according to its configured lifecycle.
- [x] Existing browser session and Origin protection checks pass, and the compiled API HTTP integration uses an isolated D1 database.

## Comments

- Local acceptance passed with 27 API tests, 69 Web tests, and two focused Chromium checks with a synthetic Google exchange. The built Web and API Workers also passed the local service binding smoke test for both discovery endpoints and the MCP authorization challenge.
- The OAuth provider is disabled until all three MCP settings are present. The configured client uses an exact callback and authenticates token exchange with `client_secret_post`. The actual ChatGPT client and public deployment are acceptance work for ticket 06.
