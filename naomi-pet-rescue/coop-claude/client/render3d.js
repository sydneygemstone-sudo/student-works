/**
 * client/render3d.js — Three.js 花园 3D 渲染器。
 *
 *  - 第三人称越肩跟随相机（相机在角色身后斜上方，略微偏右肩）
 *  - 防穿墙相机：撞到树篱 / 石头时沿视线平滑收缩，绝不穿模（用 core/vision 的纯数学）
 *  - 视线遮挡：队友、狼、狮子被挡住或距离过远时，模型直接隐藏
 *  - 创意 1 的石头退路箭头：3D 箭头 + 墙面高亮的动画提示
 *
 * R2 改动：
 *  - 地图 225 格 + 两座迷宫的墙，静态场景一律走 InstancedMesh，iPad 才扛得住
 *  - 角色和小动物头顶的大文字牌**全部去掉**（Naomi 说挡路），改为造型 + 颜色辨识
 *  - 小动物换成 client/critters.js 里的程序化动物造型，继续轻轻晃动
 *  - 新增狼 / 狮子 / 能量星 / 假房子，以及雷雨与闪电
 *
 * Author: Claude Code (Claude Opus)
 */

import * as THREE from 'three';
import { toWorld, dirToYaw, yawToForward, rightOf, lerpAngle } from './coords.js';
import {
  TERRAIN, ROLES, ROLE_LIST, DIR_VECTOR, GRID_SIZE,
  CAMERA_DISTANCE, CAMERA_HEIGHT, CAMERA_SHOULDER_OFFSET, CAMERA_MIN_DISTANCE, LOS_MAX_DISTANCE,
} from '../core/constants.js';
import { hedgeSegments, mazeOpenings } from '../core/maze.js';
import { resolveCameraPosition, smoothDamp } from '../core/vision.js';
import {
  makeCritter, makeWolf, makeLion, makePlayer, makeTeammatePin,
  makeEnergyStar, makeCabin, mat,
} from './critters.js';

const SKY = 0xbfe6ff;
const STORM_SKY = 0x5d6a7e;
const HEDGE_HEIGHT = 1.45;
const ARROW_LIFETIME = 2.8;
const RAIN_COUNT = 900;

const TERRAIN_COLOR = {
  [TERRAIN.GRASS]: 0x86cf6d,
  [TERRAIN.FOREST]: 0x4f9a4c,
  [TERRAIN.ROCK]: 0x9aa4ab,
  [TERRAIN.NET]: 0xb79a63,
  [TERRAIN.HOME]: 0xffe2a8,
  [TERRAIN.DECOY]: 0xb5aca2,
};

function disposeDeep(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    // 材质来自 critters.js 的共享表，不能在这里释放
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
    this.scene.fog = new THREE.Fog(SKY, LOS_MAX_DISTANCE * 0.85, LOS_MAX_DISTANCE * 2.2);

    this.camera = new THREE.PerspectiveCamera(58, 1, 0.05, 80);

    this.staticGroup = new THREE.Group();
    this.dynamicGroup = new THREE.Group();
    this.arrowGroup = new THREE.Group();
    this.scene.add(this.staticGroup, this.dynamicGroup, this.arrowGroup);

    this.addLights();
    this.buildRain();

    this.world = null;
    this.snapshot = null;
    this.viewRole = ROLES.BUNNY;
    this.builtSignature = null;

    this.playerMeshes = new Map();
    this.animalMeshes = new Map();
    this.giftMeshes = new Map();
    this.energyMeshes = new Map();
    this.beastMeshes = new Map();
    this.decoyMeshes = new Map();
    this.arrows = [];
    this.wallFlash = [];
    this.poses = new Map();
    this.camDistance = CAMERA_DISTANCE;
    this.clock = new THREE.Clock();
    this.shelterDome = null;
    this.lightningUntil = 0;
    this.stormLevel = 0;
    this.onFlash = null; // 客户端挂钩子，让 HUD 也闪一下
  }

  addLights() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x6f9a5a, 1.05);
    const sun = new THREE.DirectionalLight(0xfff3d6, 1.15);
    sun.position.set(6, 12, 4);
    this.sun = sun;
    this.hemi = hemi;
    this.bolt = new THREE.PointLight(0xdcefff, 0, 30); // 闪电
    this.bolt.position.set(GRID_SIZE / 2, 9, GRID_SIZE / 2);
    this.scene.add(hemi, sun, this.bolt, new THREE.AmbientLight(0xffffff, 0.25));
  }

  /** 雨：一团跟着相机走的粒子，只在雷雨时显示。 */
  buildRain() {
    const positions = new Float32Array(RAIN_COUNT * 3);
    for (let i = 0; i < RAIN_COUNT; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 1] = Math.random() * 12;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 22;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.rain = new THREE.Points(geometry, new THREE.PointsMaterial({
      color: 0xd8ecff, size: 0.06, transparent: true, opacity: 0.55, depthWrite: false,
    }));
    this.rain.visible = false;
    this.scene.add(this.rain);
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

    const size = snapshot.size ?? GRID_SIZE;

    // 地面底板
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(size + 1.6, 0.4, size + 1.6),
      mat(0x6fae5c),
    );
    base.position.set(size / 2, -0.22, size / 2);
    this.staticGroup.add(base);

    // —— 地砖：按地形分组，每组一个 InstancedMesh（225 格也只有 6 个 draw call）——
    const tileGeometry = new THREE.BoxGeometry(0.98, 0.08, 0.98);
    const byTerrain = new Map();
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const terrain = snapshot.grid[y][x];
        if (!byTerrain.has(terrain)) byTerrain.set(terrain, []);
        byTerrain.get(terrain).push({ x, y });
      }
    }
    const dummy = new THREE.Object3D();
    for (const [terrain, cells] of byTerrain) {
      const instanced = new THREE.InstancedMesh(tileGeometry, mat(TERRAIN_COLOR[terrain] ?? 0x86cf6d), cells.length);
      cells.forEach((cell, i) => {
        dummy.position.copy(toWorld(cell.x, cell.y, -0.04));
        // 棋盘格的深浅交错，让孩子一眼数得清走了几格
        const shade = (cell.x + cell.y) % 2 === 0 ? 1 : 0.94;
        dummy.scale.set(1, shade, 1);
        dummy.updateMatrix();
        instanced.setMatrixAt(i, dummy.matrix);
      });
      instanced.instanceMatrix.needsUpdate = true;
      this.staticGroup.add(instanced);
    }

    // —— 树 / 石头 / 绳网：各自一个 InstancedMesh ——
    this.addScatter(byTerrain.get(TERRAIN.FOREST) ?? [], 'tree');
    this.addScatter(byTerrain.get(TERRAIN.ROCK) ?? [], 'rock');
    this.addScatter(byTerrain.get(TERRAIN.NET) ?? [], 'net');

    // —— 树篱迷宫墙体 ——
    const walls = new Set(snapshot.walls);
    const segments = hedgeSegments(walls);
    const horizontal = segments.filter((s) => s.horizontal);
    const vertical = segments.filter((s) => !s.horizontal);
    this.addHedges(horizontal, true);
    this.addHedges(vertical, false);

    // 墙头的小花球，让树篱更好认
    const bloomGeo = new THREE.SphereGeometry(0.11, 6, 5);
    const blooms = new THREE.InstancedMesh(bloomGeo, mat(0xff9ec4), segments.length);
    segments.forEach((s, i) => {
      dummy.position.set(s.cx, HEDGE_HEIGHT + 0.06, s.cy);
      dummy.scale.set(1, 1, 1);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      blooms.setMatrixAt(i, dummy.matrix);
    });
    blooms.instanceMatrix.needsUpdate = true;
    this.staticGroup.add(blooms);

    // —— 迷宫的四个拱门（入口粉、出口黄），不挂文字牌 ——
    for (const opening of mazeOpenings()) {
      this.staticGroup.add(this.makeArchway(opening, opening.kind === 'entrance' ? 0xffb3d1 : 0xffd98a));
    }

    // —— 🏡 真正的家 ——
    const home = makeCabin({ real: true });
    home.position.copy(toWorld(snapshot.home.x, snapshot.home.y));
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.95, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshLambertMaterial({ color: 0x8fd8ff, transparent: true, opacity: 0.28, side: THREE.DoubleSide }),
    );
    dome.position.y = 0.02;
    dome.visible = false;
    this.shelterDome = dome;
    home.add(dome);
    this.staticGroup.add(home);
  }

  /** 把同一种装饰物批量摆上去。 */
  addScatter(cells, kind) {
    if (!cells.length) return;
    const dummy = new THREE.Object3D();

    if (kind === 'tree') {
      const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.1, 0.5, 6), mat(0x8b5a2b), cells.length);
      const crown = new THREE.InstancedMesh(new THREE.ConeGeometry(0.36, 0.8, 8), mat(0x2e7d32), cells.length);
      cells.forEach((cell, i) => {
        dummy.position.copy(toWorld(cell.x, cell.y, 0.25));
        dummy.rotation.set(0, (cell.x * 7 + cell.y * 13) % 6, 0);
        dummy.updateMatrix();
        trunk.setMatrixAt(i, dummy.matrix);
        dummy.position.copy(toWorld(cell.x, cell.y, 0.85));
        dummy.updateMatrix();
        crown.setMatrixAt(i, dummy.matrix);
      });
      trunk.instanceMatrix.needsUpdate = true;
      crown.instanceMatrix.needsUpdate = true;
      this.staticGroup.add(trunk, crown);
      return;
    }

    if (kind === 'rock') {
      const rocks = new THREE.InstancedMesh(
        new THREE.DodecahedronGeometry(0.36, 0),
        new THREE.MeshLambertMaterial({ color: 0x8d969c, flatShading: true }),
        cells.length,
      );
      cells.forEach((cell, i) => {
        dummy.position.copy(toWorld(cell.x, cell.y, 0.28));
        dummy.rotation.set(0.4, (cell.x * 3 + cell.y * 5) % 6, 0.2);
        dummy.updateMatrix();
        rocks.setMatrixAt(i, dummy.matrix);
      });
      rocks.instanceMatrix.needsUpdate = true;
      this.staticGroup.add(rocks);
      return;
    }

    // 绳网：横竖各三条
    const barGeo = new THREE.BoxGeometry(0.9, 0.04, 0.05);
    const bars = new THREE.InstancedMesh(barGeo, mat(0x7a5c2e), cells.length * 6);
    let n = 0;
    for (const cell of cells) {
      for (let i = -1; i <= 1; i += 1) {
        dummy.rotation.set(0, 0, 0);
        dummy.position.copy(toWorld(cell.x, cell.y, 0.12));
        dummy.position.z += i * 0.28;
        dummy.updateMatrix();
        bars.setMatrixAt(n++, dummy.matrix);
        dummy.position.copy(toWorld(cell.x, cell.y, 0.12));
        dummy.position.x += i * 0.28;
        dummy.rotation.set(0, Math.PI / 2, 0);
        dummy.updateMatrix();
        bars.setMatrixAt(n++, dummy.matrix);
      }
    }
    bars.instanceMatrix.needsUpdate = true;
    this.staticGroup.add(bars);
  }

  addHedges(segments, isHorizontal) {
    if (!segments.length) return;
    const geometry = isHorizontal
      ? new THREE.BoxGeometry(0.98, HEDGE_HEIGHT, 0.18)
      : new THREE.BoxGeometry(0.18, HEDGE_HEIGHT, 0.98);
    const instanced = new THREE.InstancedMesh(geometry, mat(0x2f7d44), segments.length);
    const dummy = new THREE.Object3D();
    segments.forEach((s, i) => {
      dummy.position.set(s.cx, HEDGE_HEIGHT / 2, s.cy);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      instanced.setMatrixAt(i, dummy.matrix);
    });
    instanced.instanceMatrix.needsUpdate = true;
    this.staticGroup.add(instanced);
  }

  makeArchway(opening, color) {
    const group = new THREE.Group();
    const v = DIR_VECTOR[opening.dir];
    const cx = opening.x + 0.5 + v.dx * 0.5;
    const cz = opening.y + 0.5 + v.dy * 0.5;
    const horizontal = opening.dir === 'N' || opening.dir === 'S';
    const material = mat(color);
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
    // 门楣上挂三朵小花代替文字招牌 —— 认门靠颜色和花，不靠字
    for (const offset of [-0.3, 0, 0.3]) {
      const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.09, 7, 6), mat(color === 0xffb3d1 ? 0xff6f9c : 0xffc247));
      bloom.position.set(cx + (horizontal ? offset : 0), HEDGE_HEIGHT + 0.42, cz + (horizontal ? 0 : offset));
      group.add(bloom);
    }
    return group;
  }

  // ———————————————————— 每次状态更新 ————————————————————

  update(snapshot) {
    this.snapshot = snapshot;
    this.world = { grid: snapshot.grid, walls: new Set(snapshot.walls) };
    this.buildStatic(snapshot);

    // —— 角色 ——
    for (const role of ROLE_LIST) {
      const player = snapshot.players[role];
      let mesh = this.playerMeshes.get(role);
      if (!mesh) {
        mesh = makePlayer(player, role === ROLES.BEAR);
        // 队友头顶只有一个小三角，没有名字牌
        const pin = makeTeammatePin(player.color);
        pin.position.y = role === ROLES.BEAR ? 1.28 : 1.3;
        mesh.add(pin);
        mesh.userData.pin = pin;
        this.playerMeshes.set(role, mesh);
        this.dynamicGroup.add(mesh);
        this.poses.set(role, { x: player.x + 0.5, z: player.y + 0.5, yaw: dirToYaw(player.facing) });
        mesh.position.set(player.x + 0.5, 0, player.y + 0.5);
        mesh.rotation.y = dirToYaw(player.facing);
      }
      mesh.userData.target = { x: player.x + 0.5, z: player.y + 0.5, yaw: dirToYaw(player.facing) };
      mesh.userData.paused = player.paused;
      mesh.userData.ready = player.ready;
    }

    // —— 小动物 ——
    for (const animal of snapshot.animals) {
      let mesh = this.animalMeshes.get(animal.id);
      if (!mesh) {
        mesh = makeCritter(animal.kind ?? 'bunny');
        this.animalMeshes.set(animal.id, mesh);
        this.dynamicGroup.add(mesh);
        mesh.position.set(animal.x + 0.5, 0, animal.y + 0.5);
      }
      mesh.userData.state = animal.state;
      let nextTarget;
      if (animal.state === 'carried' && animal.carriedBy) {
        const carrier = snapshot.players[animal.carriedBy];
        const slot = carrier.carrying.indexOf(animal.id);
        nextTarget = {
          x: carrier.x + 0.5 + (carrier.carrying.length > 1 ? (slot === 1 ? 0.24 : -0.24) : 0),
          z: carrier.y + 0.5,
          y: carrier.role === ROLES.BEAR ? 1.02 : 0.94,
          scale: 0.7,
        };
      } else if (animal.state === 'home') {
        const index = snapshot.team.rescued.indexOf(animal.id);
        const angle = (index / Math.max(1, snapshot.team.rescued.length)) * Math.PI * 2;
        nextTarget = {
          x: snapshot.home.x + 0.5 + Math.cos(angle) * 0.9,
          z: snapshot.home.y + 0.5 + Math.sin(angle) * 0.9,
          y: 0,
          scale: 1,
        };
      } else {
        nextTarget = { x: animal.x + 0.5, z: animal.y + 0.5, y: 0, scale: 1 };
      }

      // 小动物的脸统一朝 -Z。目标格发生变化时，用位移向量更新主朝向，
      // 这样被狮子叼走、回家或跟随携带者移动时都会朝着实际移动方向转身。
      const previousTarget = mesh.userData.target ?? {
        x: mesh.position.x,
        z: mesh.position.z,
      };
      const dx = nextTarget.x - previousTarget.x;
      const dz = nextTarget.z - previousTarget.z;
      if (Math.hypot(dx, dz) > 0.001) {
        mesh.userData.facingYaw = Math.atan2(-dx, -dz);
      } else if (mesh.userData.facingYaw == null) {
        mesh.userData.facingYaw = mesh.rotation.y;
      }
      nextTarget.yaw = mesh.userData.facingYaw;
      mesh.userData.target = nextTarget;
    }

    // —— 🌟 能量星 ——
    for (const star of snapshot.energies ?? []) {
      let mesh = this.energyMeshes.get(star.id);
      if (!mesh) {
        mesh = makeEnergyStar();
        mesh.position.copy(toWorld(star.x, star.y));
        this.energyMeshes.set(star.id, mesh);
        this.dynamicGroup.add(mesh);
      }
      mesh.visible = !star.taken;
    }

    // —— 🏚️ 假房子（识破后门口多一个叉）——
    for (const decoy of snapshot.decoys ?? []) {
      const key = `${decoy.id}:${decoy.discovered}`;
      const existing = this.decoyMeshes.get(decoy.id);
      if (existing && existing.userData.key === key) continue;
      if (existing) {
        this.dynamicGroup.remove(existing);
        disposeDeep(existing);
      }
      const mesh = makeCabin({ real: false, discovered: decoy.discovered });
      mesh.position.copy(toWorld(decoy.x, decoy.y));
      mesh.userData.key = key;
      this.decoyMeshes.set(decoy.id, mesh);
      this.dynamicGroup.add(mesh);
    }

    // —— 🐺🦁 野兽 ——
    for (const beast of snapshot.beasts ?? []) {
      let mesh = this.beastMeshes.get(beast.id);
      if (!mesh) {
        mesh = beast.kind === 'wolf' ? makeWolf() : makeLion();
        this.beastMeshes.set(beast.id, mesh);
        this.dynamicGroup.add(mesh);
        mesh.position.set(beast.x + 0.5, 0, beast.y + 0.5);
        mesh.rotation.y = dirToYaw(beast.facing ?? 'S');
        this.poses.set(beast.id, { x: beast.x + 0.5, z: beast.y + 0.5, yaw: dirToYaw(beast.facing ?? 'S') });
      }
      mesh.userData.target = { x: beast.x + 0.5, z: beast.y + 0.5, yaw: dirToYaw(beast.facing ?? 'S') };
      mesh.userData.stunned = beast.stunned > 0;
      mesh.userData.awake = beast.awake;
    }

    // —— 礼盒 ——
    for (const gift of snapshot.gifts) {
      let mesh = this.giftMeshes.get(gift.id);
      if (!mesh) {
        mesh = this.makeGift();
        this.giftMeshes.set(gift.id, mesh);
        this.dynamicGroup.add(mesh);
        mesh.position.copy(toWorld(gift.x, gift.y));
      }
      mesh.userData.opened = gift.opened;
      if (gift.opened) {
        mesh.userData.box.material = mat(gift.kind === 'prank' ? 0x9c8fa8 : 0xffd98a);
        mesh.scale.y = 0.45;
      }
    }

    // 庇护罩
    if (this.shelterDome) {
      this.shelterDome.visible = snapshot.team.shelter > 0;
      this.shelterDome.material.opacity = 0.18 + 0.14 * snapshot.team.shelter;
    }

    this.applyWeather(snapshot.weather === 'storm');
  }

  makeGift() {
    const group = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.34), mat(0xff8fb1));
    box.position.y = 0.17;
    const r1 = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.32, 0.07), mat(0xfff1a8));
    const r2 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.32, 0.36), mat(0xfff1a8));
    r1.position.y = 0.17;
    r2.position.y = 0.17;
    group.add(box, r1, r2);
    group.userData.box = box;
    return group;
  }

  /**
   * ⛈️ 天气。雷雨要有气氛，但绝不能让孩子看不清路：
   * 天空压暗一点、下点雨、偶尔闪一下，地面照明始终保持得住。
   */
  applyWeather(storm) {
    this.stormLevel = storm ? 1 : 0;
    this.sun.intensity = storm ? 0.62 : 1.15;
    this.hemi.intensity = storm ? 0.7 : 1.05;
    const sky = storm ? STORM_SKY : SKY;
    this.scene.background.setHex(sky);
    this.scene.fog.color.setHex(sky);
    this.renderer.setClearColor(sky, 1);
    this.rain.visible = storm;
    if (storm) this.strikeLightning();
  }

  /** 闪一下。很短（约 0.16 秒）、不铺满屏幕，不挡操作。 */
  strikeLightning() {
    this.lightningUntil = this.clock.elapsedTime + 0.16;
    this.onFlash?.();
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
      if (mesh.userData.pin) {
        mesh.userData.pin.position.y = (role === ROLES.BEAR ? 1.28 : 1.3) + Math.sin(time * 3 + 1) * 0.05;
        mesh.userData.pin.rotation.y = time * 1.5;
      }
    }

    // 视线遮挡：看不见队友就直接隐藏模型（连同头顶的小三角）
    const teammateRole = this.viewRole === ROLES.BEAR ? ROLES.BUNNY : ROLES.BEAR;
    const teammate = this.playerMeshes.get(teammateRole);
    if (teammate) teammate.visible = Boolean(this.snapshot.visibility?.visible);
    const me = this.playerMeshes.get(this.viewRole);
    if (me) {
      me.visible = true;
      if (me.userData.pin) me.userData.pin.visible = false; // 自己头上不用挂指示器
    }

    // 野兽：只渲染本人看得见的
    const visibleBeasts = new Set(this.snapshot.visibleBeasts?.[this.viewRole] ?? []);
    for (const [id, mesh] of this.beastMeshes) {
      const target = mesh.userData.target;
      mesh.visible = visibleBeasts.has(id) && mesh.userData.awake !== false;
      if (!target) continue;
      const pose = this.poses.get(id);
      pose.x = smoothDamp(pose.x, target.x, 7, dt);
      pose.z = smoothDamp(pose.z, target.z, 7, dt);
      pose.yaw = lerpAngle(pose.yaw, target.yaw, Math.min(1, dt * 8));
      // 发愣的时候原地摇头晃脑，孩子一眼看出「它这回合不动」
      const wobble = mesh.userData.stunned ? Math.sin(time * 9) * 0.08 : Math.sin(time * 2.2 + mesh.userData.bobSeed) * 0.02;
      mesh.position.set(pose.x, Math.abs(wobble) * 0.3, pose.z);
      mesh.rotation.y = pose.yaw + (mesh.userData.stunned ? wobble : 0);
    }

    // 小动物：轻轻晃动 —— Naomi 特意要保留的那个感觉
    for (const mesh of this.animalMeshes.values()) {
      const target = mesh.userData.target;
      if (!target) continue;
      mesh.position.x = smoothDamp(mesh.position.x, target.x, 8, dt);
      mesh.position.z = smoothDamp(mesh.position.z, target.z, 8, dt);
      const baseY = target.y ?? 0;
      const bob = Math.sin(time * 2.6 + mesh.userData.bobSeed) * 0.035;
      mesh.position.y = smoothDamp(mesh.position.y, baseY, 8, dt) + bob;
      const remaining = Math.hypot(target.x - mesh.position.x, target.z - mesh.position.z);
      const desiredYaw = target.yaw ?? mesh.userData.facingYaw ?? 0;
      mesh.userData.facingYaw = lerpAngle(
        mesh.userData.facingYaw ?? mesh.rotation.y,
        desiredYaw,
        Math.min(1, dt * 12),
      );
      // 移动时正脸稳定朝向移动方向；停下来后只保留很小的活泼摇摆。
      const idleSway = remaining < 0.025
        ? Math.sin(time * 1.3 + mesh.userData.bobSeed) * 0.10
        : 0;
      mesh.rotation.y = mesh.userData.facingYaw + idleSway;
      mesh.rotation.z = Math.sin(time * 2.6 + mesh.userData.bobSeed) * 0.05;
      const scale = target.scale ?? 1;
      mesh.scale.setScalar(smoothDamp(mesh.scale.x, scale, 8, dt));
    }

    // 能量星：转 + 飘 + 光环呼吸
    for (const mesh of this.energyMeshes.values()) {
      if (!mesh.visible) continue;
      mesh.userData.star.rotation.y = time * 1.6;
      mesh.userData.star.position.y = 0.42 + Math.sin(time * 2.2) * 0.07;
      mesh.userData.halo.scale.setScalar(1 + Math.sin(time * 2.2) * 0.12);
    }

    // 礼盒旋转
    for (const mesh of this.giftMeshes.values()) {
      if (!mesh.userData.opened) mesh.rotation.y = time * 0.8;
    }

    this.tickArrows(dt, time);
    this.tickWeather(dt, time);
    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
  }

  tickArrows(dt, time) {
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
  }

  /** 雨往下落并跟着相机走；闪电是一次很短的补光。 */
  tickWeather(dt, time) {
    if (this.rain.visible) {
      const pos = this.rain.geometry.attributes.position;
      for (let i = 0; i < RAIN_COUNT; i += 1) {
        let y = pos.getY(i) - dt * 9;
        if (y < 0) y += 12;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
      this.rain.position.set(this.camera.position.x, 0, this.camera.position.z);
    }
    this.bolt.intensity = time < this.lightningUntil
      ? 2.6 * (1 - (this.lightningUntil - time) / 0.16)
      : smoothDamp(this.bolt.intensity, 0, 12, dt);
  }

  /** 越肩跟随 + 防穿墙收缩。 */
  updateCamera(dt) {
    const pose = this.poses.get(this.viewRole);
    if (!pose || !this.world) return;

    const forward = yawToForward(pose.yaw);
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

    // 相机被墙 / 小屋逼到贴身时，**抬高**而不是压低：压低会直接怼在角色后脑勺上，
    // 什么路都看不见。抬起来变成略俯视，同时把注视点推远，前面的路始终在画面里。
    const ratio = THREE.MathUtils.clamp(clamped / CAMERA_DISTANCE, 0.2, 1);
    camPosition.y = CAMERA_HEIGHT * (0.72 + 0.28 * ratio);

    this.camera.position.copy(camPosition);
    const lookAhead = 1.2 + (1 - ratio) * 1.6;
    this.camera.lookAt(anchor.clone().addScaledVector(forward, lookAhead).setY(0.7));
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
