# Tide Island

Explore islands, catch fish, care for coastal animals, and head out on the water in a browser-based fishing adventure. Bring friends along in four-player rooms.

## Play the early alpha

**[Play Tide Island](https://bigger-reggae-newer-thoughts.trycloudflare.com)**

Free to play in your browser. A desktop computer with a keyboard and mouse is recommended. No game account or installation is needed.

The game is available while the host's server is running. This temporary Play link can change after a server restart.

## Join your friends

1. Open the Play link above.
2. Choose **Play together**.
3. Select **Find players**, or create a private room and share its code with your friends.

Each room supports up to **four players**.

## Controls

- **WASD:** move.
- **Mouse:** look around; click or drag the scene.
- **Space:** jump.
- **F:** cast your fishing line.
- **E:** interact when prompted.

## Before you play

- This is an **early alpha**: expect bugs and unfinished features.
- Player progress is **not yet saved between visits**.
- You can see other players move and fish, but coins, pets, habitats and purchases remain personal.
- If the game is unavailable, the host may be offline or the temporary link may need updating.

## Help improve the island

Found a bug or have an idea? [Leave feedback](https://github.com/TheCrazyGuyFighting/tide-island/issues). Tell us what happened, what you expected, and which browser you used.

## Game source

The [game folder](game/) contains the current source code, models, textures, and regression tests. See [development instructions](game/README.md) to run a local copy. GitHub stores the code; the Play button above still connects to the host's Mac, not a GitHub-hosted multiplayer server.

### Latest fix — 27 September 2026

- Cleared the full cabin-to-harbour walkway so it no longer passes underneath the hill.
- Solid terrain now takes priority over lower invisible deck floors, preventing the player from sinking into the ground.
- Added regression tests for the visible terrain, walking both directions and along the edges, jumping, steep slopes, and cabin doors.
