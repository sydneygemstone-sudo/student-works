# Trio World Opus — Cloudflare online playtest R1

Release: `opus-cloud-r1-20260925` (25 September 2026, Sydney).
Status: **deployed; partial QA; not full acceptance**. Read `QA-REPORT.json` for observed passes and unresolved timeouts.

## Family entry

https://sydneygemstone-sudo.github.io/student-works/adventure-world/builds/trio-world-opus/online/

One person opens the page and clicks **复制邀请 / Copy invite**, then sends that complete link to the other two players. All three open the same link and enter nicknames. Each independently opened entry page creates a different random room; sharing only the bare entry URL does not join the same world. Up to three connections fit in one room, including extra tabs opened by a teacher. The fourth is refused. Share invites privately; this is not a public lobby or a verified-membership system.

The original desktop controls and iPad touch controls are retained. Physical iPad/Safari and three-home-network acceptance remain outstanding. Refreshing does not restore personal inventory or quest progress. Shared-world retention is implemented separately; refer to the QA report before treating it as an accepted save system.

## Deployed architecture

GitHub Pages serves the game and assets. Cloudflare Worker `trio-world-opus` handles secure WebSockets, with a SQLite-backed `TrioRoom` Durable Object per invite room. Neither the teacher's Mac nor MSI is a runtime server. No local tunnel is used by this release.

`../public/index.html` and `../server.js` remain the original LAN release. `../online/online-loader.js` verifies the original HTML Git blob (`0383acf33132227d69596b3ff2c7a0e5debecbe3`), then applies checked client adaptations without overwriting it. If that archived file changes, the adapter stops rather than silently running against another version.

World protocol preserves positions, appearance, chat, pickup arbitration, campfires, feeding, produce, house progress and weather. Input lengths/rates and room capacity are bounded. This is cooperative, trusted-friend play: client inventory/action costs are not an authoritative anti-cheat economy, and no chat moderation service was added.

## Source and deployment

Canonical source is this repository's `cloudflare/worker.mjs`, `cloudflare/wrangler.jsonc` and `../online/`. Earlier uncommitted local adapter drafts are not the deployed release and must not overwrite these files during later recovery.

Deployment was performed through the connected Cloudflare account's API, not through a local Wrangler login. Verify accessible accounts with the connector's live account list; do not trust stale account IDs embedded in tool-description examples. Worker source, deployment ID and test results are recorded in `QA-REPORT.json`. No paid subscription or domain purchase was created; account billing details were not verified.

Compatibility date `2025-04-01` is a runtime compatibility setting, not the release date. The first deployment used migration `v1` with `new_sqlite_classes: ["TrioRoom"]`. Preserve the namespace on subsequent deploys; never introduce a delete migration as a routine rollback.

## Acceptance and rollback

Basic real browser-WebSocket multiplayer checks passed. An isolated feeding/produce test also passed. The first combined run timed out on delayed produce, and later browser-regression attempts timed out; these have not been relabelled as full passes. No three-full-graphical-client or physical-device completion is claimed.

`../online/qa.html` is an inert, separate browser-test page. The old build-directory entry redirects to the classroom HUB and is unsuitable as an isolated automation harness. Tests must create fresh synthetic rooms, never use a child's active invite.

To stop this test deployment, disable this Worker's `workers.dev` subdomain through the connector. Preserve the Durable Object namespace and repository source unless the owner explicitly authorizes deletion. The original LAN build and current classroom HUB were not changed by this release.
