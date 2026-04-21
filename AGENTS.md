# Repository Guidelines

## Core Rules

- This workspace contains two independent repositories: `music-game-web` and `music-game-api`.
- Frontend and backend remain split for deployment and versioning; do not merge them into a monorepo toolchain unless explicitly requested.
- Keep secrets, PATs, and private credentials out of tracked files. Use local environment variables instead.
- When GitHub issue or PR metadata is needed, prefer the configured GitHub MCP server over ad hoc scraping or shell-based API calls.
- Before taking GitHub write actions through MCP, clearly state the intended action in the user update.

## GitHub MCP Notes

- Repo-local Codex config lives in `.codex/config.toml`.
- The configured GitHub MCP server is the official `github/github-mcp-server` Docker image.
- The server expects `GITHUB_PAT` to be available in the shell environment before launching Codex.
- Enabled GitHub toolsets are limited to `issues`, `repos`, `pull_requests`, `users`, and `context`.
- If `GITHUB_PAT` is missing, GitHub MCP will be configured but unusable until the environment variable is set locally.
