/**
 * client/render3d.js — Three.js 花园 3D 渲染器。
 *
 *  - 第三人称越肩跟随相机（相机在角色身后斜上方，略微偏右肩）
 *  - 防穿墙相机：撞到树篱 / 石头时沿视线平滑收缩，绝不穿模（用 core/vision 的纯数学）
 *  - 视线遮挡：队友被树篱、石头、森林挡住或距离过远时，模型直接隐藏
 *  - 创意 1 的石头退路箭头：3D 箭头 + 墙面高亮的动画提示
 *
 * Author: Claude Code (Claude Opus)
 */

import * as THREE from 'three';
import { toWorld, dirToVec3, dirToYaw, rightOf, lerpAngle } from './coords.js';
import {
  TERRAIN, ROLES, ROLE_LIST, DIR_VECTOR, GRID_SIZE,
  CAMERA_DISTANCE, CAMERA_HEIGHT, CAMERA_SHOULDER_OFFSET, CAMERA_MIN_DISTANCE, LOS_MAX_DISTANCE,
} from '/core/constants.js';
import { hedgeSegments, MAZE_ENTRANCE, MAZE_EXIT, MAZE_GAZEBO } from '/core/maze.js';
import { resolveCameraPosition, smoothDamp } from '/core/vision.js';

const SKY = 0xbfe6ff;
const HEDGE_HEIGHT = 1.45;
const ARROW_LIFETIME = 2.8;

const TERRAIN_COLOR = {
  [TERRAIN.GRASS]: 0x86cf6d,
  [TERRAIN.FOREST]: 0x4f9a4c,
  [TERRAIN.ROCK]: 0x9aa4ab,
  [TERRAIN.NET]: 0xb79a63,
  [TERRAIN.HOME]: 0xffe2a8,
};

/** 用 Canvas 画一个带描边的 emoji / 文字贴图，做成永远面向相机的 Sprite。 */
function makeLabelSprite(text, { size = 256, font = 150, background = null, color = '#3b2b1d' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (background) {
    ctx.fillStyle = background;
    const r = size * 0.22;
    ctx.beginPath();
    ctx.roundRect(size * 0.04, size * 0.18, size * 0.92, size * 0.64, r);
    ctx.fill();
  }
  ctx.font = `${font}px "PingFang SC", "Apple Color Emoji", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = font * 0.12;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.strokeText(text, size / 2, size / 2);
  ctx.fillStyle = color;
  ctx.fillText(text, size / 2, size / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(0.7, 0.7, 0.7);
  return sprite;
}

function disposeDeep(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const m of materials) {
        if (m.map) m.map.dispose();
        m.dispose();
      }
    }
  });
}

export class GardenRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(SKY, 1);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(SKY);
    this.scene.fog = new THREE.Fog(SKY, LOS_MAX_DISTANCE * 0.9, LOS_MAX_DISTANCE * 2.4);

    this.camera = new THREE.PerspectiveCamera(58, 1, 0.05, 80);

    this.staticGroup = new THREE.Group();
    this.dynamicGroup = new THREE.Group();
    this.arrowGroup = new THREE.Group();
    this.scene.add(this.staticGroup, this.dynamicGroup, this.arrowGroup);

    this.addLights();

    this.world = null; // { grid, walls:Set }
    this.snapshot = null;
    this.viewRole = ROLES.BUNNY;
    this.builtSignature = null;

    this.playerMeshes = new Map();
    this.animalMeshes = new Map();
    this.giftMeshes = new Map();
    this.arrows = [];
    this.poses = new Map(); // role -> {x, z, yaw}
    this.camDistance = CAMERA_DISTANCE;
    this.clock = new THREE.Clock();
    this.shelterDome = null;
    this.wallFlash = [];
  }

  addLights() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x6f9a5a, 1.05);
    const sun = new THREE.DirectionalLight(0xfff3d6, 1.15);
    sun.position.set(6, 12, 4);
    this.sun = sun;
    this.hemi = hemi;
    this.scene.add(hemi, sun, new THREE.AmbientLight(0xffffff, 0.25));
  }

  resize() {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  setViewRole(role) {
    if (ROLE_LIST.includes(role)) this.viewRole = role;
  }

  // ———————————————————— 静态场景 ————————————————————

  buildStatic(snapshot) {
    const signature = `${snapshot.seed}:${snapshot.walls.length}:${snapshot.grid.flat().join('')}`;
    if (signature === this.builtSignature) return;
    this.builtSignature = signature;

    disposeDeep(this.staticGroup);
    this.staticGroup.clear();

    // 地面底板
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(GRID_SIZE + 1.6, 0.4, GRID_SIZE + 1.6),
      new THREE.MeshLambertMaterial({ color: 0x6fae5c }),
    );
    base.position.set(GRID_SIZE / 2, -0.22, GRID_SIZE / 2);
    this.staticGroup.add(base);

    const tileGeometry = new THREE.BoxGeometry(0.98, 0.08, 0.98);
    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        const terrain = snapshot.grid[y][x];
        const shade = (x + y) % 2 === 0 ? 1 : 0.93;
        const color = new THREE.Color(TERRAIN_COLOR[terrain] ?? 0x86cf6d).multiplyScalar(shade);
        const tile = new THREE.Mesh(tileGeometry, new THREE.MeshLambertMaterial({ color }));
        tile.position.copy(toWorld(x, y, -0.04));
        this.staticGroup.add(tile);

        if (terrain === TERRAIN.FOREST) this.staticGroup.add(this.makeTree(x, y));
        if (terrain === TERRAIN.ROCK) this.staticGroup.add(this.makeRock(x, y));
        if (terrain === TERRAIN.NET) this.staticGroup.add(this.makeNet(x, y));
      }
    }

    // 花园外墙
    const wallMaterial = new THREE.MeshLambertMaterial({ color: 0xd9b98a });
    const rim = [
      { w: GRID_SIZE + 0.6, d: 0.3, x: GRID_SIZE / 2, z: -0.15 },
      { w: GRID_SIZE + 0.6, d: 0.3, x: GRID_SIZE / 2, z: GRID_SIZE + 0.15 },
      { w: 0.3, d: GRID_SIZE + 0.6, x: -0.15, z: GRID_SIZE / 2 },
      { w: 0.3, d: GRID_SIZE + 0.6, x: GRID_SIZE + 0.15, z: GRID_SIZE / 2 },
    ];
    for (const r of rim) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(r.w, 0.55, r.d), wallMaterial);
      mesh.position.set(r.x, 0.26, r.z);
      this.staticGroup.add(mesh);
    }

    // 树篱迷宫墙体
    const walls = new Set(snapshot.walls);
    const hedgeMaterial = new THREE.MeshLambertMaterial({ color: 0x2f7d४4 & 0xffffff });
    hedgeMaterial.color.setHex(0x2f7d44);
    for (const segment of hedgeSegments(walls)) {
      const geometry = segment.horizontal
        ? new THREE.BoxGeometry(0.98, HEDGE_HEIGHT, 0.18)
        : new THREE.BoxGeometry(0.18, HEDGE_HEIGHT, 0.98);
      const mesh = new THREE.Mesh(geometry, hedgeMaterial);
      mesh.position.set(segment.cx, HEDGE_HEIGHT / 2, segment.cy);
      mesh.userData.hedge = true;
      mesh.userData.key = `${segment.x},${segment.y},${segment.dir}`;
      this.staticGroup.add(mesh);
      // 树篱顶上的小花球，孩子更容易分辨墙头
      const bloom = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 8, 6),
        new THREE.MeshLambertMaterial({ color: 0xff9ec4 }),
      );
      bloom.position.set(segment.cx, HEDGE_HEIGHT + 0.06, segment.cy);
      this.staticGroup.add(bloom);
    }

    this.staticGroup.add(this.makeArchway(MAZE_ENTRANCE, 0xffb3d1, '入口花廊'));
    this.staticGroup.add(this.makeArchway(MAZE_EXIT, 0xffd98a, '出口拱门'));
    this.staticGroup.add(this.makeGazebo());
    this.staticGroup.add(this.makeHome(snapshot.home));
  }

  makeTree(x, y) {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.1, 0.5, 6),
      new THREE.MeshLambertMaterial({ color: 0x8b5a2b }),
    );
    trunk.position.y = 0.25;
    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(0.36, 0.8, 8),
      new THREE.MeshLambertMaterial({ color: 0x2e7d32 }),
    );
    crown.position.y = 0.85;
    group.add(trunk, crown);
    group.position.copy(toWorld(x, y));
    return group;
  }

  makeRock(x, y) {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.36, 0),
      new THREE.MeshLambertMaterial({ color: 0x8d969c, flatShading: true }),
    );
    rock.position.copy(toWorld(x, y, 0.28));
    rock.rotation.set(0.4, 0.8, 0.2);
    return rock;
  }

  makeNet(x, y) {
    const group = new THREE.Group();
    const material = new THREE.MeshLambertMaterial({ color: 0x7a5c2e });
    for (let i = -1; i <= 1; i += 1) {
      const a = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.05), material);
      a.position.set(0, 0.12, i * 0.28);
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.9), material);
      b.position.set(i * 0.28, 0.12, 0);
      group.add(a, b);
    }
    group.position.copy(toWorld(x, y));
    return group;
  }

  makeArchway(opening, color, label) {
    const group = new THREE.Group();
    const v = DIR_VECTOR[opening.dir];
    const cx = opening.x + 0.5 + v.dx * 0.5;
    const cz = opening.y + 0.5 + v.dy * 0.5;
    const horizontal = opening.dir === 'N' || opening.dir === 'S';
    const material = new THREE.MeshLambertMaterial({ color });
    const postGeometry = new THREE.CylinderGeometry(0.07, 0.07, HEDGE_HEIGHT + 0.25, 8);
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(postGeometry, material);
      post.position.set(
        cx + (horizontal ? side * 0.46 : 0),
        (HEDGE_HEIGHT + 0.25) / 2,
        cz + (horizontal ? 0 : side * 0.46),
      );
      group.add(post);
    }
    const beam = new THREE.Mesh(
      horizontal ? new THREE.BoxGeometry(1.05, 0.12, 0.16) : new THREE.BoxGeometry(0.16, 0.12, 1.05),
      material,
    );
    beam.position.set(cx, HEDGE_HEIGHT + 0.3, cz);
    group.add(beam);

    const sign = makeLabelSprite(label, { size: 256, font: 52, background: 'rgba(255,255,255,0.82)' });
    sign.scale.set(1.1, 1.1, 1.1);
    sign.position.set(cx, HEDGE_HEIGHT + 0.75, cz);
    group.add(sign);
    return group;
  }

  makeGazebo() {
    const group = new THREE.Group();
    const material = new THREE.MeshLambertMaterial({ color: 0xfff1c9 });
    for (const [dx, dz] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 6), material);
      post.position.set(MAZE_GAZEBO.x + 0.5 + dx, 0.5, MAZE_GAZEBO.y + 0.5 + dz);
      group.add(post);
    }
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(0.62, 0.42, 8),
      new THREE.MeshLambertMaterial({ color: 0xff9ec4 }),
    );
    roof.position.copy(toWorld(MAZE_GAZEBO.x, MAZE_GAZEBO.y, 1.2));
    group.add(roof);
    return group;
  }

  makeHome(home) {
    const group = new THREE.Group();
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(0.66, 0.5, 0.66),
      new THREE.MeshLambertMaterial({ color: 0xd9a066 }),
    );
    cabin.position.y = 0.25;
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(0.58, 0.42, 4),
      new THREE.MeshLambertMaterial({ color: 0xc1503f }),
    );
    roof.position.y = 0.7;
    roof.rotation.y = Math.PI / 4;
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.28, 0.03),
      new THREE.MeshLambertMaterial({ color: 0x7a4a24 }),
    );
    door.position.set(0, 0.14, 0.34);

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.95, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshLambertMaterial({ color: 0x8fd8ff, transparent: true, opacity: 0.28, side: THREE.DoubleSide }),
    );
    dome.position.y = 0.02;
    dome.visible = false;
    this.shelterDome = dome;

    const label = makeLabelSprite('🏡 家', { size: 256, font: 96, background: 'rgba(255,255,255,0.8)' });
    label.position.y = 1.35;
    label.scale.set(0.9, 0.9, 0.9);

    group.add(cabin, roof, door, dome, label);
    group.position.copy(toWorld(home.x, home.y));
    return group;
  }

  // ———————————————————— 角色 / 小动物 / 礼盒 ————————————————————

  makePlayer(player) {
    const group = new THREE.Group();
    const isBear = player.role === ROLES.BEAR;
    const skin = new THREE.MeshLambertMaterial({ color: new THREE.Color(player.color) });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, isBear ? 0.28 : 0.22, 4, 12), skin);
    body.position.y = isBear ? 0.36 : 0.32;
    const head = new THREE.Mesh(new THREE.SphereGeometry(isBear ? 0.21 : 0.18, 14, 12), skin);
    head.position.y = isBear ? 0.72 : 0.64;

    const muzzle = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.16, 8),
      new THREE.MeshLambertMaterial({ color: 0xfff0e2 }),
    );
    muzzle.position.set(0, head.position.y - 0.02, -0.19);
    muzzle.rotation.x = -Math.PI / 2;

    group.add(body, head, muzzle);

    if (isBear) {
      for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), skin);
        ear.position.set(side * 0.15, head.position.y + 0.16, 0);
        group.add(ear);
      }
    } else {
      for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.26, 3, 8), skin);
        ear.position.set(side * 0.09, head.position.y + 0.26, -0.02);
        ear.rotation.z = side * 0.18;
        group.add(ear);
      }
    }

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.28, 16),
      new THREE.MeshBasicMaterial({ color: 0x2f5d2a, transparent: true, opacity: 0.22 }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.03;
    group.add(shadow);

    const tag = makeLabelSprite(`${player.emoji}${player.name}`, { size: 256, font: 44, background: 'rgba(255,255,255,0.85)' });
    tag.scale.set(1.2, 1.2, 1.2);
    tag.position.y = 1.25;
    group.add(tag);
    group.userData.tag = tag;
    group.userData.carrySlot = new THREE.Group();
    group.userData.carrySlot.position.y = 1.0;
    group.add(group.userData.carrySlot);
    return group;
  }

  makeAnimal(animal) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 12, 10),
      new THREE.MeshLambertMaterial({ color: 0xfff4d8 }),
    );
    body.position.y = 0.18;
    const sprite = makeLabelSprite(animal.emoji, { size: 256, font: 170 });
    sprite.position.y = 0.48;
    sprite.scale.set(0.62, 0.62, 0.62);
    group.add(body, sprite);
    group.userData.bobSeed = Math.random() * Math.PI * 2;
    return group;
  }

  makeGift(gift) {
    const group = new THREE.Group();
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.3, 0.34),
      new THREE.MeshLambertMaterial({ color: 0xff8fb1 }),
    );
    box.position.y = 0.17;
    const ribbonMaterial = new THREE.MeshLambertMaterial({ color: 0xfff1a8 });
    const r1 = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.32, 0.07), ribbonMaterial);
    const r2 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.32, 0.36), ribbonMaterial);
    r1.position.y = 0.17;
    r2.position.y = 0.17;
    group.add(box, r1, r2);
    group.userData.box = box;
    group.userData.ribbons = [r1, r2];
    return group;
  }

  // ———————————————————— 每次状态更新 ————————————————————

  update(snapshot) {
    this.snapshot = snapshot;
    this.world = { grid: snapshot.grid, walls: new Set(snapshot.walls) };
    this.buildStatic(snapshot);

    // 角色
    for (const role of ROLE_LIST) {
      const player = snapshot.players[role];
      let mesh = this.playerMeshes.get(role);
      if (!mesh) {
        mesh = this.makePlayer(player);
        this.playerMeshes.set(role, mesh);
        this.dynamicGroup.add(mesh);
        this.poses.set(role, { x: player.x + 0.5, z: player.y + 0.5, yaw: dirToYaw(player.facing) });
        mesh.position.set(player.x + 0.5, 0, player.y + 0.5);
        mesh.rotation.y = dirToYaw(player.facing);
      }
      mesh.userData.target = { x: player.x + 0.5, z: player.y + 0.5, yaw: dirToYaw(player.facing) };
      mesh.userData.paused = player.paused;
    }

    // 小动物
    const seenAnimals = new Set();
    for (const animal of snapshot.animals) {
      seenAnimals.add(animal.id);
      let mesh = this.animalMeshes.get(animal.id);
      if (!mesh) {
        mesh = this.makeAnimal(animal);
        this.animalMeshes.set(animal.id, mesh);
        this.dynamicGroup.add(mesh);
      }
      mesh.userData.state = animal.state;
      if (animal.state === 'carried' && animal.carriedBy) {
        const carrier = snapshot.players[animal.carriedBy];
        const slot = carrier.carrying.indexOf(animal.id);
        mesh.userData.target = {
          x: carrier.x + 0.5 + (slot === 1 ? 0.22 : -0.22) * (carrier.carrying.length > 1 ? 1 : 0),
          z: carrier.y + 0.5,
          y: 1.0,
        };
      } else if (animal.state === 'home') {
        const index = snapshot.team.rescued.indexOf(animal.id);
        const angle = (index / Math.max(1, snapshot.team.rescued.length)) * Math.PI * 2;
        mesh.userData.target = {
          x: snapshot.home.x + 0.5 + Math.cos(angle) * 0.75,
          z: snapshot.home.y + 0.5 + Math.sin(angle) * 0.75,
          y: 0,
        };
      } else {
        mesh.userData.target = { x: animal.x + 0.5, z: animal.y + 0.5, y: 0 };
      }
    }
    for (const [id, mesh] of this.animalMeshes) {
      if (seenAnimals.has(id)) continue;
      this.dynamicGroup.remove(mesh);
      disposeDeep(mesh);
      this.animalMeshes.delete(id);
    }

    // 礼盒
    for (const gift of snapshot.gifts) {
      let mesh = this.giftMeshes.get(gift.id);
      if (!mesh) {
        mesh = this.makeGift(gift);
        this.giftMeshes.set(gift.id, mesh);
        this.dynamicGroup.add(mesh);
        mesh.position.copy(toWorld(gift.x, gift.y));
      }
      mesh.userData.opened = gift.opened;
      if (gift.opened) {
        mesh.userData.box.material.color.setHex(gift.kind === 'prank' ? 0x9c8fa8 : 0xffd98a);
        mesh.scale.y = 0.45;
      }
    }

    // 庇护罩
    if (this.shelterDome) {
      this.shelterDome.visible = snapshot.team.shelter > 0;
      this.shelterDome.material.opacity = 0.18 + 0.14 * snapshot.team.shelter;
    }

    // 天气
    const storm = snapshot.weather === 'storm';
    this.sun.intensity = storm ? 0.45 : 1.15;
    this.hemi.intensity = storm ? 0.55 : 1.05;
    const sky = storm ? 0x6f7e93 : SKY;
    this.scene.background.setHex(sky);
    this.scene.fog.color.setHex(sky);
    this.renderer.setClearColor(sky, 1);
  }

  /** 创意 1：在被挡住的方向上生成一个指回退路的 3D 箭头 + 墙面高亮。 */
  spawnRetreatArrow(hint) {
    if (!hint) return;
    const group = new THREE.Group();
    const material = new THREE.MeshBasicMaterial({ color: 0xff7a3d, transparent: true, opacity: 0.95 });
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.42), material);
    shaft.position.z = 0.22;
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.3, 8), material);
    head.rotation.x = -Math.PI / 2;
    head.position.z = -0.1;
    group.add(shaft, head);

    // 箭头浮在角色与障碍之间，箭尖指向可以后退的方向
    const towards = DIR_VECTOR[hint.arrow.towards];
    group.position.set(
      hint.arrow.x + 0.5 + towards.dx * 0.42,
      0.85,
      hint.arrow.y + 0.5 + towards.dy * 0.42,
    );
    group.rotation.y = dirToYaw(hint.arrow.pointing);
    group.userData.life = ARROW_LIFETIME;
    group.userData.baseY = group.position.y;
    this.arrowGroup.add(group);
    this.arrows.push(group);

    // 被撞的那面墙闪一下
    const blocked = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 1.1),
      new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
    );
    blocked.position.set(
      hint.arrow.x + 0.5 + towards.dx * 0.5,
      0.6,
      hint.arrow.y + 0.5 + towards.dy * 0.5,
    );
    blocked.rotation.y = dirToYaw(hint.arrow.towards);
    blocked.userData.life = ARROW_LIFETIME * 0.6;
    this.arrowGroup.add(blocked);
    this.wallFlash.push(blocked);
  }

  clearArrows() {
    for (const object of [...this.arrows, ...this.wallFlash]) {
      this.arrowGroup.remove(object);
      disposeDeep(object);
    }
    this.arrows = [];
    this.wallFlash = [];
  }

  // ———————————————————— 每帧 ————————————————————

  tick() {
    const dt = Math.min(0.05, this.clock.getDelta());
    if (!this.snapshot) {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    const time = this.clock.elapsedTime;

    // 角色位置 / 朝向平滑
    for (const [role, mesh] of this.playerMeshes) {
      const target = mesh.userData.target;
      if (!target) continue;
      const pose = this.poses.get(role);
      pose.x = smoothDamp(pose.x, target.x, 9, dt);
      pose.z = smoothDamp(pose.z, target.z, 9, dt);
      pose.yaw = lerpAngle(pose.yaw, target.yaw, Math.min(1, dt * 10));
      mesh.position.set(pose.x, mesh.userData.paused ? Math.sin(time * 6) * 0.02 : 0, pose.z);
      mesh.rotation.y = pose.yaw;
    }

    // 视线遮挡：看不见队友就直接隐藏模型
    const teammateRole = this.viewRole === ROLES.BEAR ? ROLES.BUNNY : ROLES.BEAR;
    const teammate = this.playerMeshes.get(teammateRole);
    if (teammate) teammate.visible = Boolean(this.snapshot.visibility?.visible);
    const me = this.playerMeshes.get(this.viewRole);
    if (me) me.visible = true;

    // 小动物漂浮动画
    for (const mesh of this.animalMeshes.values()) {
      const target = mesh.userData.target;
      if (!target) continue;
      mesh.position.x = smoothDamp(mesh.position.x, target.x, 8, dt);
      mesh.position.z = smoothDamp(mesh.position.z, target.z, 8, dt);
      const baseY = target.y ?? 0;
      mesh.position.y = smoothDamp(mesh.position.y, baseY, 8, dt) + Math.sin(time * 2.4 + mesh.userData.bobSeed) * 0.03;
      mesh.rotation.y = time * 0.6;
    }

    // 礼盒旋转
    for (const mesh of this.giftMeshes.values()) {
      if (!mesh.userData.opened) mesh.rotation.y = time * 0.8;
    }

    // 退路箭头动画
    for (const arrow of [...this.arrows]) {
      arrow.userData.life -= dt;
      arrow.position.y = arrow.userData.baseY + Math.sin(time * 7) * 0.09;
      const fade = Math.min(1, arrow.userData.life / 0.6);
      arrow.children.forEach((child) => { child.material.opacity = 0.95 * fade; });
      if (arrow.userData.life <= 0) {
        this.arrowGroup.remove(arrow);
        disposeDeep(arrow);
        this.arrows.splice(this.arrows.indexOf(arrow), 1);
      }
    }
    for (const flash of [...this.wallFlash]) {
      flash.userData.life -= dt;
      flash.material.opacity = Math.max(0, 0.55 * (flash.userData.life / (ARROW_LIFETIME * 0.6))) * (0.6 + 0.4 * Math.sin(time * 12));
      if (flash.userData.life <= 0) {
        this.arrowGroup.remove(flash);
        disposeDeep(flash);
        this.wallFlash.splice(this.wallFlash.indexOf(flash), 1);
      }
    }

    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
  }

  /** 越肩跟随 + 防穿墙收缩。 */
  updateCamera(dt) {
    const pose = this.poses.get(this.viewRole);
    if (!pose || !this.world) return;

    const forward = new THREE.Vector3(Math.sin(pose.yaw), 0, -Math.cos(pose.yaw));
    const right = rightOf(forward);
    const anchor = new THREE.Vector3(pose.x, 0, pose.z);

    const desired = anchor.clone()
      .addScaledVector(forward, -CAMERA_DISTANCE)
      .addScaledVector(right, CAMERA_SHOULDER_OFFSET);

    const safe = resolveCameraPosition(
      this.world,
      { x: anchor.x, y: anchor.z },
      { x: desired.x, y: desired.z },
    );

    const idealDistance = Math.max(CAMERA_MIN_DISTANCE, safe.distance);
    this.camDistance = smoothDamp(this.camDistance, idealDistance, 9, dt);
    const fullDistance = anchor.distanceTo(desired) || 1;
    const clamped = Math.min(this.camDistance, safe.clamped ? Math.max(CAMERA_MIN_DISTANCE, safe.distance) : fullDistance);

    const direction = desired.clone().sub(anchor).normalize();
    const camPosition = anchor.clone().addScaledVector(direction, clamped);
    // 相机被墙逼近角色时，高度同步下压，避免变成俯视头顶
    const ratio = THREE.MathUtils.clamp(clamped / CAMERA_DISTANCE, 0.45, 1);
    camPosition.y = CAMERA_HEIGHT * ratio;

    this.camera.position.copy(camPosition);
    this.camera.lookAt(anchor.clone().addScaledVector(forward, 1.2).setY(0.8));
  }

  start() {
    const loop = () => {
      this.frame = requestAnimationFrame(loop);
      this.tick();
    };
    this.resize();
    loop();
  }

  stop() {
    cancelAnimationFrame(this.frame);
  }
}

export default GardenRenderer;
