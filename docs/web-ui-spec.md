# Web UI Spec

## Design Direction

- Do not use Angular Material for the main game shell.
- Use custom HTML, Tailwind utility classes, and local SCSS for interaction polish.
- Visual tone should feel like a lightweight game lobby:
  - soft radial and linear gradients
  - glassy white panels for setup and management views
  - dark, high-contrast surfaces for active gameplay
  - bold rounded buttons and strong typography
- The default breakpoint strategy is mobile-first. Desktop layouts may expand, but mobile must remain the baseline.

## Primary Views

The frontend remains a single app shell with three main views controlled in-app:

1. `game`
2. `ranking`
3. `catalog`

These are peer views in navigation. The landing experience still prioritizes room entry.

## Landing / Pre-room Experience

### Hero shell

- Brand eyebrow: `Music Game`
- Primary headline:
  - `Multiplayer lyrics guessing for small rooms.`
- Short supporting sentence describing the lobby and round-based guessing flow
- Top-right custom hamburger menu button

### Menu behavior

- Use a custom hamburger button, not an icon font or Angular Material menu.
- Menu opens a popover with:
  - before joining a room:
    - `Create Room`
    - `Join Room`
    - `Song maintenance`
  - after joining a room:
    - `Gameplay`
    - `Live room ranking`
    - `Song maintenance`
- Active destination should be visibly highlighted.

### Main landing content

- The default landing content should emphasize room entry only.
- Entry switch:
  - `Create Room`
  - `Join Room`
- Shared field:
  - `Nickname`
- Join-only field:
  - `Room Code`
- Create-only fields:
  - `Rounds`
  - `Seconds / Round`
- Primary CTA:
  - `Create Room` or `Join Room`

### Supporting messages

- Session notice remains visible as a secondary block below the main content.
- Error message remains visible as a separate error block when present.

## In-room Views

### Gameplay view

- Room share panel:
  - label: `Room Code`
  - large room code
  - explicit `Copy code` button
- Status strip:
  - room status
  - countdown
- Lyrics stage:
  - current round index
  - current phase
  - scrolling lyrics viewport
  - revealed answer message when a round is revealed
- Guess area:
  - `Your Guess` field
  - `Submit` button
- Action row:
  - `Start Game`
  - `Next Round`
  - `Leave Room`

### Ranking view

- Title: `Live room ranking`
- Optional self-score badge
- Player rows include:
  - initial avatar block
  - nickname
  - host indicator
  - online/offline state
  - score

### Catalog view

- Title: `Song maintenance`
- Collapse/open control
- Form fields:
  - `Song Title`
  - `Artist`
  - `Language`
  - `Aliases`
  - `Local Lyrics`
- CTA: `Add Song`
- Secondary status chip showing loaded song count
- Informational status message block
- Error block when applicable
- Song list with language and local-lyrics tags

## Responsive Rules

- Mobile is the default layout for all views.
- Headline must never be clipped. It may wrap across multiple lines.
- Landing form stacks in one column by default and expands on larger screens.
- Menu remains a compact popover trigger on both mobile and desktop.
- Gameplay controls may stack vertically on smaller screens.
- Lyrics viewport height can expand on larger screens, but must remain readable on mobile.

## Explicit Non-goals

- Do not reintroduce Angular Material cards, menus, form fields, chips, icons, or theme imports.
- Do not convert the app shell into multiple Angular routes as part of this UI work.
- Do not change game API contracts or socket behavior for visual redesign purposes.
