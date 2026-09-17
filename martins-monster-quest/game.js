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

// 2. 3D Creatures (Base & Mega Evolutions & Bosses)
function create3DCreatureMesh(species) {
  const group = new THREE.Group();

  if (species === 'Flameling') {
    // Cute Orange Fire Cub
    const bodyGeo = new THREE.SphereGeometry(0.32, 14, 14);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xf97316 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.35;
    body.castShadow = true;
    group.add(body);

    const bellyGeo = new THREE.SphereGeometry(0.24, 12, 12);
    const belly = new THREE.Mesh(bellyGeo, new THREE.MeshLambertMaterial({ color: 0xfef08a }));
    belly.position.set(0, 0.33, 0.14);
    group.add(belly);

    // Head
    const headGeo = new THREE.SphereGeometry(0.26, 14, 14);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(0, 0.65, 0.05);
    group.add(head);

    // Horns
    const hornGeo = new THREE.ConeGeometry(0.07, 0.2, 8);
    const hornL = new THREE.Mesh(hornGeo, new THREE.MeshLambertMaterial({ color: 0xef4444 }));
    hornL.position.set(-0.14, 0.86, 0.02);
    hornL.rotation.z = -0.3;
    group.add(hornL);
    const hornR = new THREE.Mesh(hornGeo, new THREE.MeshLambertMaterial({ color: 0xef4444 }));
    hornR.position.set(0.14, 0.86, 0.02);
    hornR.rotation.z = 0.3;
    group.add(hornR);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.1, 0.68, 0.26);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.1, 0.68, 0.26);
    group.add(eyeR);

    // Animated Flaming Tail
    const tailGeo = new THREE.ConeGeometry(0.1, 0.35, 8);
    tailGeo.rotateX(-Math.PI / 3);
    const tail = new THREE.Mesh(tailGeo, new THREE.MeshLambertMaterial({ color: 0xef4444, emissive: 0xf59e0b }));
    tail.position.set(0, 0.35, -0.35);
    group.add(tail);
    group.tail = tail;

    // Tail Light
    const tailLight = new THREE.PointLight(0xf97316, 0.8, 2.5);
    tailLight.position.set(0, 0.45, -0.4);
    group.add(tailLight);

  } else if (species === 'Pyrostryke') {
    // Mega Evolution: Winged Fire Dragon!
    const bodyGeo = new THREE.CylinderGeometry(0.35, 0.25, 0.8, 12);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xdc2626 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.7;
    body.castShadow = true;
    group.add(body);

    // Golden Armor Chest
    const armorGeo = new THREE.BoxGeometry(0.4, 0.5, 0.4);
    const armor = new THREE.Mesh(armorGeo, new THREE.MeshLambertMaterial({ color: 0xfacc15, emissive: 0x78350f }));
    armor.position.set(0, 0.72, 0.1);
    group.add(armor);

    // Dragon Head & Horns
    const headGeo = new THREE.ConeGeometry(0.32, 0.65, 8);
    headGeo.rotateX(Math.PI / 2);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(0, 1.25, 0.25);
    group.add(head);

    const hornGeo = new THREE.ConeGeometry(0.08, 0.4, 8);
    const hornL = new THREE.Mesh(hornGeo, new THREE.MeshLambertMaterial({ color: 0xfacc15 }));
    hornL.position.set(-0.25, 1.45, -0.05);
    hornL.rotation.z = -0.4;
    group.add(hornL);
    const hornR = new THREE.Mesh(hornGeo, new THREE.MeshLambertMaterial({ color: 0xfacc15 }));
    hornR.position.set(0.25, 1.45, -0.05);
    hornR.rotation.z = 0.4;
    group.add(hornR);

    // Giant Wings
    const wingGeo = new THREE.BoxGeometry(0.8, 0.5, 0.05);
    const wingMat = new THREE.MeshLambertMaterial({ color: 0xf97316, emissive: 0x9a3412 });
    const wingL = new THREE.Mesh(wingGeo, wingMat);
    wingL.position.set(-0.6, 0.95, -0.15);
    wingL.rotation.y = 0.3;
    group.add(wingL);
    const wingR = new THREE.Mesh(wingGeo, wingMat);
    wingR.position.set(0.6, 0.95, -0.15);
    wingR.rotation.y = -0.3;
    group.add(wingR);
    group.wingL = wingL;
    group.wingR = wingR;

  } else if (species === 'Leafbit') {
    // Nature Bunny Sprout
    const bodyGeo = new THREE.SphereGeometry(0.32, 14, 14);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x4ade80 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.35;
    group.add(body);

    // Tall Leaf Ears
    const earGeo = new THREE.BoxGeometry(0.1, 0.45, 0.05);
    const earMat = new THREE.MeshLambertMaterial({ color: 0x16a34a });
    const earL = new THREE.Mesh(earGeo, earMat);
    earL.position.set(-0.16, 0.85, 0);
    earL.rotation.z = -0.2;
    group.add(earL);
    const earR = new THREE.Mesh(earGeo, earMat);
    earR.position.set(0.16, 0.85, 0);
    earR.rotation.z = 0.2;
    group.add(earR);

    // Cheeks & Eyes
    const eyeGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const eyeL = new THREE.Mesh(eyeGeo, new THREE.MeshBasicMaterial({ color: 0x064e3b }));
    eyeL.position.set(-0.1, 0.42, 0.28);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeo, new THREE.MeshBasicMaterial({ color: 0x064e3b }));
    eyeR.position.set(0.1, 0.42, 0.28);
    group.add(eyeR);

  } else if (species === 'Floraknight') {
    // Evolved Leaf Knight
    const bodyGeo = new THREE.CylinderGeometry(0.35, 0.3, 0.7, 10);
    const body = new THREE.Mesh(bodyGeo, new THREE.MeshLambertMaterial({ color: 0x16a34a }));
    body.position.y = 0.6;
    group.add(body);

    const shieldGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.08, 16);
    shieldGeo.rotateX(Math.PI / 2);
    const shield = new THREE.Mesh(shieldGeo, new THREE.MeshLambertMaterial({ color: 0xf43f5e }));
    shield.position.set(-0.4, 0.65, 0.15);
    group.add(shield);

    const antlersGeo = new THREE.ConeGeometry(0.1, 0.6, 8);
    const antL = new THREE.Mesh(antlersGeo, new THREE.MeshLambertMaterial({ color: 0x22c55e }));
    antL.position.set(-0.25, 1.3, 0);
    antL.rotation.z = -0.3;
    group.add(antL);
    const antR = new THREE.Mesh(antlersGeo, new THREE.MeshLambertMaterial({ color: 0x22c55e }));
    antR.position.set(0.25, 1.3, 0);
    antR.rotation.z = 0.3;
    group.add(antR);

  } else if (species === 'Aquapup') {
    // Water Pup
    const bodyGeo = new THREE.SphereGeometry(0.32, 14, 14);
    const body = new THREE.Mesh(bodyGeo, new THREE.MeshLambertMaterial({ color: 0x38bdf8 }));
    body.position.y = 0.35;
    group.add(body);

    const finGeo = new THREE.BoxGeometry(0.25, 0.08, 0.15);
    const finL = new THREE.Mesh(finGeo, new THREE.MeshLambertMaterial({ color: 0x0284c7 }));
    finL.position.set(-0.35, 0.35, 0);
    group.add(finL);
    const finR = new THREE.Mesh(finGeo, new THREE.MeshLambertMaterial({ color: 0x0284c7 }));
    finR.position.set(0.35, 0.35, 0);
    group.add(finR);

  } else if (species === 'Tidallord') {
    // Evolved Leviathan
    const bodyGeo = new THREE.CylinderGeometry(0.35, 0.25, 0.9, 12);
    const body = new THREE.Mesh(bodyGeo, new THREE.MeshLambertMaterial({ color: 0x0284c7 }));
    body.position.y = 0.7;
    group.add(body);

    const crownGeo = new THREE.ConeGeometry(0.35, 0.35, 6);
    const crown = new THREE.Mesh(crownGeo, new THREE.MeshLambertMaterial({ color: 0x38bdf8, emissive: 0x075985 }));
    crown.position.set(0, 1.4, 0);
    group.add(crown);

  } else if (species === 'GigaGolem') {
    // Boss 1: Massive Stone Golem
    const bodyGeo = new THREE.BoxGeometry(0.8, 0.9, 0.6);
    const body = new THREE.Mesh(bodyGeo, new THREE.MeshLambertMaterial({ color: 0x334155 }));
    body.position.y = 0.8;
    body.castShadow = true;
    group.add(body);

    // Glowing Magma Core
    const coreGeo = new THREE.SphereGeometry(0.18, 12, 12);
    const core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: 0xf97316 }));
    core.position.set(0, 0.85, 0.28);
    group.add(core);

    const shoulderGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const shL = new THREE.Mesh(shoulderGeo, new THREE.MeshLambertMaterial({ color: 0x475569 }));
    shL.position.set(-0.6, 1.1, 0);
    group.add(shL);
    const shR = new THREE.Mesh(shoulderGeo, new THREE.MeshLambertMaterial({ color: 0x475569 }));
    shR.position.set(0.6, 1.1, 0);
    group.add(shR);

  } else if (species === 'Stormjaw') {
    // Final Boss: Thunder Titan Dragon!
    const bodyGeo = new THREE.CylinderGeometry(0.45, 0.35, 1.0, 12);
    const body = new THREE.Mesh(bodyGeo, new THREE.MeshLambertMaterial({ color: 0x4c1d95, emissive: 0x2e1065 }));
    body.position.y = 0.9;
    body.castShadow = true;
    group.add(body);

    // Thunder Horns
    const hornGeo = new THREE.ConeGeometry(0.12, 0.65, 8);
    const hornL = new THREE.Mesh(hornGeo, new THREE.MeshLambertMaterial({ color: 0xfacc15, emissive: 0x854d0e }));
    hornL.position.set(-0.35, 1.7, 0);
    hornL.rotation.z = -0.35;
    group.add(hornL);
    const hornR = new THREE.Mesh(hornGeo, new THREE.MeshLambertMaterial({ color: 0xfacc15, emissive: 0x854d0e }));
    hornR.position.set(0.35, 1.7, 0);
    hornR.rotation.z = 0.35;
    group.add(hornR);

    // Glowing Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), eyeMat);
    eyeL.position.set(-0.16, 1.35, 0.38);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), eyeMat);
    eyeR.position.set(0.16, 1.35, 0.38);
    group.add(eyeR);

    // Lightning Aura Light
    const thunderLight = new THREE.PointLight(0xfacc15, 1.2, 5);
    thunderLight.position.set(0, 1.5, 0);
    group.add(thunderLight);
  }

  return group;
}

// --- CREATURE DATA CREATORS ---
function createCreature(species, level = 1) {
  if (species === 'Flameling') {
    const maxHp = 24 + level * 7;
    return {
      id: 'flameling', name: 'Flameling 🔥', species: 'Flameling', type: 'Fire',
      level: level, hp: maxHp, maxHp: maxHp, attack: 8 + level * 3,
      xp: 0, xpNeeded: 22 * level, perks: [], evolvesTo: 'Pyrostryke',
      moves: [
        { name: 'Flame Spark', power: 1.0, type: 'Fire' },
        { name: 'Ember Blast', power: 1.35, type: 'Fire', minLevel: 2 }
      ]
    };
  } else if (species === 'Pyrostryke') {
    return {
      id: 'pyrostryke', name: 'Pyrostryke 🔥', species: 'Pyrostryke', type: 'Fire/Dragon',
      level: level, hp: 58 + level * 9, maxHp: 58 + level * 9, attack: 22 + level * 4,
      xp: 0, xpNeeded: 45 * level, perks: [],
      moves: [
        { name: 'Ember Blast', power: 1.35, type: 'Fire' },
        { name: 'Dragon Inferno', power: 1.8, type: 'Fire/Dragon' }
      ]
    };
  } else if (species === 'Leafbit') {
    const maxHp = 20 + level * 6;
    return {
      id: 'leafbit', name: 'Leafbit 🌿', species: 'Leafbit', type: 'Nature',
      level: level, hp: maxHp, maxHp: maxHp, attack: 6 + level * 2,
      xp: 0, xpNeeded: 20 * level, perks: [], evolvesTo: 'Floraknight',
      moves: [
        { name: 'Leaf Slice', power: 1.0, type: 'Nature' },
        { name: 'Vine Whip', power: 1.3, type: 'Nature', minLevel: 2 }
      ]
    };
  } else if (species === 'Floraknight') {
    return {
      id: 'floraknight', name: 'Floraknight 🌿', species: 'Floraknight', type: 'Nature/Steel',
      level: level, hp: 60 + level * 9, maxHp: 60 + level * 9, attack: 20 + level * 4,
      xp: 0, xpNeeded: 45 * level, perks: [],
      moves: [
        { name: 'Vine Whip', power: 1.3, type: 'Nature' },
        { name: 'Solar Blade', power: 1.75, type: 'Nature' }
      ]
    };
  } else if (species === 'Aquapup') {
    const maxHp = 22 + level * 6;
    return {
      id: 'aquapup', name: 'Aquapup 💧', species: 'Aquapup', type: 'Water',
      level: level, hp: maxHp, maxHp: maxHp, attack: 7 + level * 2,
      xp: 0, xpNeeded: 20 * level, perks: [], evolvesTo: 'Tidallord',
      moves: [
        { name: 'Water Pulse', power: 1.0, type: 'Water' },
        { name: 'Aqua Surge', power: 1.3, type: 'Water', minLevel: 2 }
      ]
    };
  } else if (species === 'Tidallord') {
    return {
      id: 'tidallord', name: 'Tidallord 💧', species: 'Tidallord', type: 'Water/Dragon',
      level: level, hp: 58 + level * 9, maxHp: 58 + level * 9, attack: 21 + level * 4,
      xp: 0, xpNeeded: 45 * level, perks: [],
      moves: [
        { name: 'Aqua Surge', power: 1.3, type: 'Water' },
        { name: 'Tsunami Crash', power: 1.75, type: 'Water' }
      ]
    };
  } else if (species === 'GigaGolem') {
    return {
      id: 'gigagolem', name: 'Giga-Golem 🗿', species: 'GigaGolem', type: 'Rock', isBoss: true,
      level: 3, hp: 55, maxHp: 55, attack: 11, xp: 120, xpNeeded: 999, perks: [],
      moves: [
        { name: 'Rock Throw', power: 1.1, type: 'Rock' },
        { name: 'Earthquake Slam', power: 1.35, type: 'Rock' }
      ]
    };
  } else if (species === 'Stormjaw') {
    return {
      id: 'stormjaw', name: 'Stormjaw ⚡', species: 'Stormjaw', type: 'Electric', isBoss: true,
      level: 6, hp: 85, maxHp: 85, attack: 16, xp: 300, xpNeeded: 999, perks: [],
      moves: [
        { name: 'Thunder Strike', power: 1.15, type: 'Electric' },
        { name: 'Lightning Surge', power: 1.45, type: 'Electric' }
      ]
    };
  }
}

const ALL_PERKS = [
  { id: 'crit_master', name: '💥 Meteor Impact', desc: 'Adds +35% Critical Hit damage & higher crit chance.', icon: '💥' },
  { id: 'iron_shield', name: '🛡️ Titan Armor', desc: 'Passive: Reduces all incoming damage by 30%.', icon: '🛡️' },
  { id: 'life_drain', name: '💖 Vampire Drain', desc: 'Attacks restore 40% of damage dealt back to HP.', icon: '💖' },
  { id: 'speed_boost', name: '⚡ Thunder Speed', desc: 'Speed boost: 20% chance to strike twice in a turn.', icon: '⚡' }
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

    // Grid coordinates: center is (0,0), spans from -10 to +10
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
    this.scene.fog = new THREE.FogExp2(0x0f172a, 0.035);

    this.camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 100);
    this.camera.position.set(0, 9.5, 14);
    this.camera.lookAt(0, 0.8, 6);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(ambientLight);

    const sun = new THREE.DirectionalLight(0xffedd5, 0.9);
    sun.position.set(10, 20, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 40;
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -12;
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
    // 1. Terrain Ground
    const groundGeo = new THREE.PlaneGeometry(30, 30, 32, 32);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x22c55e });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Cobblestone Path
    const pathGeo = new THREE.PlaneGeometry(2.4, 20);
    pathGeo.rotateX(-Math.PI / 2);
    const pathMat = new THREE.MeshLambertMaterial({ color: 0xfde68a });
    const path = new THREE.Mesh(pathGeo, pathMat);
    path.position.set(0, 0.02, 0);
    path.receiveShadow = true;
    this.scene.add(path);

    // East path to Healing Spring
    const eastPathGeo = new THREE.PlaneGeometry(7, 2);
    eastPathGeo.rotateX(-Math.PI / 2);
    const eastPath = new THREE.Mesh(eastPathGeo, pathMat);
    eastPath.position.set(3.5, 0.02, 5);
    this.scene.add(eastPath);

    // 2. Trainer Laboratory (Cottage)
    const houseGroup = new THREE.Group();
    houseGroup.position.set(-5, 0, 5);
    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 2.2, 3.5),
      new THREE.MeshLambertMaterial({ color: 0x92400e })
    );
    walls.position.y = 1.1;
    walls.castShadow = true;
    houseGroup.add(walls);

    const roofGeo = new THREE.ConeGeometry(2.8, 1.4, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(roofGeo, new THREE.MeshLambertMaterial({ color: 0xdc2626 }));
    roof.position.y = 2.8;
    houseGroup.add(roof);

    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1.4, 0.1),
      new THREE.MeshLambertMaterial({ color: 0x451a03 })
    );
    door.position.set(0, 0.7, 1.8);
    houseGroup.add(door);
    this.scene.add(houseGroup);

    // 3. Healing Spring (Crystal Pool)
    const springGroup = new THREE.Group();
    springGroup.position.set(6, 0, 5);

    const rimGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.4, 24);
    const rim = new THREE.Mesh(rimGeo, new THREE.MeshLambertMaterial({ color: 0x94a3b8 }));
    rim.position.y = 0.2;
    springGroup.add(rim);

    const waterGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.42, 24);
    const water = new THREE.Mesh(waterGeo, new THREE.MeshLambertMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
      emissive: 0x0284c7
    }));
    water.position.y = 0.22;
    springGroup.add(water);

    const springLight = new THREE.PointLight(0x38bdf8, 1.2, 4);
    springLight.position.set(0, 1.0, 0);
    springGroup.add(springLight);
    this.scene.add(springGroup);
    this.springMesh = springGroup;

    // 4. Stylized 3D Trees & Foliage
    const treePositions = [
      [-6, 1], [-8, 4], [-7, -3], [-3, -2],
      [5, -2], [7, 2], [8, -4], [3, 8], [-3, 8]
    ];
    treePositions.forEach(([tx, tz]) => {
      const tree = new THREE.Group();
      tree.position.set(tx, 0, tz);

      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.3, 1.4, 8),
        new THREE.MeshLambertMaterial({ color: 0x78350f })
      );
      trunk.position.y = 0.7;
      trunk.castShadow = true;
      tree.add(trunk);

      const foliage = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1.1, 1),
        new THREE.MeshLambertMaterial({ color: 0x16a34a })
      );
      foliage.position.y = 1.9;
      foliage.castShadow = true;
      tree.add(foliage);
      this.scene.add(tree);
    });

    // 5. Northern Mountain Cliffs & Gate
    const cliffGeo = new THREE.BoxGeometry(26, 4, 3);
    const cliff = new THREE.Mesh(cliffGeo, new THREE.MeshLambertMaterial({ color: 0x1e293b }));
    cliff.position.set(0, 2, -7.5);
    cliff.castShadow = true;
    this.scene.add(cliff);

    // Mountain Gatekeeper Boss (Giga-Golem) at (0, 0, -4.5)
    this.golemMesh = create3DCreatureMesh('GigaGolem');
    this.golemMesh.position.set(0, 0, -4.5);
    this.scene.add(this.golemMesh);

    // Mountain Peak Dais for Stormjaw at (0, 0, -8.5)
    const dais = new THREE.Mesh(
      new THREE.CylinderGeometry(2.5, 2.8, 1.2, 16),
      new THREE.MeshLambertMaterial({ color: 0x581c87 })
    );
    dais.position.set(0, 4, -8.5);
    this.scene.add(dais);

    this.stormjawMesh = create3DCreatureMesh('Stormjaw');
    this.stormjawMesh.position.set(0, 4.6, -8.5);
    this.scene.add(this.stormjawMesh);

    // 6. Roaming Wild Monsters in 3D Meadow
    this.wildMeshes = [
      { mesh: create3DCreatureMesh('Leafbit'), species: 'Leafbit', pos: new THREE.Vector3(-4, 0, -1), level: 1 },
      { mesh: create3DCreatureMesh('Aquapup'), species: 'Aquapup', pos: new THREE.Vector3(4, 0, 1), level: 2 }
    ];
    this.wildMeshes.forEach(w => {
      w.mesh.position.copy(w.pos);
      this.scene.add(w.mesh);
    });

    // 7. Rival Trainer NPC at (0, 0, 1.5)
    this.rivalMesh = create3DTrainer('sky');
    this.rivalMesh.position.set(0, 0, 1.5);
    this.scene.add(this.rivalMesh);

    // 8. 3D Trainer Player Model
    this.trainerMesh = create3DTrainer(this.selectedTrainer);
    this.trainerMesh.position.copy(this.playerPos);
    this.scene.add(this.trainerMesh);

    // 9. 3D Follower Companion Pet
    this.followerMesh = create3DCreatureMesh(this.selectedStarter.charAt(0).toUpperCase() + this.selectedStarter.slice(1));
    this.followerPos = new THREE.Vector3(0, 0, 7.5);
    this.followerMesh.position.copy(this.followerPos);
    this.scene.add(this.followerMesh);
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
      flameling: '🔥 <strong>Flameling:</strong> High Attack Fire cub with 3D flaming tail. Signature Move: <em>Flame Spark</em>. Evolves into the 3D winged fire dragon <strong>Pyrostryke</strong>!',
      leafbit: '🌿 <strong>Leafbit:</strong> High Defense Nature bunny with floppy 3D leaf ears. Signature Move: <em>Leaf Slice</em>. Evolves into the 3D <strong>Floraknight</strong>!',
      aquapup: '💧 <strong>Aquapup:</strong> Balanced Water seal with 3D fins. Signature Move: <em>Water Pulse</em>. Evolves into the 3D <strong>Tidallord</strong>!'
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
      this.showToast(`✨ Look at your 3D evolved companion! Head to the mountain!`);
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

    // Battle Actions
    document.getElementById('btn-attack').onclick = () => this.handleBattleAttack();
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
        if (e.key === '1' || e.key === 'z' || e.key === 'Enter' || e.key === ' ') this.handleBattleAttack();
        else if (e.key === '2' || e.key === 'x') this.handleBattleCapture();
        else if (e.key === '3' || e.key === 's') this.handleBattleSwitch();
        else if (e.key === '4' || e.key === 'Escape' || e.key === 'r') this.handleBattleRun();
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
      if (button === 'A') this.handleBattleAttack();
      else if (button === 'B') this.handleBattleRun();
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
      "Welcome, <strong>${trainerName}</strong>! Look at your 3D companion <strong>${starterSpecies}</strong> — full of life!"<br><br>
      "Two great trials await: The stone sentinel <strong>Giga-Golem 🗿</strong> guards the mountain pass, and the thunder titan <strong>Stormjaw ⚡</strong> roosts at the peak!"<br><br>
      "Explore the 3D meadow, customize your perks, and unlock <strong>3D MEGA EVOLUTION</strong>! Your companion will run behind you. Adventure awaits!"
    `;
  }

  initAdventure() {
    const starterSpecies = this.selectedStarter.charAt(0).toUpperCase() + this.selectedStarter.slice(1);
    this.party = [createCreature(starterSpecies, 1)];
    this.activeCreatureIndex = 0;

    this.playerPos.set(0, 0, 6);
    this.playerTarget.set(0, 0, 6);
    this.followerPos.set(0, 0, 7.5);

    this.state = GameState.OVERWORLD;
    this.updatePartyHUD();
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
      const icon = c.species.includes('Flame') || c.species.includes('Pyro') ? '🔥' : (c.species.includes('Leaf') || c.species.includes('Flora') ? '🌿' : '💧');
      chip.innerHTML = `
        <span>${icon} <strong>${c.species}</strong> Lv.${c.level}</span>
        <span style="color: ${c.hp <= c.maxHp * 0.25 ? '#ef4444' : '#22c55e'}">${c.hp}/${c.maxHp}</span>
      `;
      container.appendChild(chip);
    });
  }

  // --- 3D PLAYER MOVEMENT ---
  stepPlayer(dx, dz) {
    if (this.moveCooldown > 0) return;

    const stepSize = 1.0;
    const nextX = Math.max(-10, Math.min(10, this.playerPos.x + dx * stepSize));
    const nextZ = Math.max(-10, Math.min(10, this.playerPos.z + dz * stepSize));

    // Collision check: Mountain wall
    if (!this.boss1Defeated && nextZ <= -4.5) {
      this.triggerEncounter(createCreature('GigaGolem'));
      this.moveCooldown = 0.3;
      return;
    }
    if (this.boss1Defeated && nextZ <= -8.0) {
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

    // Check Rival Encounter
    if (!this.rivalDefeated && this.playerPos.distanceTo(new THREE.Vector3(0, 0, 1.5)) < 1.5) {
      this.rivalDefeated = true;
      this.showToast("⚔️ Rival Trainer challenges you in 3D!");
      setTimeout(() => {
        const rivalPet = createCreature('Aquapup', 2);
        rivalPet.name = "Rival's Aquapup 💧";
        this.triggerEncounter(rivalPet);
      }, 400);
      return;
    }

    // Check Roaming Wild Monster bump
    this.wildMeshes.forEach(w => {
      if (this.playerPos.distanceTo(w.pos) < 1.4) {
        this.triggerEncounter(createCreature(w.species, w.level));
      }
    });

    // Random Tall Grass encounter in Meadow
    if (Math.abs(this.playerPos.x) > 2 && this.playerPos.z < 3 && this.playerPos.z > -4) {
      if (Math.random() < 0.18) {
        const type = Math.random() < 0.5 ? 'Leafbit' : 'Aquapup';
        this.triggerEncounter(createCreature(type, 1));
      }
    }
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

  // --- 3D BATTLE SYSTEM ---
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
    const arenaGeo = new THREE.CylinderGeometry(4.6, 4.8, 0.08, 32);
    this.battleArenaDisk = new THREE.Mesh(
      arenaGeo,
      new THREE.MeshLambertMaterial({ color: 0x1e293b })
    );
    this.battleArenaDisk.position.set(0.1, 0.04, 0.5);
    this.scene.add(this.battleArenaDisk);

    // 2. Create Glowing Battle Pedestals
    if (this.playerPlatform) this.scene.remove(this.playerPlatform);
    if (this.enemyPlatform) this.scene.remove(this.enemyPlatform);

    const platGeo = new THREE.CylinderGeometry(1.2, 1.3, 0.1, 24);
    this.playerPlatform = new THREE.Mesh(
      platGeo,
      new THREE.MeshLambertMaterial({ color: 0x0284c7, emissive: 0x0369a1 })
    );
    this.playerPlatform.position.set(-1.1, 0.09, 1.4);
    this.scene.add(this.playerPlatform);

    this.enemyPlatform = new THREE.Mesh(
      platGeo,
      new THREE.MeshLambertMaterial({ color: 0xb91c1c, emissive: 0x991b1b })
    );
    this.enemyPlatform.position.set(1.4, 0.09, -0.4);
    this.scene.add(this.enemyPlatform);

    // 3. Move Trainer to 3D Battle Command Position (Lower-Left foreground)
    this.trainerMesh.position.set(-2.2, 0.0, 2.3);
    this.trainerMesh.rotation.y = Math.PI * 0.35; // Face towards battlefield & enemy!
    if (this.trainerMesh.leftArm) this.trainerMesh.leftArm.rotation.x = 0;
    if (this.trainerMesh.rightArm) this.trainerMesh.rightArm.rotation.x = 0;

    // 4. Spawn 3D Player Creature on Pedestal (In front of Martin)
    if (this.battlePlayerPet) this.scene.remove(this.battlePlayerPet);
    this.battlePlayerPet = create3DCreatureMesh(this.activeCreature.species);
    this.battlePlayerPet.position.set(-1.1, 0.14, 1.4);
    this.battlePlayerPet.rotation.y = Math.PI * 0.35;
    this.battlePlayerPet.scale.setScalar(1.25);
    this.scene.add(this.battlePlayerPet);

    // 5. Spawn 3D Enemy Creature on Pedestal (Upper-Right background)
    if (this.battleEnemyPet) this.scene.remove(this.battleEnemyPet);
    this.battleEnemyPet = create3DCreatureMesh(enemyCreature.species);
    this.battleEnemyPet.position.set(1.4, 0.14, -0.4);
    this.battleEnemyPet.rotation.y = -Math.PI * 0.65; // Face towards player!
    const enemyScale = enemyCreature.species === 'Stormjaw' ? 1.6 : (enemyCreature.species === 'GigaGolem' ? 1.4 : 1.25);
    this.battleEnemyPet.scale.setScalar(enemyScale);
    this.scene.add(this.battleEnemyPet);

    // 6. SNAP CAMERA INSTANTLY TO FIXED BATTLE PERSPECTIVE (NO DRIFT, NO SWAY)
    this.camera.position.set(0.0, 2.8, 5.8);
    this.camera.lookAt(0.1, 0.9, 0.5);

    document.getElementById('battle-screen').classList.remove('hidden');

    this.updateBattleUI();

    if (enemyCreature.species === 'GigaGolem') {
      sound.playBossRoar();
      this.setBattleMsg(`🗿 Giga-Golem awakens with a stone roar!`);
    } else if (enemyCreature.species === 'Stormjaw') {
      sound.playBossRoar();
      this.setBattleMsg(`⚡ STORMJAW THE TITAN CALLS DOWN LIGHTNING!`);
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

    // Enemy
    document.getElementById('enemy-name').textContent = enemy.name;
    document.getElementById('enemy-level').textContent = `Lv. ${enemy.level}`;
    const enemyHpPercent = Math.max(0, (enemy.hp / enemy.maxHp) * 100);
    const enemyHpFill = document.getElementById('enemy-hp-fill');
    enemyHpFill.style.width = `${enemyHpPercent}%`;
    enemyHpFill.style.backgroundColor = enemyHpPercent > 50 ? '#22c55e' : (enemyHpPercent > 25 ? '#f59e0b' : '#ef4444');
    document.getElementById('enemy-hp-text').textContent = `${Math.max(0, enemy.hp)} / ${enemy.maxHp} HP`;

    // Player
    document.getElementById('player-name').textContent = player.name;
    document.getElementById('player-level').textContent = `Lv. ${player.level}`;
    const playerHpPercent = Math.max(0, (player.hp / player.maxHp) * 100);
    const playerHpFill = document.getElementById('player-hp-fill');
    playerHpFill.style.width = `${playerHpPercent}%`;
    playerHpFill.style.backgroundColor = playerHpPercent > 50 ? '#22c55e' : (playerHpPercent > 25 ? '#f59e0b' : '#ef4444');
    document.getElementById('player-hp-text').textContent = `${Math.max(0, player.hp)} / ${player.maxHp} HP`;

    const xpPercent = Math.min(100, (player.xp / player.xpNeeded) * 100);
    document.getElementById('player-xp-fill').style.width = `${xpPercent}%`;

    const activeMove = player.moves[player.moves.length - 1] || player.moves[0];
    document.getElementById('btn-attack').innerHTML = `⚔️ ${activeMove.name}`;

    const switchBtn = document.getElementById('btn-switch');
    switchBtn.disabled = this.party.length <= 1;
  }

  setBattleMsg(msg) {
    document.getElementById('battle-msg').textContent = msg;
  }

  setActionsDisabled(disabled) {
    this.isBattleBusy = disabled;
    const buttons = document.querySelectorAll('#battle-actions button');
    buttons.forEach(b => {
      if (b.id === 'btn-switch' && this.party.length <= 1) b.disabled = true;
      else b.disabled = disabled;
    });
  }

  shakeTarget(targetType) {
    const targetMesh = (targetType === 'enemy') ? this.battleEnemyPet : this.battlePlayerPet;
    if (targetMesh) {
      const baseY = targetMesh.position.y;
      targetMesh.position.y = baseY + 0.22;
      setTimeout(() => { if (targetMesh) targetMesh.position.y = baseY; }, 120);
    }
  }

  spawnDamageText(text, targetType, isCrit = false, isHeal = false) {
    const layer = document.getElementById('damage-layer');
    const el = document.createElement('div');
    el.className = `float-damage ${isCrit ? 'crit' : ''} ${isHeal ? 'heal' : ''}`;
    el.textContent = text;

    if (targetType === 'enemy') {
      el.style.top = '75px';
      el.style.right = '80px';
    } else {
      el.style.bottom = '95px';
      el.style.left = '80px';
    }

    layer.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  handleBattleAttack() {
    if (this.isBattleBusy) return;
    this.setActionsDisabled(true);
    this.setFaceMood('attack', 'Unleashing Attack!');

    const player = this.activeCreature;
    const enemy = this.currentBattle.enemy;
    const move = player.moves[player.moves.length - 1] || player.moves[0];

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
        this.battlePlayerPet.position.set(-1.1, 0.14, 1.4);
      }

      const hasCrit = player.perks.includes('crit_master');
      const isCrit = Math.random() < (hasCrit ? 0.4 : 0.18);
      let dmg = Math.round(player.attack * move.power + (Math.random() * 3 - 1));
      if (isCrit) dmg = Math.round(dmg * (hasCrit ? 1.8 : 1.5));
      dmg = Math.max(2, dmg);

      enemy.hp -= dmg;
      if (isCrit) {
        sound.playCrit();
        this.spawnDamageText(`CRIT! -${dmg}`, 'enemy', true);
      } else {
        sound.playHit();
        this.spawnDamageText(`-${dmg}`, 'enemy');
      }

      this.shakeTarget('enemy');

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

    this.setBattleMsg(`Sent out ${newCreature.name}!`);
    this.updateBattleUI();

    this.setActionsDisabled(true);
    setTimeout(() => this.enemyTurn(), 900);
  }

  handleBattleRun() {
    if (this.isBattleBusy) return;
    const enemy = this.currentBattle.enemy;
    if (enemy.isBoss) {
      sound.playTone(150, 'sawtooth', 0.2);
      this.setBattleMsg(`You cannot run from this Boss battle!`);
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
      this.setBattleMsg(`🗿 Giga-Golem crumbled! Mountain gate is now open!`);
      setTimeout(() => {
        this.checkEvolutionOrPerk(this.activeCreature);
      }, 1400);
      return;
    }

    // Boss 2: Stormjaw
    if (enemy.species === 'Stormjaw') {
      sound.playVictory();
      this.setFaceMood('cheer', 'Champion!');
      this.setBattleMsg(`⚡ STORMJAW THE TITAN HAS BEEN CONQUERED!`);
      setTimeout(() => {
        document.getElementById('battle-screen').classList.add('hidden');
        document.getElementById('win-screen').classList.remove('hidden');
        this.state = GameState.WIN;
      }, 1500);
      return;
    }

    // Wild or Rival
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
    if (player.level >= 3 && player.evolvesTo) {
      this.triggerEvolution(player);
    } else {
      this.openPerkChoiceModal(player);
    }
  }

  triggerEvolution(creature) {
    this.state = GameState.EVOLUTION;
    sound.playEvolutionFanfare();

    const targetSpecies = creature.evolvesTo;
    const modal = document.getElementById('evolution-modal');
    modal.classList.remove('hidden');

    document.getElementById('evo-title').textContent = `WHAT? ${creature.species} IS EVOLVING!`;
    document.getElementById('evo-desc').innerHTML = `
      🎉 <strong>Congratulations!</strong> ${creature.species} evolved into <strong>${targetSpecies.toUpperCase()}</strong> in full 3D!<br>
      Gained Draconic Wings, +24 Max HP, +10 Attack, and learned an Ultimate Finisher!
    `;

    // Apply Evolved Stats & Model
    const evolvedObj = createCreature(targetSpecies, creature.level);
    creature.species = evolvedObj.species;
    creature.name = evolvedObj.name;
    creature.maxHp += 24;
    creature.hp = creature.maxHp;
    creature.attack += 10;
    creature.moves = evolvedObj.moves;
    delete creature.evolvesTo;

    // Upgrade 3D follower model in the world!
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
      this.stormjawMesh.position.y = 4.6 + Math.sin(time * 3) * 0.2;
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

    // 5. ROCK-SOLID 3D CAMERA TRACKING (ZERO wobbling, ZERO pitch/yaw tilt!)
    if (this.state === GameState.OVERWORLD || this.state === GameState.STORY) {
      const charPos = this.trainerMesh.position;
      const isCloser = this.cameraMode === 'closeup';
      const camOffsetY = isCloser ? 6.5 : 9.5;
      const camOffsetZ = isCloser ? 5.5 : 8.0;

      // Lockstep camera tracking - vector (0, camOffsetY - 0.8, camOffsetZ) is 100% constant!
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
      // 100% Fixed & Stable Battle Camera! No sway, no shake, perfectly framed!
      this.camera.position.set(0.0, 2.8, 5.8);
      this.camera.lookAt(0.1, 0.9, 0.5);
    }

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.renderLoop.bind(this));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game3D();
});
