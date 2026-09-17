# Shared protocol v1 — fixed contract

Node ESM server serves public assets, GET /health and ws /ws. Default PORT 18888 HOST 0.0.0.0. Modules: simulation.mjs exports createGame(), step(game,dt), handleAction(game,role,action), snapshot(game), setInput(game,role,input). Server owns room objects and player sessions. Frontend imports /vendor/three.module.js; server maps /vendor/ to node_modules/three/build safely.

WS client sends {type:'join',room:'CORAL',role:'pirate'|'diver',token?:string}. Server sends {type:'welcome',role,room,token} then {type:'state',state:SNAPSHOT}. Reconnect with saved token restores slot. Occupied role by other live token errors. Disconnected slot retained 15sec then released; room state retained. Default room CORAL, room upper A-Z0-9- 1..16. Client stores token per room+role. Two roles required for running, automatic start once both join; waiting until then. Joining running room reconnects. On player disconnect state pauses simulation until both reconnect (public online flags). Rejoin releases any previous connection belonging to token; token validated not trusted role override.

Client sends {type:'input',x:number,z:number}, normalized movement vector [-1,1] at ≤20Hz. x and z are world plane: x left/right; z negative farther/up-screen. Diver always underwater in plane y=-3. Pirate confined to deck; not required to move to perform chop/fire. Client sends {type:'action',action:'chop'|'fire'|'repair'|'boost'|'bubble'|'restart'}. Diver uses boost,bubble; pirate chop,fire,repair; restart either only won/lost. Automatic proximity collects treasure/fish and dock auto-deposits/refills; repeated action throttled server.

World x[-13,13], z[-11,11], deck centered (0,-8); diver dock/spawn (0,-6) radius2.0. Pirate deck bounds x[-3,3] z[-10,-7]. All entity positions x,z, renderer chooses y by entity kind. Diver can move whole underwater plane except min z=-6; server enforce. Camera 3D elevated view can expose ship and reef, movement screen-space should align positive z down. Enemy boat monsters approach dock, sharks underwater.

SNAPSHOT fixed keys:
{phase:'waiting'|'playing'|'won'|'lost', time:seconds,
 players:{pirate:{x,z,hunger:0..100,online:boolean},diver:{x,z,hunger:0..100,online:boolean,hp:0..100,bagGems:number,bagStars:number,boost:remainingSeconds,bubbleCooldown:remainingSeconds}},
 ship:{hp:0..100,food:portions,melon:wholeCount,chop:0..1,fireCooldown:remainingSeconds},
 goal:{gems:depositedCount,stars:depositedCount,needGems:5,needStars:2},
 treasures:[{id,kind:'gem'|'star',x,z,active:boolean}],
 fish:[{id,x,z,active:boolean}], sharks:[{id,x,z}], monsters:[{id,x,z,hp}],
 effects:[{id,kind:'cannon'|'bubble'|'pickup'|'hit'|'feed',x,z,tx?:number,tz?:number,ttl:seconds}],
 message:string }

Server broadcasts 10Hz, simulation ~20Hz dt bounded. Both devices always get full same state. Entities array lengths can change, effects expire. Frontend must survive missing welcome, reconnect, offline, and both waiting/playing. No server auth outside tailscale required classroom prototype; no camera/microphone or third-party asset requests. Health indicates instance name 'coral-crew' and port. Server tests use node:test in test.mjs. Three/ws installed by root only; no agent writes package manifest.

Gameplay: team goal deposited 5 gems 2stars; ≥7 treasures exactly those goals plus optional extras ensure attainable. Diver touch collect only hunger>0, dock deposits all and consumes ship.food to refill hunger & hp; hunger zero still move home. Pirate hunger restored when chopping using available food; cannot permanently block chopping at0. Chop takes3 valid presses with cooldown≥0.25 sec then one melon→3 food; supply replenishes every10sec max5. Fish touch grants one boat food and respawns. Hunger slow (~0.7/sec) visible, not punishing. Sharks cause modest hp damage with invulnerability and knockback; at0hp diver returns dock loses some carried gems that respawn, never loses attainability. Boat monsters damage ship slowly; fire auto aims nearest and knocks/defeats; repair recovers modest hp at cooldown. Boost limited 2sec with5sec cooldown (include boostCooldown extra field if desired). Bubble is watermelon gun auto targets/repels nearest shark. Won when deposited>=goals; lost shiphp0, restart clears state preserving online clients.

Any necessary contract change must be messaged to root before implementation; don't silently invent incompatible fields. Extra fields okay, core names stable.
