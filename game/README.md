# Tide Island game source

This is the playable game's source snapshot, including its 3D assets and tests. The main repository README keeps the current public Play link. Uploading source to GitHub does not make the multiplayer server always online.

## Run locally

Requires Node.js 22.13 or newer and pnpm.

```sh
cd game
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL printed in the terminal. The public copy's Vite configuration uses local database bindings and does not require the original Sites project or its sign-in plugin. For multiplayer development, apply the database schema locally using the configuration under `local-server`; the production Mac server does this automatically on start.

## Build

```sh
pnpm build
```

The compiled client and server are written to `dist/`. They are intentionally not committed. The [Mac server notes](local-server/README.md) describe the existing host's local game gateway and temporary public tunnel. Those scripts expect Cloudflare's `cloudflared` at `/opt/homebrew/bin/cloudflared`. The optional GitHub Play-link updater needs a separately configured repository credential; no credentials are included here.

## Cabin collision regression

`tests/cabin-terrain.test.ts` checks the actual rendered ground triangles against the collision surface, traverses the walkway in both directions at 30/60/144 FPS, and checks jumping, slopes, and cabin doors. Run with a TypeScript test runner, for example:

```sh
pnpm dlx tsx tests/cabin-terrain.test.ts
```

The terrain and landscape implementations are in `lib/island-world.ts` and `lib/island-landscape.ts`.

## Jump controls regression

`tests/jump-recovery.test.ts` checks repeated sleeping and jumping at 20/30/60/144 FPS, free rest, exhaustion, and pointer-only HUD focus recovery without stealing keyboard or menu focus.

```sh
pnpm dlx tsx tests/jump-recovery.test.ts
```

The fixes are in `lib/island-day-cycle.ts`, `lib/island-hud-focus.ts`, and `app/page.tsx`. The previous camera-angle casting update is also included; `tests/cast-aim.test.ts` verifies that 45° gives the maximum range.

## What is excluded

Private keys, environment files, user databases, local runtime state, generated builds, dependencies, temporary previews, and the original private Git history are not published.

## Assets and attribution

Third-party models and textures retain their creators' rights and any accompanying licenses or attribution files. See the license and credit files under `public/`; this repository does not grant a new blanket license over those assets. Check the applicable asset license before reuse or redistribution.
