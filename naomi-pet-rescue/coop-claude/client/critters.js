/**
 * client/critters.js — 程序化的小动物 / 野兽 / 角色造型工厂。
 *
 * Naomi 的要求：小动物不能只是「一个球加一个 emoji 符号」，要一眼认得出是谁，
 * 还要继续轻轻晃动、活生生的。所以每一只都是几十行的低面数造型：
 * 大脑袋、小身子、黑豆眼睛，再加上各自的招牌部件（刺猬的刺、狐狸的大尾巴、
 * 猫头鹰的大眼睛、乌龟的壳、小鹿的角……）。
 *
 * 全部用共享材质和共享几何体，225 格地图 + 12 个角色在 iPad 上也跑得动。
 * 材质登记在 SHARED 里，永远不 dispose —— 谁都别去释放它们。
 *
 * Author: Claude Code (Claude Opus)
 */

import * as THREE from 'three';

/** 共享材质表：同一个颜色只做一份。 */
const SHARED = new Map();

export function mat(color, opts = {}) {
  const key = `${color}:${JSON.stringify(opts)}`;
  if (!SHARED.has(key)) {
    SHARED.set(key, new THREE.MeshLambertMaterial({ color, ...opts }));
  }
  return SHARED.get(key);
}

/** 共享几何体表。 */
const GEOM = new Map();
function geom(key, build) {
  if (!GEOM.has(key)) GEOM.set(key, build());
  return GEOM.get(key);
}

const SPHERE = (r, w = 12, h = 10) => geom(`sph:${r}:${w}:${h}`, () => new THREE.SphereGeometry(r, w, h));
const BOX = (x, y, z) => geom(`box:${x}:${y}:${z}`, () => new THREE.BoxGeometry(x, y, z));
const CONE = (r, h, s = 8) => geom(`cone:${r}:${h}:${s}`, () => new THREE.ConeGeometry(r, h, s));
const CYL = (rt, rb, h, s = 8) => geom(`cyl:${rt}:${rb}:${h}:${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s));
const CAPSULE = (r, l, c = 4, s = 8) => geom(`cap:${r}:${l}:${c}:${s}`, () => new THREE.CapsuleGeometry(r, l, c, s));

const BLACK = '#2b2118';
const WHITE = '#fffaf2';

function mesh(geometry, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  return m;
}

/**
 * 一对黑豆眼睛（带一点白色高光），装在朝 -Z 的脸上。
 * 所有造型都调它，眼睛一致才像同一个世界里的小动物。
 */
function eyes(group, { y, z, spread = 0.065, size = 0.028 }) {
  for (const side of [-1, 1]) {
    group.add(mesh(SPHERE(size, 8, 6), mat(BLACK), side * spread, y, z));
    group.add(mesh(SPHERE(size * 0.4, 6, 5), mat(WHITE), side * spread - 0.008, y + size * 0.4, z - 0.012));
  }
}

/** 圆耳朵（熊、松鼠、浣熊）。 */
function roundEars(group, { y, r = 0.055, spread = 0.11, inner = null }) {
  for (const side of [-1, 1]) {
    const ear = mesh(SPHERE(r, 10, 8), group.userData.skin, side * spread, y, 0.01);
    group.add(ear);
    if (inner) group.add(mesh(SPHERE(r * 0.55, 8, 6), mat(inner), side * spread, y, -0.025));
  }
}

/** 尖耳朵（狐狸、狼、小鹿）。 */
function pointyEars(group, { y, r = 0.05, h = 0.12, spread = 0.09, tilt = 0.2, inner = null }) {
  for (const side of [-1, 1]) {
    const ear = mesh(CONE(r, h, 6), group.userData.skin, side * spread, y, 0.01);
    ear.rotation.z = -side * tilt;
    group.add(ear);
    if (inner) {
      const bit = mesh(CONE(r * 0.5, h * 0.6, 6), mat(inner), side * spread, y + 0.01, -0.018);
      bit.rotation.z = -side * tilt;
      group.add(bit);
    }
  }
}

/** 口鼻：一个浅色的小突起加一个鼻头。 */
function muzzle(group, { y, z = -0.13, r = 0.055, len = 0.08, color = '#fff0e2', nose = '#e08a9a' }) {
  const snout = mesh(SPHERE(r, 10, 8), mat(color), 0, y, z);
  snout.scale.set(1, 0.8, 1.15);
  group.add(snout);
  group.add(mesh(SPHERE(r * 0.42, 8, 6), mat(nose), 0, y + 0.012, z - r * 0.85));
}

/** 蓬松大尾巴（狐狸、松鼠）。 */
function fluffyTail(group, { color, tipColor = null, lift = 0.5, scale = 1 }) {
  const tail = new THREE.Group();
  const segs = [[0.075, 0], [0.085, 0.09], [0.075, 0.18], [0.055, 0.25]];
  segs.forEach(([r, along], i) => {
    tail.add(mesh(SPHERE(r * scale, 10, 8), mat(i === segs.length - 1 && tipColor ? tipColor : color), 0, along * scale, 0));
  });
  tail.position.set(0, 0.16, 0.16);
  tail.rotation.x = -lift;
  group.add(tail);
  return tail;
}

// ———————————————————— 8 只小动物 ————————————————————

const CRITTERS = {
  /** 🐇 小兔宝宝：雪白、长耳朵、粉鼻子。 */
  bunny(group) {
    group.userData.skin = mat('#fdf6ee');
    group.add(mesh(SPHERE(0.11, 12, 10), group.userData.skin, 0, 0.12, 0.03)); // 身子
    const head = mesh(SPHERE(0.125, 14, 12), group.userData.skin, 0, 0.27, -0.01);
    group.add(head);
    for (const side of [-1, 1]) {
      const ear = mesh(CAPSULE(0.032, 0.17, 3, 8), group.userData.skin, side * 0.055, 0.42, 0.01);
      ear.rotation.z = side * 0.16;
      group.add(ear);
      const inner = mesh(CAPSULE(0.016, 0.13, 3, 6), mat('#f7c6d4'), side * 0.055, 0.425, -0.015);
      inner.rotation.z = side * 0.16;
      group.add(inner);
    }
    muzzle(group, { y: 0.26, z: -0.1, r: 0.045, nose: '#f08fa8' });
    eyes(group, { y: 0.30, z: -0.1, spread: 0.055 });
    group.add(mesh(SPHERE(0.05, 8, 6), mat(WHITE), 0, 0.13, 0.13)); // 圆尾巴
  },

  /** 🦔 小刺猬：棕脸、一背的尖刺。 */
  hedgehog(group) {
    group.userData.skin = mat('#c9a37a');
    const body = mesh(SPHERE(0.15, 14, 12), mat('#7a5a3c'), 0, 0.15, 0.02);
    body.scale.set(1, 0.85, 1.05);
    group.add(body);
    // 一圈尖刺
    for (let i = 0; i < 14; i += 1) {
      const a = (i / 14) * Math.PI * 2;
      const ring = i % 2 === 0 ? 0.105 : 0.075;
      const spike = mesh(CONE(0.022, 0.1, 5), mat('#4f3a26'),
        Math.cos(a) * ring, 0.22 + (i % 3) * 0.015, Math.sin(a) * ring + 0.03);
      spike.rotation.x = Math.sin(a) * 0.5;
      spike.rotation.z = -Math.cos(a) * 0.5;
      group.add(spike);
    }
    const head = mesh(SPHERE(0.085, 12, 10), group.userData.skin, 0, 0.16, -0.11);
    group.add(head);
    muzzle(group, { y: 0.15, z: -0.185, r: 0.038, color: '#e8cbae', nose: BLACK });
    eyes(group, { y: 0.185, z: -0.16, spread: 0.042, size: 0.022 });
    roundEars(group, { y: 0.225, r: 0.032, spread: 0.06 });
  },

  /** 🐿️ 小松鼠：橙棕、超大的蓬松尾巴竖在身后。 */
  squirrel(group) {
    group.userData.skin = mat('#c8783c');
    group.add(mesh(SPHERE(0.1, 12, 10), group.userData.skin, 0, 0.13, 0.02));
    group.add(mesh(SPHERE(0.062, 10, 8), mat('#f2dcc0'), 0, 0.12, -0.07)); // 白肚皮
    group.add(mesh(SPHERE(0.115, 14, 12), group.userData.skin, 0, 0.27, -0.02));
    roundEars(group, { y: 0.375, r: 0.045, spread: 0.075, inner: '#f0b9a0' });
    muzzle(group, { y: 0.255, z: -0.11, r: 0.042, nose: '#8a4a3a' });
    eyes(group, { y: 0.295, z: -0.105, spread: 0.05 });
    fluffyTail(group, { color: '#d8894a', tipColor: '#f0c69a', lift: 1.15, scale: 1.25 });
  },

  /** 🦉 小猫头鹰：米色、超大的眼睛、尖喙。 */
  owl(group) {
    group.userData.skin = mat('#b99464');
    const body = mesh(SPHERE(0.145, 14, 12), group.userData.skin, 0, 0.2, 0);
    body.scale.set(1, 1.15, 0.95);
    group.add(body);
    group.add(mesh(SPHERE(0.095, 12, 10), mat('#f0dcc0'), 0, 0.17, -0.075)); // 胸口
    // 招牌大眼睛：一对白盘 + 大黑瞳
    for (const side of [-1, 1]) {
      group.add(mesh(SPHERE(0.055, 12, 10), mat('#fff6e4'), side * 0.06, 0.29, -0.095));
      group.add(mesh(SPHERE(0.032, 10, 8), mat(BLACK), side * 0.062, 0.29, -0.125));
      group.add(mesh(SPHERE(0.012, 8, 6), mat(WHITE), side * 0.05, 0.305, -0.145));
    }
    const beak = mesh(CONE(0.028, 0.06, 6), mat('#e8a03c'), 0, 0.255, -0.13);
    beak.rotation.x = -Math.PI / 2;
    group.add(beak);
    for (const side of [-1, 1]) { // 耳羽
      const tuft = mesh(CONE(0.032, 0.075, 5), group.userData.skin, side * 0.085, 0.36, -0.01);
      tuft.rotation.z = -side * 0.35;
      group.add(tuft);
    }
    for (const side of [-1, 1]) { // 翅膀
      const wing = mesh(SPHERE(0.055, 10, 8), mat('#a37f52'), side * 0.135, 0.2, 0.01);
      wing.scale.set(0.55, 1.3, 0.95);
      group.add(wing);
    }
  },

  /** 🦊 小狐狸：橙红、尖耳朵、白尖大尾巴。 */
  fox(group) {
    group.userData.skin = mat('#e0703a');
    group.add(mesh(SPHERE(0.105, 12, 10), group.userData.skin, 0, 0.13, 0.02));
    group.add(mesh(SPHERE(0.065, 10, 8), mat('#fbeadb'), 0, 0.115, -0.06)); // 白胸
    group.add(mesh(SPHERE(0.115, 14, 12), group.userData.skin, 0, 0.27, -0.02));
    pointyEars(group, { y: 0.385, r: 0.048, h: 0.115, spread: 0.08, inner: '#3b2a20' });
    muzzle(group, { y: 0.25, z: -0.13, r: 0.048, len: 0.1, color: '#fbeadb', nose: BLACK });
    eyes(group, { y: 0.295, z: -0.105, spread: 0.052 });
    fluffyTail(group, { color: '#e0703a', tipColor: '#fbeadb', lift: 0.75, scale: 1.15 });
  },

  /** 🦝 小浣熊：灰身、黑眼罩、条纹尾巴。 */
  raccoon(group) {
    group.userData.skin = mat('#9aa0ab');
    group.add(mesh(SPHERE(0.11, 12, 10), group.userData.skin, 0, 0.13, 0.02));
    group.add(mesh(SPHERE(0.115, 14, 12), group.userData.skin, 0, 0.27, -0.02));
    // 招牌黑眼罩
    const maskGeo = BOX(0.16, 0.055, 0.045);
    group.add(mesh(maskGeo, mat('#3a3430'), 0, 0.293, -0.09));
    roundEars(group, { y: 0.375, r: 0.045, spread: 0.082, inner: '#d8ccc0' });
    muzzle(group, { y: 0.245, z: -0.115, r: 0.045, color: '#e8e2da', nose: BLACK });
    eyes(group, { y: 0.295, z: -0.115, spread: 0.05, size: 0.024 });
    // 条纹尾巴
    const tail = new THREE.Group();
    [0, 0.07, 0.14, 0.2].forEach((along, i) => {
      tail.add(mesh(SPHERE(0.055 - i * 0.004, 10, 8), mat(i % 2 === 0 ? '#6b6560' : '#d8d2ca'), 0, along, 0));
    });
    tail.position.set(0, 0.15, 0.14);
    tail.rotation.x = -0.9;
    group.add(tail);
  },

  /** 🐢 小乌龟：绿脑袋、深绿的壳。 */
  turtle(group) {
    group.userData.skin = mat('#7fb84f');
    const shell = mesh(SPHERE(0.155, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat('#4a7a2e'), 0, 0.1, 0.01);
    shell.scale.set(1, 0.78, 1.05);
    group.add(shell);
    // 壳上的纹路
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2;
      const plate = mesh(SPHERE(0.038, 8, 6), mat('#6b9c3e'), Math.cos(a) * 0.08, 0.175, Math.sin(a) * 0.08 + 0.01);
      plate.scale.y = 0.4;
      group.add(plate);
    }
    group.add(mesh(SPHERE(0.075, 12, 10), group.userData.skin, 0, 0.13, -0.15));
    muzzle(group, { y: 0.115, z: -0.205, r: 0.035, color: '#a3d16f', nose: '#4a6b2a' });
    eyes(group, { y: 0.155, z: -0.195, spread: 0.04, size: 0.022 });
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { // 四只小脚
      const foot = mesh(SPHERE(0.042, 8, 6), group.userData.skin, sx * 0.11, 0.045, sz * 0.09 + 0.01);
      foot.scale.set(1.2, 0.6, 1);
      group.add(foot);
    }
  },

  /** 🦌 小鹿：浅棕、白斑点、小鹿角。 */
  deer(group) {
    group.userData.skin = mat('#c69a63');
    const body = mesh(SPHERE(0.105, 12, 10), group.userData.skin, 0, 0.16, 0.02);
    body.scale.set(1, 1.05, 1.1);
    group.add(body);
    for (const [dx, dz] of [[-0.05, -0.04], [0.05, 0.05], [-0.04, 0.06]]) { // 白斑点
      const spot = mesh(SPHERE(0.022, 8, 6), mat('#f6ead6'), dx, 0.19, dz + 0.08);
      spot.scale.y = 0.4;
      group.add(spot);
    }
    group.add(mesh(SPHERE(0.1, 14, 12), group.userData.skin, 0, 0.32, -0.03));
    pointyEars(group, { y: 0.41, r: 0.042, h: 0.1, spread: 0.088, tilt: 0.75, inner: '#f0cfae' });
    // 小鹿角：两根分叉的细枝
    for (const side of [-1, 1]) {
      const stem = mesh(CYL(0.012, 0.016, 0.11, 5), mat('#8a6a42'), side * 0.04, 0.44, -0.01);
      stem.rotation.z = -side * 0.22;
      group.add(stem);
      const fork = mesh(CYL(0.009, 0.011, 0.07, 5), mat('#8a6a42'), side * 0.068, 0.5, -0.005);
      fork.rotation.z = -side * 0.7;
      group.add(fork);
    }
    muzzle(group, { y: 0.295, z: -0.115, r: 0.04, color: '#e8cba6', nose: BLACK });
    eyes(group, { y: 0.335, z: -0.095, spread: 0.048 });
    group.add(mesh(SPHERE(0.035, 8, 6), mat('#f6ead6'), 0, 0.17, 0.12)); // 小白尾
  },
};

/**
 * 造一只小动物。未知种类退回成一只圆脸小兽，绝不留空。
 * @returns {THREE.Group} 带 userData.bobSeed，交给渲染器做「轻轻晃动」
 */
export function makeCritter(kind) {
  const group = new THREE.Group();
  group.userData.skin = mat('#d8c0a0');
  (CRITTERS[kind] ?? CRITTERS.bunny)(group);
  group.userData.bobSeed = hashSeed(kind);
  group.userData.kind = kind;
  return group;
}

/** 🐺 灰狼：比小动物大一圈，长吻、竖耳、黄眼睛。 */
export function makeWolf() {
  const group = new THREE.Group();
  const fur = mat('#6c7580');
  const belly = mat('#b9c0c8');
  group.userData.skin = fur;

  const body = mesh(SPHERE(0.19, 14, 12), fur, 0, 0.26, 0.06);
  body.scale.set(1, 0.88, 1.35);
  group.add(body);
  group.add(mesh(SPHERE(0.1, 10, 8), belly, 0, 0.2, 0.02));

  const head = mesh(SPHERE(0.145, 14, 12), fur, 0, 0.42, -0.16);
  group.add(head);
  const snout = mesh(SPHERE(0.075, 12, 10), mat('#5b636d'), 0, 0.39, -0.29);
  snout.scale.set(0.85, 0.7, 1.5);
  group.add(snout);
  group.add(mesh(SPHERE(0.035, 8, 6), mat('#241d18'), 0, 0.4, -0.37));
  // 黄眼睛 —— 一眼就知道它不是来玩的
  for (const side of [-1, 1]) {
    group.add(mesh(SPHERE(0.03, 8, 6), mat('#f2c53d'), side * 0.06, 0.45, -0.25));
    group.add(mesh(SPHERE(0.014, 6, 5), mat(BLACK), side * 0.062, 0.45, -0.275));
  }
  for (const side of [-1, 1]) {
    const ear = mesh(CONE(0.055, 0.13, 5), fur, side * 0.085, 0.55, -0.13);
    ear.rotation.z = -side * 0.14;
    group.add(ear);
  }
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const leg = mesh(CYL(0.035, 0.04, 0.22, 6), mat('#5b636d'), sx * 0.11, 0.11, sz * 0.12 + 0.06);
    group.add(leg);
  }
  const tail = mesh(CAPSULE(0.05, 0.16, 3, 8), fur, 0, 0.3, 0.26);
  tail.rotation.x = -0.65;
  group.add(tail);

  group.userData.bobSeed = hashSeed('wolf');
  return group;
}

/** 🦁 狮子：金黄的大鬃毛，一看就是这片花园里的大块头。 */
export function makeLion() {
  const group = new THREE.Group();
  const coat = mat('#e0a63c');
  const maneColor = mat('#b3651f');
  group.userData.skin = coat;

  const body = mesh(SPHERE(0.2, 14, 12), coat, 0, 0.27, 0.07);
  body.scale.set(1, 0.9, 1.3);
  group.add(body);

  // 鬃毛：一圈球，比脑袋大一号
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2;
    group.add(mesh(SPHERE(0.075, 8, 6), maneColor,
      Math.cos(a) * 0.185, 0.45 + Math.sin(a) * 0.185, -0.14));
  }
  const head = mesh(SPHERE(0.155, 14, 12), coat, 0, 0.45, -0.19);
  group.add(head);
  const snout = mesh(SPHERE(0.075, 12, 10), mat('#f0cf94'), 0, 0.41, -0.3);
  snout.scale.set(1.15, 0.8, 1);
  group.add(snout);
  group.add(mesh(SPHERE(0.032, 8, 6), mat('#8a4a2a'), 0, 0.425, -0.36));
  for (const side of [-1, 1]) {
    group.add(mesh(SPHERE(0.032, 8, 6), mat('#4a3520'), side * 0.06, 0.48, -0.29));
    group.add(mesh(SPHERE(0.013, 6, 5), mat(WHITE), side * 0.052, 0.492, -0.31));
  }
  for (const side of [-1, 1]) {
    group.add(mesh(SPHERE(0.045, 8, 6), coat, side * 0.115, 0.575, -0.17));
  }
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    group.add(mesh(CYL(0.042, 0.048, 0.2, 6), mat('#cf9433'), sx * 0.12, 0.1, sz * 0.12 + 0.07));
  }
  const tail = mesh(CYL(0.022, 0.022, 0.26, 5), coat, 0, 0.34, 0.27);
  tail.rotation.x = -0.75;
  group.add(tail);
  group.add(mesh(SPHERE(0.055, 8, 6), maneColor, 0, 0.46, 0.35)); // 尾巴毛球

  group.userData.bobSeed = hashSeed('lion');
  return group;
}

/**
 * 🐻🐰 两位玩家角色。
 *
 * 刻意**不挂名字牌**：头顶的大字牌会把前方的路挡住，Naomi 特意提过。
 * 认人靠体型和颜色 —— 小熊是敦实的棕色圆耳，小兔是高瘦的粉色长耳。
 */
export function makePlayer(player, isBear) {
  const group = new THREE.Group();
  const skin = mat(player.color);
  group.userData.skin = skin;

  if (isBear) {
    const body = mesh(CAPSULE(0.21, 0.3, 4, 12), skin, 0, 0.37, 0);
    body.scale.set(1.05, 1, 1.05);
    group.add(body);
    group.add(mesh(SPHERE(0.13, 12, 10), mat('#f2dcc0'), 0, 0.3, -0.16)); // 胸口浅色
    const head = mesh(SPHERE(0.22, 16, 14), skin, 0, 0.74, 0);
    group.add(head);
    roundEars(group, { y: 0.92, r: 0.085, spread: 0.155, inner: '#e8b48a' });
    muzzle(group, { y: 0.71, z: -0.19, r: 0.085, color: '#f7e3c8', nose: '#4a3324' });
    eyes(group, { y: 0.78, z: -0.17, spread: 0.082, size: 0.034 });
    for (const side of [-1, 1]) { // 手臂
      const arm = mesh(CAPSULE(0.06, 0.16, 3, 8), skin, side * 0.23, 0.42, -0.02);
      arm.rotation.z = side * 0.25;
      group.add(arm);
    }
  } else {
    const body = mesh(CAPSULE(0.17, 0.26, 4, 12), skin, 0, 0.34, 0);
    group.add(body);
    group.add(mesh(SPHERE(0.1, 12, 10), mat('#fff0f5'), 0, 0.28, -0.13));
    const head = mesh(SPHERE(0.18, 16, 14), skin, 0, 0.66, 0);
    group.add(head);
    for (const side of [-1, 1]) { // 招牌长耳朵
      const ear = mesh(CAPSULE(0.048, 0.26, 3, 8), skin, side * 0.085, 0.94, -0.01);
      ear.rotation.z = side * 0.17;
      group.add(ear);
      const inner = mesh(CAPSULE(0.024, 0.2, 3, 6), mat('#ffd9e6'), side * 0.085, 0.945, -0.028);
      inner.rotation.z = side * 0.17;
      group.add(inner);
    }
    muzzle(group, { y: 0.63, z: -0.155, r: 0.062, color: '#fff3f7', nose: '#e8688f' });
    eyes(group, { y: 0.70, z: -0.14, spread: 0.068, size: 0.03 });
    for (const side of [-1, 1]) {
      const arm = mesh(CAPSULE(0.048, 0.13, 3, 8), skin, side * 0.19, 0.4, -0.02);
      arm.rotation.z = side * 0.25;
      group.add(arm);
    }
    group.add(mesh(SPHERE(0.07, 10, 8), mat('#fff0f5'), 0, 0.3, 0.17)); // 圆尾巴
  }

  // 脚下的软阴影，帮孩子判断自己站在哪一格
  const shadow = new THREE.Mesh(
    geom('shadow', () => new THREE.CircleGeometry(0.3, 18)),
    mat('#2f5d2a', { transparent: true, opacity: 0.22 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.025;
  group.add(shadow);

  const carrySlot = new THREE.Group();
  carrySlot.position.y = isBear ? 1.02 : 0.94;
  group.add(carrySlot);
  group.userData.carrySlot = carrySlot;
  group.userData.bobSeed = hashSeed(player.role);
  return group;
}

/**
 * 队友指示器：一个悬在头顶的小三角。
 * 这不是名字牌 —— 没有文字、只有一个小箭头，挡不住前面的路。
 */
export function makeTeammatePin(color) {
  const pin = new THREE.Mesh(
    geom('pin', () => new THREE.ConeGeometry(0.075, 0.14, 4)),
    mat(color, { transparent: true, opacity: 0.9 }),
  );
  pin.rotation.x = Math.PI; // 尖端朝下，指着队友
  pin.rotation.y = Math.PI / 4;
  return pin;
}

/** 🌟 能量星：一个金色的八面体，会转、会飘。 */
export function makeEnergyStar() {
  const group = new THREE.Group();
  const star = new THREE.Mesh(
    geom('star', () => new THREE.OctahedronGeometry(0.15, 0)),
    mat('#ffd23f', { emissive: 0x6b4a00 }),
  );
  star.scale.set(1, 1.5, 1);
  star.position.y = 0.42;
  group.add(star);
  const halo = new THREE.Mesh(
    geom('halo', () => new THREE.RingGeometry(0.2, 0.26, 18)),
    mat('#ffe98a', { transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.05;
  group.add(halo);
  group.userData.star = star;
  group.userData.halo = halo;
  return group;
}

/**
 * 🏡 / 🏚️ 小屋。真家和假房子共用同一套轮廓 —— 远看就是像，
 * 近看才分得出：真家有暖黄的窗、屋顶小旗和金色光环，假房子灰扑扑、
 * 窗是黑的、屋顶秃着。认错门的代价由规则负责，这里只负责「看起来真的很像」。
 */
export function makeCabin({ real = true, discovered = false } = {}) {
  const group = new THREE.Group();
  const wall = real ? '#d9a066' : '#9a9088';
  const roof = real ? '#c1503f' : '#6e6862';

  const cabin = mesh(BOX(0.66, 0.5, 0.66), mat(wall), 0, 0.25, 0);
  group.add(cabin);
  const roofMesh = mesh(CONE(0.58, 0.42, 4), mat(roof), 0, 0.7, 0);
  roofMesh.rotation.y = Math.PI / 4;
  group.add(roofMesh);
  group.add(mesh(BOX(0.2, 0.28, 0.04), mat(real ? '#7a4a24' : '#4a453f'), 0, 0.14, 0.34));

  // 窗户：真家是暖黄的，假房子是冷黑的
  for (const side of [-1, 1]) {
    group.add(mesh(BOX(0.14, 0.14, 0.03), mat(real ? '#ffe9a8' : '#2f2b28'), side * 0.19, 0.33, 0.34));
  }

  if (real) {
    // 屋顶小旗 + 地面金环：真家的两个专属标志
    group.add(mesh(CYL(0.012, 0.012, 0.3, 5), mat('#8a6a42'), 0, 1.0, 0));
    const flag = mesh(BOX(0.18, 0.11, 0.02), mat('#ff7a3d'), 0.09, 1.1, 0);
    group.add(flag);
    const ring = new THREE.Mesh(
      geom('homeRing', () => new THREE.RingGeometry(0.46, 0.56, 24)),
      mat('#ffd98a', { transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    group.add(ring);
    group.userData.ring = ring;
  } else if (discovered) {
    // 已经上过一次当：门口插一个叉，帮孩子记住这座不是家
    const crossMat = mat('#d8453a');
    for (const rot of [Math.PI / 4, -Math.PI / 4]) {
      const bar = mesh(BOX(0.34, 0.06, 0.05), crossMat, 0, 0.62, 0.42);
      bar.rotation.z = rot;
      group.add(bar);
    }
  }
  return group;
}

/** 字符串 → 稳定的小数种子，让每只动物的晃动节奏各不相同但每局一致。 */
function hashSeed(text) {
  let h = 0;
  for (let i = 0; i < String(text).length; i += 1) h = (h * 31 + String(text).charCodeAt(i)) >>> 0;
  return (h % 628) / 100;
}

export const CRITTER_KINDS = Object.keys(CRITTERS);
