# Codex CLI Workflows

This document defines the expected end-to-end workflow when Codex CLI is used to automate project management and delivery.

## Operating Principle

- Preview issue and PR content before applying it
- After explicit approval in the current session, Codex may perform the remaining Git and GitHub write steps
- Merge is allowed when the branch base is correct, validation is complete, and the PR scope matches the approved work

## Workflow 1: Draft and Create an Issue

1. Inspect the repo and confirm the problem area
2. Draft an issue title, labels, and body
3. Show the draft to the user
4. Create the issue after approval
5. Apply exactly one type, priority, area, and status label

## Workflow 2: Implement from an Issue

1. Confirm the issue scope and acceptance criteria
2. Create the correct branch type from `main`
3. Implement the approved change
4. Run subsystem validation for touched code
5. Run `npm run check:docs` when docs, templates, or governance files change
6. Commit focused changes
7. Push the branch
8. Draft and create the PR

## Workflow 3: Review and Merge a PR

1. Confirm the PR base branch is correct
2. Confirm the changed file set matches the approved scope
3. Confirm validation commands were actually run
4. Merge with squash unless a different method is explicitly required
5. Update or close the linked issue
6. Delete remote and local branches when safe

## Workflow 4: Recover a Polluted Branch

1. Detect unrelated commits or files in the PR
2. Create a clean branch from the correct base
3. Cherry-pick only the intended commits
4. Push the clean branch
5. Open a replacement PR
6. Close the superseded PR with a short note

## Workflow 5: Hotfix Handling

1. Open a bug issue with urgent priority
2. Create `hotfix/<issue-number>-<slug>` from `main`
3. Implement the smallest safe fix
4. Run targeted regression validation
5. Open and merge the PR back to `main`
6. Clean up the branch immediately after merge

## Validation Matrix

- Docs, templates, governance changes
  - `npm run check:docs`
- API changes
  - `cd music-game-api && npm test -- --runInBand`
- Web changes
  - `cd music-game-web && npm test -- --watch=false`

Add build or manual checks when the issue scope requires them.

## Approval Boundaries

- Must be previewed before apply
  - issue title/body/labels
  - PR title/body
  - cross-subsystem PRs with broad file impact
- May be executed after approval
  - issue creation
  - branch creation
  - commit and push
  - PR creation and updates
  - merge and branch cleanup
