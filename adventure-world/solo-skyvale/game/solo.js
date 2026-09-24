import {TREES,RINGS,ANIMALS,FIRE,CABIN,move} from './shared.js';
const rooms=new Map();const crypto={randomBytes:()=>({toString:()=>Math.random().toString(16).slice(2,14)})};const wss={on:(_,fn)=>window.__r6Accept=fn};
function loadWorld(){try{return JSON.parse(localStorage.getItem('r6-skyvale-world'))||fresh();}catch{return fresh();}}function saveWorld(){const r=[...rooms.values()][0];if(!r)return;try{localStorage.setItem('r6-skyvale-world',JSON.stringify(r.world));const p=[...r.players.values()][0];if(p)localStorage.setItem('r6-skyvale-player',JSON.stringify({x:p.x,z:p.z,power:p.power}));}catch{}}
function fresh(){return{rings:[false,false,false],picked:[0,0,0],fruit:0,gathered:0,fire:false,fed:[false,false,false],eggs:[false,false,false],produce:0,cabin:0,celebrated:false};}
function send(ws,o){if(ws.readyState===1)ws.send(JSON.stringify(o));}
function snapshot(r){return{type:'state',time:Date.now(),weather:Math.floor(Date.now()/90000)%3,world:r.world,players:[...r.players.values()].map(p=>({id:p.id,name:p.name,skin:p.skin,x:p.x,z:p.z,angle:p.angle,fly:p.fly>Date.now(),power:p.power}))};}
function broadcast(r,event){for(const p of r.players.values())send(p.ws,event);}
function near(p,t,d=4.3){return Math.hypot(p.x-t.x,p.z-t.z)<d;}
function act(r,p,a){const s=r.world,now=Date.now();if(now-p.actionAt<350)return;p.actionAt=now;let msg='走近发光的目标，再按互动 · Move closer';let changed=false;
 if(a==='home'){p.x=0;p.z=6;p.dx=p.dz=0;send(p.ws,{type:'teleport',x:0,z:6});return;}
 if(a==='power'){p.power=(p.power+1)%3;msg=['飞行 · Flight','疾跑 · Dash','隐身 · Invisible'][p.power];changed=true;}
 if(a==='fly'){p.fly=now+8000;msg=['飞起来啦！8 秒内穿过星环','疾跑启动！','隐身启动！'][p.power];changed=true;}
 if(a==='interact'){
  const ri=RINGS.findIndex(t=>near(p,t));const ti=TREES.findIndex(t=>near(p,t));const ai=ANIMALS.findIndex(t=>near(p,t));
  if(ri>=0&&!s.rings[ri]){if(p.fly>now&&p.power===0){s.rings[ri]=true;msg='星环点亮！大家共享这枚徽章 ★';changed=true;}else msg='先选飞行能力，再按「超能力」，然后互动！';}
  else if(ti>=0){if(now-s.picked[ti]>8000){s.picked[ti]=now;s.fruit++;s.gathered++;msg='收获水果 +1！可以拿去喂动物';changed=true;}else msg='果树正在长出新水果，稍等几秒';}
  else if(near(p,FIRE)&&!s.fire){s.fire=true;msg='篝火点燃！下雨也有温暖的营地';changed=true;}
  else if(ai>=0){if(!s.fed[ai]){if(s.fruit>0){s.fruit--;s.fed[ai]=true;msg='动物吃饱了！再按互动收集农产品';changed=true;}else msg='先去生存区摘水果，再来喂动物';}else if(!s.eggs[ai]){s.eggs[ai]=true;s.produce++;msg='农产品 +1！送到小屋工地建造';changed=true;}else msg='谢谢你！这只动物今天已照顾好啦';}
  else if(near(p,CABIN,6)){if(s.cabin<3&&s.produce>0){s.produce--;s.cabin++;msg=['','地基完成！','墙壁完成！','我们的共享小屋完工！'][s.cabin];changed=true;}else msg=s.cabin===3?'小屋建好了！回大厅一起庆祝':'收集动物的农产品，每份建造一步';}
  else if(near(p,{x:0,z:0},7)){if(s.rings.every(Boolean)&&s.fire&&s.cabin===3){s.celebrated=true;msg='三片天地，一个家。探险完成！一起自由玩吧！';changed=true;}else msg='跟着左上角任务卡与金色路标，一起完成冒险！';}
 }
 send(p.ws,{type:'notice',text:msg});if(changed){broadcast(r,{type:'event',text:msg,by:p.name});broadcast(r,snapshot(r));}
}
wss.on('connection',ws=>{let player,room;const joinTimer=setTimeout(()=>{if(!player)ws.close();},10000);ws.on('message',raw=>{let m;try{m=JSON.parse(raw);}catch{return;}
 if(!player){if(m.type!=='join')return;const code=String(m.room||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,16);if(code.length<4){send(ws,{type:'error',text:'请输入至少 4 位房间码'});return;}if(!rooms.has(code)){if(rooms.size>=100){ws.close();return;}rooms.set(code,{world:loadWorld(),players:new Map(),emptyAt:0});}room=rooms.get(code);if(room.players.size>=3){send(ws,{type:'error',text:'这个房间已有 3 人，请换一个房间码'});return;}clearTimeout(joinTimer);player={id:crypto.randomBytes(6).toString('hex'),name:String(m.name||'Explorer').replace(/[<>]/g,'').slice(0,16),skin:Math.max(0,Math.min(2,Number(m.skin)||0)),x:(room.players.size-1)*2,z:6,dx:0,dz:0,angle:0,fly:0,power:0,actionAt:0,lastInput:Date.now(),ws};try{const q=JSON.parse(localStorage.getItem('r6-skyvale-player')||'null');if(q){player.x=q.x;player.z=q.z;player.power=q.power||0;}}catch{}room.players.set(player.id,player);send(ws,{type:'welcome',id:player.id,room:code});broadcast(room,snapshot(room));return;}
 if(m.type==='input'){if(Number.isFinite(m.x)&&Number.isFinite(m.z)){player.dx=Math.max(-1,Math.min(1,m.x));player.dz=Math.max(-1,Math.min(1,m.z));player.lastInput=Date.now();if(Math.hypot(player.dx,player.dz)>.01)player.angle=Math.atan2(player.dx,player.dz);}}
 if(m.type==='action')act(room,player,m.action);
 if(m.type==='skin')player.skin=(player.skin+1)%3;
 });ws.on('close',()=>{clearTimeout(joinTimer);if(player){room.players.delete(player.id);room.emptyAt=Date.now();broadcast(room,snapshot(room));}});ws.on('error',()=>{});});
let tick=0;setInterval(()=>{const now=Date.now();tick++;for(const [code,r]of rooms){if(!r.players.size&&now-r.emptyAt>24*3600000){rooms.delete(code);continue;}for(const p of r.players.values()){if(now-p.lastInput>300)p.dx=p.dz=0;move(p,p.dx,p.dz,1/30,p.fly>now&&p.power===1?12:7);}if(tick%3===0)broadcast(r,snapshot(r));if(tick%30===0)saveWorld();}},1000/30);

window.WebSocket=window.R6LocalSocket;window.__R6Game={save:saveWorld,snapshot:()=>{const r=[...rooms.values()][0];return r?JSON.parse(JSON.stringify(snapshot(r))):null;}};addEventListener('pagehide',saveWorld);