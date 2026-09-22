// fx.js —— 粒子/特效模块
// 挂载 window.FX，自己管理所有特效对象的生命周期（新增/推进/淡出/销毁）
// 依赖：全局 THREE（three.js r160），不加载任何外部资源

(function () {
  'use strict';

  var scene = null;   // FX.init 记住的场景
  var list = [];       // 当前存活的特效条目 {obj, life, age, kind, data}
  var MAX_EFFECTS = 120; // 同时存在的特效对象上限

  // 颜色缺省兜底
  function normColor(c) {
    return (c === undefined || c === null) ? 0xffffff : c;
  }

  // 生成一个随机方向的单位向量（略微偏上，炸开更好看）
  function randDir() {
    var v = new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    );
    if (v.lengthSq() < 1e-6) {
      v.set(0, 1, 0);
    }
    v.y += 0.3;
    v.normalize();
    return v;
  }

  // 递归释放一个 Object3D（含子物体）的几何体和材质
  function disposeObj(obj) {
    if (!obj) { return; }
    if (obj.children && obj.children.length) {
      for (var i = 0; i < obj.children.length; i++) {
        disposeObj(obj.children[i]);
      }
    }
    if (obj.geometry && obj.geometry.dispose) {
      obj.geometry.dispose();
    }
    if (obj.material) {
      if (Array.isArray(obj.material)) {
        for (var j = 0; j < obj.material.length; j++) {
          if (obj.material[j] && obj.material[j].dispose) {
            obj.material[j].dispose();
          }
        }
      } else if (obj.material.dispose) {
        obj.material.dispose();
      }
    }
  }

  // 从 list 里移除下标为 idx 的条目：移出场景 + 释放资源
  function removeAt(idx) {
    var e = list[idx];
    if (!e) { return; }
    if (scene && e.obj) {
      try { scene.remove(e.obj); } catch (ex) { /* 忽略 */ }
    }
    disposeObj(e.obj);
    list.splice(idx, 1);
  }

  // 新增一个特效条目，超过上限就先删最老的
  function pushEntry(entry) {
    list.push(entry);
    while (list.length > MAX_EFFECTS) {
      removeAt(0);
    }
  }

  // 按种类推进单个特效一帧
  function advanceEffect(it, t, dt) {
    var obj = it.obj;
    var data = it.data;

    switch (it.kind) {
      case 'burst': {
        var posAttr = obj.geometry.getAttribute('position');
        var arr = posAttr.array;
        var vel = data.velocities;
        var g = data.gravity;
        for (var k = 0; k < arr.length; k += 3) {
          arr[k] += vel[k] * dt;
          arr[k + 1] += vel[k + 1] * dt;
          arr[k + 2] += vel[k + 2] * dt;
          vel[k + 1] += g * dt;
        }
        posAttr.needsUpdate = true;
        obj.material.opacity = Math.max(0, 1 - t);
        break;
      }
      case 'ring': {
        var s = Math.max(0.001, t);
        obj.scale.set(s, s, s);
        obj.material.opacity = 0.9 * (1 - t);
        break;
      }
      case 'sphereWave': {
        var s2 = Math.max(0.01, t);
        obj.scale.set(s2, s2, s2);
        obj.material.opacity = 0.8 * (1 - t);
        break;
      }
      case 'puff': {
        var s3 = 0.2 + t * 1.2;
        obj.scale.set(s3, s3, s3);
        obj.material.opacity = 0.6 * (1 - t);
        break;
      }
      case 'freeze': {
        var pAttr = data.points.geometry.getAttribute('position');
        var arr2 = pAttr.array;
        var vel2 = data.velocities;
        for (var m = 0; m < arr2.length; m += 3) {
          arr2[m] += vel2[m] * dt;
          arr2[m + 1] += vel2[m + 1] * dt;
          arr2[m + 2] += vel2[m + 2] * dt;
        }
        pAttr.needsUpdate = true;
        data.points.material.opacity = Math.max(0, 0.9 * (1 - t));
        for (var c = 0; c < data.crystals.length; c++) {
          var cr = data.crystals[c];
          cr.mesh.rotation.x += cr.spin.x * dt;
          cr.mesh.rotation.y += cr.spin.y * dt;
          cr.mesh.material.opacity = Math.max(0, 0.9 * (1 - t));
        }
        break;
      }
      case 'beam': {
        obj.material.opacity = Math.max(0, 1 - t);
        var sb = 1 - t * 0.4;
        obj.scale.set(sb, 1, sb);
        break;
      }
      case 'smoke': {
        obj.position.y += 0.6 * dt;
        var s4 = 1 + t * 0.6;
        obj.scale.set(s4, s4, s4);
        obj.material.opacity = Math.max(0, 0.5 * (1 - t));
        break;
      }
      default:
        break;
    }
  }

  var FX = {};

  // 记住场景引用
  FX.init = function (s) {
    try {
      scene = s || null;
    } catch (e) { /* 忽略 */ }
  };

  // 爆炸粒子：向四面八方炸开，带重力下落和淡出
  FX.burst = function (pos, color, count, speed, life) {
    try {
      if (!scene || !pos) { return; }
      color = normColor(color);
      count = Math.floor(count || 18);
      if (count < 1) { count = 1; }
      if (count > 40) { count = 40; }
      speed = speed || 8;
      life = life || 0.7;

      var positions = new Float32Array(count * 3);
      var velocities = new Float32Array(count * 3);
      for (var i = 0; i < count; i++) {
        var idx = i * 3;
        positions[idx] = pos.x;
        positions[idx + 1] = pos.y;
        positions[idx + 2] = pos.z;
        var dir = randDir();
        var sp = speed * (0.5 + Math.random() * 0.7);
        velocities[idx] = dir.x * sp;
        velocities[idx + 1] = dir.y * sp;
        velocities[idx + 2] = dir.z * sp;
      }

      var geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      var material = new THREE.PointsMaterial({
        color: color,
        size: 0.35,
        transparent: true,
        opacity: 1,
        depthWrite: false,
        sizeAttenuation: true
      });
      var points = new THREE.Points(geometry, material);
      scene.add(points);

      pushEntry({
        obj: points, life: life, age: 0, kind: 'burst',
        data: { velocities: velocities, gravity: -9 }
      });
    } catch (e) { /* 绝不抛异常打断主循环 */ }
  };

  // 地面冲击波：水平圆环从 0 扩大到 toRadius 并淡出
  FX.ring = function (pos, color, toRadius, life) {
    try {
      if (!scene || !pos) { return; }
      color = normColor(color);
      toRadius = toRadius || 3;
      life = life || 0.5;

      var geometry = new THREE.TorusGeometry(toRadius, Math.max(0.05, toRadius * 0.06), 8, 28);
      var material = new THREE.MeshBasicMaterial({
        color: color, transparent: true, opacity: 0.9,
        depthWrite: false, side: THREE.DoubleSide
      });
      var mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(pos.x, pos.y, pos.z);
      mesh.rotation.x = Math.PI / 2; // 摆平，水平圆环
      mesh.scale.set(0.001, 0.001, 0.001);
      scene.add(mesh);

      pushEntry({ obj: mesh, life: life, age: 0, kind: 'ring', data: {} });
    } catch (e) { /* 忽略 */ }
  };

  // 球形冲击波：线框球从小到大并淡出（Boss 放大招用）
  FX.sphereWave = function (pos, color, toRadius, life) {
    try {
      if (!scene || !pos) { return; }
      color = normColor(color);
      toRadius = toRadius || 4;
      life = life || 0.6;

      var geometry = new THREE.SphereGeometry(toRadius, 14, 10);
      var material = new THREE.MeshBasicMaterial({
        color: color, wireframe: true, transparent: true,
        opacity: 0.8, depthWrite: false
      });
      var mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(pos.x, pos.y, pos.z);
      mesh.scale.set(0.01, 0.01, 0.01);
      scene.add(mesh);

      pushEntry({ obj: mesh, life: life, age: 0, kind: 'sphereWave', data: {} });
    } catch (e) { /* 忽略 */ }
  };

  // 小的半透明球，快速膨胀淡出（子弹拖尾/尘土用）
  FX.puff = function (pos, color, size, life) {
    try {
      if (!scene || !pos) { return; }
      color = normColor(color);
      size = size || 1;
      life = life || 0.4;

      var geometry = new THREE.SphereGeometry(Math.max(0.05, size * 0.5), 8, 6);
      var material = new THREE.MeshBasicMaterial({
        color: color, transparent: true, opacity: 0.6, depthWrite: false
      });
      var mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(pos.x, pos.y, pos.z);
      mesh.scale.set(0.2, 0.2, 0.2);
      scene.add(mesh);

      pushEntry({ obj: mesh, life: life, age: 0, kind: 'puff', data: {} });
    } catch (e) { /* 忽略 */ }
  };

  // 冰冻特效：淡蓝白粒子 + 几片旋转冰晶，0.8 秒消散
  FX.freezeCloud = function (pos) {
    try {
      if (!scene || !pos) { return; }
      var life = 0.8;

      var group = new THREE.Group();
      group.position.set(pos.x, pos.y, pos.z);

      // 淡蓝白粒子
      var count = 14;
      var positions = new Float32Array(count * 3);
      var velocities = new Float32Array(count * 3);
      for (var i = 0; i < count; i++) {
        var idx = i * 3;
        positions[idx] = (Math.random() - 0.5) * 0.3;
        positions[idx + 1] = (Math.random() - 0.5) * 0.3;
        positions[idx + 2] = (Math.random() - 0.5) * 0.3;
        var dir = randDir();
        var sp = 1.5 + Math.random() * 1.5;
        velocities[idx] = dir.x * sp;
        velocities[idx + 1] = dir.y * sp * 0.6 + 0.5;
        velocities[idx + 2] = dir.z * sp;
      }
      var pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      var pMat = new THREE.PointsMaterial({
        color: 0xd8f6ff, size: 0.28, transparent: true,
        opacity: 0.9, depthWrite: false, sizeAttenuation: true
      });
      var points = new THREE.Points(pGeo, pMat);
      group.add(points);

      // 几片旋转的小冰晶（用低多面体代替八面体外观）
      var crystals = [];
      var crystalCount = 4;
      for (var c = 0; c < crystalCount; c++) {
        var cg = new THREE.IcosahedronGeometry(0.16, 0);
        var cm = new THREE.MeshLambertMaterial({
          color: 0x9fe8ff, transparent: true, opacity: 0.9, depthWrite: false
        });
        var cmesh = new THREE.Mesh(cg, cm);
        cmesh.position.set(
          (Math.random() - 0.5) * 0.6,
          (Math.random() - 0.5) * 0.6 + 0.2,
          (Math.random() - 0.5) * 0.6
        );
        cmesh.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        );
        group.add(cmesh);
        crystals.push({
          mesh: cmesh,
          spin: { x: (Math.random() - 0.5) * 4, y: (Math.random() - 0.5) * 4 }
        });
      }

      scene.add(group);

      pushEntry({
        obj: group, life: life, age: 0, kind: 'freeze',
        data: { points: points, velocities: velocities, crystals: crystals }
      });
    } catch (e) { /* 忽略 */ }
  };

  // 两点间一道发光细圆柱，快速淡出（激光轨迹用）
  FX.beam = function (from, to, color, life) {
    try {
      if (!scene || !from || !to) { return; }
      color = normColor(color);
      life = life || 0.15;

      var dx = to.x - from.x;
      var dy = to.y - from.y;
      var dz = to.z - from.z;
      var length = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (length < 0.0001) { return; }

      var geometry = new THREE.CylinderGeometry(0.05, 0.05, length, 6, 1, true);
      var material = new THREE.MeshBasicMaterial({
        color: color, transparent: true, opacity: 1, depthWrite: false
      });
      var mesh = new THREE.Mesh(geometry, material);
      mesh.position.set((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2);

      var dir = new THREE.Vector3(dx, dy, dz).normalize();
      var up = new THREE.Vector3(0, 1, 0);
      var quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
      mesh.quaternion.copy(quat);

      scene.add(mesh);

      pushEntry({ obj: mesh, life: life, age: 0, kind: 'beam', data: {} });
    } catch (e) { /* 忽略 */ }
  };

  // 单片拖尾小球，1 秒淡出并上浮
  FX.smokeTrail = function (pos, color) {
    try {
      if (!scene || !pos) { return; }
      color = normColor(color);
      var life = 1.0;

      var geometry = new THREE.SphereGeometry(0.3, 8, 6);
      var material = new THREE.MeshBasicMaterial({
        color: color, transparent: true, opacity: 0.5, depthWrite: false
      });
      var mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(pos.x, pos.y, pos.z);
      scene.add(mesh);

      pushEntry({ obj: mesh, life: life, age: 0, kind: 'smoke', data: {} });
    } catch (e) { /* 忽略 */ }
  };

  // 每帧推进所有特效，过期的自动移除
  FX.update = function (dt) {
    try {
      if (!list.length) { return; }
      if (typeof dt !== 'number' || !isFinite(dt) || dt < 0) { dt = 0.016; }
      for (var i = list.length - 1; i >= 0; i--) {
        var it = list[i];
        it.age += dt;
        var life = it.life > 0 ? it.life : 0.0001;
        var t = it.age / life;
        if (t > 1) { t = 1; }
        advanceEffect(it, t, dt);
        if (it.age >= it.life) {
          removeAt(i);
        }
      }
    } catch (e) { /* 绝不抛异常打断主循环 */ }
  };

  // 清掉所有正在播放的特效（切关卡用）
  FX.clear = function () {
    try {
      for (var i = list.length - 1; i >= 0; i--) {
        removeAt(i);
      }
      list.length = 0;
    } catch (e) { /* 忽略 */ }
  };

  window.FX = FX;
})();
