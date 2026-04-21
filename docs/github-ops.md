# GitHub Ops Runbook

This repository uses GitHub templates plus Codex-assisted workflows for issue and PR management.

## Operating Model

- GitHub writes are `preview first, apply second`.
- Codex may draft issue and PR content, labels, and updates, but it should not write to GitHub until the user explicitly approves the action in the current session.
- English is the default language for issue and PR metadata.
- This repository has one GitHub system of record: `yun199905/music-game`.
- `music-game-web` and `music-game-api` are tracked within the same repo and are distinguished by labels, not separate project boards.

## Label Taxonomy

### Type

- `type:bug`: Broken or incorrect current behavior
- `type:feature`: Net-new capability or meaningful product improvement
- `type:task`: Bounded engineering work that is not a new feature
- `type:docs`: Documentation-only work
- `type:refactor`: Internal structure change without intended feature change

### Priority

- `priority:critical`: Delivery blocker, production breakage, or immediate critical path work
- `priority:high`: Important near-term work with direct stability or roadmap impact
- `priority:normal`: Useful follow-up work that is not currently blocking delivery

### Area

- `area:web`: Angular frontend
- `area:api`: NestJS backend
- `area:infra`: Deployment, CI, environment, or integrations
- `area:repo`: Cross-cutting repository governance or shared docs/process

### Status

- `status:triage`: Newly filed, not yet refined
- `status:ready`: Clear enough to implement
- `status:in-progress`: Active implementation work is underway
- `status:blocked`: Work cannot proceed due to an external or unresolved dependency
- `status:review`: Implementation is up and awaiting review or merge

## Required Metadata Contract

Every issue should include:

- A concrete summary
- One area label
- One priority label
- One type label
- Acceptance criteria

Every PR should include:

- A concise summary
- A linked issue reference
- Validation commands actually run
- A short risks or follow-up section if relevant

## Codex Workflows

### Draft an Issue

Use when the user wants a new issue but has not approved a GitHub write yet.

Codex should provide:

- Proposed title
- Issue type
- Suggested labels
- Full issue body aligned to the matching template

Recommended prompt pattern:

```text
Draft a GitHub issue for <problem>. Use the repo's governance, choose labels, and show the final title/body before writing anything.
```

### Apply an Issue

Use only after the user explicitly confirms creation.

Codex should:

1. Restate the intended write action
2. Create the issue through GitHub MCP
3. Return the created issue number, title, and applied labels

Recommended prompt pattern:

```text
Create the approved GitHub issue draft now.
```

### Draft a PR Description

Use when code changes already exist or are being prepared.

Codex should provide:

- Proposed PR title
- Linked issue reference
- Final PR body based on the repository template

Recommended prompt pattern:

```text
Draft a PR description for the current changes. Link the right issue and follow the repo template.
```

### Apply a PR Update

Use only after the user explicitly confirms the content.

Codex should:

1. Restate the intended PR write action
2. Create or update the PR through GitHub MCP
3. Return the PR number and final title

### Review or Update Existing GitHub Items

Codex may also:

- Add or refine labels
- Move status labels
- Comment on issues or PRs
- Draft review summaries

For any write, Codex should show the proposed change first unless the user explicitly asks it to apply the already reviewed draft.

## Label Selection Rules

- Pick exactly one type label.
- Pick exactly one priority label.
- Pick one primary area label.
- Apply one status label at a time.
- Use `type:docs` or `type:refactor` only for task-shaped work that is primarily documentation or structural cleanup.

## Priority Rubric

- Choose `priority:critical` when the issue blocks release, prevents core development, or breaks a critical workflow.
- Choose `priority:high` when the issue materially improves reliability, delivery confidence, or near-term roadmap work.
- Choose `priority:normal` when the issue is useful but not blocking current delivery.

## Standard Issue Titles

- Bug: `[Bug] <short failure statement>`
- Feature: `[Feature] <short capability statement>`
- Task: `[Task] <short work statement>`

Titles should be short, explicit, and implementation-neutral when possible.

## Standard PR Titles

- `<scope>: <short change statement>`

Examples:

- `web: stabilize frontend test workflow`
- `api: add room lifecycle tests`
- `repo: add GitHub governance templates`

## Triage Guidance

- New issues start as `status:triage`.
- Move an issue to `status:ready` only when scope and acceptance criteria are specific enough to implement.
- Move an issue to `status:in-progress` when active work starts.
- Move an issue to `status:review` when the implementation is in a PR and awaiting review.
- Replace the current status label rather than stacking multiple status labels.
