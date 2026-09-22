/* =========================================================================
   星海救援 —— Kehan 的太空冒险
   第三人称 3D 太空冒险：母舰航行 → 穿梭机降落 → 星球地表激战 → 夺回宝物

   依赖（都是全局变量，按 index.html 的顺序加载）：
     THREE  vendor/three.min.js (r160)
     ART    src/art-chars.js + src/art-world.js   造型
     UI     src/ui.js                             界面
     SFX    src/audio.js                          音效
     FX     src/fx.js                             粒子特效

   想调难度？只改下面这一坨 CFG 就够了。
   ========================================================================= */
(function () {
'use strict';

// ------------------------------------------------------------------ 旋钮
var CFG = {
  // ---- 玩家（地表）----
  HP          : 100,
  MOVE        : 11,      // 跑速
  BACK        : 9.5,     // 后退速度（比跑慢，逼你面对怪）
  TURN        : 2.6,     // A/D 转身速度（弧度/秒）
  JUMP        : 11,      // 起跳初速
  GRAV        : 30,      // 重力
  IFRAME      : 0.85,    // 受伤后无敌时间

  // ---- 枪 ----
  BULLET_CD   : 0.17,
  BULLET_SPD  : 55,
  BULLET_DMG  : 12,
  BULLET_LIFE : 1.6,
  AIM_ASSIST  : 0.36,    // 自动瞄准的角度容差(弧度)，小孩友好

  // ---- 冰系魔法 ----
  ICE_MAX     : 100,
  ICE_COST    : 25,
  ICE_REGEN   : 14,      // 每秒回复
  ICE_CD      : 0.5,
  ICE_RANGE   : 26,      // 冰波射程
  ICE_ANGLE   : 0.85,    // 冰波半角(弧度) —— 很宽，好命中
  ICE_SLOW    : 2.4,     // 怪物被冻住不能动的秒数

  // ---- 普通怪物 ----
  GRUNT_HP    : 40,
  GRUNT_SPD   : 4.2,
  GRUNT_CD    : 2.4,     // 吐火球间隔
  GRUNT_RANGE : 34,      // 进入这个距离就开始吐火球
  GRUNT_KEEP  : 13,      // 想和玩家保持的距离
  FIRE_SPD    : 17,
  FIRE_DMG    : 12,

  // ---- Boss ----
  BOSS_HP     : 600,
  BOSS_SPD    : 3.4,
  BOSS_CD     : 3.2,
  BOSS_TELE   : 1.5,     // 超大火球的预警时间（够你反应）
  BIG_SPD     : 13,
  BIG_DMG     : 34,
  BIG_R       : 2.6,     // 超大火球的半径
  SLAM_R      : 12,      // 砸地冲击波半径
  SLAM_DMG    : 18,

  // ---- 关卡 ----
  WAVE1       : 4,       // 第一波小怪
  WAVE2       : 4,       // 第二波小怪
  SHIP_HP     : 100,
  VOYAGE_GOAL : 1400,    // 母舰要飞的航程
  DESCENT_GOAL: 900      // 穿梭机要飞的航程
};

// ------------------------------------------------------------------ 网址开关（?ff=2 加速、?skip=planet 直接进地表，给 QA 用）
var Q = {};
location.search.replace(/^\?/, '').split('&').forEach(function (kv) {
  if (!kv) return; var p = kv.split('='); Q[p[0]] = decodeURIComponent(p[1] || '1');
});
var FF = Math.max(1, Math.min(8, parseFloat(Q.ff) || 1));   // 快进倍率（headless 截图 QA 用）

// ------------------------------------------------------------------ 模块兜底：任何一个模块没加载出来，游戏也不许崩
function noop() {}
function ensure(obj, names, maker) {
  obj = obj || {};
  for (var i = 0; i < names.length; i++) if (typeof obj[names[i]] !== 'function') obj[names[i]] = maker ? maker(names[i]) : noop;
  return obj;
}
var ART = window.ART || {};
var UI  = ensure(window.UI, ['init','setHP','setIce','setBossHP','hideBossHP','setObjective','setStage',
                             'toast','setHint','hitFlash','iceFlash','setCrosshair','showCard','hideCard',
                             'setLoading','setBullets','setTouch']);
var SFX = ensure(window.SFX, ['init','play','setMuted','isMuted','startEngine','stopEngine','setEngine','music']);
var FX  = ensure(window.FX,  ['init','burst','ring','sphereWave','puff','freezeCloud','beam','smokeTrail','update','clear']);

// 造型兜底：ART 少了哪个函数，就拿一个丑但能用的方块顶上，保证流程跑得通
function stub(color, w, h, d) {
  return function () {
    var g = new THREE.Group();
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: color }));
    m.position.y = h / 2; m.castShadow = true; g.add(m);
    g.userData.parts = { head: m, torso: m, body: m, mouth: m, crystal: m, ring: m, glow: m };
    return g;
  };
}
var ART_STUB = {
  hero: stub(0xdddddd, .9, 1.8, .6), grunt: stub(0xb54cd8, 1.2, 2.2, 1),
  boss: stub(0xc03020, 5, 9, 4), relic: stub(0xffd54a, .8, 1.2, .8),
  mothership: stub(0xc9d6e8, 6, 2, 14), shuttle: stub(0xffa040, 3, 1.2, 5),
  asteroid: stub(0x8a7f74, 3, 3, 3), starfield: function () { return new THREE.Group(); },
  planetInSky: function () { return new THREE.Group(); }, safeGate: stub(0x34d3a0, 22, 22, 2),
  planetTerrain: function () {
    var g = new THREE.Group();
    var f = new THREE.Mesh(new THREE.CircleGeometry(95, 48), new THREE.MeshLambertMaterial({ color: 0x4a2233 }));
    f.rotation.x = -Math.PI / 2; f.receiveShadow = true; g.add(f); return g;
  }
};
function art(name) {
  var f = (typeof ART[name] === 'function') ? ART[name] : ART_STUB[name];
  var a = Array.prototype.slice.call(arguments, 1);
  var o;
  try { o = f.apply(null, a); } catch (e) { console.warn('ART.' + name + ' 造型出错，用替身：', e); o = ART_STUB[name].apply(null, a); }
  if (!o || !o.isObject3D) o = ART_STUB[name].apply(null, a);
  if (!o.userData.parts) o.userData.parts = {};
  return o;
}

// ------------------------------------------------------------------ 小工具
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function rand(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
function $(id) { return document.getElementById(id); }
function dist2(a, b) { var dx = a.x - b.x, dz = a.z - b.z; return Math.sqrt(dx * dx + dz * dz); }
function angleTo(fromYaw, dx, dz) {          // 目标方向与当前朝向的夹角
  var want = Math.atan2(-dx, -dz);           // 模型面朝 -Z，所以这么算
  var d = want - fromYaw;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
function tint(obj, color) {                  // 把一棵子树染色（受击闪红用）
  obj.traverse(function (o) {
    if (!o.isMesh || !o.material || o.material.__noTint) return;
    if (!o.userData.__c0) o.userData.__c0 = o.material.color ? o.material.color.getHex() : 0xffffff;
    if (o.material.color) o.material.color.setHex(color);
  });
}
function untint(obj) {
  obj.traverse(function (o) {
    if (o.isMesh && o.material && o.material.color && o.userData.__c0 != null) o.material.color.setHex(o.userData.__c0);
  });
}
function disposeTree(root) {
  root.traverse(function (o) {
    if (o.geometry) o.geometry.dispose();
    if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { m.dispose(); }); }
  });
}

// ------------------------------------------------------------------ 渲染
var renderer, scene, camera, world, hemi, sun;
var W = 1, H = 1;

function initRender() {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, navigator.maxTouchPoints>0?1.25:1.8));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  $('app').appendChild(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
  scene.add(camera);

  hemi = new THREE.HemisphereLight(0x9fc4ff, 0x301828, 1.0); scene.add(hemi);
  sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(30, 60, 20); sun.castShadow = true;
  sun.shadow.mapSize.set(navigator.maxTouchPoints>0?512:1024,navigator.maxTouchPoints>0?512:1024);
  var c = sun.shadow.camera;
  c.left = -60; c.right = 60; c.top = 60; c.bottom = -60; c.near = 1; c.far = 220;
  scene.add(sun); scene.add(sun.target);

  world = new THREE.Group(); scene.add(world);
  FX.init(scene);
  resize(); addEventListener('resize', resize);
}
function resize() {
  W = window.visualViewport?visualViewport.width:innerWidth; H = window.visualViewport?visualViewport.height:innerHeight;
  camera.aspect = W / H; camera.updateProjectionMatrix();
  renderer.setSize(W, H);
}
function clearWorld() {
  FX.clear();
  while (world.children.length) { var o = world.children[0]; world.remove(o); disposeTree(o); }
}

// ------------------------------------------------------------------ 输入
var keys = {}, mouse = { fire: false, ice: false, dx: 0 };
var stick = { on: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };
var look = { on: false, id: null, lx: 0, dx: 0 };
var touchBtn = { fire: false, ice: false, jump: false };
var jumpEdge = false, isTouch = false;

function clearInputs(){keys={};mouse.fire=mouse.ice=false;mouse.dx=0;look.on=false;look.dx=0;stick.on=false;stick.id=null;stick.x=stick.y=0;touchBtn.fire=touchBtn.ice=touchBtn.jump=false;jumpEdge=false;var nub=$('stickNub');if(nub)nub.style.transform='translate(-50%,-50%)';}
function initInput(){
 isTouch=navigator.maxTouchPoints>0||matchMedia('(pointer:coarse)').matches;UI.setTouch(isTouch);
 addEventListener('keydown',function(e){if(e.target.closest('input,textarea,select'))return;if(e.repeat)return;keys[e.code]=true;if(e.code==='Space'){jumpEdge=true;e.preventDefault();}if(e.code==='Escape')setPaused(!PAUSED);if(e.code==='KeyM')SFX.setMuted(!SFX.isMuted());});
 addEventListener('keyup',function(e){keys[e.code]=false;});
 addEventListener('blur',function(){clearInputs();if(!['title','over'].includes(MODE))setPaused(true);});
 document.addEventListener('visibilitychange',function(){if(document.hidden){clearInputs();if(!['title','over'].includes(MODE))setPaused(true);}});
 var zone=$('stickZone');var el=$('stick');if(el){el.classList.add('on');el.style.left='50%';el.style.top='50%';}
 function move(e){if(!stick.on||e.pointerId!==stick.id)return;var r=zone.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,R=52,len=Math.max(1,Math.hypot(dx,dy)/R);dx/=len;dy/=len;stick.x=Math.abs(dx)<5?0:dx/R;stick.y=Math.abs(dy)<5?0:-dy/R;$('stickNub').style.transform='translate(-50%,-50%) translate('+dx+'px,'+dy+'px)';}
 zone.onpointerdown=function(e){if(stick.on)return;e.preventDefault();stick.on=true;stick.id=e.pointerId;zone.setPointerCapture(e.pointerId);move(e);};zone.onpointermove=move;
 zone.onpointerup=zone.onpointercancel=zone.onlostpointercapture=function(e){if(e.pointerId===stick.id){stick.on=false;stick.id=null;stick.x=stick.y=0;$('stickNub').style.transform='translate(-50%,-50%)';}};
 var cv=renderer.domElement;cv.onpointerdown=function(e){if(look.on)return;look.on=true;look.id=e.pointerId;look.lx=e.clientX;cv.setPointerCapture(e.pointerId);if(e.pointerType==='mouse'&&e.button===0)mouse.fire=true;};cv.onpointermove=function(e){if(look.on&&e.pointerId===look.id){look.dx+=(e.clientX-look.lx)*1.35;look.lx=e.clientX;}};cv.onpointerup=cv.onpointercancel=cv.onlostpointercapture=function(e){if(e.pointerId===look.id){look.on=false;look.dx=0;mouse.fire=false;}};cv.oncontextmenu=function(e){e.preventDefault();};
 bindBtn('btnFire',function(v){touchBtn.fire=v;});bindBtn('btnIce',function(v){touchBtn.ice=v;});bindBtn('btnJump',function(v){touchBtn.jump=v;if(v)jumpEdge=true;});
}
function bindBtn(id,set){var b=$(id),pointer=null;if(!b)return;b.onpointerdown=function(e){if(pointer!==null)return;e.preventDefault();e.stopPropagation();pointer=e.pointerId;b.setPointerCapture(e.pointerId);set(true);SFX.init();};b.onpointerup=b.onpointercancel=b.onlostpointercapture=function(e){if(e.pointerId===pointer){pointer=null;set(false);}};}
function k() { for (var i = 0; i < arguments.length; i++) if (keys[arguments[i]]) return true; return false; }

// 读取移动输入：返回 {fwd:-1..1, strafe:-1..1, turn:-1..1}
function readMove(){var fwd=(k('KeyW','ArrowUp')?1:0)-(k('KeyS','ArrowDown')?1:0),strafe=(k('KeyD','ArrowRight')?1:0)-(k('KeyA','ArrowLeft')?1:0),turn=(k('KeyQ')?1:0)-(k('KeyE')?1:0);if(stick.on){fwd+=stick.y;strafe+=stick.x;}var n=Math.max(1,Math.hypot(fwd,strafe));return {fwd:fwd/n,strafe:strafe/n,turn:turn};}
function wantFire() { return mouse.fire || touchBtn.fire || k('KeyJ', 'Enter'); }
function wantIce()  { return mouse.ice  || touchBtn.ice  || k('KeyK', 'ShiftLeft', 'ShiftRight', 'KeyF'); }
function takeJump() {
  var j = jumpEdge || k('Space'); jumpEdge = false; return j;
}

// ==================================================================
//  关卡总控
// ==================================================================
var MODE = 'title'; var PAUSED=false; var checkpoint='voyage';
function setPaused(v){if(['title','over'].includes(MODE))return;PAUSED=!!v;clearInputs();if(!PAUSED){lastT=performance.now();SFX.init();}}     // title | voyage | descent | planet | over
var timeNow = 0;

function setMode(m) { MODE = m; PAUSED=false; clearInputs(); }

// ------------------------------------------------------------------ 标题
function showTitle() {
  setMode('title');
  clearWorld();
  scene.background = new THREE.Color(0x05060f);
  scene.fog = null;
  UI.hideBossHP(); UI.setCrosshair(false); UI.setHint('');
  UI.setStage('星海救援'); UI.setObjective('');

  world.add(art('starfield'));
  var p1 = art('planetInSky', 46, 0x3f7ae0, 0xd8b06a); p1.position.set(-70, 10, -170); world.add(p1);
  var p2 = art('planetInSky', 22, 0xd06a4a, 0x8899aa); p2.position.set(90, -20, -240); world.add(p2);
  var ship = art('mothership'); ship.position.set(4, -3, -26); ship.rotation.y = 0.5; world.add(ship);
  titleShip = ship;
  camera.position.set(0, 0, 0); camera.lookAt(0, -2, -30);

  UI.showCard({
    title: '星 海 救 援',
    sub: '你是保护地球的太空探险家',
    cls: '',
    lines: [
      '🌍 地球快撑不住了，唯一的希望是怪物星球上的<b>能量宝物</b>',
      '🚀 先开<b>大飞船</b>穿过小行星带，抵达安全区',
      '🛸 再换<b>小飞船</b>降落到怪物星球',
      '🔫 用<b>枪</b>打怪，用<b>冰系魔法</b>冻住飞来的火球',
      '👹 最后干掉<b>超大 Boss</b>，抢回宝物 —— 地球就得救了！'
    ],
    btn: '出 发 ！'
  });
}
var titleShip = null;

// ==================================================================
//  第一/二关：飞船航行（母舰穿越小行星带 → 穿梭机降落）
// ==================================================================
var FL = null;   // 飞行关的全部状态

function startFlight(kind) {
  checkpoint=kind;
  setMode(kind);
  clearWorld();
  UI.hideCard(); UI.hideBossHP(); UI.setCrosshair(false);

  var isVoyage = (kind === 'voyage');
  scene.background = new THREE.Color(isVoyage ? 0x05060f : 0x1a0a1e);
  scene.fog = isVoyage ? null : new THREE.FogExp2(0x2a0e22, 0.0026);
  hemi.color.setHex(isVoyage ? 0x9fc4ff : 0xffb090);
  hemi.intensity = 1.1;
  sun.intensity = 1.2;

  var ship = art(isVoyage ? 'mothership' : 'shuttle');
  world.add(ship);
  world.add(art('starfield'));

  if (isVoyage) {
    var pa = art('planetInSky', 52, 0x3f7ae0, 0xd8b06a); pa.position.set(-120, 30, -420); world.add(pa);
    var pb = art('planetInSky', 30, 0x6ad0b0, 0x88aacc); pb.position.set(150, -40, -560); world.add(pb);
  } else {
    // 降落关：脚下就是那颗怪物星球，越飞越近
    var target = art('planetInSky', 320, 0x8a2f3a, 0xff7a3a);
    target.position.set(0, -360, -260); world.add(target);
    FLplanet = target;
  }

  FL = {
    kind: kind, ship: ship, hp: CFG.SHIP_HP, dist: 0,
    goal: isVoyage ? CFG.VOYAGE_GOAL : CFG.DESCENT_GOAL,
    speed: isVoyage ? 62 : 82,
    x: 0, y: 0, vx: 0, vy: 0, roll: 0, pitch: 0,
    rocks: [], rings: [], gate: null, gatePassed: false,
    iframe: 0, spawnT: 0, ended: false, endT: 0
  };

  UI.setStage(isVoyage ? '第 1 关 · 星海航行' : '第 2 关 · 降落怪物星球');
  UI.setObjective(isVoyage ? '🚀 穿过小行星带，飞到安全区传送门' : '🛸 冲下去！躲开陨石，安全着陆');
  UI.setHP(FL.hp, CFG.SHIP_HP); UI.setIce(CFG.ICE_MAX, CFG.ICE_MAX);
  UI.setHint(isTouch
    ? '左下<b>摇杆</b>操控飞船 · 别撞石头'
    : '<b>W A S D</b> / <b>方向键</b> 操控飞船 · 别撞上石头');
  SFX.play('warp'); SFX.startEngine();
}
var FLplanet = null;

function spawnRock() {
  var r = art('asteroid');
  var s = rand(0.7, 2.0);
  r.scale.setScalar(s);
  r.position.set(rand(-34, 34), rand(-20, 20), -300);
  r.userData.rr = 3.0 * s;                       // 碰撞半径
  r.userData.spin = new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1));
  world.add(r); FL.rocks.push(r);
}
function spawnGate() {
  var g = art('safeGate');
  g.position.set(0, 0, -320);
  world.add(g); FL.gate = g;
  UI.setObjective('✨ 安全区就在正前方 —— 对准圆环穿过去！');
  UI.toast('安全区出现了！对准中间飞过去', 2600);
}

function updateFlight(dt) {
  var f = FL, mv = readMove();if(f.transitionLeft!=null){f.transitionLeft-=dt;if(f.transitionLeft<=0)startFlight('descent');return;}
  var accel = 46, maxv = 26;

  // ---- 左右上下 ----
  var horizontal=stick.on?stick.x:(k('KeyD','ArrowRight')?1:0)-(k('KeyA','ArrowLeft')?1:0);
  f.vx += horizontal*accel*dt;
  f.vy += mv.fwd*accel*.85*dt;
  f.vx *= Math.pow(0.02, dt); f.vy *= Math.pow(0.02, dt);
  f.vx = clamp(f.vx, -maxv, maxv); f.vy = clamp(f.vy, -maxv, maxv);
  f.x = clamp(f.x + f.vx * dt, -32, 32);
  f.y = clamp(f.y + f.vy * dt, -17, 17);

  f.roll  += (clamp(-f.vx / maxv, -1, 1) * 0.55 - f.roll) * Math.min(1, dt * 6);
  f.pitch += (clamp(-f.vy / maxv, -1, 1) * 0.28 - f.pitch) * Math.min(1, dt * 6);
  f.ship.position.set(f.x, f.y, 0);
  f.ship.rotation.set(f.pitch, 0, f.roll);

  // 引擎尾焰跳动
  var pts = f.ship.userData.parts || {};
  var pulse = 1 + Math.sin(timeNow * 26) * 0.16;
  if (pts.engineL) pts.engineL.scale.z = pulse;
  if (pts.engineR) pts.engineR.scale.z = pulse;
  if (pts.glow && pts.glow.material) pts.glow.material.opacity = 0.65 + Math.sin(timeNow * 8) * 0.2;
  SFX.setEngine(0.6 + Math.abs(f.vx) / maxv * 0.4);

  // ---- 航程推进 ----
  if (!f.ended) f.dist += f.speed * dt;

  // ---- 石头 ----
  f.spawnT -= dt;
  var rate = (f.kind === 'voyage') ? 0.30 : 0.22;
  if (!f.ended && f.spawnT <= 0 && f.dist < f.goal) { f.spawnT = rate * rand(0.6, 1.5); spawnRock(); }

  for (var i = f.rocks.length - 1; i >= 0; i--) {
    var r = f.rocks[i];
    r.position.z += f.speed * dt;
    r.rotation.x += r.userData.spin.x * dt; r.rotation.y += r.userData.spin.y * dt;
    if (r.position.z > 26) { world.remove(r); disposeTree(r); f.rocks.splice(i, 1); continue; }
    // 碰撞（飞船在 z=0 附近，半径按机型给）
    if (Math.abs(r.position.z) < 4 && f.iframe <= 0) {
      var dx = r.position.x - f.x, dy = r.position.y - f.y;
      var hitR = r.userData.rr + (f.kind === 'voyage' ? 4.2 : 2.4);
      if (dx * dx + dy * dy < hitR * hitR) {
        f.hp -= 22; f.iframe = 1.0;
        UI.setHP(Math.max(0, f.hp), CFG.SHIP_HP); UI.hitFlash();
        SFX.play('explode'); FX.burst(r.position.clone(), 0xffa040, 22, 11, .7);
        world.remove(r); disposeTree(r); f.rocks.splice(i, 1);
        if (f.hp <= 0 && !f.ended) { f.ended = true; f.endT = 1.2; }
      }
    }
  }
  if (f.iframe > 0) {
    f.iframe -= dt;
    f.ship.visible = (Math.sin(timeNow * 40) > -0.3);
    if (f.iframe <= 0) f.ship.visible = true;
  }

  // ---- 终点 ----
  if (f.kind === 'voyage') {
    if (!f.gate && f.dist >= f.goal) spawnGate();
    if (f.gate) {
      f.gate.position.z += f.speed * dt;
      var gp = f.gate.userData.parts || {};
      if (gp.lights) gp.lights.rotation.z += dt * 1.2;
      if (gp.film && gp.film.material) gp.film.material.opacity = 0.22 + Math.sin(timeNow * 4) * 0.1;
      if (!f.gatePassed && f.gate.position.z > -2) {
        f.gatePassed = true;
        var off = Math.hypot(f.x, f.y);
        SFX.play('warp'); FX.sphereWave(new THREE.Vector3(f.x, f.y, 0), 0x66ffd0, 16, .8);
        if (off < 13) { win1(); } else { UI.toast('擦着边过去了！', 1500); win1(); }
      }
      if (f.gate.position.z > 40) { world.remove(f.gate); f.gate = null; }
    }
  } else {
    if (FLplanet) FLplanet.position.z += f.speed * dt * 0.42;
    var prog = clamp(f.dist / f.goal, 0, 1);
    if (!f.ended && prog >= 1) { f.ended = true; f.endT = 1.4; SFX.play('land'); UI.toast('着陆成功！', 1800); }
  }

  // ---- 结算延时 ----
  if (f.ended) {
    f.endT -= dt;
    if (f.endT <= 0) {
      if (f.hp <= 0) { lose(f.kind === 'voyage' ? '母舰被小行星撞毁了……' : '穿梭机在降落时解体了……'); }
      else { SFX.stopEngine(); startPlanet(); }
      return;
    }
  }

  // ---- HUD 进度 ----
  UI.setBullets(Math.round(clamp(f.dist / f.goal, 0, 1) * 100) + '%');

  // ---- 相机 ----
  var back = (f.kind === 'voyage') ? 17 : 11;
  var up = (f.kind === 'voyage') ? 4.5 : 3.2;
  camera.position.lerp(new THREE.Vector3(f.x * 0.35, f.y * 0.35 + up, back), Math.min(1, dt * 4));
  camera.lookAt(f.x * 0.6, f.y * 0.6, -18);
  sun.position.set(f.x + 30, f.y + 50, 30); sun.target.position.set(f.x, f.y, 0);
}

function win1() {
  UI.toast('🌟 进入安全区！换乘小飞船', 2200);
  SFX.stopEngine();
  FL.transitionLeft=.9;
  FL.ended = true; FL.endT = 999;   // 冻住本关逻辑，等切换
  FL.speed *= 0.3;
}

// ==================================================================
//  第三关：怪物星球地表
// ==================================================================
var P = null;              // 玩家
var foes = [], balls = [], shots = [];
var BOSS = null, relic = null;
var phase = 'wave1';       // wave1 | wave2 | boss | relic | done
var phaseT = 0;
var ARENA = 88;            // 场地半径

function startPlanet() {
  checkpoint='planet';
  setMode('planet');
  clearWorld();
  foes = []; balls = []; shots = []; BOSS = null; relic = null;
  phase = 'intro'; phaseT = 1.2;

  scene.background = new THREE.Color(0x2a0c1c);
  scene.fog = new THREE.FogExp2(0x3a0f20, 0.0072);
  hemi.color.setHex(0xff9c78); hemi.groundColor.setHex(0x3a1020); hemi.intensity = 1.15;
  sun.color.setHex(0xffd0a0); sun.intensity = 1.35;

  world.add(art('planetTerrain'));
  world.add(art('starfield'));
  var sky = art('planetInSky', 30, 0x6a3ad0, 0xaa88dd); sky.position.set(-120, 70, -180); world.add(sky);

  // ---- 玩家 ----
  var hero = art('hero');
  world.add(hero);
  // 左手（冰魔法发射点）造型模块挂在 userData 上，这里并进 parts 方便统一取用
  if (hero.userData.iceHand && !hero.userData.parts.iceHand) hero.userData.parts.iceHand = hero.userData.iceHand;
  P = {
    grp: hero, parts: hero.userData.parts || {},
    pos: new THREE.Vector3(0, 0, 52), yaw: 0,   // 站在场地南边，面朝 -Z（场地中心）
    vy: 0, onGround: true, hp: CFG.HP, ice: CFG.ICE_MAX,
    iframe: 0, fireCD: 0, iceCD: 0, walkT: 0, dead: false, kick: 0
  };
  hero.position.copy(P.pos); hero.rotation.y = P.yaw;

  camYaw = P.yaw; camPos.set(P.pos.x, 6, P.pos.z + 9);

  UI.setStage('第 3 关 · 怪物星球');
  UI.setHP(P.hp, CFG.HP); UI.setIce(P.ice, CFG.ICE_MAX);
  UI.setCrosshair(true); UI.hideBossHP();
  UI.setObjective('👹 消灭星球上的怪物');
  UI.setHint(isTouch
    ? '左摇杆移动，右侧拖动视角 · <b>射击</b> · <b>冰冻</b> · <b>跳</b>'
    : '<b>W</b> 前进 <b>S</b> 后退 <b>A/D</b> 横移 <b>Q/E</b> 转视角 <b>空格</b> 跳 · <b>鼠标左键/J</b> 射击 · <b>右键/K</b> 冰冻火球');
  UI.toast('小心！它们会吐火球，用冰魔法冻住它', 3000);
  SFX.stopEngine();
}

// ------------------------------------------------------------------ 造怪
function spawnWave(n, ringR) {
  for (var i = 0; i < n; i++) {
    var a = (i / n) * Math.PI * 2 + rand(-0.3, 0.3);
    var r = ringR + rand(-6, 6);
    var g = art('grunt');
    g.position.set(Math.cos(a) * r, 0, Math.sin(a) * r - 10);
    world.add(g);
    FX.ring(g.position.clone(), 0xd45cff, 5, .6);
    foes.push({
      grp: g, parts: g.userData.parts || {}, hp: CFG.GRUNT_HP,
      cd: rand(0.8, 2.4), frozen: 0, hitT: 0, dead: false, deadT: 0,
      walkT: rand(0, 6), yaw: 0
    });
  }
  SFX.play('roar', { vol: .5 });
}
function spawnBoss() {
  var g = art('boss');
  g.position.set(0, 0, -46);
  g.scale.setScalar(0.1);
  world.add(g);
  BOSS = {
    grp: g, parts: g.userData.parts || {}, hp: CFG.BOSS_HP,
    state: 'rise', t: 1.6, cd: 2.4, hitT: 0, frozen: 0, yaw: 0, dead: false, deadT: 0
  };
  UI.setBossHP('熔岩魔王', CFG.BOSS_HP, CFG.BOSS_HP);
  UI.setObjective('🔥 打倒熔岩魔王，抢回宝物！');
  UI.toast('⚠️ 超大 Boss 出现了！它的巨型火球要用冰魔法冻住！', 3800);
  SFX.play('roar');
  FX.ring(new THREE.Vector3(0, 0, -46), 0xff5522, 26, 1.1);
}

// ------------------------------------------------------------------ 火球 / 子弹
function makeBall(from, dir, big) {
  var r = big ? CFG.BIG_R : 0.55;
  var geo = new THREE.SphereGeometry(r, big ? 20 : 12, big ? 16 : 10);
  var m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: big ? 0xff4a10 : 0xff8a20 }));
  m.position.copy(from);
  var halo = new THREE.Mesh(new THREE.SphereGeometry(r * 1.55, 12, 10),
    new THREE.MeshBasicMaterial({ color: big ? 0xffd070 : 0xffc255, transparent: true, opacity: .35, depthWrite: false }));
  halo.material.__noTint = true; m.add(halo);
  world.add(m);
  balls.push({
    mesh: m, halo: halo, r: r, big: !!big, frozen: 0,
    vel: dir.clone().normalize().multiplyScalar(big ? CFG.BIG_SPD : CFG.FIRE_SPD),
    dmg: big ? CFG.BIG_DMG : CFG.FIRE_DMG, life: big ? 9 : 6
  });
  SFX.play(big ? 'bigfire' : 'fireball');
  return m;
}
function killBall(b, idx, frozenBreak) {
  FX.burst(b.mesh.position.clone(), frozenBreak ? 0x9fe8ff : 0xff7a20, b.big ? 30 : 14, b.big ? 12 : 8, .7);
  if (b.big) FX.sphereWave(b.mesh.position.clone(), frozenBreak ? 0xaaf0ff : 0xff6020, 7, .5);
  world.remove(b.mesh); disposeTree(b.mesh);
  balls.splice(idx, 1);
}
function shoot() {
  var f = forward(P.yaw);
  var from;
  if (P.parts.muzzle && P.parts.muzzle.getWorldPosition) {
    from = P.parts.muzzle.getWorldPosition(new THREE.Vector3());
  } else {
    from = P.pos.clone().add(new THREE.Vector3(0, 1.3, 0)).add(f.clone().multiplyScalar(0.8));
  }
  // 轻度自动瞄准：正前方一定角度内有怪就吸过去（小孩友好）
  var dir = f.clone();
  var best = null, bestA = CFG.AIM_ASSIST;
  var list = foes.concat(BOSS && !BOSS.dead ? [BOSS] : []);
  for (var i = 0; i < list.length; i++) {
    var e = list[i]; if (e.dead) continue;
    var dx = e.grp.position.x - P.pos.x, dz = e.grp.position.z - P.pos.z;
    var d = Math.hypot(dx, dz); if (d > 60) continue;
    var a = Math.abs(angleTo(P.yaw, dx, dz));
    if (a < bestA) { bestA = a; best = e; }
  }
  if (best) {
    var h = (best === BOSS) ? 4.5 : 1.2;
    dir = new THREE.Vector3(best.grp.position.x - from.x, best.grp.position.y + h - from.y, best.grp.position.z - from.z).normalize();
  }
  var m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0x7ef6ff }));
  m.position.copy(from); world.add(m);
  var tail = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0x7ef6ff, transparent: true, opacity: .4, depthWrite: false }));
  m.add(tail);
  shots.push({ mesh: m, vel: dir.multiplyScalar(CFG.BULLET_SPD), life: CFG.BULLET_LIFE });
  P.fireCD = CFG.BULLET_CD; P.kick = 1;
  SFX.play('shoot');
  FX.puff(from.clone(), 0x9ffcff, .5, .18);
}
function forward(yaw) { return new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)); }
function rightOf(yaw) { return new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)); }

// ------------------------------------------------------------------ 冰系魔法
function castIce() {
  if (P.ice < CFG.ICE_COST || P.iceCD > 0) { SFX.play('ui'); return; }
  P.ice -= CFG.ICE_COST; P.iceCD = CFG.ICE_CD;
  UI.setIce(P.ice, CFG.ICE_MAX);
  SFX.play('ice'); UI.iceFlash();

  var f = forward(P.yaw);
  var from = P.pos.clone().add(new THREE.Vector3(0, 1.2, 0));
  if (P.parts.iceHand && P.parts.iceHand.getWorldPosition) P.parts.iceHand.getWorldPosition(from);

  // 视觉：一路冰雾推出去
  for (var s = 1; s <= 7; s++) {
    var p = from.clone().add(f.clone().multiplyScalar(s * CFG.ICE_RANGE / 7));
    p.y = Math.max(0.4, p.y);
    FX.puff(p, 0xaef0ff, 1.1 + s * 0.28, .34 + s * 0.03);
  }
  FX.freezeCloud(from.clone().add(f.clone().multiplyScalar(4)));

  var froze = 0;
  // ---- 冻火球 ----
  for (var i = 0; i < balls.length; i++) {
    var b = balls[i];
    if (b.frozen > 0) continue;
    var dx = b.mesh.position.x - P.pos.x, dz = b.mesh.position.z - P.pos.z;
    var d = Math.hypot(dx, dz);
    if (d > CFG.ICE_RANGE + b.r) continue;
    if (d > 2 && Math.abs(angleTo(P.yaw, dx, dz)) > CFG.ICE_ANGLE) continue;
    freezeBall(b); froze++;
  }
  // ---- 冻怪物 ----
  var all = foes.concat(BOSS && !BOSS.dead ? [BOSS] : []);
  for (var j = 0; j < all.length; j++) {
    var e = all[j]; if (e.dead) continue;
    var ex = e.grp.position.x - P.pos.x, ez = e.grp.position.z - P.pos.z;
    var ed = Math.hypot(ex, ez);
    if (ed > CFG.ICE_RANGE) continue;
    if (ed > 2 && Math.abs(angleTo(P.yaw, ex, ez)) > CFG.ICE_ANGLE) continue;
    var dur = (e === BOSS) ? CFG.ICE_SLOW * 0.5 : CFG.ICE_SLOW;
    e.frozen = Math.max(e.frozen, dur);
    tint(e.grp, e === BOSS ? 0x88bbff : 0x9fd8ff);
    FX.freezeCloud(e.grp.position.clone().add(new THREE.Vector3(0, 1, 0)));
    if (e !== BOSS) damageFoe(e, 6, false);
  }
  if (froze > 0) {
    SFX.play('freeze');
    P.ice = Math.min(CFG.ICE_MAX, P.ice + froze * 8);   // 冻中火球回一点能量，奖励会用魔法的孩子
    UI.setIce(P.ice, CFG.ICE_MAX);
    UI.toast(froze > 1 ? '❄️ 冻住了 ' + froze + ' 个火球！' : '❄️ 火球被冻住了！', 1100);
  }
}
function freezeBall(b) {
  b.frozen = 0.9;
  b.vel.set(0, 0, 0);
  b.mesh.material.color.setHex(0x9fe8ff);
  if (b.halo) b.halo.material.color.setHex(0xe8fbff);
  FX.freezeCloud(b.mesh.position.clone());
}

// ------------------------------------------------------------------ 伤害
function damageFoe(e, amount, fromShot) {
  if (e.dead) return;
  e.hp -= amount; e.hitT = 0.12;
  tint(e.grp, 0xffffff);
  if (e === BOSS) {
    UI.setBossHP('熔岩魔王', Math.max(0, e.hp), CFG.BOSS_HP);
    FX.burst(e.grp.position.clone().add(new THREE.Vector3(0, 4.5, 0)), 0xffcc55, 8, 6, .4);
  } else {
    FX.burst(e.grp.position.clone().add(new THREE.Vector3(0, 1.3, 0)), 0xffdd66, 7, 5, .35);
  }
  SFX.play('hit');
  if (e.hp <= 0) killFoe(e);
}
function killFoe(e) {
  e.dead = true; e.deadT = (e === BOSS) ? 2.4 : 0.9;
  SFX.play('explode');
  var at = e.grp.position.clone().add(new THREE.Vector3(0, (e === BOSS) ? 4 : 1, 0));
  FX.burst(at, (e === BOSS) ? 0xff6a20 : 0xd45cff, (e === BOSS) ? 40 : 20, (e === BOSS) ? 16 : 9, 1.1);
  FX.ring(e.grp.position.clone(), (e === BOSS) ? 0xff8030 : 0xd45cff, (e === BOSS) ? 22 : 7, .8);
  if (e === BOSS) { SFX.play('roar'); UI.hideBossHP(); }
}
function hurtPlayer(amount, fromPos) {
  if (P.dead || P.iframe > 0) return;
  P.hp -= amount; P.iframe = CFG.IFRAME;
  UI.setHP(Math.max(0, P.hp), CFG.HP); UI.hitFlash(); SFX.play('hurt');
  FX.burst(P.pos.clone().add(new THREE.Vector3(0, 1.2, 0)), 0xff4444, 12, 6, .5);
  if (fromPos) {   // 被打退一点
    var d = new THREE.Vector3(P.pos.x - fromPos.x, 0, P.pos.z - fromPos.z);
    if (d.lengthSq() > 0.01) { d.normalize().multiplyScalar(1.6); P.pos.add(d); }
  }
  if (P.hp <= 0 && !P.dead) {
    P.dead = true;
    setTimeout(function () { if (MODE === 'planet') lose('你被怪物打倒了……'); }, 1100 / FF);
  }
}

// ------------------------------------------------------------------ 玩家每帧
var camYaw = 0, camPos = new THREE.Vector3(0, 6, 12);

function updatePlayer(dt) {
  var mv = readMove();

  if (P.dead) {                                  // 倒下动画
    P.grp.rotation.x += (-Math.PI / 2 - P.grp.rotation.x) * Math.min(1, dt * 5);
    P.grp.position.y = Math.max(0.3, P.grp.position.y - dt * 2);
    return;
  }

  // ---- 转身：A/D、摇杆、鼠标（指针锁定时）----
  P.yaw += mv.turn * CFG.TURN * dt;
  if (mouse.dx) { P.yaw -= mouse.dx * 0.0032; mouse.dx = 0; }
  if (look.dx) { P.yaw -= look.dx * 0.0042; look.dx = 0; }

  // ---- 跑 / 后退 / 侧移 ----
  var f = forward(P.yaw), r = rightOf(P.yaw);
  var vel = new THREE.Vector3();
  if (mv.fwd > 0) vel.addScaledVector(f, mv.fwd * CFG.MOVE);
  else if (mv.fwd < 0) vel.addScaledVector(f, mv.fwd * CFG.BACK);
  if (mv.strafe) vel.addScaledVector(r, mv.strafe * CFG.BACK);

  P.pos.x += vel.x * dt; P.pos.z += vel.z * dt;
  var dc = Math.hypot(P.pos.x, P.pos.z);
  if (dc > ARENA) { P.pos.x *= ARENA / dc; P.pos.z *= ARENA / dc; }

  // ---- 跳 + 重力 ----
  if (takeJump() && P.onGround) { P.vy = CFG.JUMP; P.onGround = false; SFX.play('jump'); }
  P.vy -= CFG.GRAV * dt;
  P.pos.y += P.vy * dt;
  if (P.pos.y <= 0) {
    if (!P.onGround) { SFX.play('land'); FX.ring(new THREE.Vector3(P.pos.x, .05, P.pos.z), 0xffd0a0, 2.4, .35); }
    P.pos.y = 0; P.vy = 0; P.onGround = true;
  }

  P.grp.position.copy(P.pos);
  P.grp.rotation.y = P.yaw;

  // ---- 走路动画 ----
  var moving = vel.lengthSq() > 1;
  P.walkT += dt * (moving ? (mv.fwd < 0 ? 7 : 11) : 0);
  var sw = Math.sin(P.walkT) * (moving ? 0.75 : 0);
  if (!P.onGround) sw = 0.5;
  if (P.parts.legL) P.parts.legL.rotation.x = sw;
  if (P.parts.legR) P.parts.legR.rotation.x = -sw;
  if (P.parts.armL) P.parts.armL.rotation.x = -sw * 0.7;
  if (P.parts.armR) P.parts.armR.rotation.x = -0.25 - P.kick * 0.5;   // 右手端枪
  if (P.parts.torso) P.parts.torso.rotation.z = Math.sin(P.walkT * 0.5) * 0.04;
  P.kick = Math.max(0, P.kick - dt * 6);

  // ---- 开枪 ----
  P.fireCD -= dt;
  if (wantFire() && P.fireCD <= 0) shoot();

  // ---- 冰魔法 ----
  P.iceCD -= dt;
  if (wantIce()) castIce();
  if (P.ice < CFG.ICE_MAX) {
    P.ice = Math.min(CFG.ICE_MAX, P.ice + CFG.ICE_REGEN * dt);
    UI.setIce(P.ice, CFG.ICE_MAX);
  }
  UI.setBullets('❄ ' + Math.round(P.ice));

  // ---- 无敌闪烁 ----
  if (P.iframe > 0) {
    P.iframe -= dt;
    P.grp.visible = (Math.sin(timeNow * 38) > -0.35);
    if (P.iframe <= 0) P.grp.visible = true;
  }
}

// ------------------------------------------------------------------ 相机（第三人称跟随）
function updateCamera(dt) {
  var lag = Math.min(1, dt * 7);
  camYaw += angleShort(camYaw, P.yaw) * Math.min(1, dt * 9);
  var back = forward(camYaw).multiplyScalar(-8.2);
  var want = new THREE.Vector3(P.pos.x + back.x, P.pos.y + 4.6, P.pos.z + back.z);
  camPos.lerp(want, lag);
  camera.position.copy(camPos);
  var lookAt = new THREE.Vector3(P.pos.x, P.pos.y + 1.9, P.pos.z).add(forward(camYaw).multiplyScalar(6));
  camera.lookAt(lookAt);
  sun.position.set(P.pos.x + 34, 62, P.pos.z + 26);
  sun.target.position.set(P.pos.x, 0, P.pos.z);
}
function angleShort(from, to) {
  var d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// ------------------------------------------------------------------ 普通怪物
function updateFoes(dt) {
  for (var i = foes.length - 1; i >= 0; i--) {
    var e = foes[i], g = e.grp;

    if (e.dead) {                                  // 死亡：瘫下去再消失
      e.deadT -= dt;
      g.rotation.x += (-1.4 - g.rotation.x) * Math.min(1, dt * 6);
      g.scale.multiplyScalar(Math.pow(0.06, dt));
      if (e.deadT <= 0) { world.remove(g); disposeTree(g); foes.splice(i, 1); }
      continue;
    }
    if (e.hitT > 0) { e.hitT -= dt; if (e.hitT <= 0 && e.frozen <= 0) untint(g); }

    var dx = P.pos.x - g.position.x, dz = P.pos.z - g.position.z;
    var d = Math.hypot(dx, dz) || 0.001;

    // 面朝玩家
    var want = Math.atan2(-dx, -dz);
    e.yaw += angleShort(e.yaw, want) * Math.min(1, dt * 5);
    g.rotation.y = e.yaw;

    if (e.frozen > 0) {                            // 被冻住：抖一抖，不动也不吐
      e.frozen -= dt;
      g.position.y = Math.sin(timeNow * 30) * 0.05;
      if (e.frozen <= 0) { untint(g); g.position.y = 0; }
      continue;
    }

    // 走位：太远就靠近，太近就后退
    var sp = 0;
    if (d > CFG.GRUNT_KEEP + 3) sp = CFG.GRUNT_SPD;
    else if (d < CFG.GRUNT_KEEP - 4) sp = -CFG.GRUNT_SPD * 0.7;
    if (sp) {
      g.position.x += (dx / d) * sp * dt;
      g.position.z += (dz / d) * sp * dt;
      var dc = Math.hypot(g.position.x, g.position.z);
      if (dc > ARENA) { g.position.x *= ARENA / dc; g.position.z *= ARENA / dc; }
    }
    // 走路摆动
    e.walkT += dt * (sp ? 9 : 2.5);
    g.position.y = Math.abs(Math.sin(e.walkT)) * (sp ? 0.17 : 0.05);
    if (e.parts.legL) e.parts.legL.rotation.x = Math.sin(e.walkT) * 0.6;
    if (e.parts.legR) e.parts.legR.rotation.x = -Math.sin(e.walkT) * 0.6;

    // 吐火球
    e.cd -= dt;
    if (e.cd <= 0 && d < CFG.GRUNT_RANGE) {
      e.cd = CFG.GRUNT_CD * rand(0.8, 1.25);
      var from = new THREE.Vector3();
      if (e.parts.mouth && e.parts.mouth.getWorldPosition) e.parts.mouth.getWorldPosition(from);
      else from.copy(g.position).add(new THREE.Vector3(0, 1.6, 0));
      var aim = new THREE.Vector3(P.pos.x - from.x, P.pos.y + 1.0 - from.y, P.pos.z - from.z);
      makeBall(from, aim, false);
      if (e.parts.mouth && e.parts.mouth.scale) e.parts.mouth.scale.setScalar(1.6);
    }
    if (e.parts.mouth && e.parts.mouth.scale) {
      var s = e.parts.mouth.scale.x;
      e.parts.mouth.scale.setScalar(s + (1 - s) * Math.min(1, dt * 7));
    }
    // 贴脸伤害
    if (d < 2.2) hurtPlayer(9, g.position);
  }
}

// ------------------------------------------------------------------ Boss
function updateBoss(dt) {
  if (!BOSS) return;
  var b = BOSS, g = b.grp, pts = b.parts;

  if (b.dead) {
    b.deadT -= dt;
    g.rotation.x += (-1.2 - g.rotation.x) * Math.min(1, dt * 2.4);
    g.position.y = Math.max(-2, g.position.y - dt * 1.2);
    if (Math.random() < dt * 6) FX.burst(g.position.clone().add(new THREE.Vector3(rand(-3, 3), rand(1, 6), rand(-3, 3))), 0xff7a20, 10, 7, .7);
    if (b.deadT <= 0 && phase === 'boss') { dropRelic(g.position.clone()); }
    return;
  }
  if (b.hitT > 0) { b.hitT -= dt; if (b.hitT <= 0 && b.frozen <= 0) untint(g); }

  var dx = P.pos.x - g.position.x, dz = P.pos.z - g.position.z;
  var d = Math.hypot(dx, dz) || 0.001;
  var want = Math.atan2(-dx, -dz);

  if (b.state === 'rise') {                        // 登场：从地里长出来
    b.t -= dt;
    var s = clamp(1 - b.t / 1.6, 0, 1);
    g.scale.setScalar(0.1 + s * 0.9);
    g.rotation.y = want;
    if (pts.core) pts.core.scale.setScalar(1 + Math.sin(timeNow * 8) * .2);
    if (b.t <= 0) { b.state = 'idle'; b.cd = 1.6; g.scale.setScalar(1); }
    return;
  }

  b.yaw += angleShort(b.yaw, want) * Math.min(1, dt * 2.6);
  g.rotation.y = b.yaw;

  if (b.frozen > 0) {
    b.frozen -= dt;
    g.position.y = Math.sin(timeNow * 24) * 0.06;
    if (b.frozen <= 0) { untint(g); g.position.y = 0; }
    return;
  }

  // 呼吸 + 核心脉动
  var rage = (b.hp < CFG.BOSS_HP * 0.4) ? 1.55 : 1;
  if (pts.core) {
    pts.core.scale.setScalar(1 + Math.sin(timeNow * (4 * rage)) * .12);
    if (pts.core.material) pts.core.material.opacity = 1;
  }

  if (b.state === 'idle') {
    if (d > 16) {                                  // 慢慢逼近
      var sp = CFG.BOSS_SPD * rage;
      g.position.x += (dx / d) * sp * dt; g.position.z += (dz / d) * sp * dt;
      if (pts.armL) pts.armL.rotation.x = Math.sin(timeNow * 3) * 0.35;
      if (pts.armR) pts.armR.rotation.x = -Math.sin(timeNow * 3) * 0.35;
    }
    b.cd -= dt * rage;
    if (b.cd <= 0) {
      if (d < 15) { b.state = 'slam'; b.t = 0.95; UI.toast('⚠️ 它要砸地！快跳开！', 1200); }
      else { b.state = 'charge'; b.t = CFG.BOSS_TELE; UI.toast('⚠️ 超大火球来了！用冰魔法冻住它！', 1600); SFX.play('roar', { vol: .6 }); }
    }
  } else if (b.state === 'charge') {               // 蓄力：张嘴、核心爆亮
    b.t -= dt;
    var k2 = 1 - clamp(b.t / CFG.BOSS_TELE, 0, 1);
    if (pts.jaw) pts.jaw.rotation.x = k2 * 0.6;
    if (pts.core) pts.core.scale.setScalar(1 + k2 * 1.6);
    if (Math.random() < dt * 20) {
      var mp = new THREE.Vector3(); 
      if (pts.mouth && pts.mouth.getWorldPosition) pts.mouth.getWorldPosition(mp);
      else mp.copy(g.position).add(new THREE.Vector3(0, 6, 0));
      FX.puff(mp, 0xff8020, .9 + k2, .3);
    }
    if (b.t <= 0) {
      var from = new THREE.Vector3();
      if (pts.mouth && pts.mouth.getWorldPosition) pts.mouth.getWorldPosition(from);
      else from.copy(g.position).add(new THREE.Vector3(0, 6, 0));
      var aim = new THREE.Vector3(P.pos.x - from.x, P.pos.y + 1.2 - from.y, P.pos.z - from.z);
      makeBall(from, aim, true);
      FX.sphereWave(from.clone(), 0xff5a10, 8, .5);
      if (pts.jaw) pts.jaw.rotation.x = 0;
      if (pts.core) pts.core.scale.setScalar(1);
      b.state = 'idle'; b.cd = CFG.BOSS_CD;
    }
  } else if (b.state === 'slam') {                 // 砸地冲击波
    b.t -= dt;
    var k3 = 1 - clamp(b.t / 0.95, 0, 1);
    if (pts.armL) pts.armL.rotation.x = -k3 * 1.8;
    if (pts.armR) pts.armR.rotation.x = -k3 * 1.8;
    if (b.t <= 0) {
      if (pts.armL) pts.armL.rotation.x = 0.6;
      if (pts.armR) pts.armR.rotation.x = 0.6;
      FX.ring(g.position.clone(), 0xff7a30, CFG.SLAM_R, .55);
      FX.burst(g.position.clone(), 0xffa040, 26, 13, .8);
      SFX.play('explode');
      if (d < CFG.SLAM_R && P.pos.y < 2.2) hurtPlayer(CFG.SLAM_DMG, g.position);
      else if (d < CFG.SLAM_R) UI.toast('漂亮！跳起来躲过了！', 1100);
      b.state = 'idle'; b.cd = CFG.BOSS_CD * 0.75;
    }
  }

  var dc2 = Math.hypot(g.position.x, g.position.z);
  if (dc2 > ARENA - 6) { g.position.x *= (ARENA - 6) / dc2; g.position.z *= (ARENA - 6) / dc2; }
  if (d < 6.5) hurtPlayer(14, g.position);
}

// ------------------------------------------------------------------ 火球 / 子弹
function updateBalls(dt) {
  for (var i = balls.length - 1; i >= 0; i--) {
    var b = balls[i], m = b.mesh;
    if (b.frozen > 0) {                            // 冻住的火球：停在半空，然后碎掉
      b.frozen -= dt;
      m.rotation.y += dt * 2;
      m.scale.setScalar(1 + Math.sin(timeNow * 20) * 0.04);
      if (b.frozen <= 0) { killBall(b, i, true); }
      continue;
    }
    m.position.addScaledVector(b.vel, dt);
    b.vel.y -= (b.big ? 2.0 : 3.2) * dt;           // 一点点下坠，好躲
    b.life -= dt;
    m.rotation.x += dt * 5; m.rotation.z += dt * 4;
    if (b.big && Math.random() < dt * 30) FX.smokeTrail(m.position.clone(), 0xff6a20);
    else if (Math.random() < dt * 12) FX.smokeTrail(m.position.clone(), 0xffa040);

    // 打中玩家？
    if (!P.dead) {
      var hx = m.position.x - P.pos.x, hy = m.position.y - (P.pos.y + 1.0), hz = m.position.z - P.pos.z;
      var rr = b.r + 0.85;
      if (hx * hx + hy * hy + hz * hz < rr * rr) {
        hurtPlayer(b.dmg, m.position);
        if (b.big) FX.sphereWave(m.position.clone(), 0xff5020, 9, .5);
        killBall(b, i, false); continue;
      }
    }
    if (m.position.y < b.r * 0.6 || b.life <= 0) {  // 落地炸开
      FX.ring(new THREE.Vector3(m.position.x, .06, m.position.z), 0xff8030, b.big ? 8 : 3, .45);
      if (b.big) {
        var gd = Math.hypot(m.position.x - P.pos.x, m.position.z - P.pos.z);
        if (gd < 7 && !P.dead) hurtPlayer(Math.round(b.dmg * 0.55), m.position);
      }
      killBall(b, i, false); continue;
    }
    var dc = Math.hypot(m.position.x, m.position.z);
    if (dc > ARENA + 20) { killBall(b, i, false); }
  }
}
function updateShots(dt) {
  for (var i = shots.length - 1; i >= 0; i--) {
    var s = shots[i], m = s.mesh;
    m.position.addScaledVector(s.vel, dt);
    s.life -= dt;
    var gone = (s.life <= 0 || m.position.y < 0.05);

    if (!gone) {
      // 打中怪物？
      var list = foes.concat(BOSS && !BOSS.dead && BOSS.state !== 'rise' ? [BOSS] : []);
      for (var j = 0; j < list.length; j++) {
        var e = list[j]; if (e.dead) continue;
        var isB = (e === BOSS);
        var cx = e.grp.position.x, cy = e.grp.position.y + (isB ? 4.5 : 1.2), cz = e.grp.position.z;
        var rr = isB ? 4.2 : 1.35;
        var dx = m.position.x - cx, dy = m.position.y - cy, dz = m.position.z - cz;
        if (dx * dx + dy * dy + dz * dz < rr * rr) {
          damageFoe(e, CFG.BULLET_DMG, true);
          gone = true; break;
        }
      }
    }
    if (!gone) {  // 子弹也能打碎冻住的火球
      for (var q = balls.length - 1; q >= 0; q--) {
        var b = balls[q];
        if (b.frozen <= 0) continue;
        var bx = m.position.x - b.mesh.position.x, by = m.position.y - b.mesh.position.y, bz = m.position.z - b.mesh.position.z;
        var br = b.r + 0.4;
        if (bx * bx + by * by + bz * bz < br * br) {
          SFX.play('freeze'); killBall(b, q, true); gone = true; break;
        }
      }
    }
    if (gone) { FX.puff(m.position.clone(), 0x9ffcff, .5, .2); world.remove(m); disposeTree(m); shots.splice(i, 1); }
  }
}

// ------------------------------------------------------------------ 宝物
function dropRelic(at) {
  phase = 'relic';
  at.y = 1.2;
  relic = art('relic');
  relic.position.copy(at);
  world.add(relic);
  FX.ring(new THREE.Vector3(at.x, .06, at.z), 0xffd54a, 14, 1.0);
  FX.burst(at.clone(), 0xffd54a, 30, 8, 1.2);
  SFX.play('pickup', { vol: .5 });
  UI.setObjective('💎 宝物掉出来了！快去捡起来！');
  UI.toast('💎 宝物出现了！跑过去捡起它，地球就有救了！', 3200);
}
function updateRelic(dt) {
  if (!relic) return;
  var p = relic.userData.parts || {};
  relic.rotation.y += dt * 1.4;
  relic.position.y = 1.2 + Math.sin(timeNow * 2) * 0.28;
  if (p.ring) p.ring.rotation.z += dt * 2.2;
  if (p.glow && p.glow.scale) { var s = 1 + Math.sin(timeNow * 4) * 0.18; p.glow.scale.setScalar(s); }
  if (Math.random() < dt * 8) FX.puff(relic.position.clone().add(new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1))), 0xffe680, .5, .5);

  if (!P.dead && dist2(P.pos, relic.position) < 3.2) {
    phase = 'done';
    FX.burst(relic.position.clone(), 0xffd54a, 40, 10, 1.4);
    FX.sphereWave(relic.position.clone(), 0xffe680, 20, 1.0);
    world.remove(relic); disposeTree(relic); relic = null;
    SFX.play('pickup');
    setTimeout(function () { win(); }, 800 / FF);
  }
}

// ------------------------------------------------------------------ 关卡推进
function updatePhase(dt) {
  phaseT -= dt;
  var alive = 0;
  for (var i = 0; i < foes.length; i++) if (!foes[i].dead) alive++;

  if (phase === 'intro') {
    if (phaseT <= 0) { spawnWave(CFG.WAVE1, 42); phase = 'w1'; UI.setObjective('👹 消灭第一波怪物（' + CFG.WAVE1 + '只）'); }
  } else if (phase === 'w1') {
    UI.setObjective('👹 还剩 ' + alive + ' 只怪物');
    if (alive === 0) { phase = 'gap'; phaseT = 2.2; UI.toast('干得好！还有一波！', 1800); }
  } else if (phase === 'gap') {
    if (phaseT <= 0) { spawnWave(CFG.WAVE2, 34); phase = 'w2'; }
  } else if (phase === 'w2') {
    UI.setObjective('👹 还剩 ' + alive + ' 只怪物');
    if (alive === 0) { phase = 'preboss'; phaseT = 1.8; UI.toast('地面在震动……', 1800); }
  } else if (phase === 'preboss') {
    if (phaseT <= 0) { spawnBoss(); phase = 'boss'; }
  }
}

// ------------------------------------------------------------------ 地表关每帧
function updatePlanet(dt) {
  updatePhase(dt);
  updatePlayer(dt);
  updateFoes(dt);
  updateBoss(dt);
  updateBalls(dt);
  updateShots(dt);
  updateRelic(dt);
  updateCamera(dt);
}

// ==================================================================
//  胜 / 负 / 重来
// ==================================================================
function win() {
  setMode('over');
  SFX.stopEngine(); SFX.play('win');
  UI.hideBossHP(); UI.setCrosshair(false); UI.setHint('');
  if (document.exitPointerLock && document.pointerLockElement) document.exitPointerLock();
  UI.showCard({
    title: '🌍 地 球 得 救 了 ！',
    sub: '你抢回了能量宝物，带着它飞回家',
    cls: 'win',
    lines: [
      '💎 宝物到手，地球的护盾重新亮了起来',
      '👹 熔岩魔王倒下了，怪物星球安静了',
      '🚀 太空探险家 <b>Kehan</b>，全世界都在等你回来',
      '⭐ 想再玩一次吗？'
    ],
    btn: '再 玩 一 次'
  });
}
function lose(why) {
  setMode('over');
  SFX.stopEngine(); SFX.play('lose');
  UI.hideBossHP(); UI.setCrosshair(false); UI.setHint('');
  if (document.exitPointerLock && document.pointerLockElement) document.exitPointerLock();
  UI.showCard({
    title: '💥 地 球 被 毁 灭 了',
    sub: why || '任务失败',
    cls: 'lose',
    lines: [
      '没能拿到宝物，地球失去了最后的护盾……',
      '💡 小提示：火球飞过来时按 <b>冰冻</b>，它就会停在半空碎掉',
      '💡 Boss 举起手要砸地时，<b>跳起来</b>就不会被打到',
      '别灰心，太空探险家可以再来一次！'
    ],
    btn: '再 挑 战 一 次'
  });
}
function restart() { UI.hideCard();SFX.play('ui');if(checkpoint==='planet')startPlanet();else startFlight(checkpoint); }

// 卡片按钮：标题 → 开始；结算 → 重来
function onCardBtn() {
  SFX.init(); SFX.play('ui');
  if (MODE === 'title') { UI.hideCard(); startFlight('voyage'); }
  else restart();
}
function hookCardBtn() {
  document.addEventListener('click', function (e) {
    var t = e.target;
    while (t && t !== document.body) {
      if (t.id === 'cardBtn') { onCardBtn(); return; }
      t = t.parentNode;
    }
  }, true);
  // 键盘也能开始 / 重来
  addEventListener('keydown', function (e) {
    if ((MODE === 'title' || MODE === 'over') && (e.code === 'Space' || e.code === 'Enter')) onCardBtn();
  });
}

// ==================================================================
//  主循环
// ==================================================================
var lastT = 0, acc = 0;
function step(dt) {
  if(PAUSED)return;
  timeNow += dt;
  if (MODE === 'title') {
    if (titleShip) { titleShip.rotation.y += dt * 0.12; titleShip.position.y = -3 + Math.sin(timeNow * 0.8) * 0.6; }
    camera.position.x = Math.sin(timeNow * 0.15) * 3;
    camera.lookAt(0, -2, -30);
  } else if (MODE === 'voyage' || MODE === 'descent') {
    updateFlight(dt);
  } else if (MODE === 'planet') {
    updatePlanet(dt);
  }
  FX.update(dt);
}
function loop() {
  requestAnimationFrame(loop);
  var now = performance.now();
  var dt = (now - lastT) / 1000; lastT = now;
  if (!(dt > 0)) dt = 0.016;
  dt = Math.min(dt, 0.25) * FF;           // 上限防卡顿穿透；FF 是 QA 快进倍率
  try { while(dt>0.000001){var h=Math.min(dt,1/60);step(h);dt-=h;} } catch (err) { fatal(err); return; }
  renderer.render(scene, camera);
}

// ==================================================================
//  启动
// ==================================================================
function fatal(err) {
  console.error(err);
  var el = $('fatal');
  if (el) { el.style.display = 'block'; el.textContent = '游戏出错了：\n' + (err && err.stack ? err.stack : err); }
}
function boot() {
  if (!window.THREE) { fatal(new Error('three.js 没加载成功（vendor/three.min.js）')); return; }
  try {
    UI.init();
    initRender();
    initInput();
    hookCardBtn();
    var b = $('boot'); if (b) b.classList.add('gone');
    showTitle();
    lastT = performance.now();
    loop();
    // QA 直通车：?skip=planet 直接进地表关，?skip=boss 直接打 Boss
    if (Q.skip === 'planet' || Q.skip === 'boss') {
      UI.hideCard(); startPlanet();
      if (Q.skip === 'boss') { phase = 'preboss'; phaseT = 0.5; }
    }
    if (Q.skip === 'descent') { UI.hideCard(); startFlight('descent'); }
  } catch (e) { fatal(e); }
}

if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot);
else boot();

// 给 QA / 调试用的小后门
window.GAME = {
  get paused(){return PAUSED;},setPaused:setPaused,clearInputs:clearInputs,get input(){return {stick:{x:stick.x,y:stick.y,on:stick.on},touch:{...touchBtn},look:look.on};},get flight(){return FL?{kind:FL.kind,x:FL.x,y:FL.y,dist:FL.dist,hp:FL.hp}:null;},
  get mode() { return MODE; }, get phase() { return phase; },
  get player() { return P; }, get boss() { return BOSS; },
  get foes() { return foes; }, get balls() { return balls; },
  startPlanet: startPlanet, startFlight: startFlight, spawnBoss: spawnBoss, cfg: CFG
};

})();
