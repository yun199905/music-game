# music-game-web

Angular frontend for the multiplayer lyrics guessing game.

## What is implemented

- Mobile-first single-page room flow
- Create room / join room / live leaderboard
- Socket.IO room sync
- Auto-scrolling masked lyrics panel
- Host-only controls for start and next round
- Runtime deploy config via `public/app-config.js`

## Local development

```bash
npm install
npm start
```

The frontend runs on `http://localhost:4200`.

## Runtime config

Edit `public/app-config.js` before deployment:

```js
window.APP_CONFIG = {
  apiBaseUrl: 'https://your-render-api.onrender.com',
  wsBaseUrl: 'https://your-render-api.onrender.com',
};
```

## Deploy target

- Vercel Free
- Build command: `npm run build`
- Output directory: `dist/music-game-web/browser`

## Notes

- Tailwind is enabled through PostCSS.
- The app expects the NestJS API to expose both REST and Socket.IO on the same origin.
- In this environment, `ng build` currently aborts during the Angular build step with `Abort trap: 6`; TypeScript compilation itself passes with `npx tsc -p tsconfig.app.json --noEmit`.
