const ROLES = ['pirate', 'diver'];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const DOCK = { x: 0, z: -6 };

export function createGame() {
  return {
    phase: 'waiting',
    time: 0,
    ready: { pirate: false, diver: false },
    teacherPaused: false,
    coins: 0,
    upgrades: { cannon: 1, flippers: 1, armor: 1, knife: 1, smoothie: 0 },
    weather: 'sunny',
    classroom: {
      round: 1,
      question: '出海启航！大家想在海底寻找什么奇妙宝藏？',
      ideas: [],
      audioAnnouncement: '准备出海！大家想在海里寻找什么宝藏？',
    },
    players: {
      pirate: {
        x: 0,
        z: -8.5,
        hunger: 85,
        online: false,
        smoothieReady: false,
        winching: false,
      },
      diver: {
        x: 0,
        z: -6,
        hunger: 65,
        online: false,
        hp: 100,
        oxygen: 100,
        maxOxygen: 100,
        bagGems: 0,
        bagStars: 0,
        bagPearls: 0,
        boost: 0,
        boostCooldown: 0,
        bubbleCooldown: 0,
        sonarCooldown: 0,
      },
    },
    ship: {
      hp: 100,
      maxHp: 100,
      food: 0,
      melon: 3,
      chop: 0,
      fireCooldown: 0,
      repairCooldown: 0,
      smoothieCount: 0,
      baitCooldown: 0,
    },
    goal: { gems: 0, stars: 0, needGems: 5, needStars: 2 },
    treasures: [
      ['gem', -4, -1], ['gem', 5, 0], ['gem', -8, 4], ['gem', 0, 5], ['gem', 8, 5],
      ['star', -5, 9], ['star', 5, 9],
    ].map(([kind, x, z], i) => ({ id: `treasure-${i}`, kind, x, z, active: true })),
    clams: [
      { id: 'clam-0', x: -6, z: 2, open: true, timer: 5, hasPearl: true },
      { id: 'clam-1', x: 6, z: 6, open: false, timer: 3, hasPearl: true },
    ],
    sunkenChest: { id: 'chest-0', x: 1.5, z: 7.5, opened: false, hp: 3 },
    fish: [[-2, 1], [6, 3], [-8, 7]].map(([x, z], i) => ({ id: `fish-${i}`, x, z, active: true })),
    sharks: [{ id: 'shark-0', x: -11, z: 6, hp: 60 }, { id: 'shark-1', x: 11, z: 9, hp: 60 }],
    kraken: {
      active: false,
      hp: 150,
      maxHp: 150,
      x: 0,
      z: 3.5,
      tentacles: [
        { id: 'tentacle-0', x: -4, z: -3.5, hp: 40 },
        { id: 'tentacle-1', x: 4, z: -3.5, hp: 40 },
      ],
    },
    monsters: [],
    effects: [],
    message: '两位伙伴入场，一起出海！',
    _input: { pirate: { x: 0, z: 0 }, diver: { x: 0, z: 0 } },
    _cooldown: { chop: 0, feed: 0, invulnerable: 0, bait: 0, winch: 0 },
    _carried: [],
    _carriedPearls: [],
    _fishTimers: {},
    _sharkRepel: {},
    _supply: 0,
    _spawn: 18,
    _krakenSpawnTimer: 40,
    _nextId: 0,
    _baitTarget: null,
    _baitTimer: 0,
  };
}

function effect(g, kind, at, target) {
  g.effects.push({
    id: `effect-${g._nextId++}`,
    kind,
    x: at.x,
    z: at.z,
    ...(target ? { tx: target.x, tz: target.z } : {}),
    ttl: kind === 'bubble' ? 0.8 : kind === 'sonar' ? 1.2 : 0.6,
  });
}

export function setInput(g, role, input) {
  if (!ROLES.includes(role) || !input || !Number.isFinite(input.x) || !Number.isFinite(input.z)) return false;
  const x = clamp(input.x, -1, 1), z = clamp(input.z, -1, 1), length = Math.max(1, Math.hypot(x, z));
  g._input[role] = { x: x / length, z: z / length };
  return true;
}

function playable(g) {
  return g.phase === 'playing' && !g.teacherPaused && ROLES.every(r => g.players[r].online);
}

function eatPirate(g) {
  if (g.ship.food > 0 && g.players.pirate.hunger < 75) {
    g.ship.food--;
    g.players.pirate.hunger = Math.min(100, g.players.pirate.hunger + 50);
    effect(g, 'feed', g.players.pirate);
  }
}

export function submitIdea(g, role, text, student) {
  if (typeof text !== 'string' || !text.trim()) return false;
  const idea = {
    id: `idea-${g._nextId++}`,
    role: role || 'student',
    student: student || (role === 'pirate' ? 'Leesha' : role === 'diver' ? 'Quinton' : '同学'),
    text: text.trim().slice(0, 100),
    at: Date.now(),
    status: 'pending',
  };
  g.classroom.ideas.unshift(idea);
  g.classroom.ideas = g.classroom.ideas.slice(0, 20);
  g.coins += 5; // Brainstorm reward coins!
  effect(g, 'coin', role === 'pirate' ? g.players.pirate : g.players.diver);
  g.message = `💡 收到 ${idea.student} 的新创意！+5 金币！`;
  return true;
}

export function handleAction(g, role, action, payload) {
  if (!ROLES.includes(role)) return false;
  if (action === 'ready' && ['waiting', 'learning'].includes(g.phase)) {
    g.ready[role] = true;
    return true;
  }
  if (action === 'restart') {
    if (g.phase !== 'won' && g.phase !== 'lost') return false;
    const online = Object.fromEntries(ROLES.map(r => [r, g.players[r].online]));
    const fresh = createGame();
    for (const key of Object.keys(g)) delete g[key];
    Object.assign(g, fresh);
    ROLES.forEach(r => { g.players[r].online = online[r]; });
    if (ROLES.every(r => online[r])) g.phase = 'learning';
    g.message = '新的航程开始啦！';
    return true;
  }

  // Idea submission can be performed anytime by players
  if (action === 'submit_idea') {
    return submitIdea(g, role, payload?.text || payload, payload?.student);
  }

  if (!playable(g)) return false;
  const p = g.players[role];

  if (action === 'rescue' && p.hunger <= 0) {
    p.hunger = 40;
    g.message = '🛟 救援西瓜送到了！继续回船补给。';
    effect(g, 'feed', p);
    return true;
  }

  // Shop upgrade action using team coins
  if (action === 'upgrade') {
    const type = payload?.type || (typeof payload === 'string' ? payload : null);
    if (!type) return false;
    const costs = { cannon: 20, flippers: 15, armor: 20, knife: 15, smoothie: 10 };
    const cost = costs[type];
    if (cost !== undefined && g.coins >= cost) {
      g.coins -= cost;
      g.upgrades[type] = (g.upgrades[type] || 1) + 1;
      if (type === 'armor') g.ship.maxHp += 20;
      if (type === 'flippers') g.players.diver.maxOxygen += 25;
      effect(g, 'coin', p);
      g.message = `🛠️ 团队升级了【${type === 'cannon' ? '超级大炮' : type === 'flippers' ? '加速脚蹼' : type === 'armor' ? '加固船甲' : '金西瓜刀'}】！`;
      return true;
    }
    return false;
  }

  if (role === 'pirate') {
    if (action === 'chop' && g._cooldown.chop <= 0 && g.ship.melon > 0) {
      g._cooldown.chop = 0.3;
      const chopIncrement = g.upgrades.knife > 1 ? 0.5 : 1 / 3;
      g.ship.chop = Math.min(1, g.ship.chop + chopIncrement);
      if (g.ship.chop >= 0.999) {
        g.ship.melon--;
        const foodYield = g.upgrades.knife > 1 ? 4 : 3;
        g.ship.food = Math.min(30, g.ship.food + foodYield);
        g.ship.chop = 0;
        g.coins += 2;
        g.message = '西瓜切好啦！潜水员回船补给。';
        effect(g, 'feed', p);
        eatPirate(g);
      }
      return true;
    }
    if (action === 'cook') {
      if (g.ship.food > 0 && g.ship.smoothieCount < 5 && (!g._cooldown.cook || g._cooldown.cook <= 0)) {
        g._cooldown.cook = 2;
        g.ship.food--;
        g.ship.smoothieCount++;
        g.coins += 3;
        effect(g, 'feed', p);
        g.message = '🥤 制作出西瓜特饮！潜水员回船畅饮可冲刺！';
        return true;
      }
      return false;
    }
    if (action === 'fire' && g.ship.fireCooldown <= 0) {
      g.ship.fireCooldown = 1;
      const dmg = g.upgrades.cannon > 1 ? 80 : 45;

      // Check Kraken tentacles first if Kraken is active
      if (g.kraken.active) {
        const liveTentacle = g.kraken.tentacles.find(t => t.hp > 0);
        if (liveTentacle) {
          liveTentacle.hp -= dmg;
          effect(g, 'cannon', p, liveTentacle);
          g.message = '🎯 命中巨妖触手！';
          if (liveTentacle.hp <= 0) {
            g.coins += 15;
            g.message = '💥 轰断了一根巨妖触手！+15 金币！';
          }
          if (g.kraken.tentacles.every(t => t.hp <= 0)) {
            g.kraken.active = false;
            g.coins += 30;
            g.message = '🎉 击退了北海巨妖 Kraken！+30 金币！';
          }
          return true;
        }
      }

      // Target closest monster
      const target = [...g.monsters].sort((a, b) => distance(p, a) - distance(p, b))[0];
      effect(g, 'cannon', p, target || { x: 0, z: 2 });
      if (target) {
        target.hp -= dmg;
        target.z = Math.min(10, target.z + 1.6);
        if (target.hp <= 0) {
          g.coins += 10;
          g.message = '💥 轰飞了水怪！+10 金币！';
        }
      }
      g.monsters = g.monsters.filter(m => m.hp > 0);
      return true;
    }
    if (action === 'repair' && g.ship.repairCooldown <= 0 && g.ship.hp < g.ship.maxHp) {
      g.ship.repairCooldown = 3;
      g.ship.hp = Math.min(g.ship.maxHp, g.ship.hp + 15);
      effect(g, 'feed', p);
      g.message = '🔨 船体修补完成！稳固如新。';
      return true;
    }
    if (action === 'bait' && g.ship.melon > 0 && g._cooldown.bait <= 0) {
      g.ship.melon--;
      g._cooldown.bait = 6;
      g._baitTarget = { x: 0, z: 3 };
      g._baitTimer = 6;
      effect(g, 'feed', p, g._baitTarget);
      g.message = '🍉 海盗投掷了西瓜诱饵！鲨鱼被吸引过去了！';
      return true;
    }
    if (action === 'winch') {
      const diver = g.players.diver;
      if (diver.z > -5 && g._cooldown.winch <= 0) {
        g._cooldown.winch = 5;
        diver.x = clamp(diver.x * 0.4, -3, 3);
        diver.z = Math.max(-5.5, diver.z - 4);
        effect(g, 'rescue', DOCK, diver);
        g.message = '🪝 海盗摇动绞盘，拉紧了救援绳！';
        return true;
      }
      return false;
    }
  } else {
    // Diver actions
    if (action === 'boost' && p.boostCooldown <= 0) {
      p.boost = 2;
      p.boostCooldown = 5;
      effect(g, 'bubble', p);
      return true;
    }
    if (action === 'bubble' && p.bubbleCooldown <= 0) {
      p.bubbleCooldown = 2.5;
      const target = [...g.sharks].sort((a, b) => distance(p, a) - distance(p, b))[0];
      effect(g, 'bubble', p, target || { x: p.x, z: p.z + 3 });
      if (target && distance(p, target) < 8) {
        const dx = target.x - p.x, dz = target.z - p.z, length = Math.hypot(dx, dz) || 1;
        target.x = clamp(target.x + (dx / length || 1) * 3, -12, 12);
        target.z = clamp(target.z + (dz / length) * 3, -3, 10);
        g._sharkRepel[target.id] = 3;
      }
      // If Kraken is nearby, bubble blast stuns it
      if (g.kraken.active && distance(p, g.kraken) < 6) {
        g.kraken.hp -= 20;
        effect(g, 'bubble', p, g.kraken);
        g.message = '🫧 水泡枪击中了巨妖核心！';
        if (g.kraken.hp <= 0) {
          g.kraken.active = false;
          g.coins += 40;
          g.message = '🎉 潜水员水泡击破了巨妖！+40 金币！';
        }
      }
      return true;
    }
    if (action === 'sonar' && p.sonarCooldown <= 0) {
      p.sonarCooldown = 6;
      effect(g, 'sonar', p);
      g.coins += 2;
      g.message = '📡 声纳雷达扫描全海域！探明宝藏位置！';
      return true;
    }
  }
  return false;
}

function rescue(g) {
  const p = g.players.diver;
  const count = Math.ceil(g._carried.length / 2);
  for (const id of g._carried.splice(0, count)) {
    const treasure = g.treasures.find(t => t.id === id);
    if (treasure) {
      treasure.active = true;
      if (treasure.kind === 'gem') p.bagGems--; else p.bagStars--;
    }
  }
  p.bagPearls = Math.floor(p.bagPearls / 2);
  p.x = DOCK.x;
  p.z = DOCK.z;
  p.hp = 55;
  p.oxygen = p.maxOxygen;
  g._cooldown.invulnerable = 4;
  effect(g, 'rescue', DOCK);
  g.message = '救援成功！落下的宝藏还在海底，回船补给再出发。';
}

export function step(g, seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  if (g.phase === 'waiting' && ROLES.every(r => g.players[r].online)) {
    g.phase = 'learning';
    g.message = '安全练习：拖动圆盘，听听按钮，再点准备好。';
  }
  if (g.phase === 'learning' && !g.teacherPaused && ROLES.every(r => g.players[r].online && g.ready[r])) {
    g.phase = 'playing';
    ROLES.forEach(r => setInput(g, r, { x: 0, z: 0 }));
    g.message = '两人准备好，出发！';
  }
  if (g.phase === 'learning' && !g.teacherPaused) {
    for (const role of ROLES) {
      const p = g.players[role], i = g._input[role];
      if (!p.online) continue;
      p.x = clamp(p.x + i.x * Math.min(seconds, 0.1) * 3, -3, 3);
      p.z = clamp(p.z + i.z * Math.min(seconds, 0.1) * 3, role === 'pirate' ? -10 : -6, role === 'pirate' ? -7 : -3);
    }
    return;
  }
  if (!playable(g)) return;

  const dt = Math.min(seconds, 0.1);
  g.time += dt;

  for (const key of Object.keys(g._cooldown)) g._cooldown[key] = Math.max(0, g._cooldown[key] - dt);
  for (const key of Object.keys(g._sharkRepel)) g._sharkRepel[key] = Math.max(0, g._sharkRepel[key] - dt);
  for (const key of ['fireCooldown', 'repairCooldown', 'baitCooldown']) {
    if (g.ship[key] !== undefined) g.ship[key] = Math.max(0, g.ship[key] - dt);
  }

  const diver = g.players.diver;
  for (const key of ['boost', 'boostCooldown', 'bubbleCooldown', 'sonarCooldown']) {
    if (diver[key] !== undefined) diver[key] = Math.max(0, diver[key] - dt);
  }

  // Bait timer
  if (g._baitTimer > 0) {
    g._baitTimer -= dt;
    if (g._baitTimer <= 0) g._baitTarget = null;
  }

  // Clam opening/closing cycles
  for (const clam of g.clams) {
    clam.timer -= dt;
    if (clam.timer <= 0) {
      clam.open = !clam.open;
      clam.timer = clam.open ? 6 : 4;
      if (!clam.hasPearl && clam.open) clam.hasPearl = true;
    }
    // Diver grab pearl
    if (clam.open && clam.hasPearl && distance(diver, clam) < 1.1) {
      clam.hasPearl = false;
      diver.bagPearls = (diver.bagPearls || 0) + 1;
      g.coins += 15;
      effect(g, 'coin', clam);
      g.message = '🦪 采到发光黑珍珠！价值 15 金币！';
    }
  }

  // Sunken chest interaction
  if (g.sunkenChest && !g.sunkenChest.opened && distance(diver, g.sunkenChest) < 1.2) {
    g.sunkenChest.opened = true;
    g.coins += 35;
    g.goal.gems = Math.min(g.goal.needGems, g.goal.gems + 1);
    effect(g, 'coin', g.sunkenChest);
    effect(g, 'pickup', g.sunkenChest);
    g.message = '👑 打开了沉船秘宝箱！获得 35 金币与 1 颗宝石！';
  }

  // Diver movement & oxygen
  for (const role of ROLES) {
    const p = g.players[role], input = g._input[role];
    p.hunger = Math.max(0, p.hunger - dt * 0.7);

    // Speed calculation
    let speed = 0;
    if (p.hunger > 0) {
      if (role === 'pirate') {
        speed = 3;
      } else {
        const baseSpeed = 3.2 + (g.upgrades.flippers > 1 ? 0.6 : 0);
        speed = diver.boost > 0 ? 6.2 : baseSpeed;
      }
    }

    p.x = clamp(p.x + input.x * dt * speed, role === 'pirate' ? -3 : -13, role === 'pirate' ? 3 : 13);
    p.z = clamp(p.z + input.z * dt * speed, role === 'pirate' ? -10 : -6, role === 'pirate' ? -7 : 11);
  }

  // Diver underwater oxygen drain & recharge at dock
  if (diver.z > -5) {
    diver.oxygen = Math.max(0, diver.oxygen - dt * 2.0);
    if (diver.oxygen <= 0 && g.time % 2 < dt) {
      diver.hp = Math.max(1, diver.hp - 5);
      g.message = '⚠️ 氧气不足！请尽快返回船边呼吸！';
    }
  } else {
    diver.oxygen = diver.maxOxygen;
  }

  // Melon replenishment
  g._supply += dt;
  if (g._supply >= 10) {
    g._supply -= 10;
    g.ship.melon = Math.min(5, g.ship.melon + 1);
  }

  // Treasures pickup
  for (const t of g.treasures) {
    if (t.active && diver.hunger > 0 && distance(diver, t) < 0.95) {
      t.active = false;
      g._carried.push(t.id);
      if (t.kind === 'gem') diver.bagGems++; else diver.bagStars++;
      effect(g, 'pickup', t);
      g.message = '找到宝藏！带回船边才算完成。';
    }
  }

  // Fish catch
  for (const fish of g.fish) {
    if (!fish.active) {
      g._fishTimers[fish.id] -= dt;
      if (g._fishTimers[fish.id] <= 0) fish.active = true;
    } else if (diver.hunger > 0 && distance(diver, fish) < 0.95) {
      fish.active = false;
      g._fishTimers[fish.id] = 14;
      g.ship.food = Math.min(30, g.ship.food + 1);
      g.coins += 5;
      effect(g, 'fish', fish);
      g.message = '抓到鱼啦，船上多了一份补给！+5 金币！';
    }
  }

  // Dock deposit & feeding
  if (distance(diver, DOCK) < 2) {
    if (g._carried.length) {
      const deliveredGems = diver.bagGems;
      const deliveredStars = diver.bagStars;
      g.goal.gems += deliveredGems;
      g.goal.stars += deliveredStars;
      g.coins += deliveredGems * 10 + deliveredStars * 25 + (diver.bagPearls || 0) * 15;
      diver.bagGems = 0;
      diver.bagStars = 0;
      diver.bagPearls = 0;
      g._carried = [];
      effect(g, 'deposit', DOCK);
      g.message = '宝藏交给海盗啦！金币入库！';
    }

    // Diver drink smoothie if prepared by pirate
    if (g.ship.smoothieCount > 0 && diver.boost <= 0) {
      g.ship.smoothieCount--;
      diver.boost = 4;
      diver.hunger = 100;
      effect(g, 'feed', DOCK);
      g.message = '🍹 畅饮海盗特制西瓜冰沙！潜水员进入超极速状态！';
    }

    // Regular food
    if (g.ship.food > 0 && (diver.hunger < 80 || diver.hp < 85) && g._cooldown.feed <= 0) {
      g.ship.food--;
      diver.hunger = Math.min(100, diver.hunger + 55);
      diver.hp = Math.min(100, diver.hp + 55);
      diver.oxygen = diver.maxOxygen;
      g._cooldown.feed = 1;
      effect(g, 'feed', DOCK);
      g.message = '补给完成，再去探险吧！';
    }
  }

  // Sharks AI
  for (let i = 0; i < g.sharks.length; i++) {
    const shark = g.sharks[i];
    if (g._sharkRepel[shark.id] > 0) continue;

    let target;
    if (g._baitTarget && g._baitTimer > 0) {
      target = g._baitTarget;
    } else if (distance(shark, diver) < 5 && diver.z > -2) {
      target = diver;
    } else {
      target = {
        x: Math.sin(g.time * 0.22 + i * 3) * 10,
        z: 6 + Math.cos(g.time * 0.18 + i * 2) * 3,
      };
    }

    const length = distance(shark, target);
    if (length > 0.01) {
      shark.x += (target.x - shark.x) / length * dt * 1.1;
      shark.z += (target.z - shark.z) / length * dt * 1.1;
    }

    if (distance(shark, diver) < 1.1 && g._cooldown.invulnerable <= 0 && diver.z > -3) {
      diver.hp = Math.max(0, diver.hp - 16);
      g._cooldown.invulnerable = 2.5;
      effect(g, 'hit', diver);
      const dx = diver.x - shark.x, dz = diver.z - shark.z, d = Math.hypot(dx, dz) || 1;
      diver.x = clamp(diver.x + (dx / d || 1) * 1.2, -13, 13);
      diver.z = clamp(diver.z + dz / d * 1.2, -6, 11);
      if (diver.hp <= 0) rescue(g);
    }
  }

  // Kraken logic
  g._krakenSpawnTimer -= dt;
  if (g._krakenSpawnTimer <= 0 && !g.kraken.active) {
    g.kraken.active = true;
    g.kraken.hp = 150;
    g.kraken.tentacles.forEach(t => { t.hp = 40; });
    g._krakenSpawnTimer = 60;
    g.message = '🦑 警告：北海巨妖 Kraken 浮出水面！开炮！';
    effect(g, 'hit', { x: 0, z: 2 });
  }

  if (g.kraken.active) {
    // Tentacles damage ship slowly
    g.ship.hp = Math.max(0, g.ship.hp - dt * 1.2);
  }

  // Regular boat-crashing monsters
  g._spawn -= dt;
  if (g._spawn <= 0) {
    g._spawn = 22;
    if (g.monsters.length < 3) {
      g.monsters.push({ id: `monster-${g._nextId++}`, x: Math.sin(g.time) * 8, z: 8, hp: 90 });
    }
  }
  for (const monster of g.monsters) {
    const target = { x: 0, z: -7 }, d = distance(monster, target);
    if (d > 1.8) {
      monster.x += (target.x - monster.x) / d * dt * 0.65;
      monster.z += (target.z - monster.z) / d * dt * 0.65;
    } else {
      g.ship.hp = Math.max(0, g.ship.hp - dt * 1.8);
    }
  }

  // Cleanup effects
  g.effects.forEach(e => { e.ttl -= dt; });
  g.effects = g.effects.filter(e => e.ttl > 0).slice(-40);

  // Victory / Defeat
  if (g.goal.gems >= g.goal.needGems && g.goal.stars >= g.goal.needStars) {
    g.phase = 'won';
    g.message = '5 颗宝石、2 颗星星！你们一起成功啦！';
  } else if (g.ship.hp <= 0) {
    g.phase = 'lost';
    g.message = '小船需要休息，点再来一次，一起重新出发！';
  }
}

export function snapshot(g) {
  const publicState = Object.fromEntries(Object.entries(g).filter(([key]) => !key.startsWith('_')));
  publicState.paused = g.teacherPaused || (g.phase === 'playing' && !ROLES.every(r => g.players[r].online));
  if (publicState.paused) {
    publicState.message = g.teacherPaused ? '老师暂停了航程 ⏸' : '伙伴暂时离线，等回来后继续。';
  }
  return structuredClone(publicState);
}

export function teacherControl(g, action, payload) {
  if (action === 'pause') {
    g.teacherPaused = true;
    ROLES.forEach(r => setInput(g, r, { x: 0, z: 0 }));
    return true;
  }
  if (action === 'resume') {
    g.teacherPaused = false;
    ROLES.forEach(r => setInput(g, r, { x: 0, z: 0 }));
    return true;
  }
  if (action === 'set_question') {
    if (payload?.question) {
      g.classroom.question = String(payload.question).slice(0, 150);
      g.classroom.audioAnnouncement = g.classroom.question;
      g.message = `📣 老师提问：${g.classroom.question}`;
      return true;
    }
    return false;
  }
  if (action === 'reward_coins') {
    const amount = Number(payload?.amount) || 10;
    g.coins += amount;
    g.message = `🌟 老师奖励了全队 ${amount} 枚闪光金币！太棒啦！`;
    effect(g, 'coin', DOCK);
    return true;
  }
  if (action === 'approve_idea') {
    const ideaId = payload?.ideaId;
    const idea = g.classroom.ideas.find(i => i.id === ideaId);
    if (idea) {
      idea.status = 'approved';
      g.coins += 20;
      g.message = `🎉 老师采纳了 ${idea.student} 的创意：“${idea.text}”！立即实装！`;
      effect(g, 'coin', DOCK);
      // Spawn magic event based on idea
      if (payload?.effect === 'kraken') {
        g.kraken.active = true;
        g.kraken.hp = 150;
      } else if (payload?.effect === 'weather') {
        g.weather = payload.weather || 'sunset';
      } else {
        g.ship.melon = Math.min(5, g.ship.melon + 2);
      }
      return true;
    }
    return false;
  }
  if (action === 'spawn_kraken') {
    g.kraken.active = true;
    g.kraken.hp = 150;
    g.kraken.tentacles.forEach(t => { t.hp = 40; });
    g.message = '🦑 老师召唤了北海巨妖试炼！全员戒备！';
    return true;
  }
  if (action === 'set_weather') {
    if (['sunny', 'sunset', 'storm', 'bioluminescent'].includes(payload?.weather)) {
      g.weather = payload.weather;
      g.message = `🌅 海洋天气变化为：${payload.weather}！`;
      return true;
    }
    return false;
  }
  if (action === 'next_round') {
    g.classroom.round++;
    g.message = `🔔 开启第 ${g.classroom.round} 轮探险讨论！`;
    return true;
  }
  return false;
}
