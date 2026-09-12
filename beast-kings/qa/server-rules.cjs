const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {Game}=require('../builds/astra/server.js');
const results=[];
function test(name,fn){try{fn();results.push({name,passed:true});}catch(e){results.push({name,passed:false,error:e.message});}}
function fresh(mode='duel'){const g=new Game();g.mode=mode;g.reset();g.status='playing';return g;}
function step(g,n=1){for(let i=0;i<n;i++){for(const p of g.players)p.lastInput=Date.now();g.step();}}
test('Movement stays inside arena',()=>{const g=fresh();g.players[0].input.left=true;step(g,300);assert(g.players[0].x>=0);});
test('Paused movement and damage remain frozen',()=>{const g=fresh();g.status='paused';g.players[0].input.right=true;g.players[0].input.super=true;const before=JSON.stringify(g.players);step(g,50);const after=g.players.map(p=>({...p,lastInput:0}));const original=JSON.parse(before).map(p=>({...p,lastInput:0}));assert.deepEqual(after,original);});
test('Duel winner is final until rematch',()=>{const g=fresh();g.players[0].x=500;g.players[1].x=560;g.players[1].hp=1;g.players[0].input.punch=true;step(g);assert.equal(g.status,'ended');assert.equal(g.winner,g.players[0].name);const hp=g.players[1].hp;step(g,100);assert.equal(g.players[1].hp,hp);g.reset();assert.equal(g.status,'lobby');assert(g.players.every(p=>p.hp===100));});
test('Simultaneous final hits produce a draw',()=>{const g=fresh();g.players[0].x=500;g.players[1].x=560;for(const p of g.players){p.hp=1;p.input.punch=true;}step(g);assert.equal(g.winner,'DRAW');});
test('Held attack obeys cooldown',()=>{const g=fresh();g.players[0].x=500;g.players[1].x=560;g.players[0].input.punch=true;step(g);const hp=g.players[1].hp;step(g);assert.equal(g.players[1].hp,hp);});
test('Crown target gives one charge per defeat',()=>{const g=fresh('crown');const t=g.targets[0];g.players[0].x=t.x-30;t.hp=1;g.players[0].input.punch=true;step(g);assert.equal(g.players[0].charges,1);step(g,5);assert.equal(g.players[0].charges,1);});
test('Five targets finish Crown Hunt',()=>{const g=fresh('crown');const t=g.targets[0];g.players[0].x=t.x-30;g.players[0].charges=4;t.hp=1;g.players[0].input.punch=true;step(g);assert.equal(g.status,'ended');assert.equal(g.winner,g.players[0].name);});
test('Crown knockout has an observable respawn delay',()=>{const g=fresh('crown');g.players[0].x=500;g.players[1].x=560;g.players[1].hp=1;g.players[0].input.punch=true;step(g);assert.equal(g.players[1].hp,0);step(g,5);assert.equal(g.players[1].hp,0);step(g,90);assert(g.players[1].hp>0);});
test('Flight is bounded and uses energy',()=>{const g=fresh();const p=g.players[0];p.input.jump=true;step(g,60);assert(p.y<470);assert(p.y>=0);assert(p.energy<100);assert(p.energy>=0);});
test('Teleport stays within the arena',()=>{const g=fresh();const p=g.players[0];p.x=1190;p.input.teleport=true;step(g);assert(p.x<=1200);});
fs.writeFileSync(path.join(__dirname,'server-rules-results.json'),JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));
if(results.some(r=>!r.passed))process.exitCode=1;
