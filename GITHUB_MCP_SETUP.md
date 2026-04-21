# GitHub MCP Setup

This workspace is configured so Codex CLI can talk to GitHub through the official GitHub MCP server.

## What is already in the repo

- Repo-local Codex config: `.codex/config.toml`
- GitHub MCP server: `ghcr.io/github/github-mcp-server`
- Enabled toolsets: `issues,repos,pull_requests,users,context`

## One-time local setup

1. Create a GitHub Personal Access Token.
2. Grant at least the `repo` scope.
3. Export it in your shell profile.

For `~/.zshrc` or `~/.bashrc`:

```bash
export GITHUB_PAT="your_github_pat_here"
```

Reload the shell:

```bash
source ~/.zshrc
```

Or for bash:

```bash
source ~/.bashrc
```

## Verification

From this repo root:

```bash
codex mcp list
codex mcp get github
```

Then start a new Codex session from this repo so it picks up the repo-local `.codex/config.toml`.

## Automation Prerequisites

Codex CLI automation in this repo assumes all of the following are true:

- `GITHUB_PAT` is available in the shell before launching Codex
- Docker is installed and running
- `origin` points to `yun199905/music-game`
- Your GitHub token has issue, PR, and merge permissions
- Git push is available from the local machine
- Root documentation tooling is installed so `npm run check:docs` can pass before governance changes are committed

## Automation Verification Checklist

Before relying on Codex for issue and PR automation, verify:

```bash
codex mcp list
codex mcp get github
git remote -v
npm run check:docs
```

Optional GitHub-specific checks:

```bash
git fetch origin main
```

If Codex will be allowed to merge PRs automatically, also confirm the current account can merge a test PR in this repository.

## Common Failure Modes

- `GITHUB_PAT` is missing or stale
- Docker is not running, so the MCP server cannot start
- The current branch has no upstream branch
- The branch was cut from the wrong base and pollutes the PR with unrelated commits
- Root docs tooling is not installed, so Markdown or template changes fail local checks

## Notes

- Do not commit PAT values into tracked files.
- Docker must be installed and running.
- This setup is repo-local: other repositories will not automatically get this GitHub MCP server.
- `gh` CLI is optional. The issue integration path for Codex is MCP-based, not `gh`-based.
