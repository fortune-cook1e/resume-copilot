# 05 Manage entire resumes

**Blocked by:** 01 Read the complete resume.

**Status:** local acceptance passed, deployed to test, ChatGPT acceptance pending

An owner can create a private resume with a description, change its saved properties, copy it into an independent private resume, and permanently delete an explicitly selected revision.

- [x] Full reads return the title, description, visibility, and version. Changing these properties preserves the content and design.
- [x] A copy keeps the source description, content, and design and uses a new ID and title. A retry returns the same copy.
- [x] Updates and deletes reject stale revisions. Copying rejects a stale source revision. The management tools require `resumes:manage` and only operate on owned resumes.
- [ ] Connect the private ChatGPT test app to the new MCP endpoint and verify the management workflow.

The test Workers are live under the `-test` names. The new endpoint passed public readiness, OAuth discovery, and Google sign-in redirect checks.
