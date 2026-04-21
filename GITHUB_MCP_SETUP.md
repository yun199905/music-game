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

## Notes

- Do not commit PAT values into tracked files.
- Docker must be installed and running.
- This setup is repo-local: other repositories will not automatically get this GitHub MCP server.
- `gh` CLI is optional. The issue integration path for Codex is MCP-based, not `gh`-based.
