# Resume Copilot UI design

The application adopts ORYZO AI's warm, dark visual language. Its primary visual is the resume and the work users do with it through MCP. Copy stays concise and actions remain explicit.

Reference measurements and editorial rules come from [Refero's ORYZO AI style reference](https://styles.refero.design/style/1f204e95-454a-437e-845b-c1b169d35607). The application adaptations below govern Resume Copilot. Tokens live in `apps/web/app/oryzo-theme.css`.

## Color and depth

| Role                             | Token               | Value     |
| -------------------------------- | ------------------- | --------- |
| Canvas                           | `--oryzo-canvas`    | `#100904` |
| Raised surface and filled action | `--oryzo-surface`   | `#382416` |
| Dividers and panel outlines      | `--oryzo-border`    | `#40372E` |
| Muted structure                  | `--oryzo-structure` | `#6C5F51` |
| Text and focus indicator         | `--oryzo-text`      | `#FFEDD7` |
| Occasional editorial emphasis    | `--oryzo-ember`     | `#DC5000` |

Use warm surface changes for depth. Separate meaningful groups with a 1px dashed divider. Keep orange for small editorial details. Primary actions use the brown surface and cream text. Panels have 12px corners, outlined controls 22.5px, and filled actions 36px. Inputs use a bottom border and square corners.

## Application typography

Inter at weights 400 and 500 is the reference's available substitute. It loads through the existing Next.js font pipeline, with preloading disabled. The current Geist family provides a fallback.

| Purpose                      | Desktop target | Treatment          |
| ---------------------------- | -------------- | ------------------ |
| Hero                         | 51px           | Uppercase, 500     |
| Page heading                 | 41px           | Uppercase, 500     |
| Group heading                | 24px           | 500                |
| Introductory sentence        | 29px           | Sentence case, 400 |
| Form and application content | 16px           | Natural case, 400  |
| Navigation and action labels | 14px           | Uppercase, 500     |

Display sizes scale down on narrow screens. Use normal letter spacing, a 0.95 display line height, and 1.5 for reading and forms. Keep names, resume content, user input, dates, and errors in their natural case. Secondary text uses the cream-derived muted text token for legibility. Reserve Driftwood for structure. Error feedback uses the separate danger token.

## Layout and interaction

- Use 24px panel padding, 18px group gaps, and 8–12px control gaps. Give each screen one prominent action.
- Explain the homepage through a six-scene illustrated story: difficulty starting a resume, discovering Resume Copilot, connecting an MCP-capable AI tool, prompting with real experience, creating the resume, and choosing a template / exporting PDF. Use the same recognizable hand-drawn character across original ivory-and-ink illustrations, with small orange accents. ChatGPT is a labelled example. Visible copy is limited to one compact opening headline, essential text within illustrations, and navigation / entry actions. Subsequent scene headings remain available only to assistive technology; the pictures explain the workflow. Desktop native scrolling blends scenes. Keep the story free of a fixed bottom bar or numbered step controls. Retain the header entry and show the single creation action only in the final scene. Mobile, short screens, reduced motion and JavaScript-disabled rendering show the complete story in normal document flow. Keep art fully visible within the viewport and separate from the final creation action. Original generated WebP assets live in `apps/web/public/illustrations/story`; preload the first illustration and keep the remaining assets lazy-loaded.
- Keep Google sign-in visually focused. Retain pending, error, and ChatGPT consent states.
- Make Dashboard documents easy to identify through their own content. Keep card actions available to touch and keyboard users.
- Compose interactions with the existing shadcn components. Radius, shadow, input borders, and uppercase labels are applied deliberately when each component or page adopts the theme.
- Preserve visible focus and semantic labels. Pointer hover and keyboard focus provide equivalent cues. Use the motion tokens for short transitions and respect reduced motion.

## Theme integration and rollout

The CSS supplies namespaced tokens, Tailwind utilities such as `bg-oryzo-canvas` and `rounded-oryzo-card`, and a `data-theme="oryzo"` boundary that maps the existing shadcn color variables. Apply that boundary to the route shell and its portal containers together so menus and dialogs inherit the same palette. Keep document typography and PDF colors owned by resume templates.

Adopt and review the homepage first, sign-in second, and Dashboard third. For each page, inspect desktop and mobile rendering and verify its existing user journey. This foundation registers the tokens and font for those later steps.
