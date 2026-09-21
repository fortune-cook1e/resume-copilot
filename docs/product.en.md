# Resume Copilot Product Definition

[中文版](product.md)

Status: Product definition stage. The core product direction is confirmed; first-release details and acceptance scope still need refinement.

This document captures the current product discussion and describes the goals of the rewrite, not functionality already implemented. Existing project documentation and implementation do not constrain the new requirements. Technology choices, architecture, and implementation phases are outside the scope of this document.

## 1. Product Positioning and User Pain Points

Help job seekers prepare resumes for different roles by maintaining a reusable library of their real experience and creating role-specific resumes through agent collaboration or manual editing.

Typical scenario: A user already has a frontend resume and also wants to apply for full-stack roles. Education, work history, and projects share the same underlying facts, but the user repeatedly copies content, explains their experience again, and adjusts the emphasis.

The core value is not replacing forms with a chatbox. It is avoiding repeated entry of the same facts while giving users control over how their experience is presented for each role.

## 2. Three Core Types of Information

- **Personal experience library**: Confirmed facts reusable across resumes, including education, work history, projects, responsibilities, actions, technologies, and outcomes. This material can be more detailed than the resume itself. Users do not need to complete everything at once or provide quantified results for every entry.
- **Target role**: A role direction, job description (JD), or job URL supplied by the user. A specific JD is not required to create a general resume for a role.
- **Role-specific resume**: Independent content created by selecting, ordering, and rewriting material for the target role. It supports manual editing, layout customization, preview, and PDF export.

These are product concepts, not finalized database tables or storage structures.

## 3. Confirmed User Experience

### 3.1 Application Home and a Unified Creation Entry Point

- The application home shows the user's resume list and highlights creating a resume for a target role. This refers to the in-app home, not the public landing page.
- Provide one "Create resume" entry point, rather than three separate entry points for a role direction, JD, and URL.
- On entry, chat can ask: "What kind of resume would you like to create? Tell me the role you're targeting, paste a job description, or send a job link."
- The agent interprets the user's intent from their input. Users can also skip chat and start filling in the form directly.
- A specific JD leads to a resume tailored to that position. A role direction alone leads to a general version; general expectations must not be presented as a particular company's requirements.

### 3.2 Building the Personal Experience Library

Offer two ways to get started, both feeding the same experience library:

1. Import an existing resume and extract facts for the user to review.
2. Start a conversation in which the agent interviews the user and organizes the facts.

Users can view and edit the library directly. It is not hidden AI memory.

The agent groups newly extracted or corrected facts into a confirmation card. Users can edit them and save them together with one confirmation, rather than being interrupted after every statement. Unconfirmed inferences must not be used as facts in a resume.

### 3.3 Generating a Resume for a Target Role

- Use the target role and experience library to ask a small number of important questions that affect content selection before generating a draft.
- Allow users to skip questions. Do not repeatedly ask for facts already available or require the entire library to be completed first.
- Select content from the library and adjust its order and space allocation, rather than merely replacing keywords in an old resume.
- Distinguish "not recorded" from "never done." Ask about important missing facts; never invent experience, skills, contributions, or numbers to match job requirements.
- When creating a new resume, generate an editable draft directly, without requiring approval of each piece of draft wording. The underlying facts must still be confirmed.

### 3.4 A Laptop-Friendly Editing Workspace

Two switchable views share the same resume:

| View | Controls | Preview |
| --- | --- | --- |
| Agent collaboration | Chat, fact confirmation cards, proposed edits | Live resume preview |
| Manual editing | Form, layout settings | Live resume preview |

- Do not require chat, the form, and the preview to be visible simultaneously.
- Switching views must not create a copy, clear the conversation, or lose edits.
- Users can edit manually at any time, then have the agent continue working from the latest content.
- Provide template selection, layout customization, and PDF export inside the product, without requiring users to move their content to an external editor.

## 4. Content Control and Data Boundaries

### Agent Edits to an Existing Resume

- Show the original and proposed content so users can accept or reject changes. Do not silently overwrite content.
- If the user manually edits content covered by a pending suggestion, that old suggestion must not be applied directly.
- To use the suggestion again, generate a new proposal based on the latest content, avoiding overwriting the user's new edits.
- Undo behavior, the granularity of change previews, and the confirmation card UI still need refinement.

### Between the Experience Library and Resumes

- Wording changes affect only the current resume by default and do not automatically write back to the library.
- When facts are added or corrected, ask whether to sync them to the library.
- Library changes do not automatically modify other previously generated resumes.
- Direct user edits to the library and agent-extracted facts awaiting confirmation are distinct interaction paths. The implementation must preserve this distinction.

## 5. First-Release Product Scope

The following capabilities are confirmed as the basis of an end-to-end workflow:

- A user-maintainable experience library, built through import or conversation.
- A unified creation entry point accepting a role direction, JD text, or job URL.
- Targeted follow-up questions and fact confirmation.
- Role-specific resume generation, confirmation of agent edits, and form-based editing.
- A resume list, template selection, live preview, basic layout customization, and PDF export.

Reproducing every Reactive Resume feature is not a goal. The first release does not require a large template collection or every advanced setting.

This is an agreement on product scope, not a task list to implement all at once. Each implementation phase still needs a minimal, verifiable deliverable.

## 6. References and Boundaries

- Interaction and layout reference: [Reactive Resume](https://github.com/reactive-resume/reactive-resume).
- This project is an independent implementation, not a fork of Reactive Resume's source code.
- The existing project is only a reference. Its features, directory structure, and technology choices do not have to be preserved and must not be used to expand the new scope.
- The reference project has not yet been investigated feature by feature. Its implementation details must not be treated as verified solutions.

## 7. Open Questions and Suggestions (Not Adopted Requirements)

- Fallback behavior when a URL cannot be read, requires login, or is no longer available. Suggested approach: ask the user to paste the text instead of guessing the content.
- Whether users should review the extracted job summary before generation, and whether to retain a JD content snapshot and source.
- Specific rules for creating, copying, or referencing an existing resume when applying for similar positions again. The earlier discussion did not reach a final decision.
- Initial templates and the scope of basic layout controls; supported import file formats.
- When sign-in is required, data deletion and retention, and whether to migrate existing users' data.
- Very narrow-screen interactions and exceptional flows such as interrupted generation and recovery.
- First-release priorities and complete acceptance criteria need further clarification before implementation. The scenarios below summarize agreed behavior, not a complete acceptance checklist.

## 8. Core User Journeys

### Scenario A: An Existing Frontend Resume, Now Applying for Full-Stack Roles

1. Import the existing resume, review the extracted personal facts, and save them.
2. Click "Create resume" and provide a full-stack role direction, JD, or URL in chat.
3. Based on known experience, the agent asks about missing facts that affect content selection, such as whether the user actually worked on API development.
4. The user confirms new facts together. Skipped questions do not become fabricated experience.
5. The agent selects material from the library to generate a full-stack resume draft, rather than merely changing frontend keywords.
6. The user refines it through the agent or form, selects a template, adjusts the layout, and exports a PDF.
7. The original frontend resume remains unchanged. Confirmed experience can be reused in future resumes.

### Scenario B: No Existing Resume and No Specific JD

1. The user clicks "Create resume" and says they want a frontend resume.
2. A conversation helps organize relevant experience, without requiring a complete library first.
3. The user reviews and saves the facts organized by the agent, then a general resume for the role is generated.
4. The user continues editing and exports from the workspace, without needing a particular company's JD.

### Scenario C: Skipping the Agent or Switching to the Form Midway

1. The user selects the manual editing view and fills in the resume without first completing a conversation.
2. Form changes appear in the same resume preview.
3. If AI assistance is needed, the user switches to the agent view and requests edits to the current content.
4. The agent shows proposed changes, and the user decides whether to apply them.
5. Switching back to the form preserves accepted edits without creating a separate copy of the content.

These are typical journeys, not a requirement that every user build the experience library before providing a target role. First-use onboarding details still need design work.

## 9. Behavioral Acceptance Baseline Derived from the Agreement

These are user-facing behaviors that future design, implementation, and testing should protect. They have not yet been verified in the product.

| Situation | Expected result |
| --- | --- |
| A user provides a role direction, JD, or URL through the same creation entry point | The corresponding target can be expressed without choosing among three creation types first; URL error flows remain to be confirmed |
| Relevant personal facts already exist when another resume is created | Confirmed facts are reused without requiring the user to copy education, work history, and similar content again |
| A JD requires a skill not recorded in the library | The agent may ask about it, but must not present the requirement as an ability the user already has |
| A user reviews agent-extracted facts | The user can edit and confirm them together; unconfirmed inferences are not used as facts |
| The agent edits an existing resume | The user sees the proposed edits and can accept or reject them; rejection leaves the original content unchanged |
| A user manually edits the same passage after a pending suggestion was created | The old suggestion cannot overwrite the new content; a new proposal must be based on the latest content |
| A user switches between agent and form views | Resume and conversation content are preserved, and subsequent agent actions use the latest resume |
| A user changes only the wording of one resume | Neither the library nor other resumes are automatically updated |
| A user confirms adding facts to the library | Future generation can reuse them, but other previously generated resumes do not change automatically |
| A user does not use chat | Form-based editing, in-product layout customization, and PDF export remain available |
