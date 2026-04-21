# AGENTS.md

## Project

- Repo: `music-game-web`
- Stack: Angular 21, Tailwind CSS, SCSS, Socket.IO client
- Purpose: mobile-first frontend for the multiplayer lyrics guessing game

## Repo Governance Link

- Root workflow rules live in `/AGENTS.md`.
- GitHub issue, PR, and merge flow lives in `/docs/github-ops.md` and `/docs/git-flow.md`.
- Codex CLI automation rules live in `/docs/codex-workflows.md`.
- Documentation and governance file changes should pass `npm run check:docs` from the repo root before commit.

## Runbook

- Install: `npm install`
- Dev server: `npm start`
- Test: `npx ng test --watch=false`
- Type-check: `npx tsc -p tsconfig.app.json --noEmit`

## Important Files

- App shell: `src/app/app.ts`
- Main template: `src/app/app.html`
- Main styles: `src/app/app.scss`
- Runtime config: `public/app-config.js`
- Shared models/services: `src/app/core/*`

## Working Rules

- Keep the project as a standalone Angular app in this repo only.
- Preserve the mobile-first layout and do not introduce desktop-only assumptions.
- Keep API and WebSocket base URLs runtime-configurable through `public/app-config.js`.
- Prefer extending the existing single-page flow before adding routing complexity.
- Keep frontend types local to this repo; do not introduce a shared package with the backend.
- Use Tailwind utility classes for layout/spacing and SCSS only for behavior that is awkward in utilities, such as lyric scrolling animation.

## Angular Conventions

- This repo targets Angular 21.
- Prefer modern template control flow: `@if`, `@for`, and `@switch`.
- Do not introduce new `*ngIf` or `*ngFor` in new code unless there is a specific compatibility reason.
- Prefer signal-first component state and current standalone Angular APIs.
- When editing an existing template, upgrade touched legacy control-flow syntax if the change stays localized and low-risk.

## Testing Notes

- `ng test` is the current reliable frontend verification in this environment.
- `ng build` has previously aborted locally with `Abort trap: 6`; if it fails again, treat that as an environment-specific build issue unless type-check/test output shows an application error.

## Deployment Notes

- Target hosting: Vercel Free
- Expected build output: `dist/music-game-web/browser`
- Before deployment, update `public/app-config.js` to point to the deployed API origin.
