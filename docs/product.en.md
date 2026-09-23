# Resume Copilot Product Definition

[Chinese version](product.md)

Status: The first-release direction is agreed; technical designs, Delivery Slices, and full acceptance criteria remain to be defined. This document describes goals, not implemented functionality. The legacy Web application is a reference, not a source of new requirements.

## 1. Product Positioning

Help job seekers manage their real experience and create, edit, and export independent resumes for different roles. The platform works as a resume workspace on its own; Codex is an optional collaboration entry point. Users need neither an OpenAI API key nor a Codex connection to create a resume manually.

The first release will not build an in-product agent or chat UI. Users converse in the Codex client; the platform shares data and accepts drafts or edit proposals through a user-authorized connection. **An in-product agent remains a later product direction, with lower priority than the manual workflow and Codex collaboration workflow.** Its capabilities, interaction design, and delivery stages will be designed later; the old agent plan is not automatically part of the first release.

## 2. Data and Content Boundaries

- **Personal experience library**: Reusable real facts about education, work, projects, and outcomes that the user manually maintains and confirms on the platform. It need not be complete up front. In the first release, Codex may read confirmed facts but cannot add or correct library facts directly.
- **Resume**: An independent draft or finished resume stored as structured content such as basics, education, work, and projects. Users edit it through forms, preview it, and export a PDF. Begin with one dependable template and allow custom sections where needed; advanced layout features are not assumed.
- **Target role**: Users can describe a role or paste JD text in Codex for the current collaboration. The first release does not separately store role directions, JDs, or Codex chat history on the platform and does not automatically fetch job links.
- The library is a source of facts; each resume is an independent selection and expression for its intended role. Resume edits do not automatically update the library, and library changes do not automatically update existing resumes. New resumes do not automatically use other resumes as references.

## 3. First-Release Experience

### Manual workflow

Without connecting Codex, users can maintain their experience library and start a blank resume. They can fill in and edit structured forms, preview the result, and export a PDF. The application provides a resume list. Later library changes do not silently rewrite resumes.

### Codex collaboration workflow

1. Users sign in to the platform and separately authorize Codex to connect to their data; matching account email addresses are not proof of shared identity. A remote MCP connection is the first-release target. The same capabilities may later be packaged as a more discoverable plugin, but public plugin approval is not a prerequisite for the first release.
2. Codex exchanges structured data through MCP tools; it does not click through the website or fill in forms. It may read confirmed experience to create a resume. To edit an existing resume, it may read only the resume explicitly selected by the user, not every resume by default.
3. Users provide a role direction or paste a JD in Codex. Codex can create an independent editable resume draft from confirmed facts without approval for every sentence. It must not present JD requirements or unknown details as the user's experience, skills, or numbers; it should ask for missing facts rather than invent them.
4. To change an existing resume, Codex submits a pending proposal. The platform shows the original and proposed content for acceptance or rejection; rejection leaves the resume unchanged. If a user manually edits the resume after a proposal was made, the stale proposal cannot be applied; a new proposal must use the latest version. The first release does not automatically merge conflicts.
5. The platform validates, stores, and displays resume data; users edit, preview, and export on the platform. MCP tool granularity, JSON format, authorization scopes, and expiry handling belong in a technical design. A Codex tool call is not equivalent to user approval of a change.

## 4. First-Release Scope and Later Directions

**First-release workflow**: Manually maintain confirmed experience; independently create and manage resumes; edit through forms, preview, and export PDFs; use a user-authorized Codex/MCP connection to read experience, create drafts, and propose changes to existing resumes. Deliver these capabilities in independently verifiable Delivery Slices rather than all at once.

**Excluded from the first release**: In-product agent/chat, Codex writes to the experience library, extracting facts from uploaded resume files, fetching job links, storing JDs or Codex chat, automatically referencing other resumes, a large template library, or automatically merging stale proposals.

**Later directions**: An in-product agent remains planned after the first-release workflow; its specific capabilities, such as conversational fact gathering, extraction, and confirmation, will be designed then. Job links, resume file import, plugin distribution, and richer layout controls require separate design and prioritization. These directions do not authorize implementation.

## 5. Example User Journeys

- **Fully manual**: Sign in → enter or maintain experience manually → start a blank resume → edit and preview → export a PDF; no Codex connection required.
- **Create with Codex**: Confirm experience manually → authorize a connection → give Codex a role direction or JD → Codex reads confirmed experience and submits an independent draft → review, edit, preview, and export on the platform.
- **Edit with Codex**: Specify one existing resume → Codex reads it and submits a proposal → accept or reject the displayed differences on the platform; a stale proposal cannot overwrite subsequent manual edits.

## 6. Behavioral Acceptance Baseline

These are behaviors for future design and testing, not claims of implementation or verification.

| Situation | Expected result |
| --- | --- |
| Codex is not connected | Users can still maintain experience, create and edit resumes, preview, and export PDFs |
| Codex requests resume creation | It may read only the user's confirmed experience; it submits an independent draft without modifying other resumes or the library |
| Codex requests an edit | It may read only the resume explicitly selected by the user; a proposed difference needs approval and rejection leaves content unchanged |
| A user edits a resume after a proposal was created | The stale proposal cannot overwrite the newer version; a new proposal must use current content |
| A JD mentions an unconfirmed skill or outcome | It must not become a claim about the user; missing facts must be checked |
| A user edits one resume or the library | Neither automatically updates the other or previously generated resumes |
| A user has no JD or only a role direction | A general role-specific resume can be created, without claiming to target a particular company |

## 7. Open Design Questions and Reference

- The Codex/MCP tools and public data contract, authorization and revocation, draft and proposal versioning, disconnection behavior, and sensitive-data minimization require a dedicated design and validation against the target client. A Codex subscription is not an OpenAI API key callable by this platform.
- Experience fields, the structured resume and first template, forms and preview, privacy/deletion/retention, and the later agent's detailed interactions and delivery stages need their own designs.
- [Reactive Resume](https://github.com/reactive-resume/reactive-resume) may inform interaction and layout, but this is an independent implementation; its implementation details are not verified solutions.
