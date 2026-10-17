# Empire Tycoon

A Monopoly-inspired board game you play in the browser — online with friends or locally on one device. Built with TypeScript, React, Node.js, and Socket.IO.

## Features

- **Classic 40-tile board** — properties, railroads, utilities, taxes, Chance, Community Chest, Jail, and Free Parking
- **Full property economy** — buy, build houses and hotels (even-build rule), mortgage and unmortgage
- **Rent system** — color-group rent, per-railroad rent, and dice-based utility rent
- **Jail mechanics** — pay the fine, roll for doubles, or use a Get Out of Jail Free card
- **Auctions & trading** — bid on declined properties or trade properties and cash with other players
- **Bankruptcy & elimination** — go bankrupt and the game continues until one player remains
- **Two game modes** — online multiplayer over Socket.IO, or local pass-and-play on a single device
- **Live lobbies** — create or join with a lobby code, chat, spectate, and tune game settings before starting
- **Configurable rules** — starting cash, house/hotel limits, Free Parking jackpot, double salary on GO, auction style, and more

## Tech Stack

| Layer    | Technologies |
|----------|--------------|
| Language | TypeScript (monorepo) |
| Server   | Node.js, Express 5, Socket.IO 4 |
| Client   | React 19, Vite 6, Tailwind CSS 3, Zustand, Framer Motion, React Router 7 |
| Shared   | `@monopoly/shared` (types, board, cards), `@monopoly/game-engine` (pure game logic), `@monopoly/config` (default settings) |
| Tooling  | pnpm workspaces, ESLint, Prettier, Vitest |

## Project Structure

```
apps/
  server/    Express + Socket.IO server (lobbies, real-time game sync)
  client/    React SPA (home, lobby, game, local game screens)
packages/
  shared/    Shared types, board layout, card decks, constants
  game-engine/  Framework-free game logic (rules, dice, rent, auctions, trades)
  config/    Default game settings
```

## Getting Started

**Prerequisites:** Node.js 22+ and pnpm 10+

### Install dependencies

Run this command on your first setup:

```bash
pnpm run setup
```

### Run client and server together

```bash
pnpm dev
```

The server starts on `http://localhost:4000` and the client on `http://localhost:3000` (run the client with `--host` so other devices on your network can join).

### Other commands

```bash
pnpm build     # build all packages and apps
pnpm test      # run Vitest unit tests (game engine)
pnpm lint      # ESLint
pnpm typecheck # TypeScript check across workspaces
```

## How to Play

1. Open the client and **create a lobby** (or start a local game for pass-and-play).
2. Share the lobby code with friends, or join an existing one.
3. The host adjusts settings and starts the game.
4. Take turns rolling the dice, buying properties, building houses, and trading — bankrupt everyone else to win.

## Disclaimer

This project is a fan-made recreation inspired by the classic Monopoly board game. It is intended for educational purposes only and is not affiliated with or endorsed by the owners of the Monopoly trademark.
