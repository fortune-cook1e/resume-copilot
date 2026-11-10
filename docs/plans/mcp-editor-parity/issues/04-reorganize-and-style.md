# 04 Reorganize and style a resume

**Blocked by:** 03 Edit existing content in a batch. Final ChatGPT acceptance also requires 02 Create a complete resume.

**Status:** in-progress (local acceptance passed, live acceptance pending)

A connected user can use the same editing flow to organize sections and change the look of a resume.

- [x] Supported section and entry add, remove, reorder, and visibility changes round-trip through the editor API.
- [x] Pagination, template, typography, density, and color changes round-trip through the editor API.
- [ ] A disposable resume can be created and edited through the private ChatGPT plugin and reopened with its saved content and design.

The isolated Worker/D1 suite passed. Both test Workers were updated and public health and OAuth checks passed with the expanded scopes. After refreshing tools, the private ChatGPT test app created the disposable resume and found the batch-edit tool. The isolated database confirmed that the new private draft saved its template. Full-read and batch-edit acceptance still require authorization for the expanded scopes and verification in ChatGPT and the editor.
