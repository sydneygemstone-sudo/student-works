# Beast Kings · Legends 3.0

七种角色，各有不同招式；Fluffy 与水鼠使用原始使魔模型预渲染的 2D 动作。 / Seven guardians with distinct moves; Fluffy and Water Rat use 2D pose atlases rendered from their original Familiar rigs.

Run `npm ci`, then `npm start`. Default: http://localhost:8765. Set `PORT` to change it. Set `PLAY_URL` to your own Tailscale HTTPS game URL and proxy that URL to this server. Up to three players can join; a fourth watches. GitHub Pages runs solo practice and quests.

Keyboard: A/D move, Space jump/hold to fly, S block, J/I basic moves, K area move, L escape, U power, O signature. The roster Move book and touch buttons show each character's actual moves. Earn gems/XP by completing practice or quests, including offline after the HTTPS page has cached. Saves stay local to the device/browser/origin.

运行 `npm test` 查看 21 项引擎／服务器回归与 12 项战斗检查。工程模拟通过不代表实体 iPad 或孩子已验收。 / Run `npm test` for 21 engine/server regressions and 12 combat checks. Engineering simulation does not establish physical-iPad or child acceptance.

See [双语升级日志 / Bilingual update](../../LEGENDS.zh-en.md) and [测评表 / Review](review.html). Artwork atlases are stored locally in `assets/`; no 3D engine or remote asset service is needed by the game.
