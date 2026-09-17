import * as THREE from './vendor/three.module.js';

const $ = id => document.getElementById(id);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};

let state = null, role = null, room = 'CORAL', socket = null;
let reconnectTimer, reconnectAttempt = 0, blocked = false, joinVersion = 0;
let input = { x: 0, z: 0 }, keys = new Set(), joyPointer = null, toastUntil = 0, lastMessage = '', audioCtx;
let lastQuestion = '';

const roomInput = $('room-input');
roomInput.value = store.get('coral-room') || 'CORAL';
let quality = store.get('coral-quality') === 'fine' ? 'fine' : 'smooth';

// Initialize Three.js
const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x4fc9ca);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
$('world').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x69d2d1, 45, 100);

const camera = new THREE.OrthographicCamera(-18, 18, 14, -14, 0.1, 140);
camera.position.set(0, 33, 24);
camera.lookAt(0, -1, -0.2);

scene.add(new THREE.HemisphereLight(0xdcfffb, 0x267781, 2.0));
const sun = new THREE.DirectionalLight(0xfff1cd, 2.5);
sun.position.set(-10, 24, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 65 });
sun.shadow.bias = -0.001;
sun.shadow.normalBias = 0.04;
scene.add(sun);

const fill = new THREE.DirectionalLight(0x84dfff, 0.8);
fill.position.set(12, 10, -10);
scene.add(fill);

const mats = new Map();
function mat(color, extra = {}) {
  const k = color + JSON.stringify(extra);
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.75, flatShading: true, ...extra }));
  return mats.get(k);
}

function mesh(geo, color, parent = scene, pos = [0, 0, 0], scale = [1, 1, 1], extra = {}) {
  const m = new THREE.Mesh(geo, mat(color, extra));
  m.position.set(...pos);
  m.scale.set(...scale);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

const sphereGeo = new THREE.IcosahedronGeometry(1, 1);
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 10);

const ball = (c, p, xyz, s = [1, 1, 1], extra = {}) => mesh(sphereGeo, c, p, xyz, s, extra);
const box = (c, p, xyz, s) => mesh(boxGeo, c, p, xyz, s);
function cyl(c, p, xyz, r = 0.2, h = 1) { return mesh(cylinderGeo, c, p, xyz, [r, h, r]); }

function link(a, b, r, c, p) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), d = end.clone().sub(start);
  const m = cyl(c, p, start.clone().add(end).multiplyScalar(0.5).toArray(), r, d.length());
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return m;
}

function label(text, color = '#fff8dd', width = 256) {
  const c = document.createElement('canvas');
  c.width = width; c.height = 80;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#146b79dd';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(3, 5, width - 6, 63, 28); else ctx.rect(3, 5, width - 6, 63);
  ctx.fill();
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, width / 2, 37);
  const tex = new THREE.CanvasTexture(c);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(3.5, 1.1, 1);
  s.renderOrder = 20;
  return s;
}

function ring(c, p, xyz, r = 0.7, tube = 0.055) {
  const m = mesh(new THREE.TorusGeometry(r, tube, 6, 32), c, p, xyz);
  m.rotation.x = -Math.PI / 2;
  return m;
}

// Seabed & Water
box(0x41c3c4, scene, [0, -4.4, 0], [75, 0.4, 70]);
const sand = mesh(new THREE.CylinderGeometry(17.6, 18.3, 0.6, 10), 0xe4e6ad, scene, [0, -4.13, 0], [1, 1, 0.87]);
sand.rotation.y = 0.15;
mesh(new THREE.CircleGeometry(13.7, 48), 0xb5e2b7, scene, [0, -3.79, 0.3], [1, 1, 1]).rotation.x = -Math.PI / 2;
const water = mesh(new THREE.PlaneGeometry(80, 65), 0x4ce0de, scene, [0, -0.08, -2], [1, 1, 1], { transparent: true, opacity: 0.1, depthWrite: false, roughness: 0.2 });
water.rotation.x = -Math.PI / 2;

function rand(seed) {
  let x = seed;
  return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; };
}
const random = rand(24682), sway = [];

function coral(x, z, size, color) {
  const g = new THREE.Group();
  g.position.set(x, -3.7, z);
  g.scale.setScalar(size);
  scene.add(g);
  const height = 1.1 + random() * 0.9;
  link([0, 0, 0], [0, height, 0], 0.14, color, g);
  for (let j = 0; j < 4; j++) {
    const a = j * 2.4;
    const xx = Math.cos(a) * (0.4 + random() * 0.3), zz = Math.sin(a) * 0.35;
    link([0, height * 0.4, 0], [xx, height * 0.8, zz], 0.1, color, g);
    link([xx, height * 0.8, zz], [xx, height * (1.05 + random() * 0.3), zz], 0.085, color, g);
    ball(color, g, [xx, height * (1.05 + random() * 0.3), zz], [0.13, 0.15, 0.13]);
  }
  sway.push({ g, base: random() * 5, amp: 0.035 });
  return g;
}

for (let i = 0; i < 49; i++) {
  const a = random() * Math.PI * 2, r = 12.3 + random() * 3.4, x = Math.cos(a) * r, z = Math.sin(a) * r * 0.8;
  if (z < -7 && Math.abs(x) < 6) continue;
  const c = [0xff8599, 0xffbd82, 0xdca5e5, 0x9c80e3, 0x68c6a0][i % 5];
  coral(x, z, 0.4 + random() * 0.65, c);
  ball(0x67b9ab, scene, [x + 0.5, -3.6, z], [0.5 + random() * 0.7, 0.2 + random() * 0.35, 0.4 + random() * 0.6]);
}

for (let i = 0; i < 19; i++) {
  const x = (random() - 0.5) * 31, z = (random() - 0.5) * 24;
  const g = new THREE.Group();
  g.position.set(x, -3.8, z);
  scene.add(g);
  for (let n = 0; n < 3; n++) {
    const m = mesh(new THREE.ConeGeometry(0.12, 0.9 + random() * 0.5, 4), 0x39ae91, g, [(n - 1) * 0.2, 0.5, 0]);
    m.rotation.z = (n - 1) * 0.22;
  }
  sway.push({ g, base: random() * 6, amp: 0.08 });
}

// Dock & Ladder
const dock = new THREE.Group();
dock.position.set(0, -3.55, -5.9);
scene.add(dock);
const dockRing = ring(0xffdf6b, dock, [0, 0, 0], 1.7, 0.1);
ring(0xffffff, dock, [0, 0.01, 0], 1.9, 0.035);
const dockLabel = label('🍉 补给 · 交宝藏', '#fff2af', 320);
dockLabel.position.set(0, 1.9, -0.4);
dockLabel.scale.set(4.5, 1.13, 1);
dock.add(dockLabel);

for (let z = -2.6; z > -5.5; z -= 1) {
  link([-0.3, -3.5, z + 0.2], [0, -3.5, z - 0.1], 0.04, 0xfff2a0, scene);
  link([0, -3.5, z - 0.1], [0.3, -3.5, z + 0.2], 0.04, 0xfff2a0, scene);
}

// Ship
const ship = new THREE.Group();
ship.position.set(0, 0, -8.5);
scene.add(ship);
const hullShape = new THREE.Shape();
hullShape.moveTo(-3.6, -1.1); hullShape.lineTo(-2.5, -1.75); hullShape.lineTo(2.6, -1.75);
hullShape.lineTo(4.2, 0); hullShape.lineTo(2.6, 1.75); hullShape.lineTo(-2.5, 1.75); hullShape.lineTo(-3.6, 1.1);
hullShape.closePath();

function hull(c, depth, y, scale) {
  const m = mesh(new THREE.ExtrudeGeometry(hullShape, { depth, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 1, steps: 1 }), c, ship, [0, y, 0], [scale, scale, scale]);
  m.rotation.x = -Math.PI / 2;
  return m;
}
hull(0x97583a, 1.1, -0.6, 1);
hull(0xf0c06e, 0.16, 0.55, 1.015);
hull(0xe0a563, 0.06, 0.74, 0.95);

for (let i = -3; i < 4; i++) {
  const b = box(0xc18a50, ship, [i, 0.84, 0], [0.035, 0.025, 3]);
  b.receiveShadow = false;
}
for (const z of [-1.62, 1.62]) {
  box(0x9b5d42, ship, [-0.25, 1.22, z], [5.7, 0.14, 0.15]);
  for (const x of [-2.8, -1.5, 0, 1.5, 2.6]) box(0x89563b, ship, [x, 1, z], [0.12, 0.65, 0.12]);
}

box(0xa76b42, ship, [-3.35, 1.25, 0], [0.15, 0.16, 2.2]);
for (let i = 0; i < 5; i++) box(0xf2c577, ship, [0, 0.4 - i * 0.68, 2.1], [0.85, 0.12, 0.2]);
for (const x of [-0.5, 0.5]) link([x, 0.8, 2.1], [x, -3.1, 2.1], 0.055, 0xdca561, ship);

cyl(0xb57543, ship, [-1.3, 3.1, -0.7], 0.12, 4.9);
const spar = cyl(0xb57543, ship, [-1.3, 4.45, -0.7], 0.07, 3.1);
spar.rotation.z = Math.PI / 2;

const sail = box(0xfff2d5, ship, [-1.3, 3.45, -0.75], [2.65, 2, 0.07]);
sail.rotation.y = 0.05;
const sailBadge = label('✦', '#ffdd8b', 128);
sailBadge.material.depthTest = true;
sailBadge.position.set(-1.3, 3.45, -0.55);
sailBadge.scale.set(0.9, 0.6, 1);
ship.add(sailBadge);

// Double Cannon
const cannon = new THREE.Group();
cannon.position.set(2, 0.95, 0.45);
ship.add(cannon);
box(0x705448, cannon, [0, 0, 0], [0.7, 0.25, 1]);
const barrel = cyl(0x426273, cannon, [0, 0.4, 0.1], 0.29, 1.25);
barrel.rotation.x = Math.PI / 2;
ball(0x253e53, cannon, [0, 0.4, 0.73], [0.23, 0.23, 0.03]);

// Melon table & kitchen
const table = box(0x955c3b, ship, [-2, 0.95, 0.8], [1.5, 0.2, 0.8]);
for (const x of [-2.5, -1.5]) box(0x8a5437, ship, [x, 0.85, 0.8], [0.15, 0.4, 0.5]);
const melon = ball(0x53ac61, ship, [-2, 1.29, 0.8], [0.42, 0.34, 0.32]);
for (let i = -1; i <= 1; i++) {
  const s = ring(0x26734c, ship, [-2 + i * 0.15, 1.29, 0.8], 0.31, 0.025);
  s.rotation.y = Math.PI / 2;
  s.scale.y = 1.03;
}

const foodCrate = box(0xad723f, ship, [0.4, 1.04, -0.9], [1, 0.5, 0.6]);
box(0xe9b66c, ship, [0.4, 1.31, -0.9], [1.1, 0.08, 0.7]);
const shipName = label('⛵ 珊瑚号', '#fff2b8', 256);
shipName.position.set(0, 1.9, -2.6);
ship.add(shipName);

// Characters
function character(kind) {
  const g = new THREE.Group(), body = new THREE.Group();
  g.add(body);
  const diver = kind === 'diver';
  ball(diver ? 0xf6b747 : 0xd75d57, body, [0, 0.63, 0], [0.31, 0.42, 0.24]);
  ball(0xffd0a4, body, [0, 1.17, 0], [0.33, 0.34, 0.31]);
  for (const x of [-0.17, 0.17]) {
    link([x, 0.48, 0], [x, 0.12, 0.08], 0.11, diver ? 0x267f95 : 0x364a64, body);
    box(diver ? 0xf4bf49 : 0x614431, body, [x, 0.08, 0.18], [diver ? 0.22 : 0.2, 0.12, diver ? 0.47 : 0.28]);
  }
  for (const side of [-1, 1]) {
    link([side * 0.25, 0.84, 0], [side * 0.43, 0.47, 0.12], 0.09, diver ? 0x2599a8 : 0xfff0d4, body);
    ball(0xffd0a4, body, [side * 0.43, 0.45, 0.13], [0.11, 0.11, 0.11]);
  }
  if (diver) {
    ball(0x2d96a8, body, [0, 1.24, -0.04], [0.355, 0.325, 0.3]);
    box(0xffe299, body, [0, 1.2, 0.29], [0.58, 0.25, 0.12]);
    box(0x8ce5e9, body, [0, 1.2, 0.365], [0.43, 0.16, 0.04]);
    for (const x of [-0.12, 0.12]) ball(0x254758, body, [x, 1.2, 0.39], [0.035, 0.04, 0.015]);
    cyl(0xfbe084, body, [0, 0.68, -0.27], 0.17, 0.65);
    link([0.31, 1.1, 0.15], [0.42, 1.56, 0.15], 0.045, 0xfadb78, body);
    box(0xf08382, body, [0.44, 0.57, 0.22], [0.18, 0.14, 0.45]);
  } else {
    ball(0x603c2d, body, [0, 1.29, -0.04], [0.34, 0.25, 0.31]);
    box(0xdb5e4e, body, [0, 1.39, 0], [0.68, 0.12, 0.6]);
    const hat = mesh(new THREE.ConeGeometry(0.52, 0.42, 3), 0x293e53, body, [0, 1.61, 0]);
    hat.rotation.y = Math.PI;
    box(0xffde85, body, [0, 1.62, 0.22], [0.12, 0.15, 0.045]);
    for (const x of [-0.12, 0.12]) ball(0x34495b, body, [x, 1.18, 0.285], [0.045, 0.055, 0.035]);
    box(0x24374e, body, [-0.12, 1.19, 0.315], [0.14, 0.11, 0.045]);
  }
  const halo = ring(diver ? 0xc1ffff : 0xffe589, g, [0, 0.025, 0], 0.58, 0.045);
  const name = label(diver ? '🤿 潜水员' : '🏴‍☠️ 海盗', diver ? '#c5fff9' : '#ffe8a9', 256);
  name.position.set(0, 2.07, 0);
  name.scale.set(2.7, 0.83, 1);
  g.add(name);
  g.userData = { body, halo, name, target: new THREE.Vector3(), kind };
  scene.add(g);
  return g;
}

const actors = { pirate: character('pirate'), diver: character('diver') };
actors.pirate.position.set(0.4, 0.83, -8.2);
actors.diver.position.set(0, -3.35, -5.6);
actors.pirate.userData.target.copy(actors.pirate.position);
actors.diver.userData.target.copy(actors.diver.position);

// 3D Models
function fishModel(shark = false) {
  const g = new THREE.Group();
  ball(shark ? 0x639ead : 0xffbf67, g, [0, 0, 0], shark ? [0.32, 0.32, 0.85] : [0.18, 0.28, 0.45]);
  const tail = mesh(new THREE.ConeGeometry(shark ? 0.39 : 0.29, shark ? 0.5 : 0.3, 3), shark ? 0x5b8198 : 0xf6875b, g, [0, 0, -(shark ? 0.85 : 0.48)]);
  tail.rotation.x = Math.PI / 2;
  tail.rotation.z = Math.PI / 2;
  const fin = mesh(new THREE.ConeGeometry(shark ? 0.31 : 0.17, shark ? 0.43 : 0.25, 3), shark ? 0x49778e : 0xff9168, g, [0, shark ? 0.31 : 0.22, -0.1]);
  fin.scale.z = 0.35;
  for (const s of [-1, 1]) {
    ball(0xffffff, g, [s * (shark ? 0.25 : 0.145), 0.08, shark ? 0.45 : 0.21], [0.09, 0.09, 0.09]);
    ball(0x244956, g, [s * (shark ? 0.31 : 0.19), 0.08, shark ? 0.48 : 0.24], [0.035, 0.045, 0.045]);
    if (shark) box(0xf2ecd9, g, [s * 0.2, -0.13, 0.55], [0.08, 0.08, 0.17]);
  }
  return g;
}

function starModel() {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI / 5 + Math.PI / 2, r = i % 2 ? 0.25 : 0.53;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  s.closePath();
  const g = new THREE.Group();
  const m = mesh(new THREE.ExtrudeGeometry(s, { depth: 0.15, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 1 }), 0xffdc5b, g);
  m.rotation.x = -Math.PI / 2;
  return g;
}

function treasureModel(kind) {
  const g = kind === 'star' ? starModel() : new THREE.Group();
  if (kind === 'gem') {
    mesh(new THREE.OctahedronGeometry(0.45), 0x9e7aff, g, [0, 0.1, 0], [1, 1.45, 1], { emissive: 0x443074, emissiveIntensity: 0.2 });
  }
  ring(kind === 'star' ? 0xffedab : 0xe6c6ff, g, [0, -0.12, 0], 0.7, 0.025);
  return g;
}

function monsterModel() {
  const g = new THREE.Group();
  ball(0xaa81c1, g, [0, 0.3, 0], [0.68, 0.55, 0.62]);
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    const x = Math.sin(a), z = Math.cos(a);
    link([x * 0.35, 0.2, z * 0.35], [x * 0.85, -0.2, z * 0.85], 0.13, 0x9474b5, g);
    ball(0xbb96d1, g, [x * 0.85, -0.15, z * 0.85], [0.22, 0.14, 0.22]);
  }
  for (const x of [-0.23, 0.23]) {
    ball(0xfffbef, g, [x, 0.43, 0.51], [0.16, 0.18, 0.09]);
    ball(0x394860, g, [x, 0.42, 0.59], [0.067, 0.09, 0.04]);
  }
  return g;
}

// Clam Model with Pearl
function clamModel(data) {
  const g = new THREE.Group();
  const lower = ball(0xd1a980, g, [0, 0, 0], [0.45, 0.15, 0.38]);
  const upper = ball(0xe5bc90, g, [0, 0.1, 0], [0.44, 0.12, 0.37]);
  const pearl = ball(0xfffbe3, g, [0, 0.08, 0], [0.14, 0.14, 0.14], { emissive: 0xffeeaa, emissiveIntensity: 0.4 });
  g.userData.upper = upper;
  g.userData.pearl = pearl;
  return g;
}

// Sunken Chest Model
function chestModel() {
  const g = new THREE.Group();
  box(0x6e4528, g, [0, 0.2, 0], [0.8, 0.4, 0.5]);
  box(0xd4af37, g, [0, 0.2, 0], [0.84, 0.06, 0.54]);
  box(0xd4af37, g, [0, 0.2, 0.26], [0.14, 0.14, 0.06]);
  return g;
}

// Kraken Boss Model
const krakenGroup = new THREE.Group();
krakenGroup.position.set(0, 0.5, 3.5);
scene.add(krakenGroup);
krakenGroup.visible = false;
ball(0x6e2c6e, krakenGroup, [0, 1.2, 0], [1.5, 1.8, 1.4]);
ball(0xffdd44, krakenGroup, [-0.6, 1.5, 1.2], [0.25, 0.3, 0.1], { emissive: 0xffaa00, emissiveIntensity: 0.5 });
ball(0xffdd44, krakenGroup, [0.6, 1.5, 1.2], [0.25, 0.3, 0.1], { emissive: 0xffaa00, emissiveIntensity: 0.5 });
const tentacles = [];
for (let i = 0; i < 4; i++) {
  const tg = new THREE.Group();
  tg.position.set((i - 1.5) * 2.2, -0.2, 0);
  krakenGroup.add(tg);
  link([0, 0, 0], [0, 2.4, 0.8], 0.28, 0x8a388a, tg);
  ball(0xff99bb, tg, [0, 1.2, 1.0], [0.18, 0.18, 0.18]);
  tentacles.push(tg);
}

const entities = new Map(), fx = new Map(), seenEffects = new Set();

function syncEntities(list, category, make, y) {
  const keep = new Set();
  for (const item of list || []) {
    const id = category + item.id;
    keep.add(id);
    let m = entities.get(id);
    if (!m) {
      m = make(item);
      scene.add(m);
      m.position.set(item.x, y, item.z);
      m.userData.target = new THREE.Vector3(item.x, y, item.z);
      m.userData.category = category;
      m.userData.phase = random() * 6;
      entities.set(id, m);
    }
    m.visible = item.active !== false;
    m.userData.target.set(item.x, y, item.z);
    if (category === 'c' && m.userData.upper) {
      m.userData.upper.position.y = item.open ? 0.28 : 0.08;
      m.userData.upper.rotation.x = item.open ? -0.4 : 0;
      if (m.userData.pearl) m.userData.pearl.visible = !!item.hasPearl && item.open;
    }
  }
  for (const [id, m] of entities) {
    if (id.startsWith(category) && !keep.has(id)) {
      scene.remove(m);
      entities.delete(id);
    }
  }
}

// Procedural Audio Engine
function sound(kind) {
  if (!audioCtx) return;
  try {
    const t = audioCtx.currentTime;
    if (kind === 'coin') {
      const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987, t);
      osc.frequency.setValueAtTime(1318, t + 0.08);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(t); osc.stop(t + 0.32);
    } else if (kind === 'sonar') {
      const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, t);
      osc.frequency.exponentialRampToValueAtTime(900, t + 0.4);
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(t); osc.stop(t + 0.52);
    } else {
      const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.type = kind === 'cannon' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(kind === 'cannon' ? 120 : kind === 'hit' ? 160 : kind === 'feed' ? 620 : 880, t);
      osc.frequency.exponentialRampToValueAtTime(kind === 'cannon' ? 30 : kind === 'hit' ? 70 : 1300, t + 0.2);
      gain.gain.setValueAtTime(kind === 'cannon' ? 0.09 : 0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      osc.start(t); osc.stop(t + 0.26);
    }
  } catch {}
}

function enableAudio() {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume();
  } catch {}
}

function syncEffects(effects) {
  for (const e of effects || []) {
    if (seenEffects.has(e.id)) continue;
    seenEffects.add(e.id);
    if (seenEffects.size > 500) seenEffects.delete(seenEffects.values().next().value);
    const g = new THREE.Group();
    g.position.set(e.x, e.kind === 'cannon' ? 0.9 : -2.6, e.z);
    scene.add(g);
    const colors = { cannon: 0xffd77e, bubble: 0x9affdd, pickup: 0xffe89c, hit: 0xff8b8b, feed: 0xc1ffab, coin: 0xffea55, sonar: 0x55eeff };
    for (let i = 0; i < (quality === 'smooth' ? 1 : 8); i++) {
      const a = i * 6.28 / 8;
      ball(colors[e.kind] || 0xffffff, g, [Math.cos(a) * 0.25, 0, Math.sin(a) * 0.25], [0.12, 0.12, 0.12]);
    }
    fx.set(e.id, { g, e, age: 0, life: 0.7 });
    sound(e.kind);
    if (e.kind === 'pickup') toast('💎 → 🎒 宝藏在背包，回金圈交付');
    if (e.kind === 'fish') toast('🐟 → 🍉 船上多一份食物，+5 金币');
    if (e.kind === 'coin') toast('🪙 金币入账！可在升级工坊使用');
    if (e.kind === 'deposit') toast('🎒 → ⛵ 已交回！团队总金币增加');
    if (e.kind === 'rescue') { toast('🛟 遇险回船，宝藏还在原处'); speak('救回船边了。落下的宝藏还在原处。'); }
    if (e.kind === 'feed') toast('补给完成！再出发 🍉');
  }
}

function acceptState(s) {
  if (state && s.time < state.time) {
    seenEffects.clear();
    for (const f of fx.values()) scene.remove(f.g);
    fx.clear();
    lastMessage = '';
  }
  state = s;
  for (const r of ['pirate', 'diver']) {
    const p = s.players?.[r];
    if (p) {
      actors[r].userData.target.set(p.x, r === 'pirate' ? 0.84 : -3.25, p.z);
      actors[r].userData.name.material.opacity = p.online ? 1 : 0.55;
    }
  }

  // Weather atmosphere adjustment
  if (s.weather === 'sunset') {
    renderer.setClearColor(0xe07b46);
    scene.fog.color.setHex(0xe07b46);
    sun.color.setHex(0xffaa55);
  } else if (s.weather === 'storm') {
    renderer.setClearColor(0x233d4d);
    scene.fog.color.setHex(0x233d4d);
    sun.color.setHex(0x8899aa);
  } else if (s.weather === 'bioluminescent') {
    renderer.setClearColor(0x0a1d2e);
    scene.fog.color.setHex(0x0a1d2e);
    sun.color.setHex(0x55ffdd);
  } else {
    renderer.setClearColor(0x4fc9ca);
    scene.fog.color.setHex(0x69d2d1);
    sun.color.setHex(0xfff1cd);
  }

  // Kraken Boss
  if (s.kraken) {
    krakenGroup.visible = !!s.kraken.active;
    $('boss-hud').hidden = !s.kraken.active;
    if (s.kraken.active) {
      const ratio = Math.max(0, Math.min(1, s.kraken.hp / s.kraken.maxHp));
      $('boss-meter-fill').style.width = (ratio * 100) + '%';
    }
  }

  // Classroom Question Banner
  if (s.classroom?.question) {
    $('classroom-banner').hidden = false;
    $('classroom-question').textContent = s.classroom.question;
    if (s.classroom.question !== lastQuestion) {
      lastQuestion = s.classroom.question;
      speak(s.classroom.question);
    }
  } else {
    $('classroom-banner').hidden = true;
  }

  syncEntities(s.treasures, 't', t => treasureModel(t.kind), -3.3);
  syncEntities(s.clams, 'c', c => clamModel(c), -3.7);
  syncEntities(s.sunkenChest ? [s.sunkenChest] : [], 'ch', () => chestModel(), -3.7);
  syncEntities(s.fish, 'f', () => fishModel(false), -2.65);
  syncEntities(s.sharks, 's', () => fishModel(true), -2.72);
  syncEntities(s.monsters, 'm', () => monsterModel(), -0.35);
  syncEffects(s.effects);
  updateHud();
}

function meter(id, value) {
  const v = Math.max(0, Math.min(100, value ?? 0));
  $(id + '-meter').style.width = v + '%';
  $(id + '-value').textContent = Math.ceil(v);
}

function updateHud() {
  if (!state || !role) return;
  const p = state.players[role], d = state.players.diver;
  meter('ship', state.ship.hp);
  meter('hunger', p.hunger);
  meter('hp', d.hp);
  $('hp-stat').hidden = role !== 'diver';
  $('oxygen-stat').hidden = role !== 'diver';
  if (role === 'diver' && d.oxygen !== undefined) meter('oxygen', d.oxygen);

  $('gems').textContent = state.goal.gems;
  $('stars').textContent = state.goal.stars;
  $('coins').textContent = state.coins || 0;
  $('food-value').textContent = state.ship.food;
  $('bag').textContent = role === 'diver'
    ? `🎒 💎 ${d.bagGems} · ⭐ ${d.bagStars} · 🦪 ${d.bagPearls || 0}`
    : `🍈 整瓜 ${state.ship.melon} · 🥤 冰沙 ${state.ship.smoothieCount || 0}`;

  $('room-label').textContent = room + ' · ' + (role === 'pirate' ? '🏴‍☠️ 海盗' : '🤿 潜水员');

  const both = state.players.pirate.online && d.online;
  const playing = state.phase === 'playing' && !state.paused;

  $('mission').textContent = !both
    ? '等伙伴加入 · 同房间选另一角色'
    : state.phase === 'waiting'
    ? '准备出发！'
    : role === 'pirate'
    ? '🍉 切瓜备粮 · 榨特饮 · 怪物来了就开炮！'
    : d.hunger < 25
    ? '🍉 肚子饿了，向上回船！'
    : d.bagGems + d.bagStars > 0
    ? '🎒 带着宝藏，向上回船交付！'
    : '💎 游向宝石、星星与贝壳珍珠！';

  $('connection').textContent = socket?.readyState === 1 ? (both ? '● 两人已连接' : '● 等待伙伴') : '● 正在重连';
  $('connection').classList.toggle('offline', socket?.readyState !== 1 || !both);

  for (const b of document.querySelectorAll('.action')) {
    const act = b.dataset.action;
    b.hidden = act === 'rescue' && p.hunger > 0;
    const cd = act === 'fire' ? state.ship.fireCooldown
      : act === 'bubble' ? d.bubbleCooldown
      : act === 'boost' ? d.boostCooldown || 0
      : act === 'sonar' ? d.sonarCooldown || 0
      : act === 'repair' ? state.ship.repairCooldown
      : 0;

    b.classList.toggle('cooldown', cd > 0);
    b.disabled = state.paused || (!playing && state.phase !== 'learning') || !both;
    b.querySelector('small').textContent = cd > 0
      ? Math.ceil(cd) + ' 秒'
      : act === 'chop' ? (Math.round(state.ship.chop * 3) + ' / 3')
      : act === 'fire' ? '大炮轰击'
      : act === 'bubble' ? '驱逐水怪'
      : act === 'sonar' ? '探测全图'
      : act === 'cook' ? '榨西瓜汁'
      : act === 'bait' ? '诱饵引鲨'
      : act === 'repair' ? '恢复船体'
      : '游得更快';
    b.querySelector('.progress').style.width = act === 'chop'
      ? state.ship.chop * 100 + '%'
      : Math.max(0, 100 - cd / (act === 'boost' ? 5 : act === 'sonar' ? 6 : act === 'repair' ? 3 : act === 'bubble' ? 2.5 : 1) * 100) + '%';
  }

  $('learning').hidden = !['waiting', 'learning'].includes(state.phase) && !state.paused;
  $('ready').hidden = state.phase !== 'learning' || state.paused;
  $('ready').disabled = state.ready?.[role];
  $('ready').textContent = state.ready?.[role] ? '👍 等伙伴' : '👍 准备好';
  $('learning-copy').textContent = state.paused ? '⏸ 暂停 · 等老师或伙伴' : '🛡 先练习 ↔ · 🔊 听按钮';
  if (p.hunger <= 0) $('mission').textContent = '🍉 0 → 🛟 点救援西瓜';

  const over = state.phase === 'won' || state.phase === 'lost';
  $('end-screen').hidden = !over;
  if (over) {
    $('end-icon').textContent = state.phase === 'won' ? '🏆' : '🛟';
    $('end-title').textContent = state.phase === 'won' ? '最佳拍档，寻宝大成功！' : '小船需要休息啦';
    $('end-copy').textContent = state.phase === 'won' ? '5 颗宝石 + 2 颗星星，满载金币带回家！' : '重新出发，记得多切瓜、开炮和修船。';
    resetInput();
  }
  if (state.message && state.message !== lastMessage) {
    lastMessage = state.message;
    toast(state.message);
  }
}

function toast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  toastUntil = performance.now() + 3500;
}

let localGame = null, simModule = null;
async function startLocalSimulation(chosenRole, chosenRoom) {
  try {
    simModule ||= await import('./simulation.mjs');
    localGame = simModule.createGame();
    localGame.players.pirate.online = true;
    localGame.players.diver.online = true;
    localGame.phase = 'playing';
    role = chosenRole;
    room = chosenRoom;
    showGame();
    $('resume').hidden = false;
    for (const id of ['hud', 'stats', 'mission', 'controls']) $(id).hidden = false;
    makeControls();
    $('join-error').textContent = '';
    toast('🎮 已开启在线试玩模式（局域网多人联机请用本地服务）');
    
    if (!window._simTimer) {
      let lastSim = performance.now();
      window._simTimer = setInterval(() => {
        const now = performance.now();
        const dt = Math.min(0.05, (now - lastSim) / 1000);
        lastSim = now;
        if (localGame && simModule) {
          simModule.step(localGame, dt);
          acceptState(simModule.snapshot(localGame));
        }
      }, 50);
    }
  } catch (err) {
    console.error('Local sim error:', err);
  }
}

function send(data) {
  if (localGame && simModule) {
    if (data.type === 'input') simModule.setInput(localGame, role, data);
    else if (data.type === 'action') simModule.handleAction(localGame, role, data.action, data.payload);
    else if (data.type === 'idea') simModule.submitIdea(localGame, role, data.text, data.student);
    acceptState(simModule.snapshot(localGame));
    return;
  }
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(data));
}

function action(a, payload) {
  if (state?.phase === 'learning' && a !== 'ready') {
    speak(actionWords[a] || '按住圆盘拖动，再点准备好');
    return;
  }
  if (state?.phase !== 'playing' && !['restart', 'ready', 'submit_idea', 'upgrade'].includes(a)) return;
  enableAudio();
  send({ type: 'action', action: a, payload });
  const button = document.querySelector(`[data-action="${a}"]`);
  button?.animate([{ transform: 'scale(.94)' }, { transform: 'scale(1)' }], { duration: 160 });
}

function makeControls() {
  const definitions = role === 'pirate' ? [
    ['rescue', '🛟', '救援西瓜', ''],
    ['repair', '🔧', '修船', ''],
    ['cook', '🍹', '榨特饮', ''],
    ['fire', '💥', '轰重炮', 'primary'],
    ['chop', '🍉', '切西瓜', 'primary'],
  ] : [
    ['rescue', '🛟', '救援西瓜', ''],
    ['sonar', '📡', '声纳', ''],
    ['bubble', '🫧', '气泡枪', 'aqua'],
    ['boost', '⚡', '加速', 'primary aqua'],
  ];

  $('actions').replaceChildren();
  for (const [a, emoji, title, cls] of definitions) {
    const b = document.createElement('button');
    b.className = 'action ' + cls;
    b.dataset.action = a;
    b.setAttribute('aria-label', title);
    b.innerHTML = `<span>${emoji}</span><b>${title}</b><small></small><i class="progress"></i>`;
    b.addEventListener('pointerdown', e => {
      e.preventDefault();
      action(a);
    });
    $('actions').appendChild(b);
  }
}

function connect(chosenRole, chosenRoom) {
  clearTimeout(reconnectTimer);
  const version = ++joinVersion;
  socket?.close();
  role = chosenRole;
  room = chosenRoom;
  blocked = false;
  resetInput();
  $('join-error').textContent = '正在登船…';

  // If on GitHub Pages static host, run immediate local simulation
  if (location.hostname.endsWith('github.io') || location.protocol === 'file:') {
    startLocalSimulation(chosenRole, chosenRoom);
    return;
  }

  const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
  socket = ws;

  ws.addEventListener('open', () => {
    if (version !== joinVersion) return;
    send({ type: 'join', role, room, token: store.get(`coral-token:${room}:${role}`) || undefined });
  });

  ws.addEventListener('message', event => {
    if (version !== joinVersion) return;
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }
    if (msg.type === 'welcome') {
      role = msg.role;
      room = msg.room;
      store.set(`coral-token:${room}:${role}`, msg.token);
      store.set('coral-room', room);
      store.set('coral-role', role);
      roomInput.value = room;
      reconnectAttempt = 0;
      showGame();
      $('resume').hidden = false;
      for (const id of ['hud', 'stats', 'mission', 'controls']) $(id).hidden = false;
      makeControls();
      $('join-error').textContent = '';
      updateHud();
    } else if (msg.type === 'state') {
      acceptState(msg.state);
    } else if (msg.type === 'error') {
      const message = msg.message || msg.error || '这个角色已经有伙伴了，请选择另一个。';
      $('join-error').textContent = message;
      toast(message);
      blocked = true;
      $('lobby').hidden = false;
    }
  });

  ws.addEventListener('close', () => {
    if (version !== joinVersion) return;
    resetInput();
    $('connection').textContent = '● 正在重连';
    $('connection').classList.add('offline');
    if (!blocked) {
      $('join-error').textContent = '连接暂时断开，正在重试…';
      reconnectTimer = setTimeout(() => connect(role, room), Math.min(5000, 800 + reconnectAttempt++ * 600));
    }
  });

  ws.addEventListener('error', () => {
    if (reconnectAttempt > 1) {
      toast('切换至在线试玩模式');
      startLocalSimulation(role, room);
      return;
    }
    $('join-error').textContent = '暂时连不到船，请检查网络。';
  });
}

document.querySelectorAll('[data-role]').forEach(b => b.addEventListener('click', () => {
  const r = roomInput.value.trim().toUpperCase();
  if (!/^[A-Z0-9-]{1,16}$/.test(r)) {
    $('join-error').textContent = '房间用 1–16 个英文字母或数字。';
    return;
  }
  enableAudio();
  if (b.dataset.armed !== 'yes') {
    document.querySelectorAll('[data-role]').forEach(x => {
      x.dataset.armed = '';
      x.classList.remove('selected');
    });
    b.dataset.armed = 'yes';
    b.classList.add('selected');
    speak(b.dataset.role === 'pirate'
      ? '海盗在船上切西瓜、做特饮、开重炮保护小船。再点一次选海盗。'
      : '潜水员在深海找宝石与珍珠，带回金圈。再点一次选潜水员。');
    $('join-error').textContent = '🔊 听一听 · 再点一次选择登船';
    return;
  }
  connect(b.dataset.role, r);
}));

function showGame() {
  $('lobby').hidden = true;
  document.body.classList.remove('at-menu');
  $('game-tools').appendChild($('tools'));
  $('home').hidden = false;
}

function showMenu(disconnect = true) {
  resetInput();
  if (disconnect) {
    blocked = true;
    joinVersion++;
    clearTimeout(reconnectTimer);
    socket?.close();
    socket = null;
  }
  $('lobby').hidden = false;
  $('end-screen').hidden = true;
  $('learning').hidden = true;
  for (const id of ['hud', 'stats', 'mission', 'controls']) $(id).hidden = true;
  document.body.classList.add('at-menu');
  $('menu-tools').appendChild($('tools'));
  $('home').hidden = true;
  const saved = store.get('coral-role'), savedRoom = store.get('coral-room');
  $('resume').hidden = !(['pirate', 'diver'].includes(saved) && savedRoom && store.get(`coral-token:${savedRoom}:${saved}`));
  $('join-error').textContent = '选择角色，或继续已有航程；不会清空伙伴进度。';
  document.querySelectorAll('[data-role]').forEach(b => {
    b.dataset.armed = '';
    b.classList.remove('selected');
  });
}

$('connection').onclick = () => showMenu();
$('home').onclick = () => showMenu();
$('resume').onclick = () => {
  const saved = store.get('coral-role'), savedRoom = store.get('coral-room');
  if (saved && savedRoom) {
    enableAudio();
    connect(saved, savedRoom);
  }
};
$('new-voyage').onclick = () => {
  showMenu();
  roomInput.value = 'SEA' + Math.random().toString(36).slice(2, 7).toUpperCase();
  document.querySelector('.teacher-room').open = true;
  $('join-error').textContent = '新房间 ' + roomInput.value + '：两台设备填同一房间，各选角色。旧航程保留。';
  speak('新航程。请老师让两台设备填写相同的新房间，再选择角色。');
};
$('restart').addEventListener('click', () => {
  seenEffects.clear();
  action('restart');
});

// Modals: Idea, Shop, QR
$('open-idea-btn').onclick = () => { $('idea-modal').hidden = false; };
$('banner-idea-btn').onclick = () => { $('idea-modal').hidden = false; };
$('close-idea-btn').onclick = () => { $('idea-modal').hidden = true; };

$('send-idea-btn').onclick = () => {
  const student = $('student-name-input').value.trim() || (role === 'pirate' ? 'Leesha' : 'Quinton');
  const text = $('idea-text-input').value.trim();
  if (!text) { toast('请写下你的创意想法哦'); return; }
  action('submit_idea', { text, student });
  $('idea-text-input').value = '';
  $('idea-modal').hidden = true;
  toast('💡 创意已发送给老师！+5 金币！');
  speak('创意已提交给老师。');
};

$('open-shop-btn').onclick = () => {
  $('shop-modal').hidden = false;
  $('shop-coins-val').textContent = state?.coins || 0;
  if (state?.upgrades) {
    $('lvl-cannon').textContent = state.upgrades.cannon || 1;
    $('lvl-flippers').textContent = state.upgrades.flippers || 1;
    $('lvl-armor').textContent = state.upgrades.armor || 1;
    $('lvl-knife').textContent = state.upgrades.knife || 1;
  }
};
$('close-shop-btn').onclick = () => { $('shop-modal').hidden = true; };

document.querySelectorAll('[data-upgrade]').forEach(b => {
  b.onclick = () => {
    const type = b.dataset.upgrade;
    action('upgrade', { type });
    setTimeout(() => {
      $('shop-coins-val').textContent = state?.coins || 0;
      if (state?.upgrades) {
        $('lvl-cannon').textContent = state.upgrades.cannon || 1;
        $('lvl-flippers').textContent = state.upgrades.flippers || 1;
        $('lvl-armor').textContent = state.upgrades.armor || 1;
        $('lvl-knife').textContent = state.upgrades.knife || 1;
      }
    }, 200);
  };
});

function openQrModal() {
  $('qr-modal').hidden = false;
  $('qr-image').src = '/api/qr?' + Date.now();
}
$('open-qr-btn').onclick = openQrModal;
$('show-qr-lobby-btn').onclick = openQrModal;
$('close-qr-btn').onclick = () => { $('qr-modal').hidden = true; };

$('copy-lan-btn').onclick = () => {
  const url = $('lan-url-display').textContent;
  navigator.clipboard?.writeText(url).then(() => toast('已复制网址到剪贴板！'));
};

// Fetch real LAN IP from server
fetch('/api/lan').then(r => r.json()).then(data => {
  if (data?.lanUrl) {
    $('lobby-lan-url').textContent = data.lanUrl;
    $('lan-url-display').textContent = data.lanUrl;
  }
}).catch(() => {});

function resetInput() {
  input = { x: 0, z: 0 };
  keys.clear();
  joyPointer = null;
  $('stick').style.transform = '';
  send({ type: 'input', x: 0, z: 0 });
}

function joyMove(e) {
  if (e.pointerId !== joyPointer) return;
  const rect = $('joystick').getBoundingClientRect(), max = rect.width * 0.31;
  let x = e.clientX - (rect.left + rect.width / 2), z = e.clientY - (rect.top + rect.height / 2);
  const len = Math.hypot(x, z);
  if (len > max) { x = x / len * max; z = z / len * max; }
  input = { x: x / max, z: z / max };
  $('stick').style.transform = `translate(${x}px,${z}px)`;
}

$('joystick').addEventListener('pointerdown', e => {
  e.preventDefault();
  if (joyPointer !== null) return;
  enableAudio();
  joyPointer = e.pointerId;
  $('joystick').setPointerCapture(e.pointerId);
  joyMove(e);
});
$('joystick').addEventListener('pointermove', joyMove);
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  $('joystick').addEventListener(event, e => {
    if (e.pointerId === joyPointer) resetInput();
  });
}

addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' ', '1', '2', '3', 'e', 'q', 'r'].includes(k)) {
    e.preventDefault();
    keys.add(k);
    if (!e.repeat) {
      const a = role === 'pirate'
        ? { ' ': 'chop', '1': 'chop', '2': 'fire', '3': 'repair', e: 'fire', q: 'cook', r: 'repair' }
        : { ' ': 'boost', '1': 'boost', '2': 'bubble', e: 'bubble', q: 'sonar' };
      if (a[k]) action(a[k]);
    }
  }
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('blur', resetInput);
document.addEventListener('visibilitychange', () => {
  resetInput();
  if (!document.hidden && socket?.readyState === WebSocket.CLOSED && role && !blocked) connect(role, room);
});
addEventListener('pagehide', resetInput);

setInterval(() => {
  let x = input.x, z = input.z;
  if (joyPointer === null) {
    x = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
    z = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
  }
  const len = Math.hypot(x, z);
  if (len > 1) { x /= len; z /= len; }
  if (document.hidden || !$('lobby').hidden || !$('end-screen').hidden) { x = 0; z = 0; }
  send({ type: 'input', x, z });
}, 60);

function resize() {
  const aspect = innerWidth / innerHeight;
  const halfW = Math.max(15.8, aspect * 15.4), halfH = halfW / aspect;
  camera.left = -halfW;
  camera.right = halfW;
  camera.top = halfH;
  camera.bottom = -halfH;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', resize);
resize();

let prev = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  if (document.hidden || (quality === 'smooth' && now - prev < 32)) return;
  const dt = Math.min(0.05, (now - prev) / 1000);
  prev = now;
  const t = quality === 'smooth' ? 0 : now / 1000;

  // Animate Characters
  for (const r of ['pirate', 'diver']) {
    const a = actors[r], delta = a.userData.target.clone().sub(a.position);
    a.position.lerp(a.userData.target, Math.min(1, dt * 15));
    const moving = delta.length() > 0.03;
    if (moving) {
      const wanted = Math.atan2(delta.x, delta.z);
      a.userData.body.rotation.y += Math.atan2(Math.sin(wanted - a.userData.body.rotation.y), Math.cos(wanted - a.userData.body.rotation.y)) * Math.min(1, dt * 12);
    }
    a.userData.body.position.y = r === 'diver' ? Math.sin(t * 3) * 0.05 : moving ? Math.abs(Math.sin(t * 12)) * 0.045 : 0;
    a.userData.halo.scale.setScalar((r === role ? 1.15 : 1) + Math.sin(t * 3) * 0.03);
  }

  // Animate Entities
  for (const m of entities.values()) {
    const d = m.userData.target.clone().sub(m.position);
    m.position.lerp(m.userData.target, Math.min(1, dt * 9));
    if (m.userData.category === 't') {
      m.rotation.y = t * 0.55 + m.userData.phase;
      m.position.y = -3.2 + Math.sin(t * 2 + m.userData.phase) * 0.13;
    } else if (m.userData.category === 'c') {
      // Clam gently rests on sand
      m.position.y = -3.75;
    } else {
      m.position.y = m.userData.target.y + Math.sin(t * 3 + m.userData.phase) * 0.055;
      if (d.x * d.x + d.z * d.z > 0.001) {
        const a = Math.atan2(d.x, d.z);
        m.rotation.y += Math.atan2(Math.sin(a - m.rotation.y), Math.cos(a - m.rotation.y)) * Math.min(1, dt * 7);
      }
    }
  }

  // Animate Kraken Tentacles
  if (krakenGroup.visible) {
    krakenGroup.position.y = 0.5 + Math.sin(t * 1.8) * 0.2;
    for (let i = 0; i < tentacles.length; i++) {
      tentacles[i].rotation.z = Math.sin(t * 2.5 + i * 1.5) * 0.3;
      tentacles[i].rotation.x = Math.cos(t * 2.0 + i) * 0.2;
    }
  }

  for (const { g, base, amp } of sway) g.rotation.z = Math.sin(t * 1.5 + base) * amp;
  dockRing.scale.setScalar(1 + Math.sin(t * 2) * 0.03);
  dockLabel.position.y = 1.9 + Math.sin(t * 2) * 0.07;
  melon.scale.y = 0.34 + Math.sin(t * 2) * 0.007;

  // Animate FX
  for (const [id, f] of fx) {
    f.age += dt;
    const p = f.age / f.life;
    for (let i = 0; i < f.g.children.length; i++) {
      const m = f.g.children[i], a = i * 6.28 / 8;
      m.position.set(Math.cos(a) * p * 1.8, p * 0.9, Math.sin(a) * p * 1.8);
      m.scale.setScalar(0.13 * (1 - p));
    }
    if (f.e.kind === 'cannon' && Number.isFinite(f.e.tx)) {
      f.g.position.lerp(new THREE.Vector3(f.e.tx, -0.1, f.e.tz), dt * 8);
    }
    if (f.age >= f.life) {
      scene.remove(f.g);
      fx.delete(id);
    }
  }

  if (now > toastUntil) $('toast').classList.remove('show');
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

renderer.domElement.addEventListener('webglcontextlost', e => {
  e.preventDefault();
  resetInput();
  $('fatal').hidden = false;
  $('fatal').textContent = '画面休息了，请刷新页面重新登船。你的房间会保留。';
});

showMenu(false);

const actionWords = {
  chop: '点西瓜切瓜备粮。',
  cook: '榨西瓜特饮，潜水员喝了能极速冲刺。',
  fire: '点大炮，轰击怪物或巨妖。',
  repair: '点扳手修补小船。',
  boost: '点闪电加速游动。',
  bubble: '气泡枪驱赶周围鲨鱼和海怪。',
  sonar: '声纳雷达扫描宝藏。',
  rescue: '饿到不能动时，点救援西瓜。',
};

function speak(words) {
  if (!window.speechSynthesis) { toast(words); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(words);
  u.lang = 'zh-CN';
  u.rate = 0.88;
  speechSynthesis.speak(u);
}

$('ready').onclick = () => { resetInput(); action('ready'); };
$('help').onclick = () => speak(!$('lobby').hidden
  ? '点角色听介绍，再点一次登船。继续当前航程会保留进度，新航程会建立新房间。'
  : role === 'pirate'
  ? '按住左边圆盘拖动。点西瓜切瓜，点榨特饮为队友加速，点大炮轰退水怪与巨妖，点扳手修船。'
  : role === 'diver'
  ? '按住左边圆盘拖动。下水寻找宝石、星星和珍珠，注意氧气，带回船下金圈。用气泡枪赶走鲨鱼。'
  : '点一个角色听介绍，再点一次选择。两个人准备好才出发。');

function applyQuality() {
  store.set('coral-quality', quality);
  document.body.dataset.quality = quality;
  renderer.setPixelRatio(quality === 'smooth' ? Math.min(devicePixelRatio, 1) : Math.min(devicePixelRatio, 1.6));
  renderer.shadowMap.enabled = quality === 'fine';
  sun.castShadow = quality === 'fine';
  sway.forEach(({ g }, i) => { g.visible = quality === 'fine' || i % 3 === 0; });
  $('quality').textContent = quality === 'smooth' ? '🌿 流畅' : '✨ 精美';
  resize();
}
$('quality').onclick = () => { quality = quality === 'smooth' ? 'fine' : 'smooth'; applyQuality(); };
applyQuality();

// Touch gesture prevention for iPads
for (const name of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(name, e => { if (e.cancelable) e.preventDefault(); }, { passive: false });
}
document.addEventListener('touchmove', e => {
  if (!e.target.closest('input') && !e.target.closest('textarea') && (!$('lobby').hidden ? e.touches.length > 1 : true) && e.cancelable) {
    e.preventDefault();
  }
}, { passive: false });
document.addEventListener('dblclick', e => {
  if (!e.target.closest('input') && !e.target.closest('textarea')) e.preventDefault();
}, { passive: false });
let lastTouchEnd = 0;
document.addEventListener('touchend', e => {
  const now = performance.now();
  if (now - lastTouchEnd < 320 && !e.target.closest('input') && !e.target.closest('textarea') && e.cancelable) {
    e.preventDefault();
  }
  lastTouchEnd = now;
}, { passive: false });
