# AGENTS.md

## Project

- Repo: `music-game-api`
- Stack: NestJS 11, TypeORM, PostgreSQL, Socket.IO, Swagger
- Purpose: backend for rooms, gameplay sync, lyrics masking, and persistence

## Repo Governance Link

- Root workflow rules live in `/AGENTS.md`.
- GitHub issue, PR, and merge flow lives in `/docs/github-ops.md` and `/docs/git-flow.md`.
- Codex CLI automation rules live in `/docs/codex-workflows.md`.
- Documentation and governance file changes should pass `npm run check:docs` from the repo root before commit.

## Runbook

- Install: `npm install`
- Dev server: `npm run start:dev`
- Start once: `npm run start`
- Build: `npm run build`
- Test: `npm run test -- --runInBand`

## Important Files

- Bootstrap: `src/main.ts`
- Module wiring: `src/app.module.ts`
- Health checks: `src/app.controller.ts`, `src/db-health.service.ts`
- Game logic: `src/game/game.service.ts`
- WebSocket gateway: `src/game/game.gateway.ts`
- Persistence layer: `src/game/persistence.service.ts`
- Lyrics masking/fetching: `src/game/masking.service.ts`, `src/game/lyrics.service.ts`

## Working Rules

- Load environment values from `.env.local` first, then `.env`.
- Keep `DATABASE_URL` optional so the app can still run in memory-only mode.
- When `DATABASE_URL` is present, assume Supabase/Postgres with `DB_SSL=true`.
- Do not hardcode secrets in source files; keep them in environment files or platform env vars.
- Keep the multiplayer runtime single-node unless Redis/distributed state is intentionally added.
- Preserve the current contract shape for room REST endpoints and Socket.IO events unless frontend changes are coordinated.
- Keep the song-title masking step on the server before any lyrics are emitted to clients.

## Testing Notes

- Verify DB connectivity with `GET /health/db`.
- The current setup uses `synchronize: true` for development convenience; avoid expanding schema risk without a migration plan.
- If Supabase direct connection fails, prefer the `Session pooler` URI over the IPv6-only direct host.

## Deployment Notes

- Target hosting: Render Free Web Service
- Required env vars: `DATABASE_URL`, `DB_SSL`, `CORS_ORIGIN`, `LYRICS_PROVIDER`, `LYRICS_API_BASE_URL`
- Swagger docs are exposed at `/docs`
