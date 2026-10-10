# Installed skills used in PK WMS

Installed 9 October 2026 through Codex's `skill-installer`. Revisions are pinned to the GitHub commit inspected before installation. They are authoring tools, not browser runtime plugins. No third-party automation was executed except the reviewed read-only token estimator; no credentials or business data were sent to these repositories.

| Skill | Pinned source | Application |
|---|---|---|
| deliver-prd | [product-on-purpose/pm-skills](https://github.com/product-on-purpose/pm-skills/tree/1cef1a9eae10017389863d51e289e0ae41e17fcb/skills/deliver-prd) | PRD requirements, scope, acceptance and execution contract |
| agents-md-creator | [chenkumi/agents-md-creator](https://github.com/chenkumi/agents-md-creator/tree/01fbc14ca1610e163118234177b77ec63405416d) | Concise AGENTS entry/index; link and size checks |
| software-architecture-analysis | [magnus919/agent-skills](https://github.com/magnus919/agent-skills/tree/c545c2b61d4d1e22377bd5db240843a25c1b5764/software-architecture-analysis) | Architecture/data-authority map, evidence classifications and API boundaries |
| design-system-doc | [qa-aman/claude-skills](https://github.com/qa-aman/claude-skills/tree/72ef27fe4fe791363be7c811a16c25ffaa6ea9c0/skills/by-role/designer/design-system-doc) | Actual tokens, component anatomy/states, accessibility and motion |

Local installation root: `C:/Users/ADMIN/.codex/skills/`, one directory per skill name above. The skills can be discovered on the next turn. They were read and applied explicitly in this task already.

The installer download path hit Windows path-length limits for two large repositories; git sparse installation succeeded without changing skill content. Existing design/refactor skills were reviewed as alternatives but were not overwritten. Global skills are local to this Codex environment; a fresh machine needs separate installation.

## Applied project contract

- [PRD](../PRD.md): observed behavior and measurable acceptance, completed private-data migration distinguished from remaining historical-copy decisions.
- [AGENTS](../AGENTS.md): setup, entry points, static principles and directly linked references.
- [ARCHITECTURE](../ARCHITECTURE.md): server authorization, data ownership and API contracts.
- [DESIGN_SYSTEM](../DESIGN_SYSTEM.md): current CSS precedence, themes, responsive components and finite motion.

These documents are excluded from Vercel public assets by `.vercelignore`; they remain in the project repository. The installation does not by itself change the website's UI.

## Follow-up application — 9 October 2026

All four skills were reapplied: deliver-prd added release acceptance, agents-md-creator preserved a concise index and the user-specified private API boundary, software-architecture-analysis mapped account/data lifecycle, and design-system-doc specified data presentation states. These updates document the current architecture and future component requirements without claiming new UI implementation.

## kien-thai reference — 10 October 2026

The user supplied `C:/Users/ADMIN/Downloads/Compressed/kien-thai-main.zip`, SHA-256 `a5a570d84cb7a43e6389c749592a058ec5acf118ae2fddebdafdd47c5cd673cc`. The archive's `skills/kien-thai/SKILL.md`, eight references and the companion `kode-thai` audit-loop instructions were read. Only the text references were copied to ignored `work/kien-thai-reference/`; no archive scripts, external model routing or third-party automation were run. This is use of a supplied reference, not a new global skill installation.

Applied the Explainer register to warehouse instructions and status messages, preserving product names, identifiers, numeric quantities, units and operational meaning. Short action labels and the existing greeting voice retain their UI roles. Review iterations, rule traces, tests and limits are recorded in [the language review](KIEN-THAI-REVIEW-2026-10-10.md).
