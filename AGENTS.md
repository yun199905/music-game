# Repository Guidelines

## Core Rules

- This workspace contains two independent repositories: `music-game-web` and `music-game-api`.
- Frontend and backend remain split for deployment and versioning; do not merge them into a monorepo toolchain unless explicitly requested.
- Keep secrets, PATs, and private credentials out of tracked files. Use local environment variables instead.
- When GitHub issue or PR metadata is needed, prefer the configured GitHub MCP server over ad hoc scraping or shell-based API calls.
- Before taking GitHub write actions through MCP, clearly state the intended action in the user update.
- GitHub issue and PR content should follow the templates and operating model in `docs/github-ops.md`.
- GitHub writes use a `preview first, apply second` workflow unless the user explicitly approves applying an already reviewed draft in the current session.
- For GitHub metadata, apply exactly one `type:*`, one `priority:*`, one `area:*`, and one `status:*` label at a time.

## GitHub MCP Notes

- Repo-local Codex config lives in `.codex/config.toml`.
- The configured GitHub MCP server is the official `github/github-mcp-server` Docker image.
- The server expects `GITHUB_PAT` to be available in the shell environment before launching Codex.
- Enabled GitHub toolsets are limited to `issues`, `repos`, `pull_requests`, `users`, and `context`.
- If `GITHUB_PAT` is missing, GitHub MCP will be configured but unusable until the environment variable is set locally.
