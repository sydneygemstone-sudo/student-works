// =========================================================================
// MARTIN'S MONSTER QUEST 3D - REAL WEBGL THREE.JS ENGINE
// Full 3D Characters, Detailed Faces, 3D Follower Pets, 3D Overworld,
// 3D Battle Arena, Dynamic Particle FX, Mega Evolutions, Perks & Sound
// =========================================================================

// --- AUDIO SYNTHESIZER ---
class SoundController {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, type, duration, startVol = 0.2, endVol = 0.01) {
    if (this.muted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(startVol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(Math.max(endVol, 0.0001), this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  playHit() {
    if (this.muted || !this.ctx) return;
    try {
      const dur = 0.18;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + dur);
      gain.gain.setValueAtTime(0.32, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + dur);
    } catch (e) {}
  }

  playCrit() {
    if (this.muted || !this.ctx) return;
    this.playHit();
    setTimeout(() => this.playTone(640, 'square', 0.25, 0.28), 50);
  }

  playSelect() {
    this.playTone(440, 'triangle', 0.08, 0.15);
  }

  playAlert() {
    this.playTone(880, 'square', 0.1, 0.2);
    setTimeout(() => this.playTone(1174, 'square', 0.15, 0.2), 70);
  }

  playCaptureThrow() {
    if (this.muted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(650, this.ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    } catch (e) {}
  }

  playCaptureWobble() {
    this.playTone(320, 'sine', 0.12, 0.2);
  }

  playCaptureSuccess() {
    const notes = [392, 523, 659, 784];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'triangle', 0.25, 0.25), idx * 120);
    });
  }

  playLevelUp() {
    const notes = [261, 329, 392, 523, 659, 784, 1046];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'square', 0.2, 0.18), idx * 90);
    });
  }

  playEvolutionFanfare() {
    const chords = [392, 440, 494, 523, 587, 659, 784, 880, 1046, 1174];
    chords.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'sawtooth', 0.3, 0.22), idx * 100);
    });
  }

  playHeal() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'sine', 0.3, 0.2), idx * 110);
    });
  }

  playBossRoar() {
    if (this.muted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.7);
      gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.7);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.7);
    } catch (e) {}
  }

  playVictory() {
    const fanfare = [
      { f: 523, d: 150 }, { f: 523, d: 150 }, { f: 523, d: 150 },
      { f: 523, d: 350 }, { f: 415, d: 350 }, { f: 466, d: 350 },
      { f: 523, d: 500 }
    ];
    let time = 0;
    fanfare.forEach(item => {
      setTimeout(() => this.playTone(item.f, 'triangle', item.d / 1000, 0.25), time);
      time += item.d + 30;
    });
  }
}

const sound = new SoundController();

// --- 3D PROCEDURAL MESH BUILDERS ---

// 1. Detailed 3D Trainer Character (Martin / Sky / Leo)
function create3DTrainer(trainerType = 'martin') {
  const group = new THREE.Group();

  let capColor = 0xef4444;    // Martin: Red Cap
  let jacketColor = 0x2563eb; // Martin: Blue Jacket
  if (trainerType === 'sky') { capColor = 0x10b981; jacketColor = 0x16a34a; }
  if (trainerType === 'leo') { capColor = 0xf59e0b; jacketColor = 0x7c3aed; }

  const skinMat = new THREE.MeshLambertMaterial({ color: 0xfed7aa });
  const capMat = new THREE.MeshLambertMaterial({ color: capColor });
  const jacketMat = new THREE.MeshLambertMaterial({ color: jacketColor });
  const pantsMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
  const shoeMat = new THREE.MeshLambertMaterial({ color: 0xdc2626 });
  const whiteMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

  // Torso / Jacket
  const torsoGeo = new THREE.BoxGeometry(0.5, 0.65, 0.3);
  const torso = new THREE.Mesh(torsoGeo, jacketMat);
  torso.position.y = 0.9;
  torso.castShadow = true;
  group.add(torso);

  // White inner collar & yellow zipper line
  const collarGeo = new THREE.BoxGeometry(0.25, 0.2, 0.32);
  const collar = new THREE.Mesh(collarGeo, whiteMat);
  collar.position.set(0, 1.15, 0);
  group.add(collar);

  // Belt & Pokéball Buckle
  const beltGeo = new THREE.BoxGeometry(0.52, 0.08, 0.32);
  const belt = new THREE.Mesh(beltGeo, pantsMat);
  belt.position.y = 0.6;
  group.add(belt);

  const buckleGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.34, 16);
  buckleGeo.rotateX(Math.PI / 2);
  const buckle = new THREE.Mesh(buckleGeo, new THREE.MeshLambertMaterial({ color: 0xf59e0b }));
  buckle.position.set(0, 0.6, 0);
  group.add(buckle);

  // Head Group (for rotation & face closeup)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.5, 0);

  // Head
  const headGeo = new THREE.SphereGeometry(0.28, 16, 16);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.castShadow = true;
  headGroup.add(head);

  // 3D Expressive Eyes
  const eyeGeo = new THREE.SphereGeometry(0.05, 8, 8);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.1, 0.04, 0.24);
  eyeL.scale.set(1, 1.4, 0.6);
  headGroup.add(eyeL);

  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.1, 0.04, 0.24);
  eyeR.scale.set(1, 1.4, 0.6);
  headGroup.add(eyeR);

  // Eye highlights (sparkles for life!)
  const sparkleGeo = new THREE.SphereGeometry(0.015, 6, 6);
  const sparkleL = new THREE.Mesh(sparkleGeo, whiteMat);
  sparkleL.position.set(-0.08, 0.07, 0.27);
  headGroup.add(sparkleL);
  const sparkleR = new THREE.Mesh(sparkleGeo, whiteMat);
  sparkleR.position.set(0.12, 0.07, 0.27);
  headGroup.add(sparkleR);

  // Cap Dome & Visor
  const capGeo = new THREE.SphereGeometry(0.3, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const cap = new THREE.Mesh(capGeo, capMat);
  cap.position.y = 0.05;
  headGroup.add(cap);

  const visorGeo = new THREE.BoxGeometry(0.32, 0.04, 0.2);
  const visor = new THREE.Mesh(visorGeo, capMat);
  visor.position.set(0, 0.08, 0.26);
  visor.rotation.x = 0.15;
  headGroup.add(visor);

  group.add(headGroup);
  group.headGroup = headGroup;

  // Arms (Swings during walk)
  const armGeo = new THREE.BoxGeometry(0.15, 0.5, 0.15);

  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(-0.35, 1.15, 0);
  const leftArm = new THREE.Mesh(armGeo, jacketMat);
  leftArm.position.y = -0.22;
  leftArm.castShadow = true;
  leftArmGroup.add(leftArm);
  group.add(leftArmGroup);
  group.leftArm = leftArmGroup;

  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(0.35, 1.15, 0);
  const rightArm = new THREE.Mesh(armGeo, jacketMat);
  rightArm.position.y = -0.22;
  rightArm.castShadow = true;
  rightArmGroup.add(rightArm);
  group.add(rightArmGroup);
  group.rightArm = rightArmGroup;

  // Legs (Strides during walk)
  const legGeo = new THREE.BoxGeometry(0.18, 0.55, 0.18);

  const leftLegGroup = new THREE.Group();
  leftLegGroup.position.set(-0.14, 0.55, 0);
  const leftLeg = new THREE.Mesh(legGeo, pantsMat);
  leftLeg.position.y = -0.22;
  leftLeg.castShadow = true;
  leftLegGroup.add(leftLeg);

  // Shoes
  const shoeGeo = new THREE.BoxGeometry(0.2, 0.12, 0.28);
  const shoeL = new THREE.Mesh(shoeGeo, shoeMat);
  shoeL.position.set(0, -0.48, 0.05);
  leftLegGroup.add(shoeL);
  group.add(leftLegGroup);
  group.leftLeg = leftLegGroup;

  const rightLegGroup = new THREE.Group();
  rightLegGroup.position.set(0.14, 0.55, 0);
  const rightLeg = new THREE.Mesh(legGeo, pantsMat);
  rightLeg.position.y = -0.22;
  rightLeg.castShadow = true;
  rightLegGroup.add(rightLeg);

  const shoeR = new THREE.Mesh(shoeGeo, shoeMat);
  shoeR.position.set(0, -0.48, 0.05);
  rightLegGroup.add(shoeR);
  group.add(rightLegGroup);
  group.rightLeg = rightLegGroup;

  return group;
}

// 2. High-Detail 3D Creatures (14 Species, 3 Stages, Bosses)
function create3DCreatureMesh(species) {
  const group = new THREE.Group();

  if (species === 'Flameling') {
    // Stage 1: Cute Fire Cub
    const bodyGeo = new THREE.SphereGeometry(0.32, 16, 16);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xf97316 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.35;
    body.castShadow = true;
    group.add(body);

    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), new THREE.MeshLambertMaterial({ color: 0xfef08a }));
    belly.position.set(0, 0.33, 0.14);
    group.add(belly);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 16), bodyMat);
    head.position.set(0, 0.65, 0.05);
    group.add(head);

    // Cute ears
    const earGeo = new THREE.ConeGeometry(0.08, 0.22, 8);
    const earL = new THREE.Mesh(earGeo, new THREE.MeshLambertMaterial({ color: 0xef4444 }));
    earL.position.set(-0.14, 0.88, 0.02);
    earL.rotation.z = -0.3;
    group.add(earL);
    const earR = new THREE.Mesh(earGeo, new THREE.MeshLambertMaterial({ color: 0xef4444 }));
    earR.position.set(0.14, 0.88, 0.02);
    earR.rotation.z = 0.3;
    group.add(earR);

    // Sparkly eyes & nose
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), eyeMat);
    eyeL.position.set(-0.1, 0.68, 0.26);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), eyeMat);
    eyeR.position.set(0.1, 0.68, 0.26);
    group.add(eyeR);

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), new THREE.MeshBasicMaterial({ color: 0x1e293b }));
    nose.position.set(0, 0.63, 0.31);
    group.add(nose);

    // Animated Flame Tail with light
    const tailGeo = new THREE.ConeGeometry(0.12, 0.38, 8);
    tailGeo.rotateX(-Math.PI / 3);
    const tail = new THREE.Mesh(tailGeo, new THREE.MeshLambertMaterial({ color: 0xef4444, emissive: 0xf59e0b }));
    tail.position.set(0, 0.35, -0.35);
    group.add(tail);
    group.tail = tail;

    const tailLight = new THREE.PointLight(0xf97316, 0.9, 3);
    tailLight.position.set(0, 0.45, -0.4);
    group.add(tailLight);

  } else if (species === 'Pyrowhisker') {
    // Stage 2: Agile Fire Lynx
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xe11d48 });
    const bodyGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.65, 12);
    bodyGeo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0.45, 0);
    body.castShadow = true;
    group.add(body);

    // Head with lynx tufts
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 14), bodyMat);
    head.position.set(0, 0.75, 0.3);
    group.add(head);

    // Flame whiskers
    const whiskerGeo = new THREE.ConeGeometry(0.05, 0.25, 6);
    const wL = new THREE.Mesh(whiskerGeo, new THREE.MeshLambertMaterial({ color: 0xf59e0b, emissive: 0xd97706 }));
    wL.position.set(-0.28, 0.7, 0.35);
    wL.rotation.z = Math.PI / 2 + 0.3;
    group.add(wL);
    const wR = new THREE.Mesh(whiskerGeo, new THREE.MeshLambertMaterial({ color: 0xf59e0b, emissive: 0xd97706 }));
    wR.position.set(0.28, 0.7, 0.35);
    wR.rotation.z = -Math.PI / 2 - 0.3;
    group.add(wR);

    // Ears with tufts
    const earGeo = new THREE.ConeGeometry(0.08, 0.3, 8);
    const earL = new THREE.Mesh(earGeo, new THREE.MeshLambertMaterial({ color: 0x9f1239 }));
    earL.position.set(-0.16, 1.05, 0.25);
    earL.rotation.z = -0.25;
    group.add(earL);
    const earR = new THREE.Mesh(earGeo, new THREE.MeshLambertMaterial({ color: 0x9f1239 }));
    earR.position.set(0.16, 1.05, 0.25);
    earR.rotation.z = 0.25;
    group.add(earR);

    // Golden eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eyeMat);
    eyeL.position.set(-0.11, 0.78, 0.52);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eyeMat);
    eyeR.position.set(0.11, 0.78, 0.52);
    group.add(eyeR);

    // Dual flame tail
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, 0.5, 8), new THREE.MeshLambertMaterial({ color: 0xf97316, emissive: 0xe11d48 }));
    tail.position.set(0, 0.55, -0.45);
    tail.rotation.x = -0.8;
    group.add(tail);
    group.tail = tail;

    const flameLight = new THREE.PointLight(0xf59e0b, 1.0, 3.5);
    flameLight.position.set(0, 0.6, -0.5);
    group.add(flameLight);

  } else if (species === 'Pyrostryke') {
    // Stage 3: Mega Fire Dragon Lord!
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xdc2626 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.28, 0.9, 14), bodyMat);
    body.position.y = 0.75;
    body.castShadow = true;
    group.add(body);

    // Golden Draconic Chestplate
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.38), new THREE.MeshLambertMaterial({ color: 0xfacc15, emissive: 0x78350f }));
    plate.position.set(0, 0.78, 0.12);
    group.add(plate);

    // Dragon Head & Jaws
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.75, 8), bodyMat);
    head.geometry.rotateX(Math.PI / 2);
    head.position.set(0, 1.35, 0.28);
    group.add(head);

    // Swept-back Dragon Horns
    const hornGeo = new THREE.ConeGeometry(0.09, 0.55, 8);
    const hornL = new THREE.Mesh(hornGeo, new THREE.MeshLambertMaterial({ color: 0xfacc15 }));
    hornL.position.set(-0.26, 1.6, -0.05);
    hornL.rotation.set(-0.4, 0, -0.45);
    group.add(hornL);
    const hornR = new THREE.Mesh(hornGeo, new THREE.MeshLambertMaterial({ color: 0xfacc15 }));
    hornR.position.set(0.26, 1.6, -0.05);
    hornR.rotation.set(-0.4, 0, 0.45);
    group.add(hornR);

    // Giant Articulated Wings
    const wingMat = new THREE.MeshLambertMaterial({ color: 0xf97316, emissive: 0x9a3412, side: THREE.DoubleSide });
    const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.6, 0.05), wingMat);
    wingL.position.set(-0.75, 1.05, -0.18);
    wingL.rotation.y = 0.35;
    group.add(wingL);
    const wingR = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.6, 0.05), wingMat);
    wingR.position.set(0.75, 1.05, -0.18);
    wingR.rotation.y = -0.35;
    group.add(wingR);
    group.wingL = wingL;
    group.wingR = wingR;

    // Spiked Spine & Tail
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.8, 8), bodyMat);
    tail.rotation.x = -1.2;
    tail.position.set(0, 0.45, -0.6);
    group.add(tail);
    group.tail = tail;

    const dragonFlame = new THREE.PointLight(0xf97316, 1.5, 4.5);
    dragonFlame.position.set(0, 1.0, 0.4);
    group.add(dragonFlame);

  } else if (species === 'Leafbit') {
    // Stage 1: Nature Bunny Sprout
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x4ade80 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 14), bodyMat);
    body.position.y = 0.35;
    group.add(body);

    // Tall Leaf Ears
    const earMat = new THREE.MeshLambertMaterial({ color: 0x16a34a });
    const earL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.48, 0.04), earMat);
    earL.position.set(-0.16, 0.85, 0);
    earL.rotation.z = -0.22;
    group.add(earL);
    const earR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.48, 0.04), earMat);
    earR.position.set(0.16, 0.85, 0);
    earR.rotation.z = 0.22;
    group.add(earR);

    // Eyes & Floral Blossom Tail
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x064e3b });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), eyeMat);
    eyeL.position.set(-0.1, 0.42, 0.28);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), eyeMat);
    eyeR.position.set(0.1, 0.42, 0.28);
    group.add(eyeR);

    const blossom = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), new THREE.MeshLambertMaterial({ color: 0xf472b6 }));
    blossom.position.set(0, 0.35, -0.32);
    group.add(blossom);
    group.tail = blossom;

  } else if (species === 'Thornhare') {
    // Stage 2: Thorn Hare
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x22c55e });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.32, 0.7, 12), bodyMat);
    body.position.y = 0.55;
    group.add(body);

    // Serrated Blade Ears
    const earMat = new THREE.MeshLambertMaterial({ color: 0x15803d });
    const earL = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.6, 6), earMat);
    earL.position.set(-0.18, 1.1, 0);
    earL.rotation.z = -0.25;
    group.add(earL);
    const earR = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.6, 6), earMat);
    earR.position.set(0.18, 1.1, 0);
    earR.rotation.z = 0.25;
    group.add(earR);

    // Thorny Collar
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 8, 16), new THREE.MeshLambertMaterial({ color: 0x854d0e }));
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.75;
    group.add(collar);

    // Glowing leaf eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xa3e635 });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), eyeMat);
    eyeL.position.set(-0.11, 0.78, 0.24);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), eyeMat);
    eyeR.position.set(0.11, 0.78, 0.24);
    group.add(eyeR);

  } else if (species === 'Floraknight') {
    // Stage 3: Mega Nature Knight!
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x166534 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.3, 0.85, 12), bodyMat);
    body.position.y = 0.7;
    group.add(body);

    // Golden Leaf Pauldrons
    const pauldronGeo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
    const goldMat = new THREE.MeshLambertMaterial({ color: 0xfacc15 });
    const pL = new THREE.Mesh(pauldronGeo, goldMat);
    pL.position.set(-0.45, 1.05, 0);
    group.add(pL);
    const pR = new THREE.Mesh(pauldronGeo, goldMat);
    pR.position.set(0.45, 1.05, 0);
    group.add(pR);

    // Rose Shield on left arm
    const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 16), new THREE.MeshLambertMaterial({ color: 0xe11d48 }));
    shield.geometry.rotateX(Math.PI / 2);
    shield.position.set(-0.52, 0.75, 0.15);
    group.add(shield);

    // Solar Thorn Blade on right arm
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.8, 6), new THREE.MeshLambertMaterial({ color: 0x4ade80, emissive: 0x15803d }));
    blade.position.set(0.52, 0.85, 0.2);
    blade.rotation.x = Math.PI / 3;
    group.add(blade);

    // Helm Horns
    const helmHorn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.55, 8), goldMat);
    helmHorn.position.set(0, 1.45, 0.1);
    group.add(helmHorn);

  } else if (species === 'Aquapup') {
    // Stage 1: Water Pup
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x38bdf8 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 14), bodyMat);
    body.position.y = 0.35;
    group.add(body);

    // Droplet Ears
    const earMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });
    const earL = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.35, 8), earMat);
    earL.position.set(-0.25, 0.45, 0);
    earL.rotation.z = -1.1;
    group.add(earL);
    const earR = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.35, 8), earMat);
    earR.position.set(0.25, 0.45, 0);
    earR.rotation.z = 1.1;
    group.add(earR);

    // Sapphire eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0369a1 });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), eyeMat);
    eyeL.position.set(-0.1, 0.42, 0.28);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), eyeMat);
    eyeR.position.set(0.1, 0.42, 0.28);
    group.add(eyeR);

    // Bubbly Tail with blue light
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), new THREE.MeshLambertMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.85 }));
    tail.position.set(0, 0.35, -0.35);
    group.add(tail);
    group.tail = tail;

  } else if (species === 'Hydrofang') {
    // Stage 2: Tide Hound
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.32, 0.7, 12), bodyMat);
    body.geometry.rotateX(Math.PI / 2);
    body.position.set(0, 0.45, 0);
    group.add(body);

    // Dorsal Wave Fin
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 6), new THREE.MeshLambertMaterial({ color: 0x38bdf8 }));
    fin.position.set(0, 0.85, -0.05);
    fin.rotation.x = -0.4;
    group.add(fin);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), bodyMat);
    head.position.set(0, 0.72, 0.35);
    group.add(head);

    // Bubble collar
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.07, 8, 16), new THREE.MeshLambertMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.85 }));
    collar.position.set(0, 0.6, 0.2);
    group.add(collar);

  } else if (species === 'Leviaking' || species === 'Tidallord') {
    // Stage 3: Mega Ocean Sea Emperor!
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x0369a1 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.32, 1.0, 14), bodyMat);
    body.position.y = 0.85;
    group.add(body);

    // Triple Golden Wave Crown
    const crownMat = new THREE.MeshLambertMaterial({ color: 0xfacc15, emissive: 0x854d0e });
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.45, 6), crownMat);
    crown.position.set(0, 1.6, 0.05);
    group.add(crown);

    // Floating Chest Pearl Orb with light
    const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 14), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    pearl.position.set(0, 0.95, 0.38);
    group.add(pearl);
    const pearlLight = new THREE.PointLight(0x38bdf8, 1.4, 4);
    pearlLight.position.set(0, 0.95, 0.45);
    group.add(pearlLight);

    // Large Fin Pauldrons
    const finL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.05), new THREE.MeshLambertMaterial({ color: 0x38bdf8, side: THREE.DoubleSide }));
    finL.position.set(-0.55, 1.05, -0.1);
    finL.rotation.y = 0.4;
    group.add(finL);
    const finR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.05), new THREE.MeshLambertMaterial({ color: 0x38bdf8, side: THREE.DoubleSide }));
    finR.position.set(0.55, 1.05, -0.1);
    finR.rotation.y = -0.4;
    group.add(finR);

  } else if (species === 'Voltling') {
    // Wild Electric Fennec with Zigzag Lightning Tail
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xfacc15 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 14), bodyMat);
    body.position.y = 0.35;
    group.add(body);

    // Black-tipped giant ears
    const earGeo = new THREE.ConeGeometry(0.1, 0.45, 6);
    const earL = new THREE.Mesh(earGeo, bodyMat);
    earL.position.set(-0.16, 0.8, 0);
    earL.rotation.z = -0.3;
    group.add(earL);
    const earR = new THREE.Mesh(earGeo, bodyMat);
    earR.position.set(0.16, 0.8, 0);
    earR.rotation.z = 0.3;
    group.add(earR);

    // Red Electric Cheek Sacs
    const cheekMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const chL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), cheekMat);
    chL.position.set(-0.2, 0.36, 0.22);
    group.add(chL);
    const chR = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), cheekMat);
    chR.position.set(0.2, 0.36, 0.22);
    group.add(chR);

    // Zigzag Lightning Tail
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 0.35, -0.3);
    const seg1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.08), bodyMat);
    seg1.rotation.x = -0.5;
    tailGroup.add(seg1);
    const seg2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.08), bodyMat);
    seg2.position.set(0, 0.25, -0.15);
    seg2.rotation.x = 0.6;
    tailGroup.add(seg2);
    group.add(tailGroup);
    group.tail = tailGroup;

    const sparkLight = new THREE.PointLight(0xfacc15, 0.8, 2.5);
    sparkLight.position.set(0, 0.5, -0.35);
    group.add(sparkLight);

  } else if (species === 'Thunderbeast') {
    // Electric Tiger with Spiked Armor
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xeab308 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.8, 12), bodyMat);
    body.geometry.rotateX(Math.PI / 2);
    body.position.set(0, 0.5, 0);
    group.add(body);

    // Lightning Horns
    const hornMat = new THREE.MeshLambertMaterial({ color: 0x38bdf8, emissive: 0x0284c7 });
    const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.45, 6), hornMat);
    hornL.position.set(-0.25, 1.05, 0.35);
    hornL.rotation.z = -0.35;
    group.add(hornL);
    const hornR = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.45, 6), hornMat);
    hornR.position.set(0.25, 1.05, 0.35);
    hornR.rotation.z = 0.35;
    group.add(hornR);

  } else if (species === 'Stoneclaw') {
    // Gorge Wild Rock Bear/Armadillo
    const rockMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
    const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 1), rockMat);
    body.position.y = 0.48;
    group.add(body);

    // Amber Crystal Back Spikes
    const crystalMat = new THREE.MeshLambertMaterial({ color: 0xf59e0b, emissive: 0x78350f });
    const sp1 = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 6), crystalMat);
    sp1.position.set(-0.15, 0.85, -0.1);
    group.add(sp1);
    const sp2 = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 6), crystalMat);
    sp2.position.set(0.15, 0.9, -0.15);
    group.add(sp2);

  } else if (species === 'GigaGolem') {
    // Boss 1: Massive Ancient Stone Golem
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 0.7), stoneMat);
    body.position.y = 0.85;
    body.castShadow = true;
    group.add(body);

    // Glowing Magma Heart Core
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), new THREE.MeshBasicMaterial({ color: 0xf97316 }));
    core.position.set(0, 0.9, 0.34);
    group.add(core);
    const coreLight = new THREE.PointLight(0xf97316, 1.5, 3.5);
    coreLight.position.set(0, 0.9, 0.4);
    group.add(coreLight);

    // Boulder Shoulders
    const shGeo = new THREE.BoxGeometry(0.45, 0.45, 0.45);
    const shL = new THREE.Mesh(shGeo, stoneMat);
    shL.position.set(-0.7, 1.15, 0);
    group.add(shL);
    const shR = new THREE.Mesh(shGeo, stoneMat);
    shR.position.set(0.7, 1.15, 0);
    group.add(shR);

  } else if (species === 'Stormjaw') {
    // Chapter 2 Final Boss: Titan Thunder Dragon!
    const titanMat = new THREE.MeshLambertMaterial({ color: 0x4c1d95, emissive: 0x2e1065 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.4, 1.2, 14), titanMat);
    body.position.y = 1.0;
    body.castShadow = true;
    group.add(body);

    // Twin Lightning Antlers
    const hornMat = new THREE.MeshLambertMaterial({ color: 0xfacc15, emissive: 0x854d0e });
    const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.85, 8), hornMat);
    hornL.position.set(-0.4, 1.95, 0);
    hornL.rotation.z = -0.35;
    group.add(hornL);
    const hornR = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.85, 8), hornMat);
    hornR.position.set(0.4, 1.95, 0);
    hornR.rotation.z = 0.35;
    group.add(hornR);

    // Giant Thunder Wings
    const wingMat = new THREE.MeshLambertMaterial({ color: 0x7c3aed, emissive: 0x3b0764, side: THREE.DoubleSide });
    const wingL = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 0.06), wingMat);
    wingL.position.set(-1.0, 1.3, -0.2);
    wingL.rotation.y = 0.35;
    group.add(wingL);
    const wingR = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 0.06), wingMat);
    wingR.position.set(1.0, 1.3, -0.2);
    wingR.rotation.y = -0.35;
    group.add(wingR);
    group.wingL = wingL;
    group.wingR = wingR;

    // Cyan Electric Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), eyeMat);
    eyeL.position.set(-0.18, 1.5, 0.45);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), eyeMat);
    eyeR.position.set(0.18, 1.5, 0.45);
    group.add(eyeR);

    // Thunder Core Aura Light
    const thunderLight = new THREE.PointLight(0xfacc15, 1.8, 6);
    thunderLight.position.set(0, 1.6, 0.2);
    group.add(thunderLight);
  }

  return group;
}

// --- CREATURE DATA CREATORS ---
function createCreature(species, level = 1) {
  if (species === 'Flameling') {
    const maxHp = 24 + level * 6;
    return {
      id: 'flameling', name: 'Flameling 🔥', species: 'Flameling', type: 'Fire',
      stage: 1, level: level, hp: maxHp, maxHp: maxHp, attack: 8 + level * 2,
      xp: 0, xpNeeded: 25 * level, perks: [], evolvesTo: 'Pyrowhisker',
      moves: [
        { name: 'Flame Spark', power: 1.0, type: 'Fire', icon: '🔥', minLevel: 1 },
        { name: 'Ember Blast', power: 1.35, type: 'Fire', icon: '💥', minLevel: 2 }
      ]
    };
  } else if (species === 'Pyrowhisker') {
    const maxHp = 44 + level * 7;
    return {
      id: 'pyrowhisker', name: 'Pyrowhisker 🔥', species: 'Pyrowhisker', type: 'Fire',
      stage: 2, level: level, hp: maxHp, maxHp: maxHp, attack: 14 + level * 3,
      xp: 0, xpNeeded: 35 * level, perks: [], evolvesTo: 'Pyrostryke',
      moves: [
        { name: 'Flame Spark', power: 1.0, type: 'Fire', icon: '🔥', minLevel: 1 },
        { name: 'Ember Blast', power: 1.35, type: 'Fire', icon: '💥', minLevel: 2 },
        { name: 'Flame Wheel', power: 1.55, type: 'Fire', icon: '🌪️', minLevel: 3 },
        { name: 'Blaze Charge', power: 1.7, type: 'Fire', icon: '☄️', minLevel: 4 }
      ]
    };
  } else if (species === 'Pyrostryke') {
    const maxHp = 72 + level * 9;
    return {
      id: 'pyrostryke', name: 'Pyrostryke 🐲', species: 'Pyrostryke', type: 'Fire/Dragon',
      stage: 3, level: level, hp: maxHp, maxHp: maxHp, attack: 24 + level * 4,
      xp: 0, xpNeeded: 55 * level, perks: [],
      moves: [
        { name: 'Flame Wheel', power: 1.55, type: 'Fire', icon: '🌪️', minLevel: 3 },
        { name: 'Blaze Charge', power: 1.7, type: 'Fire', icon: '☄️', minLevel: 4 },
        { name: 'Dragon Inferno', power: 2.0, type: 'Fire/Dragon', icon: '🐲', minLevel: 5 },
        { name: 'Cataclysm Nova', power: 2.4, type: 'Ultimate', icon: '🌟', minLevel: 6 }
      ]
    };
  } else if (species === 'Leafbit') {
    const maxHp = 22 + level * 6;
    return {
      id: 'leafbit', name: 'Leafbit 🌿', species: 'Leafbit', type: 'Nature',
      stage: 1, level: level, hp: maxHp, maxHp: maxHp, attack: 7 + level * 2,
      xp: 0, xpNeeded: 25 * level, perks: [], evolvesTo: 'Thornhare',
      moves: [
        { name: 'Leaf Slice', power: 1.0, type: 'Nature', icon: '🍃', minLevel: 1 },
        { name: 'Vine Whip', power: 1.3, type: 'Nature', icon: '🌿', minLevel: 2 }
      ]
    };
  } else if (species === 'Thornhare') {
    const maxHp = 45 + level * 7;
    return {
      id: 'thornhare', name: 'Thornhare 🌿', species: 'Thornhare', type: 'Nature',
      stage: 2, level: level, hp: maxHp, maxHp: maxHp, attack: 13 + level * 3,
      xp: 0, xpNeeded: 35 * level, perks: [], evolvesTo: 'Floraknight',
      moves: [
        { name: 'Leaf Slice', power: 1.0, type: 'Nature', icon: '🍃', minLevel: 1 },
        { name: 'Vine Whip', power: 1.3, type: 'Nature', icon: '🌿', minLevel: 2 },
        { name: 'Spore Shield', power: 1.5, type: 'Nature', icon: '🛡️', minLevel: 3 },
        { name: 'Razor Foliage', power: 1.65, type: 'Nature', icon: '⚔️', minLevel: 4 }
      ]
    };
  } else if (species === 'Floraknight') {
    const maxHp = 74 + level * 9;
    return {
      id: 'floraknight', name: 'Floraknight 🛡️', species: 'Floraknight', type: 'Nature/Steel',
      stage: 3, level: level, hp: maxHp, maxHp: maxHp, attack: 23 + level * 4,
      xp: 0, xpNeeded: 55 * level, perks: [],
      moves: [
        { name: 'Vine Whip', power: 1.3, type: 'Nature', icon: '🌿', minLevel: 2 },
        { name: 'Spore Shield', power: 1.5, type: 'Nature', icon: '🛡️', minLevel: 3 },
        { name: 'Solar Blade', power: 1.95, type: 'Nature/Steel', icon: '🗡️', minLevel: 5 },
        { name: 'Gaia Wrath', power: 2.35, type: 'Ultimate', icon: '🌲', minLevel: 6 }
      ]
    };
  } else if (species === 'Aquapup') {
    const maxHp = 23 + level * 6;
    return {
      id: 'aquapup', name: 'Aquapup 💧', species: 'Aquapup', type: 'Water',
      stage: 1, level: level, hp: maxHp, maxHp: maxHp, attack: 7 + level * 2,
      xp: 0, xpNeeded: 25 * level, perks: [], evolvesTo: 'Hydrofang',
      moves: [
        { name: 'Water Pulse', power: 1.0, type: 'Water', icon: '💧', minLevel: 1 },
        { name: 'Aqua Surge', power: 1.3, type: 'Water', icon: '🌊', minLevel: 2 }
      ]
    };
  } else if (species === 'Hydrofang') {
    const maxHp = 44 + level * 7;
    return {
      id: 'hydrofang', name: 'Hydrofang 💧', species: 'Hydrofang', type: 'Water',
      stage: 2, level: level, hp: maxHp, maxHp: maxHp, attack: 14 + level * 3,
      xp: 0, xpNeeded: 35 * level, perks: [], evolvesTo: 'Leviaking',
      moves: [
        { name: 'Water Pulse', power: 1.0, type: 'Water', icon: '💧', minLevel: 1 },
        { name: 'Aqua Surge', power: 1.3, type: 'Water', icon: '🌊', minLevel: 2 },
        { name: 'Bubble Jet', power: 1.5, type: 'Water', icon: '🫧', minLevel: 3 },
        { name: 'Tide Crusher', power: 1.65, type: 'Water', icon: '🌊', minLevel: 4 }
      ]
    };
  } else if (species === 'Leviaking' || species === 'Tidallord') {
    const maxHp = 72 + level * 9;
    return {
      id: 'leviaking', name: 'Leviaking 🌊', species: 'Leviaking', type: 'Water/Dragon',
      stage: 3, level: level, hp: maxHp, maxHp: maxHp, attack: 23 + level * 4,
      xp: 0, xpNeeded: 55 * level, perks: [],
      moves: [
        { name: 'Aqua Surge', power: 1.3, type: 'Water', icon: '🌊', minLevel: 2 },
        { name: 'Bubble Jet', power: 1.5, type: 'Water', icon: '🫧', minLevel: 3 },
        { name: 'Tsunami Crash', power: 1.95, type: 'Water/Dragon', icon: '🌊', minLevel: 5 },
        { name: 'Abyssal Deluge', power: 2.35, type: 'Ultimate', icon: '🔱', minLevel: 6 }
      ]
    };
  } else if (species === 'Voltling') {
    const maxHp = 24 + level * 6;
    return {
      id: 'voltling', name: 'Voltling ⚡', species: 'Voltling', type: 'Electric',
      stage: 1, level: level, hp: maxHp, maxHp: maxHp, attack: 9 + level * 2,
      xp: 0, xpNeeded: 25 * level, perks: [], evolvesTo: 'Thunderbeast',
      moves: [
        { name: 'Spark Nibble', power: 1.0, type: 'Electric', icon: '⚡', minLevel: 1 },
        { name: 'Thunder Jolt', power: 1.35, type: 'Electric', icon: '🌩️', minLevel: 2 }
      ]
    };
  } else if (species === 'Thunderbeast') {
    const maxHp = 52 + level * 8;
    return {
      id: 'thunderbeast', name: 'Thunderbeast ⚡', species: 'Thunderbeast', type: 'Electric',
      stage: 2, level: level, hp: maxHp, maxHp: maxHp, attack: 17 + level * 3,
      xp: 0, xpNeeded: 40 * level, perks: [],
      moves: [
        { name: 'Thunder Jolt', power: 1.35, type: 'Electric', icon: '🌩️', minLevel: 2 },
        { name: 'Volt Charge', power: 1.6, type: 'Electric', icon: '⚡', minLevel: 3 },
        { name: 'Thunderstorm', power: 1.9, type: 'Electric', icon: '🌪️', minLevel: 4 }
      ]
    };
  } else if (species === 'Stoneclaw') {
    const maxHp = 50 + level * 8;
    return {
      id: 'stoneclaw', name: 'Stoneclaw 🗿', species: 'Stoneclaw', type: 'Rock',
      stage: 1, level: level, hp: maxHp, maxHp: maxHp, attack: 13 + level * 2,
      xp: 0, xpNeeded: 30 * level, perks: [],
      moves: [
        { name: 'Rock Claw', power: 1.1, type: 'Rock', icon: '🪨', minLevel: 1 },
        { name: 'Boulder Crush', power: 1.45, type: 'Rock', icon: '🗿', minLevel: 2 }
      ]
    };
  } else if (species === 'GigaGolem') {
    return {
      id: 'gigagolem', name: 'Giga-Golem 🗿', species: 'GigaGolem', type: 'Rock', isBoss: true,
      stage: 2, level: 4, hp: 68, maxHp: 68, attack: 13, xp: 180, xpNeeded: 999, perks: ['iron_shield'],
      moves: [
        { name: 'Rock Throw', power: 1.15, type: 'Rock', icon: '🪨', minLevel: 1 },
        { name: 'Earthquake Slam', power: 1.45, type: 'Rock', icon: '💥', minLevel: 1 }
      ]
    };
  } else if (species === 'Stormjaw') {
    return {
      id: 'stormjaw', name: 'Stormjaw ⚡', species: 'Stormjaw', type: 'Electric/Dragon', isBoss: true,
      stage: 3, level: 6, hp: 95, maxHp: 95, attack: 18, xp: 500, xpNeeded: 999, perks: ['speed_boost', 'crit_master'],
      moves: [
        { name: 'Thunder Strike', power: 1.25, type: 'Electric', icon: '⚡', minLevel: 1 },
        { name: 'Lightning Surge', power: 1.55, type: 'Electric', icon: '🌩️', minLevel: 1 },
        { name: 'Cataclysm Storm', power: 1.95, type: 'Electric/Dragon', icon: '🌪️', minLevel: 1 }
      ]
    };
  }
}

const ALL_PERKS = [
  { id: 'crit_master', name: '💥 Meteor Impact', desc: 'Adds +35% Critical Hit damage & higher crit chance.', icon: '💥' },
  { id: 'iron_shield', name: '🛡️ Titan Armor', desc: 'Passive: Reduces all incoming damage by 30%.', icon: '🛡️' },
  { id: 'life_drain', name: '💖 Vampire Drain', desc: 'Attacks restore 40% of damage dealt back to HP.', icon: '💖' },
  { id: 'speed_boost', name: '⚡ Thunder Speed', desc: 'Speed boost: 25% chance to strike twice in a turn.', icon: '⚡' },
  { id: 'element_fury', name: '🔥 Elemental Fury', desc: 'Passive: Boosts all super-effective attacks by +25%.', icon: '🔥' }
];

// --- 3D GAME STATE & SCENE MANAGER ---
const GameState = {
  TITLE: 'TITLE',
  SELECT: 'SELECT',
  STORY: 'STORY',
  OVERWORLD: 'OVERWORLD',
  BATTLE: 'BATTLE',
  PERK: 'PERK',
  EVOLUTION: 'EVOLUTION',
  GAMEOVER: 'GAMEOVER',
  WIN: 'WIN'
};

class Game3D {
  constructor() {
    this.canvas = document.getElementById('webgl-canvas');
    this.state = GameState.TITLE;

    this.selectedTrainer = 'martin';
    this.selectedStarter = 'flameling';

    this.party = [];
    this.activeCreatureIndex = 0;
    this.boss1Defeated = false;
    this.rivalDefeated = false;
    this.boss2Defeated = false;
    this.stormjawPhase = 1;
    this.inEvolutionBattle = false;

    // Grid coordinates: center is (0,0), spans from -14 to +11
    this.playerPos = new THREE.Vector3(0, 0, 6);
    this.playerTarget = new THREE.Vector3(0, 0, 6);
    this.playerRotation = 0;
    this.isMoving = false;
    this.moveCooldown = 0;

    // Camera modes: 'follow' or 'closeup'
    this.cameraMode = 'follow';

    this.initThree();
    this.build3DWorld();
    this.setupDOM();
    this.setupInputs();

    this.clock = new THREE.Clock();
    requestAnimationFrame(this.renderLoop.bind(this));
  }

  get activeCreature() {
    return this.party[this.activeCreatureIndex] || this.party[0];
  }

  initThree() {
    const width = this.canvas.parentElement.clientWidth || 540;
    const height = this.canvas.parentElement.clientHeight || 540;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a);
    this.scene.fog = new THREE.FogExp2(0x0f172a, 0.025);

    this.camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 100);
    this.camera.position.set(0, 9.5, 14);
    this.camera.lookAt(0, 0.8, 6);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.78);
    this.scene.add(ambientLight);

    const sun = new THREE.DirectionalLight(0xffedd5, 0.95);
    sun.position.set(10, 22, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 45;
    sun.shadow.camera.left = -16;
    sun.shadow.camera.right = 16;
    sun.shadow.camera.top = 16;
    sun.shadow.camera.bottom = -16;
    this.scene.add(sun);

    window.addEventListener('resize', () => {
      const w = this.canvas.parentElement.clientWidth;
      const h = this.canvas.parentElement.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  build3DWorld() {
    // -------------------------------------------------------------
    // ZONE 1: EMERALD VALLEY (z = 12 to 0, lush meadow, lab, spring)
    // -------------------------------------------------------------
    const valleyGeo = new THREE.PlaneGeometry(30, 14, 20, 20);
    valleyGeo.rotateX(-Math.PI / 2);
    const valleyMat = new THREE.MeshLambertMaterial({ color: 0x22c55e });
    const valleyGround = new THREE.Mesh(valleyGeo, valleyMat);
    valleyGround.position.set(0, 0, 6);
    valleyGround.receiveShadow = true;
    this.scene.add(valleyGround);

    // Cobblestone Path in Valley
    const pathGeo = new THREE.PlaneGeometry(2.6, 14);
    pathGeo.rotateX(-Math.PI / 2);
    const pathMat = new THREE.MeshLambertMaterial({ color: 0xfde68a });
    const valleyPath = new THREE.Mesh(pathGeo, pathMat);
    valleyPath.position.set(0, 0.02, 6);
    valleyPath.receiveShadow = true;
    this.scene.add(valleyPath);

    // East path to Healing Spring
    const eastPathGeo = new THREE.PlaneGeometry(7, 2.2);
    eastPathGeo.rotateX(-Math.PI / 2);
    const eastPath = new THREE.Mesh(eastPathGeo, pathMat);
    eastPath.position.set(3.5, 0.02, 5);
    this.scene.add(eastPath);

    // Trainer Laboratory Cottage at (-5, 0, 5)
    const houseGroup = new THREE.Group();
    houseGroup.position.set(-5, 0, 5);
    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 2.4, 3.6),
      new THREE.MeshLambertMaterial({ color: 0x92400e })
    );
    walls.position.y = 1.2;
    walls.castShadow = true;
    houseGroup.add(walls);

    const roofGeo = new THREE.ConeGeometry(3.0, 1.5, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(roofGeo, new THREE.MeshLambertMaterial({ color: 0xdc2626 }));
    roof.position.y = 3.1;
    houseGroup.add(roof);

    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 1.5, 0.1),
      new THREE.MeshLambertMaterial({ color: 0x451a03 })
    );
    door.position.set(0, 0.75, 1.85);
    houseGroup.add(door);
    this.scene.add(houseGroup);

    // Healing Spring (Crystal Pool) at (6, 0, 5)
    const springGroup = new THREE.Group();
    springGroup.position.set(6, 0, 5);

    const rimGeo = new THREE.CylinderGeometry(1.7, 1.9, 0.45, 24);
    const rim = new THREE.Mesh(rimGeo, new THREE.MeshLambertMaterial({ color: 0x94a3b8 }));
    rim.position.y = 0.22;
    springGroup.add(rim);

    const waterGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.46, 24);
    const water = new THREE.Mesh(waterGeo, new THREE.MeshLambertMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
      emissive: 0x0284c7
    }));
    water.position.y = 0.24;
    springGroup.add(water);

    const springLight = new THREE.PointLight(0x38bdf8, 1.4, 5);
    springLight.position.set(0, 1.2, 0);
    springGroup.add(springLight);
    this.scene.add(springGroup);
    this.springMesh = springGroup;

    // Valley Foliage & Stylized Trees
    const valleyTrees = [
      [-6, 1], [-8, 4], [-8, 8], [-4, 9],
      [5, 1], [8, 3], [8, 8], [3, 9], [-3, 9]
    ];
    valleyTrees.forEach(([tx, tz]) => {
      const tree = new THREE.Group();
      tree.position.set(tx, 0, tz);

      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.32, 1.5, 8),
        new THREE.MeshLambertMaterial({ color: 0x78350f })
      );
      trunk.position.y = 0.75;
      trunk.castShadow = true;
      tree.add(trunk);

      const foliage = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1.15, 1),
        new THREE.MeshLambertMaterial({ color: 0x16a34a })
      );
      foliage.position.y = 2.0;
      foliage.castShadow = true;
      tree.add(foliage);
      this.scene.add(tree);
    });

    // -------------------------------------------------------------
    // ZONE 2: WHISPERING GORGE (z = 0 to -7.5, canyon cliffs, stone arch)
    // -------------------------------------------------------------
    const gorgeGeo = new THREE.PlaneGeometry(30, 8, 20, 20);
    gorgeGeo.rotateX(-Math.PI / 2);
    const gorgeMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    const gorgeGround = new THREE.Mesh(gorgeGeo, gorgeMat);
    gorgeGround.position.set(0, 0, -4);
    gorgeGround.receiveShadow = true;
    this.scene.add(gorgeGround);

    // Gorge stone trail
    const gorgePathGeo = new THREE.PlaneGeometry(2.8, 8);
    gorgePathGeo.rotateX(-Math.PI / 2);
    const gorgePath = new THREE.Mesh(gorgePathGeo, new THREE.MeshLambertMaterial({ color: 0x64748b }));
    gorgePath.position.set(0, 0.02, -4);
    gorgePath.receiveShadow = true;
    this.scene.add(gorgePath);

    // Canyon Cliff Walls on Left & Right
    const canyonMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const wallL = new THREE.Mesh(new THREE.BoxGeometry(8, 4.5, 8), canyonMat);
    wallL.position.set(-8.5, 2.2, -4);
    wallL.castShadow = true;
    this.scene.add(wallL);

    const wallR = new THREE.Mesh(new THREE.BoxGeometry(8, 4.5, 8), canyonMat);
    wallR.position.set(8.5, 2.2, -4);
    wallR.castShadow = true;
    this.scene.add(wallR);

    // Ancient Stone Gate Archway at z = -4.5
    const archMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const pillarL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.0, 0.8), archMat);
    pillarL.position.set(-2.0, 2.0, -4.5);
    pillarL.castShadow = true;
    this.scene.add(pillarL);

    const pillarR = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.0, 0.8), archMat);
    pillarR.position.set(2.0, 2.0, -4.5);
    pillarR.castShadow = true;
    this.scene.add(pillarR);

    const archTop = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.8, 1.0), archMat);
    archTop.position.set(0, 4.2, -4.5);
    archTop.castShadow = true;
    this.scene.add(archTop);

    // Gatekeeper Giga-Golem Boss at z = -4.5
    this.golemMesh = create3DCreatureMesh('GigaGolem');
    this.golemMesh.position.set(0, 0, -4.5);
    this.scene.add(this.golemMesh);

    // Rival Evolution Arena Ring at (0, 0, -6.2)
    const rivalRing = new THREE.Mesh(
      new THREE.RingGeometry(1.6, 1.9, 24),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
    );
    rivalRing.rotateX(-Math.PI / 2);
    rivalRing.position.set(0, 0.03, -6.2);
    this.scene.add(rivalRing);

    // Rival Sky standing at (0, 0, -6.2)
    this.rivalMesh = create3DTrainer('sky');
    this.rivalMesh.position.set(0, 0, -6.2);
    this.scene.add(this.rivalMesh);

    // -------------------------------------------------------------
    // ZONE 3: THUNDER PEAK SUMMIT (z = -7.5 to -15, obsidian crag, storm titan)
    // -------------------------------------------------------------
    const peakGeo = new THREE.PlaneGeometry(30, 8, 20, 20);
    peakGeo.rotateX(-Math.PI / 2);
    const peakMat = new THREE.MeshLambertMaterial({ color: 0x1e1b4b }); // Dark obsidian purple
    const peakGround = new THREE.Mesh(peakGeo, peakMat);
    peakGround.position.set(0, 0, -11.5);
    peakGround.receiveShadow = true;
    this.scene.add(peakGround);

    // Thunder Peak Jagged Crystal Spires
    const crystalMat = new THREE.MeshLambertMaterial({ color: 0xa855f7, emissive: 0x581c87 });
    const spires = [
      [-5, -9, 3.2], [5, -9, 3.0],
      [-6, -12, 4.0], [6, -12, 4.2],
      [-4, -14, 3.5], [4, -14, 3.8]
    ];
    spires.forEach(([cx, cz, ch]) => {
      const spire = new THREE.Mesh(new THREE.ConeGeometry(0.5, ch, 6), crystalMat);
      spire.position.set(cx, ch / 2, cz);
      spire.castShadow = true;
      this.scene.add(spire);

      const spLight = new THREE.PointLight(0xa855f7, 0.9, 4);
      spLight.position.set(cx, ch + 0.3, cz);
      this.scene.add(spLight);
    });

    // Elevated Titan Battle Dais at (0, 0.9, -12.5)
    const dais = new THREE.Mesh(
      new THREE.CylinderGeometry(3.0, 3.5, 1.8, 24),
      new THREE.MeshLambertMaterial({ color: 0x3b0764, emissive: 0x1e1b4b })
    );
    dais.position.set(0, 0.9, -12.5);
    dais.castShadow = true;
    this.scene.add(dais);

    // Chapter 2 Final Boss: Titan Stormjaw perched atop the Dais
    this.stormjawMesh = create3DCreatureMesh('Stormjaw');
    this.stormjawMesh.position.set(0, 2.0, -12.5);
    this.scene.add(this.stormjawMesh);

    // -------------------------------------------------------------
    // ROAMING WILD MONSTERS ACROSS ALL 3 BIOMES (Detailed 3D models)
    // -------------------------------------------------------------
    this.wildMeshes = [
      // Zone 1: Emerald Valley
      { mesh: create3DCreatureMesh('Leafbit'), species: 'Leafbit', pos: new THREE.Vector3(-3.5, 0, 2.5), level: 1 },
      { mesh: create3DCreatureMesh('Aquapup'), species: 'Aquapup', pos: new THREE.Vector3(3.5, 0, 2.5), level: 1 },
      { mesh: create3DCreatureMesh('Voltling'), species: 'Voltling', pos: new THREE.Vector3(-2.0, 0, 0.5), level: 2 },
      // Zone 2: Whispering Gorge
      { mesh: create3DCreatureMesh('Stoneclaw'), species: 'Stoneclaw', pos: new THREE.Vector3(-2.5, 0, -3.2), level: 3 },
      { mesh: create3DCreatureMesh('Thunderbeast'), species: 'Thunderbeast', pos: new THREE.Vector3(2.5, 0, -5.5), level: 3 }
    ];
    this.wildMeshes.forEach(w => {
      w.mesh.position.copy(w.pos);
      this.scene.add(w.mesh);
    });

    // -------------------------------------------------------------
    // 3D TRAINER PLAYER MODEL & COMPANION FOLLOWER
    // -------------------------------------------------------------
    this.trainerMesh = create3DTrainer(this.selectedTrainer);
    this.trainerMesh.position.copy(this.playerPos);
    this.scene.add(this.trainerMesh);

    this.followerMesh = create3DCreatureMesh(this.selectedStarter.charAt(0).toUpperCase() + this.selectedStarter.slice(1));
    this.followerPos = new THREE.Vector3(0, 0, 7.5);
    this.followerMesh.position.copy(this.followerPos);
    this.scene.add(this.followerMesh);
  }

  updateQuestBanner() {
    const badge = document.getElementById('chapter-badge');
    const text = document.getElementById('quest-text');
    if (!badge || !text) return;
    if (!this.boss1Defeated) {
      badge.textContent = '📖 CH. 1';
      text.textContent = 'Train your starter in Emerald Valley, reach Lv. 2, and defeat Gatekeeper Giga-Golem 🗿 at the gorge!';
    } else if (!this.rivalDefeated) {
      badge.textContent = '⚔️ CH. 1.5';
      text.textContent = 'Enter Whispering Gorge and challenge Rival Sky to trigger 3D Mega Evolution! ⭐';
    } else if (!this.boss2Defeated) {
      badge.textContent = '⚡ CH. 2';
      text.textContent = 'Climb Thunder Peak Summit and conquer the Awakened Titan Stormjaw ⚡!';
    } else {
      badge.textContent = '👑 CHAMPION';
      text.textContent = 'Master of the Monster Realm! All 3D Titans have been conquered!';
    }
  }

  setupDOM() {
    // Title Start
    document.getElementById('btn-go-to-select').onclick = () => {
      sound.init();
      sound.playSelect();
      document.getElementById('title-screen').classList.add('hidden');
      document.getElementById('select-screen').classList.remove('hidden');
      this.state = GameState.SELECT;
    };

    // Trainer Select Cards
    const trainerCards = document.querySelectorAll('#trainer-cards .select-card');
    trainerCards.forEach(card => {
      card.onclick = () => {
        sound.playSelect();
        trainerCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedTrainer = card.getAttribute('data-trainer');

        // Swap 3D Trainer model live!
        this.scene.remove(this.trainerMesh);
        this.trainerMesh = create3DTrainer(this.selectedTrainer);
        this.trainerMesh.position.copy(this.playerPos);
        this.scene.add(this.trainerMesh);
      };
    });

    // Starter Select Cards
    const starterCards = document.querySelectorAll('#starter-cards .select-card');
    const starterDetailBox = document.getElementById('starter-detail-box');
    const details = {
      flameling: '🔥 <strong>Flameling:</strong> High Attack Fire cub with 3D flaming tail. Signature Move: <em>Flame Spark</em>. Evolves into <strong>Pyrostryke</strong> (Winged Fire Dragon)!',
      leafbit: '🌿 <strong>Leafbit:</strong> High Defense Nature bunny with floppy 3D leaf ears. Signature Move: <em>Leaf Slice</em>. Evolves into <strong>Floraknight</strong> (Nature Knight)!',
      aquapup: '💧 <strong>Aquapup:</strong> Balanced Water seal with 3D droplet ears. Signature Move: <em>Water Pulse</em>. Evolves into <strong>Leviaking</strong> (Ocean Emperor)!'
    };

    starterCards.forEach(card => {
      card.onclick = () => {
        sound.playSelect();
        starterCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedStarter = card.getAttribute('data-starter');
        starterDetailBox.innerHTML = details[this.selectedStarter];

        // Swap 3D follower mesh live!
        this.scene.remove(this.followerMesh);
        const species = this.selectedStarter.charAt(0).toUpperCase() + this.selectedStarter.slice(1);
        this.followerMesh = create3DCreatureMesh(species);
        this.followerMesh.position.copy(this.followerPos);
        this.scene.add(this.followerMesh);
      };
    });

    // Confirm Selection -> Story
    document.getElementById('btn-confirm-selection').onclick = () => {
      sound.playSelect();
      document.getElementById('select-screen').classList.add('hidden');
      this.openStoryPrologue();
    };

    // Start Adventure
    document.getElementById('btn-start-overworld').onclick = () => {
      sound.playSelect();
      document.getElementById('story-screen').classList.add('hidden');
      this.initAdventure();
    };

    // Evolution Continue
    document.getElementById('btn-evo-continue').onclick = () => {
      sound.playSelect();
      document.getElementById('evolution-modal').classList.add('hidden');
      this.endBattle();
      this.showToast(`✨ Look at your 3D Mega Evolved companion! Thunder Peak is open!`);
    };

    // Camera Toggle Mode
    document.getElementById('camera-toggle').onclick = () => {
      sound.playSelect();
      this.cameraMode = this.cameraMode === 'follow' ? 'closeup' : 'follow';
      this.showToast(this.cameraMode === 'closeup' ? '🎥 Camera: 3D Action Close-Up!' : '🎥 Camera: 3D Adventure Overview');
    };

    // Face Widget Click
    document.getElementById('trainer-face-widget').onclick = () => {
      sound.playHeal();
      this.setFaceMood('cheer', 'Super Happy! 🌟');
      this.showToast(`❤️ Martin smiled and pumped his fist!`);
    };

    // Battle Actions Menu Toggle
    const fightBtn = document.getElementById('btn-fight');
    if (fightBtn) {
      fightBtn.onclick = () => {
        if (this.isBattleBusy) return;
        sound.playSelect();
        document.getElementById('battle-actions').classList.add('hidden');
        document.getElementById('battle-moves').classList.remove('hidden');
      };
    }

    const backBtn = document.getElementById('btn-move-back');
    if (backBtn) {
      backBtn.onclick = () => {
        sound.playSelect();
        document.getElementById('battle-moves').classList.add('hidden');
        document.getElementById('battle-actions').classList.remove('hidden');
      };
    }

    // Move buttons in Move Menu
    for (let i = 0; i < 3; i++) {
      const mBtn = document.getElementById(`btn-move-${i}`);
      if (mBtn) {
        mBtn.onclick = () => {
          if (this.isBattleBusy) return;
          const player = this.activeCreature;
          const availableMoves = (player.moves || []).filter(m => (player.level || 1) >= (m.minLevel || 1));
          const chosenMove = availableMoves[i] || availableMoves[0];
          document.getElementById('battle-moves').classList.add('hidden');
          document.getElementById('battle-actions').classList.remove('hidden');
          this.handleBattleAttack(chosenMove);
        };
      }
    }

    // Capture, Switch, Run
    document.getElementById('btn-capture').onclick = () => this.handleBattleCapture();
    document.getElementById('btn-switch').onclick = () => this.handleBattleSwitch();
    document.getElementById('btn-run').onclick = () => this.handleBattleRun();

    // Revive & Play Again
    document.getElementById('btn-play-again').onclick = () => {
      sound.playSelect();
      document.getElementById('win-screen').classList.add('hidden');
      document.getElementById('title-screen').classList.remove('hidden');
      this.state = GameState.TITLE;
    };

    document.getElementById('btn-revive').onclick = () => {
      sound.playSelect();
      this.reviveParty();
    };

    // Sound toggle
    const soundBtn = document.getElementById('sound-toggle');
    soundBtn.onclick = () => {
      sound.muted = !sound.muted;
      soundBtn.textContent = sound.muted ? '🔇' : '🔊';
      this.showToast(sound.muted ? 'Sound Muted' : 'Sound Enabled');
    };

    // Touch D-Pad
    const bindTouch = (id, dx, dz) => {
      const el = document.getElementById(id);
      if (!el) return;
      const step = (e) => {
        e.preventDefault();
        sound.init();
        this.stepPlayer(dx, dz);
      };
      el.addEventListener('touchstart', step, { passive: false });
      el.addEventListener('mousedown', step);
    };

    bindTouch('dpad-up', 0, -1);
    bindTouch('dpad-down', 0, 1);
    bindTouch('dpad-left', -1, 0);
    bindTouch('dpad-right', 1, 0);

    // A & B Buttons
    document.getElementById('pad-btn-a').onclick = () => this.handleActionKey('A');
    document.getElementById('pad-btn-b').onclick = () => this.handleActionKey('B');
  }

  setupInputs() {
    window.addEventListener('keydown', (e) => {
      sound.init();
      if (this.state === GameState.OVERWORLD) {
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.stepPlayer(0, -1);
        else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.stepPlayer(0, 1);
        else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.stepPlayer(-1, 0);
        else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.stepPlayer(1, 0);
        else if (e.key === ' ' || e.key === 'Enter') this.interactFacing();
      }

      if (this.state === GameState.BATTLE && !this.isBattleBusy) {
        const movesMenu = document.getElementById('battle-moves');
        const movesOpen = movesMenu && !movesMenu.classList.contains('hidden');
        if (e.key === '1') {
          if (!movesOpen) {
            document.getElementById('btn-fight').click();
          } else {
            document.getElementById('btn-move-0').click();
          }
        } else if (e.key === '2') {
          if (movesOpen) document.getElementById('btn-move-1').click();
          else document.getElementById('btn-capture').click();
        } else if (e.key === '3') {
          if (movesOpen) document.getElementById('btn-move-2').click();
          else document.getElementById('btn-switch').click();
        } else if (e.key === '4' || e.key === 'Escape' || e.key === 'r') {
          if (movesOpen) document.getElementById('btn-move-back').click();
          else document.getElementById('btn-run').click();
        } else if (e.key === 'z' || e.key === ' ' || e.key === 'Enter') {
          if (!movesOpen) document.getElementById('btn-fight').click();
          else document.getElementById('btn-move-0').click();
        }
      }
    });

    // Tap directly on 3D ground using Three.js Raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.state !== GameState.OVERWORLD) return;
      const rect = this.canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, this.camera);
      const hits = raycaster.intersectObjects(this.scene.children, true);
      if (hits.length > 0) {
        const point = hits[0].point;
        const dx = Math.sign(point.x - this.playerPos.x);
        const dz = Math.sign(point.z - this.playerPos.z);
        if (Math.abs(point.x - this.playerPos.x) > Math.abs(point.z - this.playerPos.z)) {
          this.stepPlayer(dx, 0);
        } else {
          this.stepPlayer(0, dz);
        }
      }
    });
  }

  handleActionKey(button) {
    if (this.state === GameState.BATTLE && !this.isBattleBusy) {
      const movesMenu = document.getElementById('battle-moves');
      const movesOpen = movesMenu && !movesMenu.classList.contains('hidden');
      if (button === 'A') {
        if (!movesOpen) document.getElementById('btn-fight').click();
        else document.getElementById('btn-move-0').click();
      } else if (button === 'B') {
        if (movesOpen) document.getElementById('btn-move-back').click();
        else document.getElementById('btn-run').click();
      }
    } else if (this.state === GameState.OVERWORLD) {
      if (button === 'A') this.interactFacing();
    }
  }

  setFaceMood(emotion, moodText) {
    const avatar = document.getElementById('hud-face-avatar');
    const moodSpan = document.getElementById('hud-trainer-mood');
    if (emotion === 'attack') avatar.textContent = '🔥';
    else if (emotion === 'hurt') avatar.textContent = '😣';
    else if (emotion === 'cheer') avatar.textContent = '⭐';
    else avatar.textContent = '🧢';

    if (moodSpan) moodSpan.textContent = moodText || 'Focused';
  }

  openStoryPrologue() {
    this.state = GameState.STORY;
    document.getElementById('story-screen').classList.remove('hidden');

    const trainerName = this.selectedTrainer === 'martin' ? 'Martin' : (this.selectedTrainer === 'sky' ? 'Sky' : 'Leo');
    const starterSpecies = this.selectedStarter.charAt(0).toUpperCase() + this.selectedStarter.slice(1);

    document.getElementById('dialog-story-text').innerHTML = `
      "Welcome, <strong>${trainerName}</strong>! Look at your 3D companion <strong>${starterSpecies}</strong> — full of energy!"<br><br>
      "Ahead lies 3 grand biomes: <strong>Emerald Valley</strong>, <strong>Whispering Gorge</strong>, and <strong>Thunder Peak</strong>!"<br><br>
      "Defeat the Gatekeeper <strong>Giga-Golem 🗿</strong>, duel your Rival for <strong>3D MEGA EVOLUTION</strong>, and conquer the Awakened Titan <strong>Stormjaw ⚡</strong>!"
    `;
  }

  initAdventure() {
    const starterSpecies = this.selectedStarter.charAt(0).toUpperCase() + this.selectedStarter.slice(1);
    this.party = [createCreature(starterSpecies, 1)];
    this.activeCreatureIndex = 0;

    this.boss1Defeated = false;
    this.rivalDefeated = false;
    this.boss2Defeated = false;
    this.stormjawPhase = 1;
    this.inEvolutionBattle = false;

    this.playerPos.set(0, 0, 6);
    this.playerTarget.set(0, 0, 6);
    this.followerPos.set(0, 0, 7.5);

    this.state = GameState.OVERWORLD;
    this.updatePartyHUD();
    this.updateQuestBanner();
    this.setFaceMood('idle', 'Ready!');
    this.showToast(`✨ Exploring in 3D with ${starterSpecies}!`);
  }

  showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
  }

  updatePartyHUD() {
    const container = document.getElementById('party-hud');
    container.innerHTML = '';
    this.party.forEach((c) => {
      const chip = document.createElement('div');
      chip.className = `party-chip ${c.hp <= 0 ? 'fainted' : ''}`;
      const icon = c.species.includes('Flame') || c.species.includes('Pyro') ? '🔥' : (c.species.includes('Leaf') || c.species.includes('Flora') || c.species.includes('Thorn') ? '🌿' : (c.species.includes('Aqua') || c.species.includes('Hydro') || c.species.includes('Levia') ? '💧' : '⚡'));
      chip.innerHTML = `
        <span>${icon} <strong>${c.species}</strong> Lv.${c.level}</span>
        <span style="color: ${c.hp <= c.maxHp * 0.25 ? '#ef4444' : '#22c55e'}">${c.hp}/${c.maxHp}</span>
      `;
      container.appendChild(chip);
    });
  }

  // --- 3D PLAYER MOVEMENT & TRIGGER CHECKS ---
  stepPlayer(dx, dz) {
    if (this.moveCooldown > 0) return;

    const stepSize = 1.0;
    const nextX = Math.max(-7.5, Math.min(7.5, this.playerPos.x + dx * stepSize));
    const nextZ = Math.max(-13.5, Math.min(11, this.playerPos.z + dz * stepSize));

    // Chapter 1 Gatekeeper Check: Giga-Golem at z = -4.5
    if (!this.boss1Defeated && nextZ <= -4.2) {
      this.triggerEncounter(createCreature('GigaGolem'));
      this.moveCooldown = 0.3;
      return;
    }

    // Chapter 1.5 Evolution Duel Check: Rival Sky at z = -6.0
    if (this.boss1Defeated && !this.rivalDefeated && nextZ <= -6.0) {
      this.triggerRivalEvolutionDuel();
      this.moveCooldown = 0.3;
      return;
    }

    // Chapter 2 Final Boss Check: Awakened Titan Stormjaw at z = -11.5
    if (this.rivalDefeated && !this.boss2Defeated && nextZ <= -11.5) {
      this.stormjawPhase = 1;
      this.triggerEncounter(createCreature('Stormjaw'));
      this.moveCooldown = 0.3;
      return;
    }

    // Follower follows previous spot
    this.followerPos.copy(this.playerPos);

    this.playerPos.set(nextX, 0, nextZ);
    this.isMoving = true;
    this.moveCooldown = 0.16;

    // Turn character towards walking direction
    if (dx !== 0 || dz !== 0) {
      this.playerRotation = Math.atan2(dx, dz);
      this.trainerMesh.rotation.y = this.playerRotation;
    }

    // Check Healing Spring
    if (this.playerPos.distanceTo(new THREE.Vector3(6, 0, 5)) < 2.2) {
      this.healParty();
      return;
    }

    // Check Roaming Wild Monster bump
    this.wildMeshes.forEach(w => {
      if (this.playerPos.distanceTo(w.pos) < 1.4) {
        this.triggerEncounter(createCreature(w.species, w.level));
      }
    });

    // Random encounter in tall grass / gorge dust
    if (Math.abs(this.playerPos.x) > 2.2 && (this.playerPos.z < 4 && this.playerPos.z > -10)) {
      if (Math.random() < 0.14) {
        let species = 'Leafbit';
        let lvl = 1;
        if (this.playerPos.z > 0) {
          species = Math.random() < 0.5 ? 'Leafbit' : (Math.random() < 0.5 ? 'Aquapup' : 'Voltling');
          lvl = Math.random() < 0.3 ? 2 : 1;
        } else {
          species = Math.random() < 0.5 ? 'Stoneclaw' : 'Thunderbeast';
          lvl = 3;
        }
        this.triggerEncounter(createCreature(species, lvl));
      }
    }
  }

  triggerRivalEvolutionDuel() {
    sound.playAlert();
    this.setFaceMood('attack', 'Rival Challenge!');
    this.showToast("⚔️ Rival Sky challenges you to a 3D Evolution Duel!");

    setTimeout(() => {
      let rivalSpecies = 'Hydrofang';
      if (this.activeCreature.type.includes('Nature')) rivalSpecies = 'Pyrowhisker';
      else if (this.activeCreature.type.includes('Water')) rivalSpecies = 'Thornhare';

      const rivalPet = createCreature(rivalSpecies, 4);
      rivalPet.name = `Rival's ${rivalSpecies}`;
      this.inEvolutionBattle = true;
      this.startBattle(rivalPet);
      this.setBattleMsg(`Rival Sky: "Show me the bond with your starter! Let's trigger MEGA EVOLUTION!"`);
    }, 600);
  }

  interactFacing() {
    // Healing spring
    if (this.playerPos.distanceTo(new THREE.Vector3(6, 0, 5)) < 2.5) {
      this.healParty();
      return;
    }

    // Follower interaction
    sound.playHeal();
    this.setFaceMood('cheer', 'Happy Companion!');
    this.showToast(`❤️ ${this.activeCreature.name} happily circled around your feet in 3D!`);
  }

  healParty() {
    this.party.forEach(c => c.hp = c.maxHp);
    sound.playHeal();
    this.updatePartyHUD();
    this.setFaceMood('cheer', 'Restored!');
    this.showToast("💖 Full HP restored in the Crystal Spring!");
  }

  reviveParty() {
    document.getElementById('gameover-screen').classList.add('hidden');
    this.playerPos.set(6, 0, 6);
    this.followerPos.set(6, 0, 7.5);
    this.party.forEach(c => c.hp = c.maxHp);
    this.updatePartyHUD();
    sound.playHeal();
    this.state = GameState.OVERWORLD;
    this.showToast("Revived at the 3D Healing Spring! Train more before challenging the Titans!");
  }

  // --- 3D BATTLE SYSTEM WITH 3/4 OVER-THE-SHOULDER PERSPECTIVE ---
  triggerEncounter(enemyCreature) {
    sound.playAlert();
    this.setFaceMood('attack', 'Battle Ready!');

    const flash = document.getElementById('encounter-flash');
    flash.classList.remove('flash');
    void flash.offsetWidth;
    flash.classList.add('flash');

    setTimeout(() => {
      this.startBattle(enemyCreature);
    }, 500);
  }

  startBattle(enemyCreature) {
    this.state = GameState.BATTLE;
    this.currentBattle = { enemy: enemyCreature, turn: 'player' };

    // Hide overworld follower to prevent duplicate pet clutter
    if (this.followerMesh) this.followerMesh.visible = false;

    // 1. Create clean Battle Stage Arena Disc
    if (this.battleArenaDisk) this.scene.remove(this.battleArenaDisk);
    const arenaGeo = new THREE.CylinderGeometry(5.2, 5.5, 0.08, 36);
    this.battleArenaDisk = new THREE.Mesh(
      arenaGeo,
      new THREE.MeshLambertMaterial({ color: 0x1e293b })
    );
    this.battleArenaDisk.position.set(0.1, 0.04, 0.5);
    this.scene.add(this.battleArenaDisk);

    // Arena concentric ring line
    const ringGeo = new THREE.RingGeometry(3.5, 3.65, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringDecal = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x475569, side: THREE.DoubleSide }));
    ringDecal.position.set(0.1, 0.085, 0.5);
    this.battleArenaDisk.add(ringDecal);

    // 2. Create Glowing Battle Pedestals (Player Cyan, Enemy Red)
    if (this.playerPlatform) this.scene.remove(this.playerPlatform);
    if (this.enemyPlatform) this.scene.remove(this.enemyPlatform);

    const platGeo = new THREE.CylinderGeometry(1.25, 1.35, 0.1, 24);
    this.playerPlatform = new THREE.Mesh(
      platGeo,
      new THREE.MeshLambertMaterial({ color: 0x0284c7, emissive: 0x0369a1 })
    );
    this.playerPlatform.position.set(-1.0, 0.09, 1.4);
    this.scene.add(this.playerPlatform);

    this.enemyPlatform = new THREE.Mesh(
      platGeo,
      new THREE.MeshLambertMaterial({ color: 0xb91c1c, emissive: 0x991b1b })
    );
    this.enemyPlatform.position.set(1.4, 0.09, -0.4);
    this.scene.add(this.enemyPlatform);

    // 3. Move Trainer to 3D Battle Command Position (Lower-Left foreground)
    this.trainerMesh.position.set(-2.3, 0.0, 2.6);
    this.trainerMesh.rotation.y = Math.PI * 0.32; // Face towards battlefield & enemy!
    if (this.trainerMesh.leftArm) this.trainerMesh.leftArm.rotation.x = 0;
    if (this.trainerMesh.rightArm) this.trainerMesh.rightArm.rotation.x = 0;

    // 4. Spawn 3D Player Creature on Pedestal (In front of Martin)
    if (this.battlePlayerPet) this.scene.remove(this.battlePlayerPet);
    this.battlePlayerPet = create3DCreatureMesh(this.activeCreature.species);
    this.battlePlayerPet.position.set(-1.0, 0.14, 1.4);
    this.battlePlayerPet.rotation.y = Math.PI * 0.32;
    this.battlePlayerPet.scale.setScalar(1.25);
    this.scene.add(this.battlePlayerPet);

    // 5. Spawn 3D Enemy Creature on Pedestal (Upper-Right background)
    if (this.battleEnemyPet) this.scene.remove(this.battleEnemyPet);
    this.battleEnemyPet = create3DCreatureMesh(enemyCreature.species);
    this.battleEnemyPet.position.set(1.4, 0.14, -0.4);
    this.battleEnemyPet.rotation.y = -Math.PI * 0.68; // Face towards player!
    const enemyScale = enemyCreature.species === 'Stormjaw' ? 1.6 : (enemyCreature.species === 'GigaGolem' ? 1.4 : 1.25);
    this.battleEnemyPet.scale.setScalar(enemyScale);
    this.scene.add(this.battleEnemyPet);

    // 6. CINEMATIC 3/4 OVER-THE-SHOULDER PERSPECTIVE (100% FIXED, ZERO SHAKE)
    this.camera.position.set(-2.6, 2.4, 4.4);
    this.camera.lookAt(0.7, 1.0, 0.2);

    // Reset battle menus
    document.getElementById('battle-screen').classList.remove('hidden');
    document.getElementById('battle-actions').classList.remove('hidden');
    document.getElementById('battle-moves').classList.add('hidden');

    this.updateBattleUI();

    if (enemyCreature.species === 'GigaGolem') {
      sound.playBossRoar();
      this.setBattleMsg(`🗿 Giga-Golem awakens with a stone roar! Defeat it to open the Gorge!`);
    } else if (enemyCreature.species === 'Stormjaw') {
      sound.playBossRoar();
      this.setBattleMsg(`⚡ STORMJAW THE TITAN CALLS DOWN LIGHTNING!`);
    } else if (this.inEvolutionBattle) {
      sound.playSelect();
      this.setBattleMsg(`⚔️ Rival Sky: "Show me your bond! Win this to unleash 3D Mega Evolution!"`);
    } else {
      sound.playSelect();
      this.setBattleMsg(`A wild 3D ${enemyCreature.name} appeared!`);
    }

    this.setActionsDisabled(false);
  }

  updateBattleUI() {
    const battle = this.currentBattle;
    if (!battle) return;

    const enemy = battle.enemy;
    const player = this.activeCreature;

    // Enemy HUD
    document.getElementById('enemy-name').textContent = enemy.name;
    document.getElementById('enemy-level').textContent = `Lv. ${enemy.level}`;
    const enemyHpPercent = Math.max(0, (enemy.hp / enemy.maxHp) * 100);
    const enemyHpFill = document.getElementById('enemy-hp-fill');
    enemyHpFill.style.width = `${enemyHpPercent}%`;
    enemyHpFill.style.backgroundColor = enemyHpPercent > 50 ? '#22c55e' : (enemyHpPercent > 25 ? '#f59e0b' : '#ef4444');
    document.getElementById('enemy-hp-text').textContent = `${Math.max(0, enemy.hp)} / ${enemy.maxHp} HP`;

    // Player HUD
    document.getElementById('player-name').textContent = player.name;
    document.getElementById('player-level').textContent = `Lv. ${player.level}`;
    const playerHpPercent = Math.max(0, (player.hp / player.maxHp) * 100);
    const playerHpFill = document.getElementById('player-hp-fill');
    playerHpFill.style.width = `${playerHpPercent}%`;
    playerHpFill.style.backgroundColor = playerHpPercent > 50 ? '#22c55e' : (playerHpPercent > 25 ? '#f59e0b' : '#ef4444');
    document.getElementById('player-hp-text').textContent = `${Math.max(0, player.hp)} / ${player.maxHp} HP`;

    const xpPercent = Math.min(100, (player.xp / player.xpNeeded) * 100);
    document.getElementById('player-xp-fill').style.width = `${xpPercent}%`;

    // Populate Move Selection Menu
    const availableMoves = (player.moves || []).filter(m => (player.level || 1) >= (m.minLevel || 1));
    for (let i = 0; i < 3; i++) {
      const mBtn = document.getElementById(`btn-move-${i}`);
      if (!mBtn) continue;
      if (availableMoves[i]) {
        const m = availableMoves[i];
        mBtn.style.display = 'flex';
        mBtn.innerHTML = `<span class="m-name">${m.icon || '⚔️'} ${m.name}</span><span class="m-info">${m.type} • Pwr ${Math.round((m.power || 1.0) * 100)}%</span>`;
      } else {
        mBtn.style.display = 'none';
      }
    }

    const switchBtn = document.getElementById('btn-switch');
    if (switchBtn) switchBtn.disabled = this.party.length <= 1;
  }

  setBattleMsg(msg) {
    document.getElementById('battle-msg').textContent = msg;
  }

  setActionsDisabled(disabled) {
    this.isBattleBusy = disabled;
    const actionButtons = document.querySelectorAll('#battle-actions button');
    actionButtons.forEach(b => {
      if (b.id === 'btn-switch' && this.party.length <= 1) b.disabled = true;
      else b.disabled = disabled;
    });
    const moveButtons = document.querySelectorAll('#battle-moves button');
    moveButtons.forEach(b => b.disabled = disabled);
  }

  shakeTarget(targetType) {
    const targetMesh = (targetType === 'enemy') ? this.battleEnemyPet : this.battlePlayerPet;
    if (targetMesh) {
      const baseY = targetMesh.position.y;
      targetMesh.position.y = baseY + 0.22;
      setTimeout(() => { if (targetMesh) targetMesh.position.y = baseY; }, 120);
    }
  }

  spawnDamageText(text, targetType, isCrit = false, isHeal = false, isSuper = false) {
    const layer = document.getElementById('damage-layer');
    const el = document.createElement('div');
    el.className = `float-damage ${isCrit ? 'crit' : ''} ${isHeal ? 'heal' : ''}`;
    if (isSuper) {
      el.style.color = '#f59e0b';
      el.style.fontSize = '22px';
    }
    el.textContent = text;

    if (targetType === 'enemy') {
      el.style.top = '75px';
      el.style.right = '80px';
    } else {
      el.style.bottom = '95px';
      el.style.left = '80px';
    }

    layer.appendChild(el);
    setTimeout(() => el.remove(), 950);
  }

  getElementalMultiplier(moveType, targetType) {
    if (!moveType || !targetType) return 1.0;
    const m = moveType.toLowerCase();
    const t = targetType.toLowerCase();
    // Super Effective
    if (m.includes('fire') && t.includes('nature')) return 1.5;
    if (m.includes('nature') && (t.includes('water') || t.includes('rock'))) return 1.5;
    if (m.includes('water') && (t.includes('fire') || t.includes('rock'))) return 1.5;
    if (m.includes('electric') && (t.includes('water') || t.includes('dragon'))) return 1.5;
    if (m.includes('rock') && (t.includes('fire') || t.includes('electric'))) return 1.5;
    if (m.includes('dragon') && t.includes('dragon')) return 1.5;
    if (m.includes('ultimate')) return 1.4;

    // Resistances
    if (m.includes('fire') && (t.includes('water') || t.includes('rock'))) return 0.7;
    if (m.includes('water') && t.includes('nature')) return 0.7;
    if (m.includes('nature') && t.includes('fire')) return 0.7;
    return 1.0;
  }

  handleBattleAttack(chosenMove = null) {
    if (this.isBattleBusy) return;
    this.setActionsDisabled(true);
    this.setFaceMood('attack', 'Unleashing Attack!');

    const player = this.activeCreature;
    const enemy = this.currentBattle.enemy;
    const availableMoves = (player.moves || []).filter(m => (player.level || 1) >= (m.minLevel || 1));
    const move = chosenMove || availableMoves[0] || { name: 'Tackle', power: 1.0, type: 'Normal', icon: '💥' };

    this.setBattleMsg(`${player.species} used ${move.name}!`);

    // 3D Attack Animation: Martin commands & player creature lunges forward!
    if (this.trainerMesh.rightArm) this.trainerMesh.rightArm.rotation.x = -1.4;
    if (this.battlePlayerPet) {
      this.battlePlayerPet.position.x += 0.4;
      this.battlePlayerPet.position.z -= 0.3;
    }

    setTimeout(() => {
      // Return positions
      if (this.trainerMesh.rightArm) this.trainerMesh.rightArm.rotation.x = 0;
      if (this.battlePlayerPet) {
        this.battlePlayerPet.position.set(-1.0, 0.14, 1.4);
      }

      // Elemental type matching
      let mult = this.getElementalMultiplier(move.type, enemy.type);
      if (mult > 1.0 && player.perks.includes('element_fury')) mult += 0.25;

      const hasCrit = player.perks.includes('crit_master');
      const isCrit = Math.random() < (hasCrit ? 0.38 : 0.18);
      let dmg = Math.round(player.attack * move.power * mult + (Math.random() * 3 - 1));
      if (isCrit) dmg = Math.round(dmg * (hasCrit ? 1.8 : 1.5));
      dmg = Math.max(2, dmg);

      enemy.hp -= dmg;
      if (isCrit) {
        sound.playCrit();
        this.spawnDamageText(`CRIT! -${dmg}`, 'enemy', true);
      } else if (mult > 1.2) {
        sound.playCrit();
        this.spawnDamageText(`SUPER! -${dmg}`, 'enemy', false, false, true);
      } else {
        sound.playHit();
        this.spawnDamageText(`-${dmg}`, 'enemy');
      }

      this.shakeTarget('enemy');

      // Life drain perk
      if (player.perks.includes('life_drain')) {
        const healAmt = Math.round(dmg * 0.4);
        player.hp = Math.min(player.maxHp, player.hp + healAmt);
        this.spawnDamageText(`+${healAmt}`, 'player', false, true);
      }

      this.updateBattleUI();

      if (enemy.hp <= 0) {
        enemy.hp = 0;
        this.updateBattleUI();
        this.setFaceMood('cheer', 'Victory!');
        setTimeout(() => this.onEnemyDefeated(), 700);
      } else {
        setTimeout(() => this.enemyTurn(), 900);
      }
    }, 400);
  }

  handleBattleCapture() {
    if (this.isBattleBusy) return;
    this.setActionsDisabled(true);

    const enemy = this.currentBattle.enemy;
    if (enemy.isBoss) {
      sound.playBossRoar();
      this.setFaceMood('hurt', 'Resisted!');
      this.setBattleMsg(`⚡ The 3D Boss deflected your orb with a roar!`);
      setTimeout(() => this.enemyTurn(), 1400);
      return;
    }

    sound.playCaptureThrow();
    this.setFaceMood('attack', 'Throwing Orb!');
    this.setBattleMsg(`Martin threw a Monster Orb!`);

    const ball = document.createElement('div');
    ball.className = 'ball-throw-anim';
    document.getElementById('battle-arena').appendChild(ball);

    setTimeout(() => {
      ball.remove();
      this.setBattleMsg(`The Orb is wobbling in 3D...`);
      sound.playCaptureWobble();

      setTimeout(() => {
        sound.playCaptureWobble();

        setTimeout(() => {
          const hpPercent = enemy.hp / enemy.maxHp;
          let catchRate = hpPercent <= 0.3 ? 0.95 : (hpPercent <= 0.6 ? 0.65 : 0.25);

          if (Math.random() < catchRate) {
            sound.playCaptureSuccess();
            this.setFaceMood('cheer', 'Caught!');
            this.setBattleMsg(`🎉 Gotcha! 3D ${enemy.name} was caught!`);

            const newTeammate = createCreature(enemy.species, enemy.level);
            newTeammate.hp = enemy.hp;
            this.party.push(newTeammate);
            this.updatePartyHUD();

            setTimeout(() => {
              this.endBattle();
              this.showToast(`✨ ${newTeammate.name} joined your 3D party!`);
            }, 1500);
          } else {
            sound.playHit();
            this.setFaceMood('hurt', 'Broke Free!');
            this.setBattleMsg(`Oh no! ${enemy.species} broke free!`);
            setTimeout(() => this.enemyTurn(), 900);
          }
        }, 600);
      }, 600);
    }, 700);
  }

  handleBattleSwitch() {
    if (this.isBattleBusy || this.party.length <= 1) return;
    sound.playSelect();

    this.activeCreatureIndex = (this.activeCreatureIndex + 1) % this.party.length;
    const newCreature = this.activeCreature;

    // Swap 3D battle pet model live!
    if (this.battlePlayerPet) this.scene.remove(this.battlePlayerPet);
    this.battlePlayerPet = create3DCreatureMesh(newCreature.species);
    this.battlePlayerPet.position.set(-1.0, 0.14, 1.4);
    this.battlePlayerPet.rotation.y = Math.PI * 0.32;
    this.battlePlayerPet.scale.setScalar(1.25);
    this.scene.add(this.battlePlayerPet);

    this.setBattleMsg(`Sent out ${newCreature.name}!`);
    this.updateBattleUI();

    this.setActionsDisabled(true);
    setTimeout(() => this.enemyTurn(), 900);
  }

  handleBattleRun() {
    if (this.isBattleBusy) return;
    const enemy = this.currentBattle.enemy;
    if (enemy.isBoss || this.inEvolutionBattle) {
      sound.playTone(150, 'sawtooth', 0.2);
      this.setBattleMsg(`You cannot run from this Boss / Rival duel!`);
      return;
    }
    sound.playSelect();
    this.setBattleMsg(`Got away safely!`);
    this.setActionsDisabled(true);
    setTimeout(() => this.endBattle(), 700);
  }

  enemyTurn() {
    const enemy = this.currentBattle.enemy;
    const player = this.activeCreature;

    const move = enemy.moves[Math.floor(Math.random() * enemy.moves.length)] || enemy.moves[0];
    this.setBattleMsg(`${enemy.name} used ${move.name}!`);

    setTimeout(() => {
      // Enemy creature lunges forward towards player
      if (this.battleEnemyPet) {
        this.battleEnemyPet.position.x -= 0.4;
        this.battleEnemyPet.position.z += 0.3;
        setTimeout(() => {
          if (this.battleEnemyPet) {
            this.battleEnemyPet.position.set(1.4, 0.14, -0.4);
          }
        }, 180);
      }

      let dmg = Math.round(enemy.attack * move.power + (Math.random() * 2 - 1));
      if (player.perks.includes('iron_shield')) dmg = Math.round(dmg * 0.7);
      dmg = Math.max(2, dmg);

      player.hp -= dmg;
      sound.playHit();
      this.shakeTarget('player');
      this.setFaceMood('hurt', 'Taking Hit!');
      this.spawnDamageText(`-${dmg}`, 'player');
      this.updateBattleUI();
      this.updatePartyHUD();

      if (player.hp <= 0) {
        player.hp = 0;
        this.updateBattleUI();
        setTimeout(() => this.onPlayerCreatureFainted(), 600);
      } else {
        setTimeout(() => {
          this.setBattleMsg(`What will ${player.species} do?`);
          this.setActionsDisabled(false);
          this.setFaceMood('idle', 'Focused');
        }, 600);
      }
    }, 400);
  }

  onPlayerCreatureFainted() {
    const player = this.activeCreature;
    sound.playTone(120, 'sawtooth', 0.4);
    this.setFaceMood('hurt', 'Fainted!');
    this.setBattleMsg(`${player.name} fainted!`);

    const nextAlive = this.party.findIndex(c => c.hp > 0);
    if (nextAlive !== -1) {
      setTimeout(() => {
        this.activeCreatureIndex = nextAlive;
        const next = this.activeCreature;

        // Swap 3D battle pet model live!
        if (this.battlePlayerPet) this.scene.remove(this.battlePlayerPet);
        this.battlePlayerPet = create3DCreatureMesh(next.species);
        this.battlePlayerPet.position.set(-1.0, 0.14, 1.4);
        this.battlePlayerPet.rotation.y = Math.PI * 0.32;
        this.battlePlayerPet.scale.setScalar(1.25);
        this.scene.add(this.battlePlayerPet);

        this.setBattleMsg(`Go! ${next.name}!`);
        this.updateBattleUI();
        this.setActionsDisabled(false);
      }, 1000);
    } else {
      setTimeout(() => {
        document.getElementById('battle-screen').classList.add('hidden');
        document.getElementById('gameover-screen').classList.remove('hidden');
        this.state = GameState.GAMEOVER;
      }, 1200);
    }
  }

  onEnemyDefeated() {
    const enemy = this.currentBattle.enemy;

    // Boss 1: Giga-Golem
    if (enemy.species === 'GigaGolem') {
      this.boss1Defeated = true;
      this.scene.remove(this.golemMesh); // Golem crumbles in 3D!
      sound.playVictory();
      this.updateQuestBanner();
      this.setBattleMsg(`🗿 Giga-Golem crumbled! The Mountain Gate through Whispering Gorge is open!`);
      setTimeout(() => {
        this.checkEvolutionOrPerk(this.activeCreature);
      }, 1400);
      return;
    }

    // Chapter 1.5: Rival Evolution Duel Defeated
    if (this.inEvolutionBattle) {
      this.inEvolutionBattle = false;
      this.rivalDefeated = true;
      sound.playVictory();
      this.updateQuestBanner();
      this.setBattleMsg(`⚔️ Rival defeated! The Ancient Keystone is glowing with blinding 3D light!`);
      setTimeout(() => {
        this.triggerMegaEvolution(this.activeCreature);
      }, 1400);
      return;
    }

    // Chapter 2 Final Boss: Stormjaw (Dual-Phase)
    if (enemy.species === 'Stormjaw') {
      if (this.stormjawPhase === 1) {
        // Trigger Phase 2: Titan Awakening!
        this.stormjawPhase = 2;
        sound.playBossRoar();
        this.setFaceMood('hurt', 'Titan Awakens!');
        enemy.hp = 110;
        enemy.maxHp = 110;
        enemy.attack = 22;
        enemy.name = 'AWAKENED STORMJAW ⚡⚡';
        this.setBattleMsg(`⚡ TITAN AWAKENING! Stormjaw calls down purple cataclysm lightning and regenerates to 100% HP!`);
        this.updateBattleUI();
        setTimeout(() => {
          this.setBattleMsg(`What will ${this.activeCreature.species} do against Awakened Stormjaw?`);
          this.setActionsDisabled(false);
        }, 1800);
        return;
      } else {
        // Phase 2 Defeated: Victory!
        this.boss2Defeated = true;
        sound.playVictory();
        this.updateQuestBanner();
        this.setFaceMood('cheer', 'Champion!');
        this.setBattleMsg(`⚡ AWAKENED TITAN STORMJAW CONQUERED! MARTIN IS THE ULTIMATE CHAMPION!`);
        setTimeout(() => {
          document.getElementById('battle-screen').classList.add('hidden');
          document.getElementById('win-screen').classList.remove('hidden');
          this.state = GameState.WIN;
        }, 1800);
        return;
      }
    }

    // Standard Wild Monster Defeat
    sound.playTone(587, 'triangle', 0.25);
    const xp = 28 * enemy.level;
    this.setBattleMsg(`${enemy.name} was defeated! Gained ${xp} XP!`);

    const player = this.activeCreature;
    player.xp += xp;

    if (player.xp >= player.xpNeeded) {
      player.xp -= player.xpNeeded;
      player.level += 1;
      player.maxHp += 8;
      player.hp = player.maxHp;
      player.attack += 3;
      player.xpNeeded = Math.round(player.xpNeeded * 1.5);

      setTimeout(() => this.checkEvolutionOrPerk(player), 800);
    } else {
      setTimeout(() => this.endBattle(), 1100);
    }
  }

  checkEvolutionOrPerk(player) {
    if (player.level >= 2 && player.evolvesTo && !this.rivalDefeated) {
      // Natural Stage 2 evolution if ready
      this.triggerStage2Evolution(player);
    } else {
      this.openPerkChoiceModal(player);
    }
  }

  triggerStage2Evolution(creature) {
    this.state = GameState.EVOLUTION;
    sound.playEvolutionFanfare();

    const targetSpecies = creature.evolvesTo;
    const modal = document.getElementById('evolution-modal');
    modal.classList.remove('hidden');

    document.getElementById('evo-title').textContent = `WHAT? ${creature.species} IS EVOLVING!`;
    document.getElementById('evo-desc').innerHTML = `
      🎉 <strong>Stage 2 Evolution!</strong> ${creature.species} evolved into <strong>${targetSpecies.toUpperCase()}</strong> in full 3D!<br>
      Gained +22 Max HP, +8 Attack, and unlocked a new specialized combat move!
    `;

    const evolvedObj = createCreature(targetSpecies, creature.level);
    creature.species = evolvedObj.species;
    creature.name = evolvedObj.name;
    creature.maxHp += 22;
    creature.hp = creature.maxHp;
    creature.attack += 8;
    creature.moves = evolvedObj.moves;
    creature.evolvesTo = evolvedObj.evolvesTo;

    // Upgrade 3D follower model in the world
    this.scene.remove(this.followerMesh);
    this.followerMesh = create3DCreatureMesh(targetSpecies);
    this.followerMesh.position.copy(this.followerPos);
    this.scene.add(this.followerMesh);

    this.updatePartyHUD();
  }

  triggerMegaEvolution(creature) {
    this.state = GameState.EVOLUTION;
    sound.playEvolutionFanfare();

    // Determine Stage 3 Mega Form
    let targetSpecies = 'Pyrostryke';
    if (creature.type.includes('Nature') || creature.species.includes('Leaf') || creature.species.includes('Thorn')) {
      targetSpecies = 'Floraknight';
    } else if (creature.type.includes('Water') || creature.species.includes('Aqua') || creature.species.includes('Hydro')) {
      targetSpecies = 'Leviaking';
    }

    const modal = document.getElementById('evolution-modal');
    modal.classList.remove('hidden');

    document.getElementById('evo-title').textContent = `⭐ 3D MEGA EVOLUTION: ${targetSpecies.toUpperCase()}! ⭐`;
    document.getElementById('evo-desc').innerHTML = `
      🌟 <strong>THE ANCIENT KEYSTONE RESONATED!</strong><br>
      ${creature.species} transformed into the colossal 3D Mega Titan <strong>${targetSpecies.toUpperCase()}</strong>!<br>
      Gained Draconic Wings/Armor, +40 Max HP, +14 Attack, and learned the ultimate finisher!
    `;

    const evolvedObj = createCreature(targetSpecies, Math.max(5, creature.level + 2));
    creature.species = evolvedObj.species;
    creature.name = evolvedObj.name;
    creature.level = evolvedObj.level;
    creature.maxHp += 40;
    creature.hp = creature.maxHp;
    creature.attack += 14;
    creature.moves = evolvedObj.moves;
    delete creature.evolvesTo;

    // Upgrade 3D follower model in overworld
    this.scene.remove(this.followerMesh);
    this.followerMesh = create3DCreatureMesh(targetSpecies);
    this.followerMesh.position.copy(this.followerPos);
    this.scene.add(this.followerMesh);

    this.updatePartyHUD();
  }

  openPerkChoiceModal(creature) {
    this.state = GameState.PERK;
    sound.playLevelUp();

    const modal = document.getElementById('perk-modal');
    modal.classList.remove('hidden');

    document.getElementById('perk-modal-title').textContent = `LEVEL UP! CHOOSE A PERK FOR ${creature.species.toUpperCase()}`;
    const container = document.getElementById('perk-cards-container');
    container.innerHTML = '';

    const available = ALL_PERKS.filter(p => !creature.perks.includes(p.id));
    const choices = available.slice(0, 3);

    choices.forEach(perk => {
      const card = document.createElement('div');
      card.className = 'perk-card';
      card.innerHTML = `
        <div class="perk-icon">${perk.icon}</div>
        <div>
          <div class="perk-name">${perk.name}</div>
          <div class="perk-desc">${perk.desc}</div>
        </div>
      `;
      card.onclick = () => {
        sound.playSelect();
        creature.perks.push(perk.id);
        modal.classList.add('hidden');
        this.endBattle();
        this.showToast(`⭐ ${creature.species} acquired ${perk.name}!`);
      };
      container.appendChild(card);
    });
  }

  endBattle() {
    document.getElementById('battle-screen').classList.add('hidden');
    document.getElementById('evolution-modal').classList.add('hidden');
    document.getElementById('perk-modal').classList.add('hidden');

    // Clean up temporary 3D battle meshes
    if (this.battlePlayerPet) { this.scene.remove(this.battlePlayerPet); this.battlePlayerPet = null; }
    if (this.battleEnemyPet) { this.scene.remove(this.battleEnemyPet); this.battleEnemyPet = null; }
    if (this.playerPlatform) { this.scene.remove(this.playerPlatform); this.playerPlatform = null; }
    if (this.enemyPlatform) { this.scene.remove(this.enemyPlatform); this.enemyPlatform = null; }
    if (this.battleArenaDisk) { this.scene.remove(this.battleArenaDisk); this.battleArenaDisk = null; }

    // Restore overworld follower
    if (this.followerMesh) this.followerMesh.visible = true;

    // Return trainer to overworld coordinates
    this.trainerMesh.position.copy(this.playerPos);
    this.trainerMesh.rotation.y = this.playerRotation;
    if (this.trainerMesh.leftArm) this.trainerMesh.leftArm.rotation.x = 0;
    if (this.trainerMesh.rightArm) this.trainerMesh.rightArm.rotation.x = 0;

    // Restore camera to stable overworld overhead view
    const isCloser = this.cameraMode === 'closeup';
    const camOffsetY = isCloser ? 6.5 : 9.5;
    const camOffsetZ = isCloser ? 5.5 : 8.0;
    this.camera.position.set(
      this.playerPos.x,
      this.playerPos.y + camOffsetY,
      this.playerPos.z + camOffsetZ
    );
    this.camera.lookAt(
      this.playerPos.x,
      this.playerPos.y + 0.8,
      this.playerPos.z
    );

    this.currentBattle = null;
    this.state = GameState.OVERWORLD;
    this.updatePartyHUD();
  }

  // --- RENDER LOOP & 3D ANIMATIONS ---
  renderLoop() {
    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    if (this.moveCooldown > 0) this.moveCooldown -= delta;

    // 1. Overworld Trainer Animation (Smooth responsive walking without jitter)
    if (this.trainerMesh && (this.state === GameState.OVERWORLD || this.state === GameState.STORY)) {
      this.trainerMesh.position.lerp(this.playerPos, 0.25);

      if (this.isMoving) {
        const swing = Math.sin(time * 12) * 0.4;
        if (this.trainerMesh.leftArm) this.trainerMesh.leftArm.rotation.x = swing;
        if (this.trainerMesh.rightArm) this.trainerMesh.rightArm.rotation.x = -swing;
        if (this.trainerMesh.leftLeg) this.trainerMesh.leftLeg.rotation.x = -swing;
        if (this.trainerMesh.rightLeg) this.trainerMesh.rightLeg.rotation.x = swing;

        if (this.playerPos.distanceTo(this.trainerMesh.position) < 0.05) {
          this.trainerMesh.position.copy(this.playerPos);
          this.isMoving = false;
        }
      } else {
        if (this.trainerMesh.leftArm) this.trainerMesh.leftArm.rotation.x = 0;
        if (this.trainerMesh.rightArm) this.trainerMesh.rightArm.rotation.x = 0;
        if (this.trainerMesh.leftLeg) this.trainerMesh.leftLeg.rotation.x = 0;
        if (this.trainerMesh.rightLeg) this.trainerMesh.rightLeg.rotation.x = 0;
        if (this.trainerMesh.headGroup) this.trainerMesh.headGroup.rotation.y = 0;
      }
    }

    // 2. Follower Pet Animation (Smooth follow behind trainer at ground level)
    if (this.followerMesh && (this.state === GameState.OVERWORLD || this.state === GameState.STORY)) {
      this.followerMesh.position.lerp(this.followerPos, 0.2);
      this.followerMesh.position.y = 0;

      if (this.followerMesh.tail) {
        this.followerMesh.tail.rotation.z = Math.sin(time * 8) * 0.2;
      }
      if (this.followerMesh.wingL && this.followerMesh.wingR) {
        this.followerMesh.wingL.rotation.z = Math.sin(time * 8) * 0.25;
        this.followerMesh.wingR.rotation.z = -Math.sin(time * 8) * 0.25;
      }
    }

    // 3. Boss Floating & Thunder Light Pulsing
    if (this.stormjawMesh) {
      this.stormjawMesh.position.y = 2.0 + Math.sin(time * 3) * 0.2;
    }
    if (this.golemMesh) {
      this.golemMesh.rotation.y = Math.sin(time * 1.2) * 0.15;
    }
    if (this.springMesh) {
      this.springMesh.rotation.y = time * 0.2;
    }

    // 4. Wild Monsters Hop
    this.wildMeshes.forEach((w, i) => {
      w.mesh.position.y = Math.abs(Math.sin(time * 4 + i)) * 0.12;
      w.mesh.rotation.y = Math.sin(time * 2 + i) * 0.3;
    });

    // 5. ROCK-SOLID 3D CAMERA TRACKING
    if (this.state === GameState.OVERWORLD || this.state === GameState.STORY) {
      const charPos = this.trainerMesh.position;
      const isCloser = this.cameraMode === 'closeup';
      const camOffsetY = isCloser ? 6.5 : 9.5;
      const camOffsetZ = isCloser ? 5.5 : 8.0;

      // Lockstep camera tracking - vector is 100% constant, zero rotational jitter
      this.camera.position.set(
        charPos.x,
        charPos.y + camOffsetY,
        charPos.z + camOffsetZ
      );
      this.camera.lookAt(
        charPos.x,
        charPos.y + 0.8,
        charPos.z
      );
    } else if (this.state === GameState.BATTLE) {
      // 100% Fixed & Stable Cinematic 3/4 Battle Camera! Zero sway, zero shake!
      this.camera.position.set(-2.6, 2.4, 4.4);
      this.camera.lookAt(0.7, 1.0, 0.2);
    }

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.renderLoop.bind(this));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game3D();
});
