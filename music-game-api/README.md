# music-game-api

NestJS backend for the multiplayer lyrics guessing game.

## What is implemented

- REST endpoints for room creation, room join, room state, and song catalog
- Socket.IO events for room sync, round start, guesses, round end, and next round
- Lyrics fetching via `lyrics.ovh`
- Song-title masking before lyrics are sent to players
- In-memory room runtime with optional TypeORM persistence when `DATABASE_URL` is provided
- Swagger docs at `/docs`

## Local development

```bash
npm install
cp .env.example .env
npm run start:dev
```

The API runs on `http://localhost:3000`.

## Environment variables

```bash
PORT=3000
CORS_ORIGIN=http://localhost:4200
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/music_game
DB_SSL=false
LYRICS_PROVIDER=lyrics.ovh
LYRICS_API_BASE_URL=https://api.lyrics.ovh/v1
```

If `DATABASE_URL` is omitted, the app still runs with in-memory state and in-memory seeded songs.

## Deploy target

- Render Free Web Service
- Start command: `npm run start:prod`
- Build command: `npm run build`
- Database: Supabase Postgres or any PostgreSQL-compatible provider

## Verification

```bash
npm run build
npm run test
```
