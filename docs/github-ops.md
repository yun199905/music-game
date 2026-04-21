# GitHub Ops Runbook

This repository uses GitHub templates plus Codex-assisted workflows for issue and PR management.

## Operating Model

- GitHub writes are `preview first, apply second` for issue and PR content.
- Codex may draft issue and PR content, labels, and updates before applying them.
- After the user explicitly approves the reviewed content in the current session, Codex may complete the follow-up Git and GitHub write steps, including branch creation, commit, push, PR creation, status updates, merge, and cleanup when the required checks pass.
- English is the default language for issue and PR metadata.
- This repository has one GitHub system of record: `yun199905/music-game`.
- `music-game-web` and `music-game-api` are tracked within the same repo and are distinguished by labels, not separate project boards.

## Branch Strategy

This repository uses a simplified Git Flow model.

- `main`
  - Always represents the latest deployable state
  - All completed work ultimately merges into `main`
- `feature/<issue-number>-<slug>`
  - Default branch type for features, tasks, docs, and refactors
  - Cut from `main`
  - Merged back into `main`
- `hotfix/<issue-number>-<slug>`
  - Used for urgent fixes that must land directly from the current production-ready branch
  - Cut from `main`
  - Merged back into `main`
- `release/<version-or-date>`
  - Used only when multiple completed changes need coordinated validation or release notes before publication
  - Cut from `main`
  - Merged back into `main`

See `docs/git-flow.md` for the detailed branch lifecycle.

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

## Status Lifecycle

- `status:triage`
  - Default for newly filed work
- `status:ready`
  - Scope and acceptance criteria are implementation-ready
- `status:in-progress`
  - Active implementation is underway on a branch
- `status:review`
  - Implementation is in a PR and waiting for review or merge
- `closed`
  - Work is complete, superseded, or intentionally discarded

Replace the existing status label instead of stacking multiple status labels.

## End-to-End Workflow

1. Draft the issue
   - Codex proposes title, labels, and body using the repository templates.
2. Create the issue
   - After approval, Codex creates the issue and applies exactly one type, priority, area, and status label.
3. Start the branch
   - Create `feature/*`, `hotfix/*`, or `release/*` from the correct base branch.
4. Implement and validate
   - Run the relevant test and formatting commands for the touched subsystems.
5. Draft the PR
   - Codex prepares the PR title/body and links the primary issue.
6. Open the PR
   - After approval, Codex pushes, creates the PR, and moves the issue to `status:review`.
7. Merge and clean up
   - When the documented checks pass and the user has approved the flow, Codex may merge and remove stale branches.

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

### Merge an Approved PR

Use when:

- the PR base is correct
- the file set has been checked for unrelated changes
- the validation commands have actually been run
- the user has approved the merge flow in the current session

Codex should:

1. Confirm the PR is clean and mergeable
2. Merge with squash by default
3. Close or update the linked issue
4. Delete remote and local feature branches when safe

### Recover a Polluted Branch

Use when a PR contains unrelated commits or files because the branch was cut from the wrong base.

Codex should:

1. Create a clean branch from the correct base
2. Cherry-pick only the intended commits
3. Push the clean branch
4. Open a replacement PR
5. Close the superseded PR with a short explanation

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

## Branch Naming Rules

- Feature: `feature/<issue-number>-<slug>`
- Hotfix: `hotfix/<issue-number>-<slug>`
- Release: `release/<version-or-date>`

Examples:

- `feature/12-room-rejoin-reliability`
- `hotfix/34-fix-start-game-timeout`
- `release/2026-04-30`

## Commit Naming Rules

- Prefer conventional scope-first summaries:
  - `web: stabilize socket reconnect flow`
  - `api: improve room persistence upsert logic`
  - `repo: add GitHub governance templates`
- Keep each commit focused enough to cherry-pick into a clean branch if needed.

## Merge Rules

- Default PR merge strategy is squash merge.
- Do not merge a PR that still contains unrelated files, polluted base commits, or missing validation notes.
- If Codex is performing the merge, it must first verify:
  - base branch is correct
  - file scope matches the approved work
  - required validation commands were executed
  - linked issue and labels are consistent

## Documentation and Formatting Gate

- Root governance files, `docs/*.md`, and `.github/*` templates must pass `npm run check:docs` from the repo root before merge.
- Code changes must still pass the relevant subsystem validation, such as API tests or frontend tests/build checks.
- Prettier is the canonical formatter for documentation assets. Markdown lint supplements structure checks and should not be configured to fight Prettier.

## Triage Guidance

- New issues start as `status:triage`.
- Move an issue to `status:ready` only when scope and acceptance criteria are specific enough to implement.
- Move an issue to `status:in-progress` when active work starts.
- Move an issue to `status:review` when the implementation is in a PR and awaiting review.
- Replace the current status label rather than stacking multiple status labels.
