const world = {
  fruits: {},      // id -> true(挂在树上) / false(已摘)
  wood: {},        // id -> true / false
  stars: {},       // id -> true / false
  campfire: false,
  fedAnimals: {},  // animalId -> 时间戳
  produce: {},     // id -> true(可收集)
  house: 0,        // 0..5 建造阶段
  weather: 'sunny',
};
for (let i = 0; i < 12; i++) world.fruits['f' + i] = true;
for (let i = 0; i < 8; i++) world.wood['w' + i] = true;
for (let i = 0; i < 8; i++) world.stars['s' + i] = true;

try{Object.assign(world,JSON.parse(localStorage.getItem('r6-opus-world')||'{}'));}catch{}
const players = new Map(); // id -> {ws, name, skin, x,y,z,ry,anim}
let nextId = 1;

const wss={on:(_,fn)=>window.__r6Accept=fn};
function send(ws, msg) { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); }
function broadcast(msg, except) { const s = JSON.stringify(msg); for (const [id, p] of players) if (id !== except && p.ws.readyState === 1) p.ws.send(s); }
function patch(obj) { saveWorld(); broadcast({ t: 'world', patch: obj }); }
function respawnLater(kind, id, ms) { setTimeout(() => { world[kind][id] = true; patch({ [kind]: { [id]: true } }); }, ms); }

wss.on('connection', (ws) => {
  const id = nextId++;
  let joined = false;
  ws.on('message', (raw) => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.t === 'join' && !joined) {
      joined = true;
      const pl = { ws, name: String(m.name || '玩家').slice(0, 12), skin: m.skin | 0, x: 0, y: 0, z: 8, ry: 0, anim: 0 };
      players.set(id, pl);
      const others = [...players].filter(([k]) => k !== id).map(([k, p]) => ({ id: k, name: p.name, skin: p.skin, x: p.x, y: p.y, z: p.z, ry: p.ry }));
      send(ws, { t: 'init', id, players: others, world, now: Date.now() });
      broadcast({ t: 'join', id, name: pl.name, skin: pl.skin, x: pl.x, y: pl.y, z: pl.z }, id);
      console.log(`+ ${pl.name} (#${id}) 在线 ${players.size}`);
      return;
    }
    const pl = players.get(id); if (!pl) return;
    switch (m.t) {
      case 'pos': pl.x = +m.x || 0; pl.y = +m.y || 0; pl.z = +m.z || 0; pl.ry = +m.ry || 0; pl.anim = m.anim | 0; break;
      case 'skin': pl.skin = m.skin | 0; broadcast({ t: 'skin', id, skin: pl.skin }, id); break;
      case 'fx': broadcast({ t: 'fx', id, kind: String(m.kind).slice(0, 16) }, id); break;
      case 'chat': broadcast({ t: 'chat', id, name: pl.name, text: String(m.text || '').slice(0, 80) }); break;
      case 'take': { // 采摘/拾取：fruits/wood/stars/produce
        const kind = m.kind; if (!['fruits', 'wood', 'stars', 'produce'].includes(kind)) return;
        if (!world[kind][m.id]) return send(ws, { t: 'deny', kind, id: m.id });
        world[kind][m.id] = false; patch({ [kind]: { [m.id]: false } });
        send(ws, { t: 'got', kind, id: m.id });
        if (kind === 'produce') delete world.produce[m.id];
        else respawnLater(kind, m.id, kind === 'stars' ? 25000 : 20000);
        break;
      }
      case 'campfire': if (!world.campfire) { world.campfire = true; patch({ campfire: true }); broadcast({ t: 'toast', text: `🔥 ${pl.name} 点燃了篝火！` }); setTimeout(() => { world.campfire = false; patch({ campfire: false }); }, 90000); } break;
      case 'feed': {
        const a = String(m.id); const now = Date.now();
        if (world.fedAnimals[a] && now - world.fedAnimals[a] < 8000) return;
        world.fedAnimals[a] = now; patch({ fedAnimals: { [a]: now } });
        const at = Array.isArray(m.at) ? m.at : [pl.x, pl.z];
        const k = ['cow', 'chicken', 'sheep'].includes(m.kind) ? m.kind : 'chicken';
        setTimeout(() => { const pid = 'p' + a + '_' + now; world.produce[pid] = { k, x: (+at[0] || 0) + 1, z: (+at[1] || 0) + 1 }; patch({ produce: { [pid]: world.produce[pid] } }); }, 1500);
        break;
      }
      case 'build': if (world.house < 5) { world.house++; patch({ house: world.house }); if (world.house === 5) broadcast({ t: 'toast', text: '🏠 小屋盖好啦！大家一起进去看看！' }); } break;
    }
  });
  ws.on('close', () => { if (players.delete(id)) { broadcast({ t: 'leave', id }); console.log(`- #${id} 离开 在线 ${players.size}`); } });
});

// 位置广播 15Hz
setInterval(() => {
  if (players.size < 2) return;
  const list = [...players].map(([id, p]) => [id, +p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2), +p.ry.toFixed(2), p.anim]);
  broadcast({ t: 'pos', list });
}, 66);

// 天气循环
const WEATHERS = ['sunny', 'cloudy', 'rain', 'sunny', 'sunset'];
let wi = 0;
setInterval(() => { wi = (wi + 1) % WEATHERS.length; world.weather = WEATHERS[wi]; patch({ weather: world.weather }); }, 45000);


function saveWorld(){try{localStorage.setItem('r6-opus-world',JSON.stringify(world));}catch{}}window.WebSocket=window.R6LocalSocket;window.__r6WorldSave=saveWorld;

for(const kind of ["fruits","wood","stars"])for(const id in world[kind])if(!world[kind][id])respawnLater(kind,id,20000);
