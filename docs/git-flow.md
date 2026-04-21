# Git Flow Guide

This repository uses a simplified Git Flow model that works well with Codex CLI automation.

## Branch Model

- `main`
  - The deployable branch
  - Every merged PR ends here
- `feature/<issue-number>-<slug>`
  - Default branch type for features, tasks, docs, and refactors
- `hotfix/<issue-number>-<slug>`
  - Urgent fixes that must land quickly from the current production-ready base
- `release/<version-or-date>`
  - Temporary stabilization branch for grouped release validation when needed

This model intentionally does not maintain a long-lived `develop` branch.

## Branch Creation Rules

- Start `feature/*` from `main`
- Start `hotfix/*` from `main`
- Start `release/*` from `main`
- Every branch must map to one primary GitHub issue

Examples:

- `feature/12-room-rejoin-reliability`
- `feature/27-add-song-admin-api`
- `hotfix/41-fix-room-not-found-regression`
- `release/2026-04-30`

## Lifecycle by Branch Type

### Feature Branches

1. Draft and create the issue
2. Open `feature/<issue-number>-<slug>` from `main`
3. Implement and validate
4. Open a PR to `main`
5. Merge with squash
6. Delete the branch

### Hotfix Branches

1. Create a bug issue with urgent priority
2. Open `hotfix/<issue-number>-<slug>` from `main`
3. Implement the minimum safe fix
4. Validate the regression path
5. Open a PR to `main`
6. Merge with squash
7. Delete the branch

### Release Branches

1. Create a release issue describing scope and validation goals
2. Open `release/<version-or-date>` from `main`
3. Perform grouped verification and release-note preparation
4. Merge back to `main`
5. Delete the branch

## Merge Rules

- Default merge strategy is squash merge
- Every PR must link the primary issue
- Every PR must document validation commands actually run
- Do not merge polluted branches; create a clean branch and cherry-pick the intended commits instead

## Issue, PR, and Label Alignment

- New work starts at `status:triage`
- Ready-to-implement work moves to `status:ready`
- Work on a branch moves to `status:in-progress`
- PR-open work moves to `status:review`
- Closing the issue should happen when the merged PR completes the intended scope

## Cleanup Rules

- Delete remote feature, hotfix, and release branches after merge
- Delete local branches after merge if there is no uncommitted work
- If a branch was superseded by a clean replacement branch, close the old PR with a short explanation
