(function () {
  'use strict';

  // ===== 小工具 =====

  // 随机范围
  function rand(a, b) { return a + Math.random() * (b - a); }

  // Lambert 材质（受光，卡通色）
  function mat(color, flat) {
    return new THREE.MeshLambertMaterial({ color: color, flatShading: !!flat });
  }

  // 发光材质（不受光，永远亮）
  function glowMat(color, opacity) {
    var m = new THREE.MeshBasicMaterial({ color: color });
    if (opacity !== undefined && opacity < 1) {
      m.transparent = true;
      m.opacity = opacity;
    }
    return m;
  }

  // 造一个 mesh 并摆位
  function put(geo, material, x, y, z) {
    var m = new THREE.Mesh(geo, material);
    m.position.set(x || 0, y || 0, z || 0);
    return m;
  }

  // ===== 1) 母舰：玩家的大飞船，长约 14，正面朝 -Z =====
  function mothership() {
    var g = new THREE.Group();

    var silver = mat(0xdfe6ef);   // 银白
    var navy = mat(0x25417a);     // 深蓝
    var dark = mat(0x33405c);     // 深灰蓝

    // 主机身：胶囊拉长，沿 Z 轴
    var hullGeo = new THREE.CapsuleGeometry(1.5, 8, 6, 16);
    hullGeo.rotateX(Math.PI / 2);
    var hull = put(hullGeo, silver, 0, 0, 0);
    hull.scale.set(1, 0.72, 1);
    hull.castShadow = true;
    g.add(hull);

    // 机鼻：锥体指向 -Z
    var noseGeo = new THREE.ConeGeometry(1.5, 3.2, 16);
    noseGeo.rotateX(-Math.PI / 2);
    var nose = put(noseGeo, navy, 0, 0, -7.2);
    nose.scale.set(1, 0.72, 1);
    g.add(nose);

    // 背脊：深蓝装饰条
    var spine = put(new THREE.BoxGeometry(0.9, 0.5, 8.5), navy, 0, 1.0, 0.3);
    g.add(spine);

    // 驾驶舱：青色半透明玻璃罩
    var domeGeo = new THREE.SphereGeometry(1.15, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    var domeMat = new THREE.MeshLambertMaterial({
      color: 0x55e6ff, transparent: true, opacity: 0.6
    });
    var dome = put(domeGeo, domeMat, 0, 0.75, -3.2);
    dome.scale.set(1, 0.85, 1.45);
    g.add(dome);

    // 两侧机翼/挂架
    [-1, 1].forEach(function (s) {
      var wing = put(new THREE.BoxGeometry(3.4, 0.35, 3.0), navy, s * 2.5, -0.1, 1.6);
      wing.rotation.z = s * 0.12;
      wing.castShadow = true;
      g.add(wing);
    });

    // 两侧大引擎筒
    var nacelles = [];
    [-1, 1].forEach(function (s) {
      var nGeo = new THREE.CylinderGeometry(0.85, 0.95, 4.6, 16);
      nGeo.rotateX(Math.PI / 2);
      var n = put(nGeo, dark, s * 3.6, -0.1, 2.2);
      n.castShadow = true;
      g.add(n);
      nacelles.push(n);

      // 引擎口的青色环
      var ringGeo = new THREE.TorusGeometry(0.85, 0.16, 8, 16);
      g.add(put(ringGeo, glowMat(0x4ff0ff), s * 3.6, -0.1, 4.45));
    });

    // 引擎尾焰（主逻辑会缩放这两个）
    var flameGeo = new THREE.ConeGeometry(0.72, 2.6, 14);
    flameGeo.rotateX(Math.PI / 2);   // 锥尖指向 +Z（向后喷）
    flameGeo.translate(0, 0, 1.3);   // 根部在原点，方便缩放
    var engineL = put(flameGeo, glowMat(0xffa030, 0.9), -3.6, -0.1, 4.6);
    var engineR = put(flameGeo.clone(), glowMat(0xffa030, 0.9), 3.6, -0.1, 4.6);
    g.add(engineL);
    g.add(engineR);

    // 尾焰内芯（青色）
    var coreGeo = new THREE.ConeGeometry(0.38, 1.5, 12);
    coreGeo.rotateX(Math.PI / 2);
    coreGeo.translate(0, 0, 0.75);
    engineL.add(put(coreGeo, glowMat(0x9ffcff, 0.95), 0, 0, 0.05));
    engineR.add(put(coreGeo.clone(), glowMat(0x9ffcff, 0.95), 0, 0, 0.05));

    // 机身发光灯带（glow）
    var glow = new THREE.Group();
    var stripGeo = new THREE.BoxGeometry(0.16, 0.16, 7.0);
    [-1, 1].forEach(function (s) {
      glow.add(put(stripGeo, glowMat(0x5ff2ff), s * 1.45, -0.25, 0.2));
    });
    // 几颗信号灯
    var bulbGeo = new THREE.SphereGeometry(0.22, 10, 8);
    glow.add(put(bulbGeo, glowMat(0xffe45c), 0, 1.45, -1.2));
    glow.add(put(bulbGeo.clone(), glowMat(0xff6a6a), -4.1, 0.1, 0.4));
    glow.add(put(bulbGeo.clone(), glowMat(0x7dff8a), 4.1, 0.1, 0.4));
    g.add(glow);

    g.userData.parts = { engineL: engineL, engineR: engineR, glow: glow, hull: hull, dome: dome };
    return g;
  }

  // ===== 2) 穿梭机：小型登陆船，长约 5 =====
  function shuttle() {
    var g = new THREE.Group();

    var white = mat(0xf2f2ee);
    var orange = mat(0xff8a2b);

    // 机身
    var bodyGeo = new THREE.CapsuleGeometry(0.6, 2.6, 5, 12);
    bodyGeo.rotateX(Math.PI / 2);
    var body = put(bodyGeo, white, 0, 0, 0);
    body.scale.set(1, 0.8, 1);
    body.castShadow = true;
    g.add(body);

    // 机鼻
    var noseGeo = new THREE.ConeGeometry(0.6, 1.2, 12);
    noseGeo.rotateX(-Math.PI / 2);
    g.add(put(noseGeo, orange, 0, 0, -2.5));

    // 驾驶舱玻璃
    var cockMat = new THREE.MeshLambertMaterial({
      color: 0x5ce3ff, transparent: true, opacity: 0.65
    });
    var cock = put(new THREE.SphereGeometry(0.46, 14, 10), cockMat, 0, 0.32, -1.2);
    cock.scale.set(1, 0.8, 1.4);
    g.add(cock);

    // 两片机翼
    var wingGeo = new THREE.BoxGeometry(1.9, 0.14, 1.1);
    var wingL = put(wingGeo, orange, -1.2, -0.05, 0.7);
    var wingR = put(wingGeo.clone(), orange, 1.2, -0.05, 0.7);
    wingL.rotation.z = 0.2;
    wingR.rotation.z = -0.2;
    wingL.castShadow = true;
    wingR.castShadow = true;
    g.add(wingL);
    g.add(wingR);

    // 翼尖小灯
    var tipGeo = new THREE.SphereGeometry(0.13, 8, 6);
    wingL.add(put(tipGeo, glowMat(0xff5555), -0.95, 0, 0));
    wingR.add(put(tipGeo.clone(), glowMat(0x66ff88), 0.95, 0, 0));

    // 尾翼
    var fin = put(new THREE.BoxGeometry(0.12, 0.9, 0.8), orange, 0, 0.55, 1.4);
    g.add(fin);

    // 尾焰 + 发光件
    var glow = new THREE.Group();
    var flameGeo = new THREE.ConeGeometry(0.34, 1.3, 12);
    flameGeo.rotateX(Math.PI / 2);
    flameGeo.translate(0, 0, 0.65);
    glow.add(put(flameGeo, glowMat(0xffb04a, 0.9), 0, 0, 1.85));
    var coreGeo = new THREE.ConeGeometry(0.18, 0.8, 10);
    coreGeo.rotateX(Math.PI / 2);
    coreGeo.translate(0, 0, 0.4);
    glow.add(put(coreGeo, glowMat(0xaefcff, 0.95), 0, 0, 1.9));
    // 机身腰线
    glow.add(put(new THREE.BoxGeometry(0.1, 0.1, 2.4), glowMat(0x5ff2ff), 0.55, -0.1, 0.1));
    glow.add(put(new THREE.BoxGeometry(0.1, 0.1, 2.4), glowMat(0x5ff2ff), -0.55, -0.1, 0.1));
    g.add(glow);

    g.userData.parts = { glow: glow, wingL: wingL, wingR: wingR, body: body };
    return g;
  }

  // ===== 3) 小行星：每次形状都不一样 =====
  function asteroid() {
    var g = new THREE.Group();
    var r = rand(1.5, 4.0);

    var geo = new THREE.IcosahedronGeometry(r, 2);
    var pos = geo.attributes.position;

    // 用连续函数做扰动：同一位置的重复顶点会得到同样的偏移，不会撕裂
    var p1 = rand(0, 6.28), p2 = rand(0, 6.28), p3 = rand(0, 6.28);
    var f1 = rand(1.4, 2.6), f2 = rand(2.2, 4.0), f3 = rand(4.0, 6.5);
    var v = new THREE.Vector3();
    for (var i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      var n = v.clone().normalize();
      var d =
        0.20 * Math.sin(n.x * f1 + p1) * Math.cos(n.y * f1 + p2) +
        0.12 * Math.sin(n.y * f2 + p2) * Math.cos(n.z * f2 + p3) +
        0.06 * Math.sin(n.z * f3 + p3) * Math.cos(n.x * f3 + p1);
      v.multiplyScalar(1 + d);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    // 灰褐色岩石，平面着色
    var colors = [0x8a7a68, 0x776a5c, 0x9a8873, 0x6d6255];
    var rock = new THREE.Mesh(
      geo,
      new THREE.MeshLambertMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        flatShading: true
      })
    );
    rock.castShadow = true;
    rock.receiveShadow = true;
    rock.rotation.set(rand(0, 6.28), rand(0, 6.28), rand(0, 6.28));
    g.add(rock);

    // 偶尔嵌几颗彩色矿石，好看
    if (Math.random() < 0.55) {
      var oreCol = [0x4fe0ff, 0xffd24a, 0xff7ad9][Math.floor(Math.random() * 3)];
      var cnt = Math.floor(rand(2, 5));
      for (var k = 0; k < cnt; k++) {
        var dir = new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize();
        var ore = put(
          new THREE.IcosahedronGeometry(r * rand(0.10, 0.18), 0),
          glowMat(oreCol),
          dir.x * r * 0.92, dir.y * r * 0.92, dir.z * r * 0.92
        );
        g.add(ore);
      }
    }

    g.userData.parts = { rock: rock };
    g.userData.radius = r;
    return g;
  }

  // ===== 4) 星空背景：2500 颗星星 =====
  function starfield() {
    var g = new THREE.Group();

    var COUNT = 2500;
    var R = 600;
    var positions = new Float32Array(COUNT * 3);
    var colors = new Float32Array(COUNT * 3);

    var palette = [
      [1.00, 1.00, 1.00],  // 白
      [0.72, 0.85, 1.00],  // 淡蓝
      [1.00, 0.95, 0.72]   // 淡黄
    ];

    for (var i = 0; i < COUNT; i++) {
      // 球壳上均匀撒点
      var u = Math.random() * 2 - 1;
      var t = Math.random() * Math.PI * 2;
      var s = Math.sqrt(1 - u * u);
      positions[i * 3] = R * s * Math.cos(t);
      positions[i * 3 + 1] = R * u;
      positions[i * 3 + 2] = R * s * Math.sin(t);

      var c = palette[Math.floor(Math.random() * palette.length)];
      var b = 0.65 + Math.random() * 0.35; // 亮度有差别
      colors[i * 3] = c[0] * b;
      colors[i * 3 + 1] = c[1] * b;
      colors[i * 3 + 2] = c[2] * b;
    }

    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    var pm = new THREE.PointsMaterial({
      size: 2.0,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false
    });

    var points = new THREE.Points(geo, pm);
    points.frustumCulled = false;
    g.add(points);

    g.userData.parts = { points: points };
    return g;
  }

  // ===== 5) 远景装饰星球 =====
  function planetInSky(radius, colorA, colorB) {
    var r = (radius === undefined) ? 40 : radius;
    var ca = (colorA === undefined) ? 0x4a7ddb : colorA;
    var cb = (colorB === undefined) ? 0xc8a45a : colorB;

    var g = new THREE.Group();

    // 星球本体
    var ball = put(new THREE.SphereGeometry(r, 32, 24), glowMat(ca), 0, 0, 0);
    g.add(ball);

    // 两条云带，看起来更有层次
    var band1 = put(new THREE.SphereGeometry(r * 1.004, 32, 24, 0, Math.PI * 2, Math.PI * 0.34, Math.PI * 0.12),
      glowMat(0xffffff, 0.18), 0, 0, 0);
    var band2 = put(new THREE.SphereGeometry(r * 1.004, 32, 24, 0, Math.PI * 2, Math.PI * 0.58, Math.PI * 0.09),
      glowMat(0x000000, 0.14), 0, 0, 0);
    g.add(band1);
    g.add(band2);

    // 行星环，倾斜
    var ring = new THREE.Mesh(
      new THREE.TorusGeometry(r * 1.85, r * 0.10, 2, 64),
      new THREE.MeshBasicMaterial({ color: cb, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
    );
    ring.rotation.x = Math.PI / 2;
    ring.scale.set(1, 1, 0.12); // 压扁成薄环
    g.add(ring);

    var ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(r * 2.25, r * 0.05, 2, 64),
      new THREE.MeshBasicMaterial({ color: cb, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
    );
    ring2.rotation.x = Math.PI / 2;
    ring2.scale.set(1, 1, 0.12);
    g.add(ring2);

    // 整体倾斜一点
    g.rotation.z = 0.32;
    g.rotation.x = -0.18;

    g.userData.parts = { ball: ball, ring: ring, ring2: ring2 };
    return g;
  }

  // ===== 6) 安全区传送门：直立大圆环，环面朝 Z =====
  function safeGate() {
    var g = new THREE.Group();

    // 主环（外径约 22）
    var ring = new THREE.Mesh(
      new THREE.TorusGeometry(20, 2, 12, 48),
      new THREE.MeshLambertMaterial({ color: 0xe7edf5, flatShading: true })
    );
    g.add(ring);

    // 环上的发光纹路：内外两圈细环
    ring.add(new THREE.Mesh(
      new THREE.TorusGeometry(20, 0.45, 8, 64),
      glowMat(0x46ffd0)
    ));
    var outerLine = new THREE.Mesh(new THREE.TorusGeometry(22.2, 0.3, 8, 64), glowMat(0x2ad9ff, 0.85));
    var innerLine = new THREE.Mesh(new THREE.TorusGeometry(17.9, 0.3, 8, 64), glowMat(0x2ad9ff, 0.85));
    g.add(outerLine);
    g.add(innerLine);

    // 能量膜：青绿色半透明圆盘
    var film = new THREE.Mesh(
      new THREE.CircleGeometry(19.6, 48),
      new THREE.MeshBasicMaterial({
        color: 0x3fe6b0,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    g.add(film);

    // 一圈发光小球（主逻辑会转动这个 Group）
    var lights = new THREE.Group();
    var bulbGeo = new THREE.SphereGeometry(0.85, 10, 8);
    var bulbCols = [0x6bfff0, 0xffe45c, 0xff8ad4, 0x8affa0];
    for (var i = 0; i < 16; i++) {
      var a = (i / 16) * Math.PI * 2;
      var b = put(bulbGeo, glowMat(bulbCols[i % bulbCols.length]),
        Math.cos(a) * 20, Math.sin(a) * 20, 0);
      lights.add(b);
    }
    g.add(lights);

    // 底座支架，让门"站"在地上/太空里也好认
    var legMat = mat(0x5a6a86, true);
    [-1, 1].forEach(function (s) {
      var leg = put(new THREE.BoxGeometry(1.4, 8, 1.4), legMat, s * 14, -18, 0);
      leg.rotation.z = s * 0.35;
      g.add(leg);
    });

    g.userData.parts = { ring: ring, film: film, lights: lights };
    return g;
  }

  // ===== 7) 怪物星球地表：战斗场地 =====
  function planetTerrain() {
    var g = new THREE.Group();

    // 地面：半径 95 的圆盘，暗红紫外星土壤
    var groundGeo = new THREE.CircleGeometry(95, 64);
    groundGeo.rotateX(-Math.PI / 2);
    var ground = new THREE.Mesh(groundGeo, new THREE.MeshLambertMaterial({ color: 0x4a2340 }));
    ground.position.y = 0;
    ground.receiveShadow = true;
    g.add(ground);

    // 地面上的深色斑块，增加层次（稍微抬高避免 z-fighting）
    for (var p = 0; p < 14; p++) {
      var pa = rand(0, Math.PI * 2), pr = rand(10, 88);
      var patchGeo = new THREE.CircleGeometry(rand(4, 12), 16);
      patchGeo.rotateX(-Math.PI / 2);
      var patch = new THREE.Mesh(patchGeo, mat(rand(0, 1) > 0.5 ? 0x5c2b32 : 0x3a1c3a));
      patch.position.set(Math.cos(pa) * pr, 0.02, Math.sin(pa) * pr);
      patch.receiveShadow = true;
      g.add(patch);
    }

    // 岩石 / 晶柱：30~45 块，分布在半径 20~90，中心留空给战斗
    var rockCols = [0x6b3a6b, 0x7a3340, 0xd8cfc0, 0x532a4f];
    var rockCount = Math.floor(rand(30, 46));
    for (var i = 0; i < rockCount; i++) {
      var ang = rand(0, Math.PI * 2);
      var dist = rand(20, 90);
      var x = Math.cos(ang) * dist;
      var z = Math.sin(ang) * dist;
      var col = rockCols[Math.floor(Math.random() * rockCols.length)];

      var mesh;
      if (Math.random() < 0.4) {
        // 晶柱：细长锥体
        var h = rand(4, 14);
        mesh = new THREE.Mesh(
          new THREE.ConeGeometry(rand(0.8, 2.2), h, 6),
          new THREE.MeshLambertMaterial({ color: col, flatShading: true })
        );
        mesh.position.set(x, h / 2, z);
        mesh.rotation.y = rand(0, 6.28);
        mesh.rotation.z = rand(-0.18, 0.18);
      } else {
        // 岩石：不规则多面体
        var rr = rand(1.5, 5.0);
        mesh = new THREE.Mesh(
          new THREE.IcosahedronGeometry(rr, 0),
          new THREE.MeshLambertMaterial({ color: col, flatShading: true })
        );
        mesh.position.set(x, rr * 0.6, z);
        mesh.rotation.set(rand(0, 6.28), rand(0, 6.28), rand(0, 6.28));
        mesh.scale.set(1, rand(0.6, 1.4), 1);
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      g.add(mesh);
    }

    // 4~6 个发光熔岩池
    var poolCount = Math.floor(rand(4, 7));
    for (var j = 0; j < poolCount; j++) {
      var la = rand(0, Math.PI * 2);
      var ld = rand(22, 80);
      var lr = rand(5, 11);
      var poolGeo = new THREE.CircleGeometry(lr, 24);
      poolGeo.rotateX(-Math.PI / 2);
      var pool = new THREE.Mesh(poolGeo, glowMat(0xff5a1e));
      pool.position.set(Math.cos(la) * ld, 0.05, Math.sin(la) * ld);
      g.add(pool);

      // 池心更亮
      var coreGeo = new THREE.CircleGeometry(lr * 0.55, 20);
      coreGeo.rotateX(-Math.PI / 2);
      var core = new THREE.Mesh(coreGeo, glowMat(0xffc44a));
      core.position.set(pool.position.x, 0.07, pool.position.z);
      g.add(core);
    }

    // 边界山脊墙：一圈大锥体，高 15~30
    var wallCount = 26;
    for (var w = 0; w < wallCount; w++) {
      var wa = (w / wallCount) * Math.PI * 2 + rand(-0.04, 0.04);
      var wh = rand(15, 30);
      var peak = new THREE.Mesh(
        new THREE.ConeGeometry(rand(8, 13), wh, 5),
        new THREE.MeshLambertMaterial({ color: w % 2 ? 0x3a1f38 : 0x4a2430, flatShading: true })
      );
      peak.position.set(Math.cos(wa) * 95, wh / 2 - 1.5, Math.sin(wa) * 95);
      peak.rotation.y = rand(0, 6.28);
      peak.castShadow = true;
      peak.receiveShadow = true;
      g.add(peak);
    }

    g.userData.parts = { ground: ground };
    return g;
  }

  // ===== 挂载到 window.ART（合并，不覆盖别人的）=====
  window.ART = window.ART || {};
  Object.assign(window.ART, {
    mothership: mothership,
    shuttle: shuttle,
    asteroid: asteroid,
    starfield: starfield,
    planetInSky: planetInSky,
    safeGate: safeGate,
    planetTerrain: planetTerrain
  });
})();
