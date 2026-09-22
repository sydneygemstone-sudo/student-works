/* art-chars.js —— 角色与生物造型库
 * 约定：每个函数返回 THREE.Group；脚底 y=0 向上生长；正面朝 -Z；
 *       可动部件挂在 group.userData.parts 上；所有 mesh castShadow = true。
 */
(function () {
  'use strict';

  // ---------- 小工具 ----------

  // 卡通漫反射材质
  function lam(color, emissive) {
    return new THREE.MeshLambertMaterial({
      color: color,
      emissive: emissive === undefined ? 0x000000 : emissive
    });
  }

  // 自发光材质（熔岩、能量核心、光环）
  function glowMat(color, opacity) {
    var o = { color: color };
    if (opacity !== undefined && opacity < 1) {
      o.transparent = true;
      o.opacity = opacity;
    }
    return new THREE.MeshBasicMaterial(o);
  }

  // 建一个 mesh 并摆位（统一开投影）
  function mk(geo, mat, x, y, z) {
    var m = new THREE.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = true;
    return m;
  }

  // 建一个空的枢轴 Group（肩、胯、下巴的旋转中心）
  function pivot(parent, x, y, z) {
    var g = new THREE.Group();
    g.position.set(x || 0, y || 0, z || 0);
    parent.add(g);
    return g;
  }

  // 定位用空对象（枪口、嘴巴、冰手）
  function anchor(parent, x, y, z) {
    var o = new THREE.Object3D();
    o.position.set(x || 0, y || 0, z || 0);
    parent.add(o);
    return o;
  }

  // 低面数几何体（控制多边形数量）
  function sphereGeo(r) { return new THREE.SphereGeometry(r, 16, 12); }
  function coneGeo(r, h) { return new THREE.ConeGeometry(r, h, 8); }
  function cylGeo(r, h) { return new THREE.CylinderGeometry(r, r, h, 10); }
  function capGeo(r, len) { return new THREE.CapsuleGeometry(r, len, 3, 10); }

  // ================================================================
  // 1) 太空探险家（宇航员）  总高约 1.8
  // ================================================================
  function hero() {
    var g = new THREE.Group();

    var SUIT = lam(0xf4f7fc);        // 白色宇航服
    var SUIT_D = lam(0x4a5a78);      // 深色关节
    var BLUE = lam(0x33c9ff, 0x0f5f8c); // 亮蓝头盔面罩
    var ORANGE = lam(0xff8a2b);      // 橙色背包
    var GUNBODY = lam(0x5e6b82);
    var GUNGLOW = glowMat(0x3cffd6);

    // --- 双腿：枢轴在胯部 y=0.72，网格向下长 ---
    var legL = pivot(g, -0.14, 0.72, 0);
    var legR = pivot(g, 0.14, 0.72, 0);
    [legL, legR].forEach(function (leg) {
      leg.add(mk(capGeo(0.1, 0.34), SUIT, 0, -0.3, 0));        // 大腿+小腿
      leg.add(mk(new THREE.BoxGeometry(0.16, 0.1, 0.16), SUIT_D, 0, -0.36, 0)); // 膝甲
      leg.add(mk(new THREE.BoxGeometry(0.2, 0.14, 0.3), SUIT_D, 0, -0.65, -0.05)); // 靴子（底面 y=0）
    });

    // --- 躯干 ---
    var torso = new THREE.Group();
    torso.position.set(0, 0.72, 0);
    g.add(torso);
    torso.add(mk(capGeo(0.21, 0.32), SUIT, 0, 0.34, 0));                          // 身体主体
    torso.add(mk(new THREE.BoxGeometry(0.24, 0.16, 0.06), BLUE, 0, 0.42, -0.19)); // 胸前控制面板
    torso.add(mk(new THREE.BoxGeometry(0.46, 0.08, 0.3), ORANGE, 0, 0.06, 0));    // 腰带
    torso.add(mk(new THREE.BoxGeometry(0.4, 0.46, 0.2), ORANGE, 0, 0.4, 0.24));   // 背包
    torso.add(mk(cylGeo(0.06, 0.36), SUIT_D, -0.12, 0.42, 0.38));                 // 氧气瓶 左
    torso.add(mk(cylGeo(0.06, 0.36), SUIT_D, 0.12, 0.42, 0.38));                  // 氧气瓶 右
    torso.add(mk(cylGeo(0.08, 0.1), SUIT_D, 0, 0.66, 0));                         // 脖子

    // --- 头（头盔）---
    var head = new THREE.Group();
    head.position.set(0, 1.45, 0);
    g.add(head);
    head.add(mk(sphereGeo(0.23), SUIT, 0, 0.12, 0));   // 头盔
    var visor = mk(sphereGeo(0.19), BLUE, 0, 0.11, -0.08); // 面罩
    visor.scale.set(1, 0.85, 0.7);
    head.add(visor);
    head.add(mk(cylGeo(0.05, 0.06), SUIT_D, -0.22, 0.12, 0)); // 耳机 左
    head.add(mk(cylGeo(0.05, 0.06), SUIT_D, 0.22, 0.12, 0));  // 耳机 右
    head.children[2].rotation.z = Math.PI / 2;
    head.children[3].rotation.z = Math.PI / 2;
    head.add(mk(cylGeo(0.015, 0.14), SUIT_D, 0.14, 0.32, 0.08)); // 天线杆
    head.add(mk(sphereGeo(0.035), glowMat(0xff3b3b), 0.14, 0.4, 0.08)); // 天线灯

    // --- 手臂：枢轴在肩膀 y=1.3 ---
    var armL = pivot(g, -0.28, 1.3, 0);
    var armR = pivot(g, 0.28, 1.3, 0);
    [armL, armR].forEach(function (arm, i) {
      arm.add(mk(sphereGeo(0.11), BLUE, 0, 0, 0));                 // 肩甲
      arm.add(mk(capGeo(0.075, 0.28), SUIT, 0, -0.26, 0));         // 手臂
      arm.add(mk(new THREE.BoxGeometry(0.16, 0.06, 0.16), SUIT_D, 0, -0.3, 0)); // 手肘环
      arm.add(mk(sphereGeo(0.095), ORANGE, 0, -0.48, 0));          // 手套
    });

    // --- 能量枪（挂在右手）---
    var gun = new THREE.Group();
    gun.position.set(0, -0.52, -0.08);
    armR.add(gun);
    gun.add(mk(new THREE.BoxGeometry(0.11, 0.13, 0.4), GUNBODY, 0, 0, -0.12));   // 枪身
    gun.add(mk(new THREE.BoxGeometry(0.08, 0.16, 0.1), GUNBODY, 0, -0.12, 0.04)); // 握把
    var barrel = mk(cylGeo(0.045, 0.28), SUIT_D, 0, 0.01, -0.44);                 // 枪管
    barrel.rotation.x = Math.PI / 2;
    gun.add(barrel);
    var ring = mk(new THREE.TorusGeometry(0.075, 0.022, 6, 12), GUNGLOW, 0, 0.01, -0.36);
    gun.add(ring); // 枪口发光环
    gun.add(mk(new THREE.BoxGeometry(0.05, 0.07, 0.14), GUNGLOW, 0, 0.09, -0.06)); // 能量电池

    // 枪口锚点：主逻辑用它的世界坐标生成子弹
    var muzzle = anchor(gun, 0, 0.01, -0.62);

    // 左手：冰魔法发射点
    var iceHand = anchor(armL, 0, -0.56, -0.06);

    g.userData.parts = {
      head: head, torso: torso,
      armL: armL, armR: armR,
      legL: legL, legR: legR,
      gun: gun, muzzle: muzzle
    };
    g.userData.iceHand = iceHand;
    return g;
  }

  // ================================================================
  // 2) 普通小怪物 grunt  总高约 2.2
  // ================================================================
  function grunt() {
    var g = new THREE.Group();

    var PURPLE = lam(0x9a3ccd);
    var MAGENTA = lam(0xe04ff0);
    var DARK = lam(0x531a78);
    var MOUTH_IN = lam(0xff3d2e, 0x5a0f08);
    var TOOTH = lam(0xfff6e0);
    var CLAW = lam(0xffd257);

    // --- 双腿：枢轴在 y=0.55 ---
    var legL = pivot(g, -0.26, 0.55, 0);
    var legR = pivot(g, 0.26, 0.55, 0);
    [legL, legR].forEach(function (leg) {
      leg.add(mk(capGeo(0.13, 0.26), PURPLE, 0, -0.22, 0));                        // 腿
      leg.add(mk(new THREE.BoxGeometry(0.34, 0.14, 0.4), DARK, 0, -0.48, -0.08));  // 大脚
      var c1 = mk(coneGeo(0.05, 0.14), CLAW, -0.1, -0.48, -0.3);                   // 爪子
      var c2 = mk(coneGeo(0.05, 0.14), CLAW, 0.1, -0.48, -0.3);
      c1.rotation.x = -Math.PI / 2; c2.rotation.x = -Math.PI / 2;
      leg.add(c1); leg.add(c2);
    });

    // --- 身体 ---
    var body = new THREE.Group();
    body.position.set(0, 0.55, 0);
    g.add(body);
    var trunk = mk(sphereGeo(0.46), PURPLE, 0, 0.5, 0);
    trunk.scale.set(1, 0.95, 0.9);
    body.add(trunk);
    var belly = mk(sphereGeo(0.3), MAGENTA, 0, 0.42, -0.26);     // 亮色肚皮
    belly.scale.set(1, 1.1, 0.5);
    body.add(belly);
    // 背上三根小尖刺
    body.add(mk(coneGeo(0.09, 0.26), DARK, 0, 0.9, 0.24));
    body.add(mk(coneGeo(0.08, 0.2), DARK, -0.2, 0.72, 0.3));
    body.add(mk(coneGeo(0.08, 0.2), DARK, 0.2, 0.72, 0.3));
    // 两条小胳膊
    var aL = mk(capGeo(0.08, 0.22), PURPLE, -0.46, 0.5, -0.04);
    var aR = mk(capGeo(0.08, 0.22), PURPLE, 0.46, 0.5, -0.04);
    aL.rotation.z = 0.6; aR.rotation.z = -0.6;
    body.add(aL); body.add(aR);
    body.add(mk(sphereGeo(0.09), MAGENTA, -0.56, 0.32, -0.06));
    body.add(mk(sphereGeo(0.09), MAGENTA, 0.56, 0.32, -0.06));

    // --- 头 ---
    var head = new THREE.Group();
    head.position.set(0, 1.56, 0);
    g.add(head);
    var skull = mk(sphereGeo(0.42), PURPLE, 0, 0.24, 0);
    skull.scale.set(1.05, 0.95, 1);
    head.add(skull);

    // 大嘴巴（张开的深红色口腔）
    var maw = mk(sphereGeo(0.28), MOUTH_IN, 0, 0.1, -0.26);
    maw.scale.set(1.05, 0.7, 0.6);
    head.add(maw);
    // 上下各两颗牙
    var tz = -0.44;
    var t1 = mk(coneGeo(0.05, 0.14), TOOTH, -0.13, 0.22, tz);
    var t2 = mk(coneGeo(0.05, 0.14), TOOTH, 0.13, 0.22, tz);
    t1.rotation.x = Math.PI; t2.rotation.x = Math.PI;
    var t3 = mk(coneGeo(0.05, 0.14), TOOTH, -0.09, -0.02, tz);
    var t4 = mk(coneGeo(0.05, 0.14), TOOTH, 0.09, -0.02, tz);
    head.add(t1); head.add(t2); head.add(t3); head.add(t4);

    // 眼睛：白球 + 黑瞳（材质各自独立，受击时可单独染红）
    function eye(x) {
      var e = mk(sphereGeo(0.14), lam(0xffffff), x, 0.44, -0.29);
      var pupil = mk(sphereGeo(0.07), lam(0x14101c), 0, 0, -0.09);
      e.add(pupil);
      head.add(e);
      return e;
    }
    var eyeL = eye(-0.19);
    var eyeR = eye(0.19);
    // 坏坏的眉毛
    var bL = mk(new THREE.BoxGeometry(0.17, 0.05, 0.05), DARK, -0.19, 0.58, -0.3);
    var bR = mk(new THREE.BoxGeometry(0.17, 0.05, 0.05), DARK, 0.19, 0.58, -0.3);
    bL.rotation.z = -0.35; bR.rotation.z = 0.35;
    head.add(bL); head.add(bR);
    // 头顶两根触角
    head.add(mk(coneGeo(0.06, 0.24), MAGENTA, -0.16, 0.66, 0.06));
    head.add(mk(coneGeo(0.06, 0.24), MAGENTA, 0.16, 0.66, 0.06));

    // 吐火球的位置：嘴巴前端，朝 -Z
    var mouth = anchor(head, 0, 0.1, -0.56);

    g.userData.parts = {
      head: head, mouth: mouth,
      eyeL: eyeL, eyeR: eyeR,
      legL: legL, legR: legR,
      body: body
    };
    return g;
  }

  // ================================================================
  // 3) 超大 Boss  总高约 9
  // ================================================================
  function boss() {
    var g = new THREE.Group();

    var RED = lam(0x8f1d1d);
    var RED_D = lam(0x5a0f12);
    var ORANGE = lam(0xd9541a);
    var LAVA = glowMat(0xff9a1f);       // 熔岩裂纹（发光）
    var CORE_M = glowMat(0xff5200);     // 胸口能量核心
    var EYE_M1 = glowMat(0xffd23d);
    var EYE_M2 = glowMat(0xffd23d);
    var TOOTH = lam(0xfff0d4);
    var HORN = lam(0xf0e2c8);
    var MOUTH_IN = lam(0x3a0606, 0x300000);

    // --- 双腿（不参与 parts，做支撑造型）---
    [-1.05, 1.05].forEach(function (x) {
      var leg = pivot(g, x, 2.5, 0);
      leg.add(mk(capGeo(0.48, 1.2), RED, 0, -1.0, 0));                             // 腿
      leg.add(mk(new THREE.BoxGeometry(1.0, 0.5, 1.5), RED_D, 0, -2.25, -0.3));    // 脚
      [-0.3, 0, 0.3].forEach(function (tx) {                                        // 脚趾爪
        var c = mk(coneGeo(0.14, 0.4), HORN, tx, -2.25, -1.1);
        c.rotation.x = -Math.PI / 2;
        leg.add(c);
      });
    });

    // --- 身体 ---
    var body = new THREE.Group();
    body.position.set(0, 2.5, 0);
    g.add(body);
    var trunk = mk(capGeo(1.25, 1.6), RED, 0, 1.9, 0);
    trunk.scale.set(1.15, 1, 0.9);
    body.add(trunk);
    body.add(mk(new THREE.BoxGeometry(2.0, 0.6, 1.9), RED_D, 0, 0.55, 0));          // 腰甲
    var chest = mk(sphereGeo(1.0), ORANGE, 0, 2.2, -0.65);                          // 胸甲
    chest.scale.set(1.1, 0.9, 0.6);
    body.add(chest);
    // 背上熔岩裂纹：发光小块
    var cracks = [
      [0, 3.0, 1.05, 0.9, 0.16], [-0.55, 2.4, 1.0, 0.5, 0.14],
      [0.55, 2.4, 1.0, 0.5, 0.14], [0, 1.9, 1.05, 1.1, 0.13],
      [-0.4, 1.3, 0.95, 0.45, 0.12], [0.4, 1.3, 0.95, 0.45, 0.12],
      [0, 3.5, 0.95, 0.6, 0.12]
    ];
    cracks.forEach(function (c) {
      var m = mk(new THREE.BoxGeometry(c[3], c[4], 0.18), LAVA, c[0], c[1], c[2]);
      m.rotation.z = (c[0] === 0) ? 0 : (c[0] > 0 ? -0.5 : 0.5);
      body.add(m);
    });
    // 胸口能量核心（主逻辑缩放它做蓄力）
    var core = mk(sphereGeo(0.55), CORE_M, 0, 2.2, -1.15);
    body.add(core);
    body.add(mk(new THREE.TorusGeometry(0.75, 0.1, 6, 14), LAVA, 0, 2.2, -1.1));    // 核心外圈

    // --- 手臂：枢轴在肩膀 ---
    var armL = pivot(g, -2.0, 6.0, 0);
    var armR = pivot(g, 2.0, 6.0, 0);
    [armL, armR].forEach(function (arm, i) {
      var dir = i === 0 ? -1 : 1;
      arm.add(mk(sphereGeo(0.8), RED_D, 0, 0, 0));                 // 肩
      arm.add(mk(capGeo(0.45, 1.3), RED, 0, -1.2, 0));             // 上臂
      arm.add(mk(new THREE.BoxGeometry(0.9, 0.5, 0.9), ORANGE, 0, -1.9, 0)); // 护腕
      arm.add(mk(sphereGeo(0.6), RED, 0, -2.5, -0.1));             // 拳头
      [0.3, -0.3].forEach(function (sx) {                          // 肩上尖刺
        var s = mk(coneGeo(0.2, 0.6), HORN, sx * dir, 0.6, 0.1);
        s.rotation.z = -dir * 0.4;
        arm.add(s);
      });
      arm.add(mk(new THREE.BoxGeometry(0.5, 0.14, 0.2), LAVA, 0, -1.2, -0.45)); // 手臂裂纹
    });

    // --- 头 ---
    var head = new THREE.Group();
    head.position.set(0, 6.6, 0);
    g.add(head);
    var skull = mk(sphereGeo(1.1), RED, 0, 0.85, 0);
    skull.scale.set(1.15, 1, 1.05);
    head.add(skull);
    head.add(mk(new THREE.BoxGeometry(1.9, 0.3, 0.5), RED_D, 0, 1.25, -0.85));      // 眉骨
    // 头顶双角
    var hL = mk(coneGeo(0.28, 1.3), HORN, -0.65, 1.9, 0.15);
    var hR = mk(coneGeo(0.28, 1.3), HORN, 0.65, 1.9, 0.15);
    hL.rotation.z = 0.4; hR.rotation.z = -0.4;
    head.add(hL); head.add(hR);
    // 侧边小角
    var sL = mk(coneGeo(0.16, 0.6), HORN, -1.15, 1.0, 0.25);
    var sR = mk(coneGeo(0.16, 0.6), HORN, 1.15, 1.0, 0.25);
    sL.rotation.z = 1.1; sR.rotation.z = -1.1;
    head.add(sL); head.add(sR);
    // 血盆大口：口腔内壁 + 上排牙
    var maw = mk(sphereGeo(0.85), MOUTH_IN, 0, 0.35, -0.55);
    maw.scale.set(1.1, 0.7, 0.7);
    head.add(maw);
    [-0.5, -0.17, 0.17, 0.5].forEach(function (tx) {
      var t = mk(coneGeo(0.13, 0.42), TOOTH, tx, 0.5, -1.0);
      t.rotation.x = Math.PI;
      head.add(t);
    });
    // 发光眼睛
    var eyeL = mk(sphereGeo(0.24), EYE_M1, -0.5, 1.0, -1.0);
    var eyeR = mk(sphereGeo(0.24), EYE_M2, 0.5, 1.0, -1.0);
    head.add(eyeL); head.add(eyeR);

    // --- 下巴（主逻辑绕 x 轴旋转做张嘴）---
    var jaw = pivot(head, 0, 0.35, -0.2);
    jaw.add(mk(new THREE.BoxGeometry(1.5, 0.45, 1.1), RED_D, 0, -0.32, -0.45));
    jaw.add(mk(new THREE.BoxGeometry(1.2, 0.2, 0.8), MOUTH_IN, 0, -0.08, -0.5));
    [-0.45, -0.15, 0.15, 0.45].forEach(function (tx) {
      jaw.add(mk(coneGeo(0.12, 0.36), TOOTH, tx, -0.12, -0.85));
    });

    // 超大火球发射点：嘴巴前端偏上，朝 -Z
    var mouth = anchor(head, 0, 0.55, -1.5);

    g.userData.parts = {
      head: head, jaw: jaw, mouth: mouth,
      armL: armL, armR: armR,
      eyeL: eyeL, eyeR: eyeR,
      core: core, body: body
    };
    return g;
  }

  // ================================================================
  // 4) 宝物 relic  总高约 1.2
  // ================================================================
  function relic() {
    var g = new THREE.Group();

    var GOLD = lam(0xffd24a, 0x7a5200);
    var CYAN = glowMat(0x38f5e0);
    var CYAN_SOFT = glowMat(0x4ff7ff, 0.25);
    var CY = 0.6; // 水晶中心高度

    // --- 水晶（主逻辑让它自转）---
    var crystal = new THREE.Group();
    crystal.position.set(0, CY, 0);
    g.add(crystal);
    var top = mk(coneGeo(0.26, 0.6), GOLD, 0, 0.3, 0);          // 上半锥
    var bot = mk(coneGeo(0.26, 0.42), GOLD, 0, -0.21, 0);       // 下半锥
    bot.rotation.x = Math.PI;
    crystal.add(top); crystal.add(bot);
    crystal.add(mk(new THREE.IcosahedronGeometry(0.15, 0), CYAN, 0, 0.02, 0)); // 内核
    // 环绕的小碎晶
    [0, 1, 2].forEach(function (i) {
      var a = i * Math.PI * 2 / 3;
      crystal.add(mk(new THREE.IcosahedronGeometry(0.07, 0), GOLD,
        Math.cos(a) * 0.34, 0.05, Math.sin(a) * 0.34));
    });

    // --- 光环（主逻辑让它转）---
    var ring = new THREE.Group();
    ring.position.set(0, CY, 0);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
    ring.add(mk(new THREE.TorusGeometry(0.52, 0.045, 6, 20), CYAN, 0, 0, 0));
    [0, 1, 2, 3].forEach(function (i) {
      var a = i * Math.PI / 2;
      ring.add(mk(new THREE.BoxGeometry(0.1, 0.1, 0.1), GOLD,
        Math.cos(a) * 0.52, Math.sin(a) * 0.52, 0));
    });
    // 第二圈斜环
    var ring2 = mk(new THREE.TorusGeometry(0.4, 0.03, 6, 18), CYAN_SOFT, 0, 0, 0);
    ring2.rotation.y = 0.9;
    ring.add(ring2);

    // --- 外层光晕（主逻辑呼吸缩放）---
    var glow = mk(sphereGeo(0.42), CYAN_SOFT, 0, CY, 0);
    g.add(glow);

    // 底座光圈，让它看起来是漂浮的
    var base = mk(new THREE.TorusGeometry(0.22, 0.03, 6, 14), CYAN, 0, 0.04, 0);
    base.rotation.x = Math.PI / 2;
    g.add(base);

    g.userData.parts = { crystal: crystal, ring: ring, glow: glow };
    return g;
  }

  // ---------- 挂载（合并，不覆盖别的模块）----------
  window.ART = window.ART || {};
  Object.assign(window.ART, { hero: hero, grunt: grunt, boss: boss, relic: relic });
})();
