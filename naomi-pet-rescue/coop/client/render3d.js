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

    // 墙体 (暖米白木屋)
    const wallGeo = new THREE.BoxGeometry(1.6, 1.4, 1.6);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xfff9e6, roughness: 0.85 });
    const walls = new THREE.Mesh(wallGeo, wallMat);
    walls.position.y = 0.7;
    walls.castShadow = true;
    walls.receiveShadow = true;
    group.add(walls);

    // 木屋原木边框支柱
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.7 });
    for (const [bx, bz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) {
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.45, 6), beamMat);
      beam.position.set(bx, 0.72, bz);
      group.add(beam);
    }

    // 屋顶（温馨红瓦斜顶）
    const roofGeo = new THREE.ConeGeometry(1.5, 0.95, 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xd84315, roughness: 0.55 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 1.85;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    // 石砌烟囱
    const chimGeo = new THREE.BoxGeometry(0.3, 0.65, 0.3);
    const chimMat = new THREE.MeshStandardMaterial({ color: 0x78909c, roughness: 0.9 });
    const chimney = new THREE.Mesh(chimGeo, chimMat);
    chimney.position.set(0.35, 1.95, 0.35);
    group.add(chimney);

    // 木门
    const doorGeo = new THREE.BoxGeometry(0.48, 0.8, 0.08);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.6 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 0.4, 0.81);
    group.add(door);

    // 门旁暖光小灯笼
    const lanternGeo = new THREE.DodecahedronGeometry(0.12, 0);
    const lanternMat = new THREE.MeshStandardMaterial({
      color: 0xffecb3,
      emissive: 0xffb74d,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    });
    const lantern = new THREE.Mesh(lanternGeo, lanternMat);
    lantern.position.set(0.36, 0.8, 0.84);
    group.add(lantern);

    // 门前花坛 (盛开的小郁金香与雏菊)
    const flowerbedGeo = new THREE.BoxGeometry(1.4, 0.16, 0.32);
    const flowerbedMat = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
    const flowerbed = new THREE.Mesh(flowerbedGeo, flowerbedMat);
    flowerbed.position.set(0, 0.08, 1.05);
    group.add(flowerbed);

    const flowerColors = [0xff4081, 0xffeb3b, 0x00e676, 0xff9100, 0xe040fb];
    for (let f = -0.55; f <= 0.55; f += 0.28) {
      const flower = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 6, 6),
        new THREE.MeshStandardMaterial({ color: flowerColors[Math.floor(Math.random() * flowerColors.length)] })
      );
      flower.position.set(f, 0.24, 1.05);
      group.add(flower);
    }

    return group;
  }

  createBearMesh() {
    const group = new THREE.Group();

    // 身体 (憨态可掬的圆滚滚身体)
    const bodyGeo = new THREE.SphereGeometry(0.56, 16, 16);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.75 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.56;
    body.castShadow = true;
    group.add(body);

    // 肚子上的浅色暖绒肚皮贴片
    const bellyGeo = new THREE.SphereGeometry(0.38, 14, 14);
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xd7ccc8, roughness: 0.9 });
    const belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.position.set(0, 0.54, 0.22);
    belly.scale.set(0.85, 0.9, 0.4);
    group.add(belly);

    // 头部
    const headGeo = new THREE.SphereGeometry(0.44, 16, 16);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(0, 1.18, 0.08);
    head.castShadow = true;
    group.add(head);

    // 吻部
    const snoutGeo = new THREE.SphereGeometry(0.18, 12, 12);
    const snoutMat = new THREE.MeshStandardMaterial({ color: 0xf5ebe0 });
    const snout = new THREE.Mesh(snoutGeo, snoutMat);
    snout.position.set(0, 1.1, 0.44);
    snout.scale.set(1.1, 0.8, 0.9);
    group.add(snout);

    // 鼻扣
    const noseGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const noseMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.2 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, 1.15, 0.58);
    group.add(nose);

    // 眼睛
    const eyeGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.1 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.16, 1.25, 0.42);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.16, 1.25, 0.42);
    group.add(eyeL, eyeR);

    // 熊圆耳朵
    const earGeo = new THREE.SphereGeometry(0.16, 12, 12);
    const earInnerGeo = new THREE.SphereGeometry(0.1, 10, 10);
    const earInnerMat = new THREE.MeshStandardMaterial({ color: 0xd7ccc8 });

    const earL = new THREE.Mesh(earGeo, bodyMat);
    earL.position.set(-0.32, 1.52, 0.05);
    const earLIn = new THREE.Mesh(earInnerGeo, earInnerMat);
    earLIn.position.set(-0.32, 1.52, 0.1);
    group.add(earL, earLIn);

    const earR = new THREE.Mesh(earGeo, bodyMat);
    earR.position.set(0.32, 1.52, 0.05);
    const earRIn = new THREE.Mesh(earInnerGeo, earInnerMat);
    earRIn.position.set(0.32, 1.52, 0.1);
    group.add(earR, earRIn);

    // 红围巾与流苏
    const scarfGeo = new THREE.TorusGeometry(0.36, 0.1, 8, 16);
    const scarfMat = new THREE.MeshStandardMaterial({ color: 0xe53935, roughness: 0.6 });
    const scarf = new THREE.Mesh(scarfGeo, scarfMat);
    scarf.rotation.x = Math.PI / 2;
    scarf.position.set(0, 0.96, 0.06);
    group.add(scarf);

    const scarfTail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.32, 0.06), scarfMat);
    scarfTail.position.set(0.18, 0.78, 0.38);
    scarfTail.rotation.z = -0.2;
    group.add(scarfTail);

    return group;
  }

  createBunnyMesh() {
    const group = new THREE.Group();

    // 身体 (奶油白)
    const bodyGeo = new THREE.SphereGeometry(0.48, 16, 16);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.65 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.48;
    body.castShadow = true;
    group.add(body);

    // Naomi 的粉色可爱围裙
    const apronMat = new THREE.MeshStandardMaterial({ color: 0xf48fb1, roughness: 0.7 });
    const apron = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 12), apronMat);
    apron.position.set(0, 0.46, 0.18);
    apron.scale.set(0.88, 0.92, 0.4);
    group.add(apron);

    // 围裙胸前小爱心
    const heart = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), new THREE.MeshStandardMaterial({ color: 0xff1744 }));
    heart.position.set(0, 0.54, 0.36);
    group.add(heart);

    // 头部
    const headGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(0, 1.08, 0.06);
    head.castShadow = true;
    group.add(head);

    // 眼睛与鼻子
    const eyeGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.14, 1.15, 0.4);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.14, 1.15, 0.4);
    group.add(eyeL, eyeR);

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), new THREE.MeshStandardMaterial({ color: 0xff80ab }));
    nose.position.set(0, 1.06, 0.45);
    group.add(nose);

    // 兔耳（内粉外白）
    const earGeo = new THREE.CylinderGeometry(0.07, 0.12, 0.68, 12);
    const earInnerGeo = new THREE.BoxGeometry(0.08, 0.52, 0.02);
    const earInnerMat = new THREE.MeshStandardMaterial({ color: 0xff80ab });

    const earL = new THREE.Mesh(earGeo, bodyMat);
    earL.position.set(-0.16, 1.62, 0);
    earL.rotation.z = 0.15;
    earL.rotation.x = -0.1;
    const earLIn = new THREE.Mesh(earInnerGeo, earInnerMat);
    earLIn.position.set(-0.16, 1.62, 0.06);
    earLIn.rotation.z = 0.15;
    earLIn.rotation.x = -0.1;
    group.add(earL, earLIn);

    const earR = new THREE.Mesh(earGeo, bodyMat);
    earR.position.set(0.16, 1.62, 0);
    earR.rotation.z = -0.15;
    earR.rotation.x = -0.1;
    const earRIn = new THREE.Mesh(earInnerGeo, earInnerMat);
    earRIn.position.set(0.16, 1.62, 0.06);
    earRIn.rotation.z = -0.15;
    earRIn.rotation.x = -0.1;
    group.add(earR, earRIn);

    // 蝴蝶结发饰
    const bow = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.08), new THREE.MeshStandardMaterial({ color: 0xf06292 }));
    bow.position.set(0, 1.38, 0.2);
    group.add(bow);

    // 绒球圆尾巴
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), bodyMat);
    tail.position.set(0, 0.38, -0.46);
    group.add(tail);

    // 后背救援藤篓
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.35, 12), new THREE.MeshStandardMaterial({ color: 0xbcaaa4, roughness: 0.9 }));
    basket.position.set(0, 0.65, -0.32);
    basket.rotation.x = 0.2;
    group.add(basket);

    return group;
  }

  // -------------------------------------------------------------
  // 🌟 核心升级：手工打造 8 种具体小动物的独立精致 3D 模型
  // -------------------------------------------------------------
  createPetLabelSprite(emoji, name) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 76;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
    ctx.strokeStyle = '#43a047';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(6, 6, 244, 64, 32);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 30px "PingFang SC", "Segoe UI Emoji", system-ui, sans-serif';
    ctx.fillStyle = '#1b5e20';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${emoji} ${name}`, 128, 38);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.4, 0.42, 1);
    return sprite;
  }

  // 0. 🐰 小兔宝宝（迷宫深处守护目标）
  buildBabyBunnyModel() {
    const g = new THREE.Group();
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
    const pinkMat = new THREE.MeshStandardMaterial({ color: 0xff80ab });

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 14), whiteMat);
    body.position.y = 0.3;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 14), whiteMat);
    head.position.set(0, 0.6, 0.06);

    const earL = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.07, 0.42, 8), whiteMat);
    earL.position.set(-0.11, 0.92, 0.04);
    earL.rotation.z = 0.18;
    const earR = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.07, 0.42, 8), whiteMat);
    earR.position.set(0.11, 0.92, 0.04);
    earR.rotation.z = -0.18;

    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), whiteMat);
    tail.position.set(0, 0.22, -0.28);

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), pinkMat);
    nose.position.set(0, 0.58, 0.29);

    g.add(body, head, earL, earR, tail, nose);
    return g;
  }

  // 1. 🐱 小猫（橘粉猫咪，立耳俏皮尾）
  buildKittenModel() {
    const g = new THREE.Group();
    const catMat = new THREE.MeshStandardMaterial({ color: 0xffb74d, roughness: 0.7 });
    const pinkMat = new THREE.MeshStandardMaterial({ color: 0xff80ab });

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 14), catMat);
    body.position.y = 0.28;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 14), catMat);
    head.position.set(0, 0.56, 0.06);

    const earGeo = new THREE.ConeGeometry(0.08, 0.16, 4);
    const earL = new THREE.Mesh(earGeo, catMat);
    earL.position.set(-0.14, 0.76, 0.06);
    earL.rotation.y = Math.PI / 4;
    const earR = new THREE.Mesh(earGeo, catMat);
    earR.position.set(0.14, 0.76, 0.06);
    earR.rotation.y = Math.PI / 4;

    const tail = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 6, 10, Math.PI * 0.75), catMat);
    tail.position.set(0, 0.35, -0.25);
    tail.rotation.y = Math.PI / 2;

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), pinkMat);
    nose.position.set(0, 0.54, 0.27);

    g.add(body, head, earL, earR, tail, nose);
    return g;
  }

  // 2. 🐶 小狗（金毛垂耳、红项圈金铃铛）
  buildPuppyModel() {
    const g = new THREE.Group();
    const dogMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.8 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63 });

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 14), dogMat);
    body.position.y = 0.3;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 14, 14), dogMat);
    head.position.set(0, 0.58, 0.08);

    const earL = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.18, 4, 8), darkMat);
    earL.position.set(-0.22, 0.62, 0.05);
    earL.rotation.z = 0.45;
    const earR = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.18, 4, 8), darkMat);
    earR.position.set(0.22, 0.62, 0.05);
    earR.rotation.z = -0.45;

    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.22, 6), dogMat);
    tail.position.set(0, 0.38, -0.26);
    tail.rotation.x = -0.8;

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.03, 6, 14), new THREE.MeshStandardMaterial({ color: 0xe53935 }));
    collar.position.set(0, 0.48, 0.06);
    collar.rotation.x = Math.PI / 2;

    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), dogMat);
    snout.position.set(0, 0.54, 0.28);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), new THREE.MeshStandardMaterial({ color: 0x212121 }));
    nose.position.set(0, 0.58, 0.36);

    g.add(body, head, earL, earR, tail, collar, snout, nose);
    return g;
  }

  // 3. 🐥 小鸡（鲜亮黄羽毛、小橙喙与翅膀）
  buildChickModel() {
    const g = new THREE.Group();
    const chickMat = new THREE.MeshStandardMaterial({ color: 0xffeb3b, roughness: 0.6 });
    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xff5722 });

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 14), chickMat);
    body.position.y = 0.26;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 14), chickMat);
    head.position.set(0, 0.52, 0.06);

    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 6), orangeMat);
    beak.position.set(0, 0.5, 0.26);
    beak.rotation.x = Math.PI / 2;

    const wingGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const wingL = new THREE.Mesh(wingGeo, chickMat);
    wingL.scale.set(0.3, 0.8, 1.2);
    wingL.position.set(-0.24, 0.28, 0.02);
    const wingR = new THREE.Mesh(wingGeo, chickMat);
    wingR.scale.set(0.3, 0.8, 1.2);
    wingR.position.set(0.24, 0.28, 0.02);

    const comb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), new THREE.MeshStandardMaterial({ color: 0xf44336 }));
    comb.position.set(0, 0.72, 0.06);

    g.add(body, head, beak, wingL, wingR, comb);
    return g;
  }

  // 4. 🐹 小仓鼠（胖嘟嘟圆脸颊、捧着瓜子）
  buildHamsterModel() {
    const g = new THREE.Group();
    const brownMat = new THREE.MeshStandardMaterial({ color: 0xd7ccc8, roughness: 0.8 });
    const cheekMat = new THREE.MeshStandardMaterial({ color: 0xffccbc });

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 14), brownMat);
    body.position.y = 0.28;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 14), brownMat);
    head.position.set(0, 0.54, 0.06);

    const cheekL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), cheekMat);
    cheekL.position.set(-0.14, 0.48, 0.2);
    const cheekR = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), cheekMat);
    cheekR.position.set(0.14, 0.48, 0.2);

    const earGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const earL = new THREE.Mesh(earGeo, cheekMat);
    earL.position.set(-0.14, 0.72, 0.04);
    const earR = new THREE.Mesh(earGeo, cheekMat);
    earR.position.set(0.14, 0.72, 0.04);

    const seed = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.12, 6), new THREE.MeshStandardMaterial({ color: 0x3e2723 }));
    seed.position.set(0, 0.36, 0.28);
    seed.rotation.x = -0.3;

    g.add(body, head, cheekL, cheekR, earL, earR, seed);
    return g;
  }

  // 5. 🐢 小乌龟（深翠绿龟甲、探头四鳍足）
  buildTurtleModel() {
    const g = new THREE.Group();
    const shellMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.55 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x81c784, roughness: 0.7 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xffecb3 });

    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), shellMat);
    shell.scale.set(1.15, 0.7, 1.25);
    shell.position.y = 0.14;

    const belly = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.05, 12), bellyMat);
    belly.position.y = 0.12;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), skinMat);
    head.position.set(0, 0.22, 0.38);

    const flipperGeo = new THREE.BoxGeometry(0.14, 0.05, 0.18);
    const f1 = new THREE.Mesh(flipperGeo, skinMat);
    f1.position.set(-0.32, 0.1, 0.2);
    const f2 = new THREE.Mesh(flipperGeo, skinMat);
    f2.position.set(0.32, 0.1, 0.2);
    const f3 = new THREE.Mesh(flipperGeo, skinMat);
    f3.position.set(-0.28, 0.1, -0.2);
    const f4 = new THREE.Mesh(flipperGeo, skinMat);
    f4.position.set(0.28, 0.1, -0.2);

    g.add(shell, belly, head, f1, f2, f3, f4);
    return g;
  }

  // 6. 🦆 小鸭（奶油白鸭身、宽扁橘色鸭嘴）
  buildDuckModel() {
    const g = new THREE.Group();
    const duckMat = new THREE.MeshStandardMaterial({ color: 0xfffde7, roughness: 0.65 });
    const billMat = new THREE.MeshStandardMaterial({ color: 0xff6f00 });

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 14), duckMat);
    body.position.y = 0.28;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 14), duckMat);
    head.position.set(0, 0.54, 0.08);

    const bill = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.16), billMat);
    bill.position.set(0, 0.52, 0.28);

    const wingL = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), duckMat);
    wingL.scale.set(0.25, 0.7, 1.3);
    wingL.position.set(-0.26, 0.32, 0.02);
    const wingR = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), duckMat);
    wingR.scale.set(0.25, 0.7, 1.3);
    wingR.position.set(0.26, 0.32, 0.02);

    g.add(body, head, bill, wingL, wingR);
    return g;
  }

  // 7. 🐑 小羊（云朵般的簇状蓬松羊毛球、黑脸蛋）
  buildLambModel() {
    const g = new THREE.Group();
    const woolMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });
    const faceMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.8 });

    const woolPuffs = [
      [0, 0.3, 0, 0.26],
      [-0.12, 0.35, 0.1, 0.18],
      [0.12, 0.35, 0.1, 0.18],
      [-0.14, 0.32, -0.12, 0.19],
      [0.14, 0.32, -0.12, 0.19],
      [0, 0.44, 0, 0.22],
    ];
    woolPuffs.forEach(([wx, wy, wz, wr]) => {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(wr, 10, 10), woolMat);
      puff.position.set(wx, wy, wz);
      g.add(puff);
    });

    const face = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), faceMat);
    face.position.set(0, 0.46, 0.26);

    const earL = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.14, 4, 6), faceMat);
    earL.position.set(-0.16, 0.48, 0.2);
    earL.rotation.z = 0.5;
    const earR = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.14, 4, 6), faceMat);
    earR.position.set(0.16, 0.48, 0.2);
    earR.rotation.z = -0.5;

    g.add(face, earL, earR);
    return g;
  }

  createPetMesh(pet) {
    const group = new THREE.Group();
    const id = pet.id;

    let animalModel;
    switch (id) {
      case 0: animalModel = this.buildBabyBunnyModel(); break;
      case 1: animalModel = this.buildKittenModel(); break;
      case 2: animalModel = this.buildPuppyModel(); break;
      case 3: animalModel = this.buildChickModel(); break;
      case 4: animalModel = this.buildHamsterModel(); break;
      case 5: animalModel = this.buildTurtleModel(); break;
      case 6: animalModel = this.buildDuckModel(); break;
      case 7: animalModel = this.buildLambModel(); break;
      default: animalModel = this.buildBabyBunnyModel();
    }
    group.add(animalModel);

    // 悬浮爱心名字精灵标记 (孩子远距离一眼看清)
    const nameSprite = this.createPetLabelSprite(pet.emoji, pet.name);
    nameSprite.position.y = 1.18;
    group.add(nameSprite);

    group.userData = {
      id: pet.id,
      name: pet.name,
      emoji: pet.emoji,
      baseY: 0,
      animPhase: pet.id * 0.9,
    };

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

    const playerCarriedCount = { 0: 0, 1: 0 };

    state.pets.forEach((pet) => {
      const group = this.createPetMesh(pet);

      if (pet.home) {
        // 救回家的小动物：在温馨小木屋前围成一圈欢聚庆祝！
        const homeW = this.gridToWorld(4, 4);
        const circleAngle = (pet.id / 8) * Math.PI * 2;
        const radius = 1.75;
        group.position.set(
          homeW.x + 1.4 + Math.cos(circleAngle) * radius,
          0,
          homeW.z - 1.4 + Math.sin(circleAngle) * radius
        );
        group.rotation.y = circleAngle + Math.PI;
        group.userData.carried = false;
        group.userData.isHome = true;
      } else if (pet.carriedBy !== null) {
        const carrierId = pet.carriedBy;
        const carrier = state.players[carrierId];
        const carrierW = this.gridToWorld(carrier.x, carrier.y);
        const slot = playerCarriedCount[carrierId] || 0;
        playerCarriedCount[carrierId] = slot + 1;

        if (carrier.roleKey === 'BEAR') {
          // 小熊抱两只：左右两肩各一只
          const shoulderOffset = slot === 0 ? -0.42 : 0.42;
          group.position.set(carrierW.x + shoulderOffset, 1.25, carrierW.z);
          group.scale.set(0.85, 0.85, 0.85);
        } else {
          // Naomi 小兔抱 1 只：坐在小兔的可爱背篓里
          group.position.set(carrierW.x, 1.05, carrierW.z + 0.15);
          group.scale.set(0.88, 0.88, 0.88);
        }
        group.userData.carried = true;
        group.userData.isHome = false;
      } else {
        // 地面上等待救援
        const w = this.gridToWorld(pet.x, pet.y);
        group.position.set(w.x, 0, w.z);
        group.userData.carried = false;
        group.userData.isHome = false;
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

      const isBomb = gift.kind === 'bomb';
      const boxMat = new THREE.MeshStandardMaterial({
        color: isBomb ? 0x9c27b0 : 0xffb300,
        roughness: 0.35,
      });
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.72), boxMat);
      box.position.y = 0.36;
      box.castShadow = true;
      group.add(box);

      // 丝带十字蝴蝶结
      const ribbonMat = new THREE.MeshStandardMaterial({
        color: isBomb ? 0xe1bee7 : 0xffffff,
        roughness: 0.2,
      });
      const ribH = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.74, 0.16), ribbonMat);
      ribH.position.y = 0.36;
      const ribV = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.74, 0.74), ribbonMat);
      ribV.position.y = 0.36;
      const bow = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), ribbonMat);
      bow.position.y = 0.78;
      group.add(ribH, ribV, bow);

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

    // 5. 礼盒与小动物生动待机动画
    const nowSec = Date.now() * 0.003;
    this.giftMeshes.forEach((g) => {
      g.rotation.y += 0.015;
    });

    this.petMeshes.forEach((petMesh) => {
      if (!petMesh.userData.carried) {
        const animPhase = petMesh.userData.animPhase || 0;
        const hop = Math.abs(Math.sin(nowSec * 2.5 + animPhase)) * 0.12;
        petMesh.position.y = hop;
      }
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
