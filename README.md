# Tide Island

Explore islands, catch fish, care for coastal animals, and head out on the water in a browser-based fishing adventure. Bring friends along in four-player rooms.

## Play the early alpha

**[Play Tide Island](https://bob-corps-walker-docs.trycloudflare.com)**

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

### Latest update — Jump controls · 4 October 2026

- Fixed jumping becoming unavailable after sleeping, even when energy was full. Waking now clears the rest timer completely.
- Mouse clicks on game controls now return keyboard focus to the scene, so Space keeps working for jumping instead of activating the last-clicked HUD button.
- Keyboard navigation and typing in menus are preserved. Sleeping is still free, and normal jump restrictions during fishing, swimming, or boat travel remain unchanged.
- Added regression tests for repeated sleep-and-jump cycles at 20, 30, 60, and 144 FPS, plus HUD focus recovery.

Reload the game to load this update. The earlier cabin terrain and 45° casting improvements are included in the current source.
