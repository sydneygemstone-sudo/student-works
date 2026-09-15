/**
 * Naomi《小动物回家》双 iPad 联机探索版 —— 3D 越肩视角渲染引擎
 * 基于 Three.js 构建，纯本地运行，不依赖外部 CDN
 */
class Render3D {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.cellSize = 4.0;
    this.gridN = 9;

    this.scene = null;
    this.camera = null;
    this.renderer = null;

    this.myPlayerId = 0;
    this.gameState = null;

    this.playerMeshes = [null, null];
    this.petMeshes = [];
    this.giftMeshes = [];
    this.terrainMeshes = [];
    this.arrowMesh = null;
    this.shieldMesh = null;

    this.targetPositions = [
      { x: 0, y: 0, z: 0, angle: 0 },
      { x: 0, y: 0, z: 0, angle: Math.PI },
    ];
    this.currentPositions = [
      { x: 0, y: 0, z: 0, angle: 0 },
      { x: 0, y: 0, z: 0, angle: Math.PI },
    ];

    this.arrowTimer = 0;
    this.arrowActive = false;

    this.colliders = []; // 用于越肩镜头碰撞检测的 AABB 墙体

    this.initThree();
    this.setupLighting();
    this.setupStaticEnvironment();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);

    window.addEventListener('resize', () => this.onResize());
  }

  initThree() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x90caf9); // 温和的天空蓝
    this.scene.fog = new THREE.FogExp2(0x90caf9, 0.012);

    this.camera = new THREE.PerspectiveCamera(55, width / height, 0.2, 120);
    this.camera.position.set(0, 3.5, 6);
    this.camera.lookAt(0, 1.2, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);
  }

  setupLighting() {
    // 环境光与半球光
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x558b2f, 0.95);
    hemiLight.position.set(0, 30, 0);
    this.scene.add(hemiLight);

    // 暖阳方向光
    const dirLight = new THREE.DirectionalLight(0xfff9c4, 1.25);
    dirLight.position.set(20, 35, 15);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 80;
    dirLight.shadow.camera.left = -25;
    dirLight.shadow.camera.right = 25;
    dirLight.shadow.camera.top = 25;
    dirLight.shadow.camera.bottom = -25;
    this.scene.add(dirLight);
  }

  gridToWorld(gx, gy) {
    const offset = (this.gridN - 1) / 2;
    return {
      x: (gx - offset) * this.cellSize,
      z: (gy - offset) * this.cellSize,
    };
  }

  headingToAngle(heading) {
    // 0: 北 (-Z), 1: 东 (+X), 2: 南 (+Z), 3: 西 (-X)
    switch (heading) {
      case 0: return Math.PI; // 面向 -Z
      case 1: return Math.PI * 0.5; // 面向 +X
      case 2: return 0; // 面向 +Z
      case 3: return -Math.PI * 0.5; // 面向 -X
      default: return 0;
    }
  }

  setupStaticEnvironment() {
    // 1. 地面草坪
    const groundGeo = new THREE.PlaneGeometry(60, 60);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x7cb342,
      roughness: 0.9,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 2. 网格石砖步道
    const pathGroup = new THREE.Group();
    for (let x = 0; x < this.gridN; x++) {
      for (let y = 0; y < this.gridN; y++) {
        const w = this.gridToWorld(x, y);
        const tileGeo = new THREE.PlaneGeometry(this.cellSize * 0.92, this.cellSize * 0.92);
        const isChecker = (x + y) % 2 === 0;
        const tileMat = new THREE.MeshStandardMaterial({
          color: isChecker ? 0x8bc34a : 0x7cb342,
          roughness: 0.95,
        });
        const tile = new THREE.Mesh(tileGeo, tileMat);
        tile.rotation.x = -Math.PI / 2;
        tile.position.set(w.x, 0.01, w.z);
        tile.receiveShadow = true;
        pathGroup.add(tile);
      }
    }
    this.scene.add(pathGroup);

    // 3. 家园温馨小屋 (4, 4) - 置于家园角落，留出迎宾花园与前进视野
    const homeW = this.gridToWorld(4, 4);
    const house = this.createCottageMesh();
    house.position.set(homeW.x + 1.4, 0, homeW.z - 1.4);
    this.scene.add(house);

    // 4. 家园庇护护盾半球
    const shieldGeo = new THREE.SphereGeometry(this.cellSize * 0.88, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x80d8ff,
      transparent: true,
      opacity: 0.35,
      roughness: 0.2,
      metalness: 0.1,
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    this.shieldMesh.position.set(homeW.x, 0, homeW.z);
    this.shieldMesh.visible = false;
    this.scene.add(this.shieldMesh);

    // 5. Naomi 的石头箭头提示 Mesh
    this.createStoneArrowMesh();

    // 6. 两位主角 Mesh
    this.playerMeshes[0] = this.createBearMesh();
    this.playerMeshes[1] = this.createBunnyMesh();
    this.scene.add(this.playerMeshes[0]);
    this.scene.add(this.playerMeshes[1]);
  }

  createCottageMesh() {
    const group = new THREE.Group();

    // 墙体
    const wallGeo = new THREE.BoxGeometry(1.5, 1.3, 1.5);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xfff8e1, roughness: 0.8 });
    const walls = new THREE.Mesh(wallGeo, wallMat);
    walls.position.y = 0.65;
    walls.castShadow = true;
    walls.receiveShadow = true;
    group.add(walls);

    // 屋顶（斜顶）
    const roofGeo = new THREE.ConeGeometry(1.4, 0.9, 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xd84315, roughness: 0.6 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 1.75;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    // 烟囱
    const chimGeo = new THREE.BoxGeometry(0.26, 0.55, 0.26);
    const chimMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63 });
    const chimney = new THREE.Mesh(chimGeo, chimMat);
    chimney.position.set(0.35, 1.8, 0.35);
    group.add(chimney);

    // 门
    const doorGeo = new THREE.BoxGeometry(0.45, 0.75, 0.08);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 0.38, 0.76);
    group.add(door);

    return group;
  }

  createBearMesh() {
    const group = new THREE.Group();

    // 身体
    const bodyGeo = new THREE.SphereGeometry(0.55, 16, 16);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.8 }); // 暖棕色
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.55;
    body.castShadow = true;
    group.add(body);

    // 头部
    const headGeo = new THREE.SphereGeometry(0.42, 16, 16);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(0, 1.15, 0.08);
    head.castShadow = true;
    group.add(head);

    // 熊耳朵 (两只圆耳朵)
    const earGeo = new THREE.SphereGeometry(0.15, 12, 12);
    const earMat = new THREE.MeshStandardMaterial({ color: 0x6d4c41 });
    const earL = new THREE.Mesh(earGeo, earMat);
    earL.position.set(-0.3, 1.45, 0.05);
    const earR = new THREE.Mesh(earGeo, earMat);
    earR.position.set(0.3, 1.45, 0.05);
    group.add(earL);
    group.add(earR);

    // 小红围巾
    const scarfGeo = new THREE.TorusGeometry(0.35, 0.09, 8, 16);
    const scarfMat = new THREE.MeshStandardMaterial({ color: 0xe53935 });
    const scarf = new THREE.Mesh(scarfGeo, scarfMat);
    scarf.rotation.x = Math.PI / 2;
    scarf.position.set(0, 0.95, 0.05);
    group.add(scarf);

    return group;
  }

  createBunnyMesh() {
    const group = new THREE.Group();

    // 身体 (奶油白)
    const bodyGeo = new THREE.SphereGeometry(0.48, 16, 16);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.48;
    body.castShadow = true;
    group.add(body);

    // 头部
    const headGeo = new THREE.SphereGeometry(0.38, 16, 16);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(0, 1.05, 0.06);
    head.castShadow = true;
    group.add(head);

    // 兔长耳朵
    const earGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.65, 12);
    const earL = new THREE.Mesh(earGeo, bodyMat);
    earL.position.set(-0.16, 1.6, 0);
    earL.rotation.z = 0.15;
    const earR = new THREE.Mesh(earGeo, bodyMat);
    earR.position.set(0.16, 1.6, 0);
    earR.rotation.z = -0.15;
    group.add(earL);
    group.add(earR);

    // 粉色蝴蝶结
    const bowGeo = new THREE.BoxGeometry(0.24, 0.12, 0.1);
    const bowMat = new THREE.MeshStandardMaterial({ color: 0xf48fb1 });
    const bow = new THREE.Mesh(bowGeo, bowMat);
    bow.position.set(0, 1.35, 0.22);
    group.add(bow);

    return group;
  }

  createStoneArrowMesh() {
    const group = new THREE.Group();

    // Naomi 箭头：地板上的弯曲指示箭头
    const shaftGeo = new THREE.BoxGeometry(0.3, 0.08, 1.0);
    const headGeo = new THREE.ConeGeometry(0.42, 0.65, 3);
    const arrowMat = new THREE.MeshStandardMaterial({
      color: 0xffb300,
      emissive: 0xff8f00,
      emissiveIntensity: 0.8,
      roughness: 0.3,
    });

    const shaft = new THREE.Mesh(shaftGeo, arrowMat);
    shaft.position.z = -0.35;
    const head = new THREE.Mesh(headGeo, arrowMat);
    head.rotation.x = Math.PI / 2;
    head.position.z = -0.95;

    group.add(shaft);
    group.add(head);
    group.position.y = 0.15;
    group.visible = false;

    this.arrowMesh = group;
    this.scene.add(this.arrowMesh);
  }

  showObstacleArrow(playerX, playerY, heading, hint) {
    if (!this.arrowMesh) return;
    const w = this.gridToWorld(playerX, playerY);
    this.arrowMesh.position.x = w.x;
    this.arrowMesh.position.z = w.z;

    // 根据退路方向设定箭头朝向
    let baseAngle = this.headingToAngle(heading);
    if (hint.arrowDirection === 'BACKWARD') {
      this.arrowMesh.rotation.y = baseAngle + Math.PI; // 指向后退
    } else if (hint.arrowDirection === 'LEFT') {
      this.arrowMesh.rotation.y = baseAngle + Math.PI * 0.5; // 指向左
    } else if (hint.arrowDirection === 'RIGHT') {
      this.arrowMesh.rotation.y = baseAngle - Math.PI * 0.5; // 指向右
    } else {
      this.arrowMesh.rotation.y = baseAngle + Math.PI;
    }

    this.arrowMesh.visible = true;
    this.arrowActive = true;
    this.arrowTimer = 2.8;
  }

  syncGameState(state, myPlayerId) {
    this.gameState = state;
    this.myPlayerId = myPlayerId;

    // 1. 同步家园庇护罩
    if (this.shieldMesh) {
      this.shieldMesh.visible = state.shield > 0;
      if (state.shield > 0) {
        this.shieldMesh.material.opacity = state.shield >= 2 ? 0.55 : 0.35;
      }
    }

    // 2. 同步静态地形障碍（树篱、石头、森林）
    this.syncTerrain(state);

    // 3. 同步小动物
    this.syncPets(state);

    // 4. 同步礼盒
    this.syncGifts(state);

    // 5. 更新玩家目标位置（同格站位轻微错开 0.35m，表现层不重叠）
    const isSameTile = state.players[0].x === state.players[1].x && state.players[0].y === state.players[1].y;
    state.players.forEach((p) => {
      const w = this.gridToWorld(p.x, p.y);
      const angle = this.headingToAngle(p.heading);
      const offset = isSameTile ? (p.id === 0 ? -0.35 : 0.35) : 0;
      this.targetPositions[p.id] = { x: w.x + offset, y: 0, z: w.z, angle };
    });
  }

  syncTerrain(state) {
    if (this.terrainMeshes.length > 0) return;

    this.colliders = [];
    state.terrain.forEach((t) => {
      const w = this.gridToWorld(t.x, t.y);

      if (t.type === 'hedge') {
        // 树篱迷宫墙体：高 2.8m，严密阻挡视线与镜头穿墙
        const hedgeGeo = new THREE.BoxGeometry(this.cellSize * 0.98, 2.8, this.cellSize * 0.98);
        const hedgeMat = new THREE.MeshStandardMaterial({
          color: 0x2e7d32,
          roughness: 0.85,
        });
        const mesh = new THREE.Mesh(hedgeGeo, hedgeMat);
        mesh.position.set(w.x, 1.4, w.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        this.terrainMeshes.push(mesh);

        this.colliders.push({
          minX: w.x - this.cellSize * 0.5,
          maxX: w.x + this.cellSize * 0.5,
          minZ: w.z - this.cellSize * 0.5,
          maxZ: w.z + this.cellSize * 0.5,
        });
      } else if (t.type === 'rock') {
        const rockGeo = new THREE.DodecahedronGeometry(1.2, 1);
        const rockMat = new THREE.MeshStandardMaterial({
          color: 0x78909c,
          roughness: 0.7,
        });
        const mesh = new THREE.Mesh(rockGeo, rockMat);
        mesh.position.set(w.x, 0.9, w.z);
        mesh.scale.set(1.1, 0.9, 1.1);
        mesh.castShadow = true;
        this.scene.add(mesh);
        this.terrainMeshes.push(mesh);

        this.colliders.push({
          minX: w.x - 1.2,
          maxX: w.x + 1.2,
          minZ: w.z - 1.2,
          maxZ: w.z + 1.2,
        });
      } else if (t.type === 'forest') {
        const treeGroup = new THREE.Group();
        const trunkGeo = new THREE.CylinderGeometry(0.3, 0.4, 1.2, 8);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 0.6;
        trunk.castShadow = true;
        treeGroup.add(trunk);

        const leafGeo = new THREE.ConeGeometry(1.6, 2.4, 8);
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x388e3c, roughness: 0.8 });
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.position.y = 2.1;
        leaf.castShadow = true;
        treeGroup.add(leaf);

        // 可见森林绳网
        if (t.net && !t.cleared) {
          const netGeo = new THREE.TorusGeometry(1.4, 0.08, 6, 16);
          const netMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.4 });
          const net = new THREE.Mesh(netGeo, netMat);
          net.rotation.x = Math.PI / 2;
          net.position.y = 1.2;
          treeGroup.add(net);
          t.netMesh = net;
        }

        treeGroup.position.set(w.x, 0, w.z);
        this.scene.add(treeGroup);
        this.terrainMeshes.push(treeGroup);
      }
    });

    // 迷宫地标装饰
    if (state.maze) {
      const entW = this.gridToWorld(state.maze.entrance.x, state.maze.entrance.y);
      const arch = this.createArchway(0xffb74d);
      arch.position.set(entW.x, 0, entW.z);
      this.scene.add(arch);

      const exitW = this.gridToWorld(state.maze.exit.x, state.maze.exit.y);
      const exitArch = this.createArchway(0x81c784);
      exitArch.position.set(exitW.x, 0, exitW.z);
      this.scene.add(exitArch);
    }
  }

  createArchway(colorHex) {
    const group = new THREE.Group();
    const pillarGeo = new THREE.CylinderGeometry(0.18, 0.22, 2.6, 8);
    const mat = new THREE.MeshStandardMaterial({ color: colorHex });

    const p1 = new THREE.Mesh(pillarGeo, mat);
    p1.position.set(-1.4, 1.3, 0);
    const p2 = new THREE.Mesh(pillarGeo, mat);
    p2.position.set(1.4, 1.3, 0);

    const beamGeo = new THREE.BoxGeometry(3.2, 0.35, 0.35);
    const beam = new THREE.Mesh(beamGeo, mat);
    beam.position.set(0, 2.6, 0);

    group.add(p1);
    group.add(p2);
    group.add(beam);
    return group;
  }

  syncPets(state) {
    this.petMeshes.forEach((m) => this.scene.remove(m));
    this.petMeshes = [];

    state.pets.forEach((pet) => {
      if (pet.home) return;

      const w = this.gridToWorld(pet.x, pet.y);
      const group = new THREE.Group();

      const geo = new THREE.SphereGeometry(0.35, 12, 12);
      const mat = new THREE.MeshStandardMaterial({ color: 0xffd54f, roughness: 0.5 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 0.35;
      mesh.castShadow = true;
      group.add(mesh);

      if (pet.carriedBy !== null) {
        const carrierW = this.gridToWorld(
          state.players[pet.carriedBy].x,
          state.players[pet.carriedBy].y
        );
        group.position.set(carrierW.x, 1.2, carrierW.z);
      } else {
        group.position.set(w.x, 0, w.z);
      }

      this.scene.add(group);
      this.petMeshes.push(group);
    });
  }

  syncGifts(state) {
    this.giftMeshes.forEach((m) => this.scene.remove(m));
    this.giftMeshes = [];

    state.gifts.forEach((gift) => {
      if (gift.opened) return;
      const w = this.gridToWorld(gift.x, gift.y);
      const group = new THREE.Group();

      const boxGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
      const boxMat = new THREE.MeshStandardMaterial({
        color: gift.kind === 'bomb' ? 0xba68c8 : 0xffca28,
        roughness: 0.4,
      });
      const box = new THREE.Mesh(boxGeo, boxMat);
      box.position.y = 0.35;
      box.castShadow = true;
      group.add(box);

      group.position.set(w.x, 0, w.z);
      this.scene.add(group);
      this.giftMeshes.push(group);
    });
  }

  updateCameraOcclusion(charPos, forwardDir, rightDir) {
    const charY = charPos.y || 0;
    const desiredCamDist = 4.8;
    const desiredCamHeight = 2.4;
    const shoulderOffset = 0.55;

    // 相机注视目标点：角色前方 1.8m，高度 1.2m
    const targetPos = new THREE.Vector3(
      charPos.x + forwardDir.x * 1.8,
      charY + 1.2,
      charPos.z + forwardDir.z * 1.8
    );

    // 越肩相机世界坐标（角色身后偏右略高）
    let camX = charPos.x - forwardDir.x * desiredCamDist + rightDir.x * shoulderOffset;
    let camZ = charPos.z - forwardDir.z * desiredCamDist + rightDir.z * shoulderOffset;
    let camY = charY + desiredCamHeight;

    // 5.1 节要求：相机碰到墙体时向角色收近，不穿墙，也不透明化整片墙体
    let effectiveDist = desiredCamDist;
    for (const c of this.colliders) {
      if (
        camX >= c.minX && camX <= c.maxX &&
        camZ >= c.minZ && camZ <= c.maxZ
      ) {
        effectiveDist = Math.max(1.6, effectiveDist * 0.45);
        camX = charPos.x - forwardDir.x * effectiveDist + rightDir.x * (shoulderOffset * 0.4);
        camZ = charPos.z - forwardDir.z * effectiveDist + rightDir.z * (shoulderOffset * 0.4);
        break;
      }
    }

    this.camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 0.15);
    this.camera.lookAt(targetPos);
  }

  updateTeammateVisibility() {
    if (!this.gameState || this.playerMeshes.length < 2) return;
    const mateId = 1 - this.myPlayerId;
    const myP = this.gameState.players[this.myPlayerId];
    const mateP = this.gameState.players[mateId];
    const mateMesh = this.playerMeshes[mateId];

    if (!mateMesh) return;

    // 规则 5.1：离开视野的队友模型与定位标记必须消失
    const distTiles = Math.hypot(myP.x - mateP.x, myP.y - mateP.y);
    const inRange = distTiles <= 6.5;

    let lineOfSight = false;
    if (window.CoopEngine) {
      lineOfSight = window.CoopEngine.hasLineOfSight(
        this.gameState,
        myP.x,
        myP.y,
        mateP.x,
        mateP.y
      );
    } else {
      lineOfSight = distTiles <= 4.0;
    }

    const isVisible = inRange && lineOfSight && mateP.connected;
    mateMesh.visible = isVisible;
  }

  animate() {
    requestAnimationFrame(this.animate);

    const delta = 0.016;

    // 1. 平滑插值角色位置与朝向
    for (let i = 0; i < 2; i++) {
      const mesh = this.playerMeshes[i];
      const target = this.targetPositions[i];
      const current = this.currentPositions[i];

      if (mesh && target) {
        current.x += (target.x - current.x) * 0.2;
        current.z += (target.z - current.z) * 0.2;

        let diffAngle = target.angle - current.angle;
        while (diffAngle < -Math.PI) diffAngle += Math.PI * 2;
        while (diffAngle > Math.PI) diffAngle -= Math.PI * 2;
        current.angle += diffAngle * 0.25;

        mesh.position.set(current.x, 0, current.z);
        mesh.rotation.y = current.angle;
      }
    }

    // 2. 更新主角越肩镜头跟随
    const myPos = this.currentPositions[this.myPlayerId];
    if (myPos) {
      const forwardDir = new THREE.Vector3(
        Math.sin(myPos.angle),
        0,
        Math.cos(myPos.angle)
      );
      const rightDir = new THREE.Vector3(
        Math.cos(myPos.angle),
        0,
        -Math.sin(myPos.angle)
      );

      this.updateCameraOcclusion(myPos, forwardDir, rightDir);
    }

    // 3. 视线遮挡：隔墙/树篱看不见队友
    this.updateTeammateVisibility();

    // 4. Naomi 箭头动画衰减
    if (this.arrowActive && this.arrowMesh) {
      this.arrowTimer -= delta;
      if (this.arrowTimer <= 0) {
        this.arrowActive = false;
        this.arrowMesh.visible = false;
      } else {
        this.arrowMesh.position.y = 0.15 + Math.sin(Date.now() * 0.008) * 0.04;
      }
    }

    // 5. 礼盒与待救动物轻微待机动画
    this.giftMeshes.forEach((g) => {
      g.rotation.y += 0.015;
    });

    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
}

window.Render3D = Render3D;
