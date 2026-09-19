// 3D 渲染 + 联机客户端 — 作者: Codex (GLM 5.3 Max)
'use strict';

(() => {
const $ = (s) => document.querySelector(s);
const GRID = 9, CELL = 2, HOME = { x: 4, y: 4 };

let ws = null, token = null, myRole = 'bear', solo = false, state = null;
let localGame = null;
let scene, camera, renderer, meshes = {}, clock;
const TERRAIN_COLORS = { grass: 0x4c8a3f, forest: 0x245c2a, net: 0x6b7a2e, stone: 0x777d84, hedge: 0x1c4a22 };

function gridToWorld(x, y) { return { x: (x - 4) * CELL, z: (y - 4) * CELL }; }

// ---------- Three.js 场景 ----------
function init3D() {
  if (!window.THREE) return;
  renderer = new THREE.WebGLRenderer({ canvas: $('#c3d'), antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fd3e8);
  scene.fog = new THREE.Fog(0x9fd3e8, 14, 34);
  camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const sun = new THREE.DirectionalLight(0xfff2d0, 1.0);
  sun.position.set(6, 12, 4);
  scene.add(sun);

  buildWorld();
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
  clock = new THREE.Clock();
  requestAnimationFrame(tick);
}

function buildWorld() {
  fetch('/api/info').then(r => r.json()).catch(() => null);
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const t = (window.MAZE_TERRAIN && MAZE_TERRAIN[y][x]) || 'grass';
      const { x: wx, z: wz } = gridToWorld(x, y);
      const mat = new THREE.MeshLambertMaterial({ color: TERRAIN_COLORS[t] || 0x4c8a3f });
      const h = t === 'hedge' ? 3.4 : t === 'stone' ? 1.1 : t === 'forest' ? 0.2 : 0.1;
      const m = new THREE.Mesh(new THREE.BoxGeometry(CELL * .96, h, CELL * .96), mat);
      m.position.set(wx, h / 2, wz);
      scene.add(m);
      if (t === 'forest') {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.16, .2, 1.6), new THREE.MeshLambertMaterial({ color: 0x5b3d22 }));
        trunk.position.set(wx, 1.0, wz); scene.add(trunk);
        const crown = new THREE.Mesh(new THREE.ConeGeometry(.8, 1.8, 8), new THREE.MeshLambertMaterial({ color: 0x1d5c28 }));
        crown.position.set(wx, 2.4, wz); scene.add(crown);
      }
      if (t === 'net') {
        const net = new THREE.Mesh(new THREE.BoxGeometry(CELL*.7, .5, CELL*.7), new THREE.MeshLambertMaterial({ color: 0xb9a44a, wireframe: true }));
        net.position.set(wx, 1.0, wz); scene.add(net);
      }
    }
  }
  // 家园小木屋 + 庇护罩
  const { x: hx, z: hz } = gridToWorld(HOME.x, HOME.y);
  const house = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.0, 1.3), new THREE.MeshLambertMaterial({ color: 0x9c6b3f }));
  house.position.set(hx - .3, .5, hz - .3); scene.add(house);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.1, .8, 4), new THREE.MeshLambertMaterial({ color: 0xb5432f }));
  roof.position.set(hx - .3, 1.4, hz - .3); roof.rotation.y = Math.PI / 4; scene.add(roof);
  const shield = new THREE.Mesh(new THREE.SphereGeometry(1.6, 20, 14), new THREE.MeshBasicMaterial({ color: 0x7fd8ff, transparent: true, opacity: .22, wireframe: true }));
  shield.position.set(hx, 1.0, hz); scene.add(shield);
  meshes.shield = shield;
}

const DIRVECS = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };

function ensureActor(role, color) {
  if (meshes[role]) return meshes[role];
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.34, .55, 6, 12), new THREE.MeshLambertMaterial({ color }));
  body.position.y = .75; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.4, 16, 12), new THREE.MeshLambertMaterial({ color }));
  head.position.y = 1.5; g.add(head);
  const earGeo = new THREE.ConeGeometry(.1, .5, 6);
  const e1 = new THREE.Mesh(earGeo, new THREE.MeshLambertMaterial({ color })); e1.position.set(-.15, 1.95, 0); e1.rotation.z = .2;
  const e2 = e1.clone(); e2.position.x = .15; e2.rotation.z = -.2;
  g.add(e1, e2);
  scene.add(g);
  meshes[role] = g;
  return g;
}

let arrowMesh = null;
function showBlockArrow(show) {
  if (!scene) return;
  if (show && !arrowMesh) {
    arrowMesh = new THREE.Mesh(new THREE.ConeGeometry(.4, 1.0, 4), new THREE.MeshBasicMaterial({ color: 0xffb13d }));
    arrowMesh.rotation.z = Math.PI;
    scene.add(arrowMesh);
  }
  if (arrowMesh) arrowMesh.visible = !!show;
}

function renderState() {
  if (!state || !scene) return;
  for (const role of ['bear', 'bunny']) {
    const p = state.players[role];
    const g = ensureActor(role, role === 'bear' ? 0x8a5a2b : 0xe8d8c8);
    const w = gridToWorld(p.x, p.y);
    g.userData.target = w; g.userData.dir = p.dir;
    // 队友视线遮挡
    if (role !== myRole) g.visible = hasLOS();
  }
  // 动物
  for (const a of state.animals) {
    const key = 'animal-' + a.id;
    if (a.carried) { if (meshes[key]) meshes[key].visible = false; continue; }
    if (!meshes[key]) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(.28, 12, 10), new THREE.MeshLambertMaterial({ color: 0xffe08a }));
      scene.add(m); meshes[key] = m;
    }
    const w = gridToWorld(a.x, a.y);
    meshes[key].position.set(w.x, .35, w.z);
    meshes[key].visible = true;
  }
  for (const b of state.boxes) {
    const key = 'box-' + b.id;
    if (!meshes[key]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(.6, .6, .6), new THREE.MeshLambertMaterial({ color: 0xd868a8 }));
      scene.add(m); meshes[key] = m;
    }
    meshes[key].visible = !b.opened;
  }
  if (meshes.shield) meshes.shield.material.opacity = state.shield > 0 ? 0.18 + state.shield * .1 : 0;

  $('#turn-info').textContent = `第 ${state.round}/14 回合`;
  $('#weather').textContent = state.weather === 'storm' ? '⛈️ 雷雨' : '☀️ 晴朗';
  $('#courage').textContent = `✨ 勇气 ${state.courage}`;
  $('#shield').textContent = `🛡️ 庇护 ${state.shield}/2`;
  const saved = state.animals.filter(a => a.carried === 'home').length;
  $('#saved').textContent = `🏡 已救 ${saved}/8`;
  $('#my-role').textContent = solo ? `🎭 控制：${myRole === 'bear' ? '小熊' : '小兔'} (Tab 切换)` : (myRole === 'bear' ? '🐻 小熊' : '🐰 小兔');
  $('#btn-ready').classList.toggle('armed', state.players[myRole].ready);
  $('#btn-ready').textContent = state.players[myRole].ready ? '⏳ 等待队友…（可取消）' : '✅ 结束本回合';
  if (state.phase !== 'playing') banner(state.phase === 'won' ? '🎉 全部小动物救回家，胜利！' : '🌧️ 回合用尽…下次一定！');
}

function hasLOS() {
  // 与服务端一致：切比雪夫距离 + 森林/树篱/石头遮挡（近似）
  const a = state.players[myRole], b = state.players[myRole === 'bear' ? 'bunny' : 'bear'];
  if (Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) > 4) return false;
  const x0 = a.x, y0 = a.y, x1 = b.x, y1 = b.y;
  const dx = Math.abs(x1-x0), dy = Math.abs(y1-y0);
  const sx = x0<x1?1:-1, sy = y0<y1?1:-1;
  let x = x0, y = y0, e = dx - dy;
  while (!(x===x1 && y===y1)) {
    const e2 = 2*e;
    if (e2 > -dy) { e -= dy; x += sx; }
    if (e2 < dx) { e += dx; y += sy; }
    if (x===x1 && y===y1) break;
    const t = MAZE_TERRAIN[y][x];
    if (t === 'hedge' || t === 'stone' || t === 'forest') return false;
  }
  return true;
}

function tick() {
  requestAnimationFrame(tick);
  if (!state) return;
  const dt = clock.getDelta();
  for (const role of ['bear', 'bunny']) {
    const g = meshes[role]; if (!g || !g.userData.target) continue;
    const t = g.userData.target;
    g.position.x += (t.x - g.position.x) * Math.min(1, dt * 8);
    g.position.z += (t.z - g.position.z) * Math.min(1, dt * 8);
    const d = g.userData.dir;
    const yaw = { N: Math.PI, E: Math.PI/2, S: 0, W: -Math.PI/2 }[d] || 0;
    g.rotation.y += (yaw - g.rotation.y) * Math.min(1, dt * 8);
  }
  if (arrowMesh && arrowMesh.visible) arrowMesh.rotation.y += dt * 3;

  // 越肩跟随 + 相机防穿墙（贴身收缩）
  const me = meshes[myRole];
  if (me) {
    const dirYaw = { N: Math.PI, E: Math.PI/2, S: 0, W: -Math.PI/2 }[state.players[myRole].dir] || 0;
    let dist = 4.2, height = 2.6;
    const p = state.players[myRole];
    // 目标格若是高墙，收缩相机
    const [dx, dy] = DIRVECS[p.dir];
    const behind = { x: p.x - dx, y: p.y - dy };
    if (behind.x < 0 || behind.x > 8 || behind.y < 0 || behind.y > 8 || ['stone','hedge'].includes(MAZE_TERRAIN[behind.y][behind.x])) { dist = 2.0; height = 1.8; }
    const cx = me.position.x + Math.sin(dirYaw) * -dist;
    const cz = me.position.z + Math.cos(dirYaw) * -dist;
    camera.position.lerp(new THREE.Vector3(cx, height, cz), Math.min(1, dt * 5));
    camera.lookAt(me.position.x, 1.2, me.position.z);
  }
  renderer.render(scene, camera);
}

// ---------- 本地单机 ----------
function startLocalSolo() {
  if (!window.GLMGame) {
    banner('本地单机引擎加载失败');
    return;
  }
  solo = true;
  myRole = 'bear';
  localGame = window.GLMGame.createGame();
  state = window.GLMGame.publicState(localGame);
  $('#lobby').style.display = 'none';
  $('#hud').hidden = false;
  $('#btn-swap').hidden = false;
  $('#btn-both-ready').hidden = false;
  build3DOnce();
  renderState();
}

function applyLocalAction(action, role = myRole) {
  const result = window.GLMGame.applyAction(localGame, action, role);
  state = window.GLMGame.publicState(localGame);
  renderState();
  if (!result.ok) {
    banner(result.message);
    showBlockArrow(!!result.blocked);
    if (result.blocked) setTimeout(() => showBlockArrow(false), 1600);
  } else {
    hideBanner();
  }
  return result;
}

// ---------- 网络 ----------
function connect(role, soloMode) {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const soloQ = soloMode ? '?solo=1&role=bear' : `?role=${role}`;
  const saved = sessionStorage.getItem('coop-token');
  const t = (!soloMode && saved) ? `&token=${saved}` : '';
  ws = new WebSocket(`${proto}://${location.host}${soloQ}${t}`);
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.type === 'welcome') {
      token = m.token; myRole = m.role; solo = m.solo; state = m.state;
      if (!solo) sessionStorage.setItem('coop-token', token);
      $('#lobby').style.display = 'none';
      $('#hud').hidden = false;
      $('#btn-swap').hidden = !solo;
      $('#btn-both-ready').hidden = !solo;
      build3DOnce();
      renderState();
    } else if (m.type === 'state') {
      state = m.state; renderState();
    } else if (m.type === 'result') {
      const r = m.result;
      if (!r.ok) { banner(r.message); showBlockArrow(!!r.blocked); if (r.blocked) setTimeout(() => showBlockArrow(false), 1600); }
      else if (r.blocked === undefined) hideBanner();
    } else if (m.type === 'gameover') {
      // state 广播已带 phase
    }
  };
  ws.onclose = () => setTimeout(() => connect(role, soloMode), 1500);
}

function sendAction(action) {
  if (localGame) {
    applyLocalAction(action, myRole);
    return;
  }
  if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'action', action, role: myRole }));
}

let built3D = false;
function build3DOnce() {
  if (built3D) return;
  built3D = true;
  init3D();
}

// MAZE_TERRAIN 与服务端一致（同步自 core/maze.js 生成结果）
const HEDGE = ['.H.H','...H','.H.H','.H..'];
const FOREST = [[1,1],[2,1],[6,6],[7,6],[1,6],[3,3],[5,5],[2,7]];
const STONE = [[0,3],[3,0],[8,5],[5,8],[0,8],[8,8],[3,6],[6,3]];
const NET = [[2,4],[6,4],[4,1],[4,7]];
window.MAZE_TERRAIN = Array.from({length: 9}, () => Array(9).fill('grass'));
FOREST.forEach(([x,y]) => MAZE_TERRAIN[y][x] = 'forest');
STONE.forEach(([x,y]) => MAZE_TERRAIN[y][x] = 'stone');
NET.forEach(([x,y]) => MAZE_TERRAIN[y][x] = 'net');
HEDGE.forEach((row, dy) => [...row].forEach((ch, dx) => { MAZE_TERRAIN[dy][5+dx] = ch === 'H' ? 'hedge' : 'grass'; }));
MAZE_TERRAIN[4][4] = 'grass';

// ---------- UI ----------
let bannerTimer;
function banner(text) {
  const b = $('#banner'); b.textContent = text; b.hidden = false;
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(hideBanner, 3200);
}
function hideBanner() { $('#banner').hidden = true; }

$('#btn-bear').onclick = () => connect('bear', false);
$('#btn-bunny').onclick = () => connect('bunny', false);
$('#btn-solo').onclick = () => {
  const u = new URL(location);
  u.searchParams.set('solo', '1');
  u.searchParams.set('local', '1');
  history.replaceState(null, '', u);
  startLocalSolo();
};
document.querySelectorAll('[data-act]').forEach(btn => {
  btn.addEventListener('click', () => {
    const act = btn.dataset.act;
    if (act === 'forward') sendAction({ type: 'move', forward: true });
    else if (act === 'backward') sendAction({ type: 'move', forward: false });
    else if (act === 'left') sendAction({ type: 'turn', side: 'left' });
    else if (act === 'right') sendAction({ type: 'turn', side: 'right' });
    else if (act === 'give') sendAction({ type: 'give' });
    else if (act === 'support') sendAction({ type: 'support' });
    else if (act === 'boost') sendAction({ type: 'boost' });
    else if (act === 'ready') sendAction({ type: 'ready', value: !state?.players[myRole]?.ready });
  });
});
$('#btn-swap').onclick = swapRole;
$('#btn-both-ready').onclick = () => {
  if (localGame) {
    applyLocalAction({ type: 'ready', value: true }, 'bear');
    applyLocalAction({ type: 'ready', value: true }, 'bunny');
    return;
  }
  sendAction({ type:'ready', value:true });
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type:'action', action:{type:'ready',value:true}, role:'bunny' }));
  }
};

function swapRole() { if (solo) { myRole = myRole === 'bear' ? 'bunny' : 'bear'; renderState(); } }
addEventListener('keydown', (e) => {
  if (e.key === 'Tab' && solo) { e.preventDefault(); swapRole(); }
  if (e.key === 'ArrowUp' || e.key === 'w') sendAction({ type: 'move', forward: true });
  if (e.key === 'ArrowDown' || e.key === 's') sendAction({ type: 'move', forward: false });
  if (e.key === 'ArrowLeft' || e.key === 'a') sendAction({ type: 'turn', side: 'left' });
  if (e.key === 'ArrowRight' || e.key === 'd') sendAction({ type: 'turn', side: 'right' });
});

// 大厅二维码
fetch('/api/info').then(r => r.json()).then(info => {
  $('#qr').innerHTML = info.qr;
  $('#lan-url').textContent = info.url;
}).catch(() => {});
if (new URLSearchParams(location.search).get('solo') === '1') startLocalSolo();
})();
