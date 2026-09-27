# Tide Island on this Mac

Double-click **Start Tide Island Server.command** in the project folder. It prints the temporary public link. Use that same link on every player's device, then Play together → Find players or share a room code. Starting again while online preserves the existing link. Restarting after stopping generates a new one.

Double-click **Stop Tide Island Server.command** to disconnect the tunnel and stop the local game. It does not delete game files or the local database. This setup does not install a login service, open router ports or keep the Mac awake automatically. Closing the launcher window is fine; sleeping, restarting or disconnecting this Mac interrupts the game.

The original chatgpt.site game is unchanged and its rooms are separate. This local copy serves the existing compiled game in `dist`, not a Vite development server. After future game edits, build again before restarting the local server.

## A permanent page to share

Share **https://github.com/TheCrazyGuyFighting/tide-island**. Each public server start automatically updates that page's **Play Tide Island** button after checking the new Cloudflare link is reachable. The game URL still changes; the GitHub page stays the same. This is a repository page, not a GitHub Pages deployment. The Mac still needs to be awake and online to play.

Updates run in the background, usually within a minute. `node local-server/control.mjs status` reports whether the button is current. If GitHub is unavailable, the game keeps running. Double-click Start again to retry a failed update without restarting the game, or use `node local-server/control.mjs sync-link`. Local-only starts do not change the public link.

The public readiness check queries Cloudflare's authoritative DNS directly because recursive/local/VPN DNS can cache a newly issued tunnel name as missing. Cloudflare DNS (1.1.1.1 / 1.0.0.1) is used to discover the long-lived nameserver addresses, not to cache the new game name. HTTPS certificate verification stays enabled and no system network settings are changed. Visitors using a stale DNS cache may still need to wait or use their own network's normal troubleshooting.

If directed DNS is blocked or returns a stale negative answer, the updater retries through Cloudflare DNS over HTTPS. It accepts only a public IPv4 address for the exact validated tunnel name, does not follow redirects, and still checks the game server's HTTPS certificate normally.

The updater changes only the destination of the single `[Play Tide Island](...)` link in the remote `main` branch's `README.md`. Keep that label when editing the README. It fetches the latest text, preserves other edits, never force-pushes, and stops rather than guessing when the link is missing or ambiguous. No game code or models are uploaded to GitHub.

This Mac has a dedicated repository-only deploy key. Its private half is in ignored `.local-server/github-link-key` with permissions 600, outside the served files. Do not upload or share it. The updater pins GitHub's published SSH host key and does not use your general SSH agent. To revoke its access, remove **Tide Island Play link updater — this Mac** under the repository's **Settings → Deploy keys**. GitHub grants write access to the whole intro repository even though this updater only changes the Play link.

## Same Wi-Fi / local network

Open the `Same Wi-Fi` address printed by the launcher on other devices connected to the same trusted home network. No Cloudflare connection or domain is needed for this direct route. Use **Play together** to join a room; there are no account logins. The LAN, localhost and public tunnel all use the same local crew database.

The Mac currently uses `http://192.168.3.114:8870`. Its router may assign another address later; restart the server after changing networks and check the launcher output. Only private IPv4 addresses on physical Mac Wi-Fi/Ethernet adapters are enabled. The Mac must remain awake. Guest Wi-Fi/client isolation or a macOS firewall rule can prevent connections; do not disable the firewall. If prompted, allow incoming connections only for the game server's Node executable.

LAN access uses HTTP, so use it only on a trusted home network, not public Wi-Fi. A local-only start is also supported with `node local-server/control.mjs start --local-only` after stopping the existing server; it skips the public tunnel.

## Boundaries

- Cloudflare is only the HTTPS tunnel/relay; game requests and the crew database run locally.
- Only `/`, `/api/crew` and explicitly listed built public assets pass through the gateway.
- No source directories, environment files, database files, debugging endpoints or server controls are public.
- Port 8870 serves the game on `127.0.0.1` and detected private physical LAN addresses only, never every interface. The private worker engine (8871) and token-protected controls (8872) remain loopback-only and are never forwarded. Exact game hostnames and request origins are checked on LAN and public requests.
- Runtime state, logs and the separate local SQLite/D1 database are in ignored `.local-server`. No cloud database is used. Local migrations use `--local` and a dedicated persistence directory.
- This is a temporary testing setup, not an always-on production service. Cloudflare Quick Tunnels do not guarantee uptime; links can change and have a 200 in-flight request limit.
- Existing gameplay limitations are unchanged: four players per room, shared movement/poses, personal visit-only money, pets and orders. The local crew database does not add saved player progress.

Reference: https://developers.cloudflare.com/tunnel/get-started/#quick-tunnels-development
