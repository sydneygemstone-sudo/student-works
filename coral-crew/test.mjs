import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { createGame, step, handleAction, setInput, snapshot, teacherControl } from './simulation.mjs';
import { createServer } from './server.mjs';

function playing() { const g = createGame(); g.players.pirate.online = true; g.players.diver.online = true; handleAction(g,'pirate','ready');handleAction(g,'diver','ready');step(g, 0.05); return g; }
function advance(g, seconds) { for (let i = 0; i < Math.ceil(seconds / 0.05); i++) step(g, 0.05); }
function chop(g) { for (let i = 0; i < 3; i++) { assert.equal(handleAction(g, 'pirate', 'chop'), true); advance(g, 0.35); } }
function walk(g, point) {
  let steps = 0;
  while (g.phase === 'playing' && Math.hypot(g.players.diver.x - point.x, g.players.diver.z - point.z) > 0.5 && steps++ < 1000) {
    const p = g.players.diver, dx = point.x - p.x, dz = point.z - p.z, d = Math.hypot(dx, dz);
    setInput(g, 'diver', { x: dx / d, z: dz / d });
    handleAction(g, 'diver', 'bubble'); handleAction(g, 'pirate', 'fire'); handleAction(g, 'pirate', 'repair');
    step(g, 0.05);
  }
  setInput(g, 'diver', { x: 0, z: 0 });
  assert.ok(steps < 1000, 'target reachable without teleporting');
}

test('two online roles start, disconnect pauses, snapshots are detached', () => {
  const g = createGame(); advance(g, 1); assert.equal(g.phase, 'waiting'); assert.equal(g.time, 0);
  g.players.pirate.online = true; advance(g, 1); assert.equal(g.phase, 'waiting');
  g.players.diver.online = true; handleAction(g,'pirate','ready');handleAction(g,'diver','ready');step(g, 0.05); assert.equal(g.phase, 'playing');
  const view = snapshot(g); view.players.diver.hp = 0; assert.equal(g.players.diver.hp, 100);
  assert.ok(!('_input' in view));
  g.players.diver.online = false; const before = g.time; advance(g, 3);
  assert.equal(g.time, before); assert.equal(snapshot(g).paused, true); assert.equal(handleAction(g, 'pirate', 'chop'), false);
});

test('authoritative movement normalizes and clamps, roles cannot use each other actions', () => {
  const g = playing(), before = { ...g.players.diver };
  assert.equal(setInput(g, 'diver', { x: Infinity, z: 1 }), false);
  setInput(g, 'diver', { x: 999, z: 999 }); step(g, 0.1);
  assert.ok(Math.hypot(g.players.diver.x - before.x, g.players.diver.z - before.z) <= 0.320001);
  setInput(g, 'pirate', { x: 1, z: 1 }); advance(g, 3);
  assert.ok(g.players.pirate.x <= 3); assert.ok(g.players.pirate.z <= -7);
  assert.equal(handleAction(g, 'diver', 'chop'), false); assert.equal(handleAction(g, 'pirate', 'boost'), false);
  assert.equal(handleAction(g, 'diver', 'boost'), true); assert.equal(handleAction(g, 'diver', 'boost'), false);
});

test('cooperative full game: chop, swimming pickups, dock deposits, exact shared victory and restart', () => {
  const g = playing();
  chop(g); assert.ok(g.players.diver.hunger > 90, 'diver receives chopped food at dock');
  for (const treasure of g.treasures) {
    const before = { ...g.goal };
    walk(g, treasure);
    assert.equal(treasure.active, false);
    assert.equal(g.goal.gems, before.gems, 'pickup does not count until delivery');
    assert.equal(g.goal.stars, before.stars);
    assert.ok(g.players.diver.bagGems + g.players.diver.bagStars > 0);
    walk(g, { x: 0, z: -6 });
    assert.equal(g.players.diver.bagGems + g.players.diver.bagStars, 0);
    if (g.phase === 'playing') chop(g);
  }
  assert.equal(g.phase, 'won'); assert.equal(g.goal.gems, 5); assert.equal(g.goal.stars, 2);
  const total = JSON.stringify(g.goal); advance(g, 2); assert.equal(JSON.stringify(g.goal), total);
  assert.equal(handleAction(g, 'diver', 'restart'), true);
  assert.equal(g.phase, 'learning'); assert.equal(g.goal.gems, 0); assert.equal(g.goal.stars, 0);
  assert.equal(g.treasures.filter(t => t.active).length, 7); assert.equal(g.ship.hp, 100);
  assert.equal(g.players.diver.online, true); assert.equal(g.players.pirate.online, true);
});

test('fish add supply once, respawn; starvation freezes movement and remote rescue restores it', () => {
  const g = playing(); g.ship.food = 0; g.players.diver.hunger = 0; g.players.pirate.hunger = 0;
  setInput(g,'diver',{x:1,z:1});const before={...g.players.diver};step(g,.1);assert.equal(g.players.diver.x,before.x);assert.equal(g.players.diver.z,before.z);g.ship.melon=0;g.players.diver.x=10;g.players.diver.z=10;assert.equal(handleAction(g,'diver','rescue'),true);assert.equal(g.players.diver.hunger,40);assert.equal(handleAction(g,'pirate','rescue'),true);g.ship.melon=3;
  const fish = g.fish[0];
  walk(g, fish); assert.equal(fish.active, false); assert.equal(g.ship.food, 1);
  advance(g, 1); assert.equal(g.ship.food, 1, 'overlap cannot double-count fish');
  walk(g, { x: 0, z: -6 }); assert.ok(g.players.diver.hunger > 0);
  chop(g); assert.ok(g.players.pirate.hunger > 0, 'starving pirate can prepare and eat food');
  g.ship.melon = 0; advance(g, 11); assert.ok(g.ship.melon > 0, 'melons replenish');
  advance(g, 5); assert.equal(fish.active, true);
});

test('shark rescue returns carried treasure to reachable world; bubble, fire, repair and loss are real', () => {
  const g = playing(); const t = g.treasures[0];
  walk(g, t); assert.equal(g.players.diver.bagGems, 1);
  g.players.diver.hp = 1; g.players.diver.z = 0; g.players.diver.x = 0;
  g.sharks[0].x = 0; g.sharks[0].z = 0; g._cooldown.invulnerable = 0; g._sharkRepel = {};
  step(g, 0.05);
  assert.equal(g.players.diver.z, -6); assert.equal(g.players.diver.hp, 55);
  assert.equal(t.active, true); assert.equal(g.players.diver.bagGems, 0);
  assert.equal(g.goal.gems + g.players.diver.bagGems + g.treasures.filter(t => t.active && t.kind === 'gem').length, 5);
  g.players.diver.bubbleCooldown = 0; g.sharks[0].x = 1; g.sharks[0].z = -2;
  const old = { ...g.sharks[0] }; assert.equal(handleAction(g, 'diver', 'bubble'), true);
  assert.ok(Math.hypot(g.sharks[0].x - old.x, g.sharks[0].z - old.z) > 0);
  g.monsters = [{ id: 'test-monster', x: 0, z: -7, hp: 90 }];
  const hp = g.ship.hp; advance(g, 1); assert.ok(g.ship.hp < hp);
  assert.equal(handleAction(g, 'pirate', 'repair'), true); assert.equal(g.ship.hp, 100);
  assert.equal(handleAction(g, 'pirate', 'fire'), true); assert.equal(g.monsters[0].hp, 45);
  advance(g, 1.1); handleAction(g, 'pirate', 'fire'); assert.equal(g.monsters.length, 0);
  g.ship.hp = 0; step(g, 0.05); assert.equal(g.phase, 'lost');
  handleAction(g, 'pirate', 'restart'); assert.equal(g.ship.hp, 100); assert.equal(g.treasures.filter(t => t.active).length, 7);
});

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url), messages = [], waiters = [];
    ws.on('message', buffer => {
      const data = JSON.parse(buffer); messages.push(data);
      for (const waiter of [...waiters]) if (waiter.predicate(data)) { clearTimeout(waiter.timer); waiters.splice(waiters.indexOf(waiter), 1); waiter.resolve(data); }
    });
    ws.on('error', reject);
    ws.once('open', () => resolve({ ws, messages, send: data => ws.send(JSON.stringify(data)), wait(predicate) {
      const found = messages.find(predicate); if (found) return Promise.resolve(found);
      return new Promise((resolve, reject) => {
        const waiter = { predicate, resolve, timer: setTimeout(() => { waiters.splice(waiters.indexOf(waiter), 1); reject(new Error('WS message timed out')); }, 3000) }; waiters.push(waiter);
      });
    } }));
  });
}

test('real HTTP/WS: shared state, role exclusion, reconnect takeover, release and rooms', async t => {
  const service = createServer({ port: 0, host: '127.0.0.1', graceMs: 120 });
  t.after(() => service.close());
  const address = await service.listen(), base = `http://127.0.0.1:${address.port}`, url = `ws://127.0.0.1:${address.port}/ws`;
  const health = await (await fetch(`${base}/health`)).json(); assert.equal(health.instance, 'coral-crew');
  assert.equal((await fetch(`${base}/vendor/three.module.js`)).status, 200);
  assert.equal((await fetch(`${base}/vendor/three.core.js`)).status, 200);
  assert.equal((await fetch(`${base}/%2e%2e%2fserver.mjs`)).status, 403);
  const a = await connect(url), b = await connect(url), outsider = await connect(url);
  a.send({ type: 'join', room: 'TEST', role: 'pirate' }); const wa = await a.wait(m => m.type === 'welcome');
  b.send({ type: 'join', room: 'TEST', role: 'diver' }); const wb = await b.wait(m => m.type === 'welcome');
  a.send({type:'action',action:'ready'}); b.send({type:'action',action:'ready'});
  await a.wait(m => m.state?.phase === 'playing'); await b.wait(m => m.state?.phase === 'playing');
  outsider.send({ type: 'join', room: 'TEST', role: 'pirate' }); await outsider.wait(m => m.type === 'error');
  a.messages.length = 0; b.messages.length = 0;
  a.send({ type: 'action', action: 'chop' });
  const sharedA = await a.wait(m => m.state?.ship.chop > 0), sharedB = await b.wait(m => m.state?.ship.chop > 0);
  assert.deepEqual(sharedA.state, sharedB.state);
  b.send({ type: 'input', x: 1, z: 1 }); await a.wait(m => m.state?.players.diver.x > 0.1);
  const takeover = await connect(url); takeover.send({ type: 'join', room: 'TEST', role: 'pirate', token: wa.token });
  const welcome = await takeover.wait(m => m.type === 'welcome'); assert.equal(welcome.token, wa.token);
  b.ws.close(); await takeover.wait(m => m.state?.paused === true);
  const reconnect = await connect(url); reconnect.send({ type: 'join', room: 'TEST', role: 'diver', token: wb.token });
  assert.equal((await reconnect.wait(m => m.type === 'welcome')).token, wb.token);
  await reconnect.wait(m => m.state?.players.diver.online && !m.state.paused);
  reconnect.ws.close(); await new Promise(resolve => setTimeout(resolve, 200));
  outsider.send({ type: 'join', room: 'TEST', role: 'diver' }); await outsider.wait(m => m.type === 'welcome');
  const other = await connect(url); other.send({ type: 'join', room: 'OTHER', role: 'pirate' });
  assert.equal((await other.wait(m => m.type === 'state')).state.phase, 'waiting');
  assert.equal(service.rooms.size, 2);
});

test('learning is safe until both ready; teacher pause freezes complete simulation',()=>{
 const g=createGame();g.players.pirate.online=true;g.players.diver.online=true;step(g,.1);assert.equal(g.phase,'learning');
 const before=JSON.stringify({ship:g.ship,hunger:g.players.diver.hunger,hp:g.players.diver.hp,time:g.time});advance(g,60);assert.equal(JSON.stringify({ship:g.ship,hunger:g.players.diver.hunger,hp:g.players.diver.hp,time:g.time}),before);
 handleAction(g,'pirate','ready');advance(g,1);assert.equal(g.phase,'learning');handleAction(g,'diver','ready');step(g,.1);assert.equal(g.phase,'playing');
 assert.equal(handleAction(g,'pirate','pause'),false);teacherControl(g,'pause');const frozen=JSON.stringify(snapshot(g));advance(g,20);assert.equal(JSON.stringify(snapshot(g)),frozen);teacherControl(g,'resume');step(g,.1);assert.ok(g.time>0);
});

test('teacher control requires room code; ordinary player cannot pause', async t=>{
 const service=createServer({port:0,host:'127.0.0.1',teacherCodes:{TEST:'test-only-code'}});await service.listen();t.after(()=>service.close());
 const ws=new WebSocket(`ws://127.0.0.1:${service.server.address().port}/ws`);t.after(()=>ws.close());const events=[];ws.on('message',b=>events.push(JSON.parse(b)));await new Promise(r=>ws.on('open',r));
 const wait=async predicate=>{for(let i=0;i<100;i++){const m=events.find(predicate);if(m)return m;await new Promise(r=>setTimeout(r,10));}throw Error('teacher response timeout')};
 ws.send(JSON.stringify({type:'join',role:'pirate',room:'TEST'}));await wait(m=>m.type==='welcome');
 ws.send(JSON.stringify({type:'action',action:'pause'}));await new Promise(r=>setTimeout(r,30));assert.equal(service.rooms.get('TEST').game.teacherPaused,false);
 ws.send(JSON.stringify({type:'teacher',room:'TEST',code:'wrong',action:'pause'}));await wait(m=>m.type==='error');assert.equal(service.rooms.get('TEST').game.teacherPaused,false);
 ws.send(JSON.stringify({type:'teacher',room:'TEST',code:'test-only-code',action:'pause'}));await wait(m=>m.type==='teacher'&&m.paused);assert.equal(service.rooms.get('TEST').game.teacherPaused,true);
 ws.send(JSON.stringify({type:'teacher',room:'TEST',code:'test-only-code',action:'resume'}));await wait(m=>m.type==='teacher'&&!m.paused);assert.equal(service.rooms.get('TEST').game.teacherPaused,false);
});

test('enhanced complex gameplay: cooking smoothie, sonar, shop upgrades, kraken battle and classroom ideas', () => {
  const g = playing();
  // Cooking smoothie
  chop(g);
  assert.equal(handleAction(g, 'pirate', 'cook'), true);
  assert.equal(g.ship.smoothieCount, 1);
  // Diver at dock drinks smoothie
  step(g, 0.05);
  assert.ok(g.players.diver.boost > 0, 'smoothie gives diver speed boost');
  assert.equal(g.ship.smoothieCount, 0);

  // Diver sonar
  assert.equal(handleAction(g, 'diver', 'sonar'), true);
  assert.ok(g.coins >= 2);

  // Shop upgrade
  g.coins = 50;
  assert.equal(handleAction(g, 'diver', 'upgrade', { type: 'cannon' }), true);
  assert.equal(g.upgrades.cannon, 2);
  assert.equal(g.coins, 30);

  // Classroom idea submission
  assert.equal(handleAction(g, 'diver', 'submit_idea', { text: '召唤大西瓜雨', student: 'Quinton' }), true);
  assert.equal(g.classroom.ideas.length, 1);
  assert.equal(g.classroom.ideas[0].student, 'Quinton');

  // Teacher actions: question, reward coins, approve idea, summon kraken
  teacherControl(g, 'set_question', { question: '大家想要什么新装备？' });
  assert.equal(g.classroom.question, '大家想要什么新装备？');
  const coinsBefore = g.coins;
  teacherControl(g, 'reward_coins', { amount: 25 });
  assert.equal(g.coins, coinsBefore + 25);

  teacherControl(g, 'approve_idea', { ideaId: g.classroom.ideas[0].id, student: 'Quinton' });
  assert.equal(g.classroom.ideas[0].status, 'approved');

  teacherControl(g, 'spawn_kraken');
  assert.equal(g.kraken.active, true);
  assert.equal(g.kraken.hp, 150);

  // Pirate cannon hits Kraken tentacle
  assert.equal(handleAction(g, 'pirate', 'fire'), true);
  assert.ok(g.kraken.tentacles[0].hp < 40);
});

