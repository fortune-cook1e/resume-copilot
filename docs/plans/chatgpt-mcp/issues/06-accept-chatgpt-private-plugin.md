# 06: Verify the complete private ChatGPT flow

**Parent:** [ChatGPT MCP for resumes](../spec.md)

**What to build:** Demonstrate that a real private ChatGPT plugin can connect to Resume Copilot and complete the approved resume workflow against a disposable test account.

**Blocked by:** [01: Authorize a connection and list resumes](01-connect-and-list-resumes.md), [02: Revoke the ChatGPT connection](02-revoke-connection.md), [03: Read the requested parts of a resume](03-read-requested-resume-fields.md), [04: Create a private resume from chat](04-create-private-resume.md), and [05: Edit resume text with version checks](05-update-resume-with-version-check.md).

**Status:** public test deployment verified; awaiting Google OAuth configuration

The Web and API Worker dry runs passed with isolated test resource names. The compiled Web Worker forwarded discovery, Google sign-in with a simulated provider, OAuth with PKCE, all four tools, a stale save, and revocation to the compiled API Worker backed by isolated D1. The live acceptance check uses a separate Web Worker, API Worker and D1 database.

The authorized test deployment has its own Web Worker, API Worker and migrated D1. Public checks passed for readiness, the sign-in page, both OAuth discovery endpoints, the unauthenticated MCP challenge and the redirect into the OAuth login flow. Google OAuth on the test API still uses placeholders. Complete its callback registration and test credentials before the real ChatGPT connection and write-confirmation checks.

- [ ] The actual ChatGPT client discovers the four tools and completes OAuth against the authorized public test endpoint on Cloudflare's free tier.
- [ ] From ChatGPT, list owned resumes, create a disposable private resume, read its Summary and request a targeted edit. Declining the write leaves the test resume intact. Confirming the write persists it.
- [ ] Open the resume in the website editor and verify the saved content. After a manual save, demonstrate that a write using the prior revision is rejected.
- [ ] Disconnect in settings and verify that ChatGPT cannot perform another authenticated tool call until the user grants access again.
- [ ] Record the real-client outcome without secrets or resume data in the evidence. A simulated client alone does not satisfy this ticket. A public test deployment requires explicit authorization.
