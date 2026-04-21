# Repository Guidelines

## Core Rules

- This workspace contains two independent repositories: `music-game-web` and `music-game-api`.
- Frontend and backend remain split for deployment and versioning; do not merge them into a monorepo toolchain unless explicitly requested.
- Keep secrets, PATs, and private credentials out of tracked files. Use local environment variables instead.
- When GitHub issue or PR metadata is needed, prefer the configured GitHub MCP server over ad hoc scraping or shell-based API calls.
- Before taking GitHub write actions through MCP, clearly state the intended action in the user update.
- GitHub issue and PR content should follow the templates and operating model in `docs/github-ops.md`.
- Branch naming and merge flow should follow `docs/git-flow.md`.
- Codex CLI execution patterns should follow `docs/codex-workflows.md`.
- GitHub writes use a `preview first, apply second` workflow for issue and PR content. Once the user explicitly approves the reviewed draft in the current session, Codex may complete the remaining Git and GitHub write steps, including merge, when the documented checks pass.
- For GitHub metadata, apply exactly one `type:*`, one `priority:*`, one `area:*`, and one `status:*` label at a time.

## Delivery Flow

- `main` is always the deployable branch.
- Start new work from `main` using:
  - `feature/<issue-number>-<slug>` for normal feature, task, docs, and refactor work
  - `hotfix/<issue-number>-<slug>` for urgent production fixes
  - `release/<version-or-date>` only when bundling multiple completed changes into a controlled release
- Every working branch must map to one primary GitHub issue.
- PRs should target `main` unless a documented release branch workflow is active.
- Default merge strategy is squash merge.
- After merge, delete the remote branch and clean up the local branch if no uncommitted work remains.

## Codex CLI Guardrails

- Codex may draft issues, create issues, create branches, commit, push, open PRs, update PR metadata, merge PRs, and clean up branches after the user explicitly approves the reviewed content or workflow in the current session.
- Codex must not merge when the branch base is polluted, the PR contains unrelated files, or the documented validation steps have not been executed.
- If a branch is contaminated by unrelated commits, create a clean branch from the correct base and cherry-pick only the approved commits before opening or updating the PR.

## Documentation Quality Gates

- Root-level docs and GitHub templates must follow the shared root Prettier and Markdown lint configuration.
- Before committing documentation or governance changes, run `npm run check:docs` from the repo root.
- Keep VSCode aligned with the workspace formatter settings in `.vscode/settings.json` to avoid editor-only formatting drift.

## GitHub MCP Notes

- Repo-local Codex config lives in `.codex/config.toml`.
- The configured GitHub MCP server is the official `github/github-mcp-server` Docker image.
- The server expects `GITHUB_PAT` to be available in the shell environment before launching Codex.
- Enabled GitHub toolsets are limited to `issues`, `repos`, `pull_requests`, `users`, and `context`.
- If `GITHUB_PAT` is missing, GitHub MCP will be configured but unusable until the environment variable is set locally.
