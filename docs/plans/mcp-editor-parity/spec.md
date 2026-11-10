# MCP resume creation and editing

This is the follow-up to [ChatGPT MCP for resumes](../chatgpt-mcp/spec.md). It replaces the initial restrictions on resume reading, creation, and editing in the slices below.

## Problem and solution

A user can ask ChatGPT to write some resume text, but many ordinary changes still require switching to the website. A connected user should be able to create a complete private resume, inspect one chosen resume, and save a batch of edits covering the same document fields as the editor.

## User stories

1. As an owner, I want ChatGPT to read the complete resume I select so it can understand my existing content and layout before proposing changes.
2. As a connected user, I want to see that full read access includes contact details before granting it.
3. As an author starting a resume, I want ChatGPT to fill the content and design I specify in one private draft so I can inspect the saved result in the editor.
4. As an author revising a resume, I want to edit Basics and existing entries in one batch so related changes are saved together.
5. As an author reorganizing a resume, I want to add, remove, reorder, and hide sections and entries where the editor supports it, and change pagination and design.
6. As an author working in two clients, I want stale or invalid edits to fail as a whole so my saved changes are preserved.
7. As an owner, I want to read and update the name, description, and visibility of a resume and create, copy, or delete an entire resume from chat.

## Implementation decisions

- The full-read grant permits reading complete owned resume documents, including contacts, custom sections, and design. A read identifies one resume by ID and returns its data and current version. Explicit selectors retain the existing compact response. The response size limit still applies.
- The existing limited grant continues to provide metadata and supported projections. A connection that was granted only selected content must obtain the separate full-read scope. Public and private owned resumes follow the same MCP access rules.
- Reuse the editor's shared document, defaults, and validation for create and edit. Keep private creation and the existing retry contract. Generate IDs for new entries and use stable IDs to identify existing entries.
- `create_resume` accepts section drafts keyed by section ID, plus Basics, section order, typography, and design. The original short form for common sections remains accepted.
- `apply_resume_patch` takes a batch of named operations for Basics, Summary, entries, sections, order, pagination, and design. Existing entries use stable IDs. Section removal follows the editor: delete custom sections and clear built-in sections.
- Full editing requires fresh `resumes:edit` consent. The existing `resumes:write` grant still permits private creation and the original text edit tool. For end-to-end acceptance, the test app requests `resumes:read_full resumes:write resumes:edit offline_access`.
- [Resume management](issues/05-manage-resumes.md) uses the separate `resumes:manage` grant for updates to resume properties, duplication, and permanent deletion. Full reads return the resume description and visibility. The existing create tool accepts an optional description. Creation and duplication save private resumes, and setting visibility follows the editor's stored preference.
- Save a batch of edits in one owner-scoped conditional write. Use the version from the last read and require a fresh read after a conflict. Keep the existing client confirmation flow.
- Keep the existing Workers and D1 free-tier architecture.

## Verification

Extend the isolated Worker/D1 HTTP suite for consent, ownership, complete document round trips, invalid requests, and competing writes. At the end of the four slices, use the private ChatGPT plugin and a disposable resume to create, edit, and reopen the same document in the Web editor.

## Out of scope

Restoring historical revisions, public sharing links, and exporting documents through MCP.
