(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./moves.js'):root.BeastMoves);if(typeof module==='object'&&module.exports)module.exports=api;else root.BeastCombat=api;})(globalThis,function(M){
'use strict';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),GROUND=480;
const keys=['left','right','jump','punch','kick','spin','dash','super','block','special'];
function tick(g,raw,dt,h){
 if(g.status!=='playing'||!dt)return g;g.tick++;g.time+=dt;
 g.projectiles=g.projectiles||[];g.zones=g.zones||[];g.pending=g.pending||[];g.serial=g.serial||0;
 g.effects=g.effects.filter(e=>(e.life-=dt)>0);const alive=new Set(g.players.filter(p=>p.alive).map(p=>p.id)),hits=[];
 const player=id=>g.players.find(p=>p.id===id);
 const fx=(p,type,x=p.x,y=p.y-68,extra={})=>h.effect(g,type,x,y,p,{life:.55,maxLife:.55,character:p.character,...extra});
 const power=(p,m)=>(m.damage+p.attackBonus*.65)*p.attackMultiplier*(1+p.charges*.06);
 function strike(p,m,x=p.x,y=p.y,extra={}){hits.push({owner:p.id,x,y,face:p.face,range:m.range,vertical:m.ground?48:112,damage:power(p,m),fx:m.fx,all:false,...m,...extra,damage:extra.damage??power(p,m)});}
 function zone(p,m,x=p.x,y=GROUND,extra={}){if(g.zones.length>=18)return;g.zones.push({id:++g.serial,owner:p.id,character:p.character,x,y,range:m.range,wait:m.delay||0,life:m.duration||.12,pulse:0,interval:m.interval||1,damage:power(p,m),fx:m.fx,slow:m.slow,freeze:m.freeze,root:m.root,drain:m.drain,heal:m.heal||0,...extra});}
 function queue(p,delay,kind,data){if(g.pending.length<32)g.pending.push({owner:p.id,delay,kind,...data});}
 function bolt(p,m,extra={}){if(g.projectiles.length>=32)return;g.projectiles.push({id:++g.serial,owner:p.id,character:p.character,x:p.x+p.face*40,y:p.y-68,startX:p.x,vx:p.face*(m.speed||400),vy:m.vy||0,gravity:m.gravity||0,radius:m.radius||20,range:m.range,life:2.5,age:0,damage:power(p,m),fx:m.fx,face:p.face,hit:[],pierce:m.pierce||1,splash:m.splash||0,slow:m.slow,root:m.root,bubble:m.bubble,push:m.push,boomerang:m.boomerang||false,returning:false,...extra});}
 function cast(p,key){const m=M.get(p.character,key);if(!m||p.energy<(m.cost||0))return;
  p.energy-=m.cost||0;p.cd[key]=m.cooldown*(key==='dash'?p.dashMultiplier:1);p.action=key;p.actionTime=['breath','dive'].includes(m.type)?.7:.34;p.attackLock=.10;p.lastMove=m.label;
  fx(p,'cast',p.x,p.y-65,{style:m.fx,kind:key,range:m.range,life:.48,maxLife:.48});
  const x=p.x,y=p.y,face=p.face;
  switch(m.type){
   case'melee':{let damage=power(p,m);if(m.combo){p.combo++;p.comboTime=1.25;if(p.combo>=3){damage+=8;p.combo=0;fx(p,'spark-finish');}}strike(p,m,x,y,{damage});break;}
   case'echo':strike(p,m);queue(p,m.echoDelay,'strike',{move:m,x:x+face*20,y,face});fx(p,'partner',x-face*36,y-70,{life:.4,maxLife:.4});break;
   case'charge':p.x=clamp(x+face*m.distance,50,1150);strike(p,m,p.x,y,{all:true});p.shield=Math.max(p.shield||0,8);p.shieldTime=1;break;
   case'dash':p.x=clamp(x+face*m.range,50,1150);p.invulnerable=Math.max(p.invulnerable,m.invul||0);if(m.shield){p.shield=Math.max(p.shield||0,m.shield);p.shieldTime=2;}if(m.rise){p.y=Math.max(120,p.y-24);p.vy=-m.rise;}
    fx(p,'trail',x,y-55,{endX:p.x,endY:p.y-55,style:m.fx,life:.52,maxLife:.52});
    if(m.line)strike(p,m,(x+p.x)/2,y,{range:Math.abs(p.x-x)/2+22,all:true});
    if(m.trail)zone(p,{...m,damage:3,range:85,duration:.65,interval:.4,slow:.5,fx:'ice-trail'},x,GROUND);
    break;
   case'projectile':bolt(p,m);break;
   case'zone':zone(p,m,clamp(x+face*(m.offset||0),60,1140),y);break;
   case'grove':zone(p,m,x,GROUND);break;
   case'eruption':for(let i=0;i<3;i++)zone(p,{...m,delay:.25+i*.26,duration:.32,interval:1},clamp(x+face*(85+i*110),60,1140),GROUND);break;
   case'guard':p.shield=Math.max(p.shield||0,m.shield);p.shieldTime=2.2;strike(p,m,x,y,{all:true});break;
   case'orbit':for(const sign of [-1,1])zone(p,{...m,duration:.85,interval:.43},clamp(x+sign*75,40,1160),y);break;
   case'chain':{let origin={x,y},damage=power(p,m);const used=new Set([p.id]);const candidates=[...(g.mode==='practice'?[]:g.players.filter(o=>alive.has(o.id))),...g.targets.filter(t=>t.hp>0)];for(let i=0;i<3;i++){const target=candidates.filter(o=>!used.has(o.id)&&Math.hypot(o.x-origin.x,o.y-origin.y)<m.range).sort((a,b)=>Math.hypot(a.x-origin.x,a.y-origin.y)-Math.hypot(b.x-origin.x,b.y-origin.y))[0];if(!target)break;used.add(target.id);strike(p,m,target.x,target.y,{range:12,all:true,targetId:target.id,damage});fx(p,'chain',origin.x,origin.y-65,{endX:target.x,endY:target.y-65,life:.35,maxLife:.35});origin=target;damage*=.76;}break;}
   case'afterstrike':for(let i=0;i<3;i++){const tx=clamp(x+face*(70+i*100),60,1140);queue(p,.18+i*.18,'strike',{move:m,x:tx,y,face,all:true});fx(p,'afterimage',tx,y-70,{delay:i*.18,life:.8,maxLife:.8});}break;
   case'pincer':{const tx=clamp(x+face*175,100,1100);for(const sign of [-1,1]){queue(p,sign<0?.40:.58,'strike',{move:m,x:tx,y,face:sign,all:true});fx(p,'pincer',tx+sign*170,y-70,{endX:tx,sign,life:.7,maxLife:.7});}break;}
   case'petals':for(let i=0;i<6;i++){const angle=i*Math.PI/3;bolt(p,{...m,radius:17},{vx:Math.cos(angle)*285,vy:Math.sin(angle)*240,range:320,life:1.1});}break;
   case'breath':for(let i=0;i<4;i++)queue(p,i*.16,'breath',{move:m,face});break;
   case'dive':{const tx=clamp(x+face*160,80,1120);p.vy=-305;p.y=Math.min(p.y,GROUND-8);p.invulnerable=Math.max(p.invulnerable,.16);queue(p,.58,'dive',{move:m,x:tx,y:GROUND,face});fx(p,'dive-mark',tx,GROUND,{life:.62,maxLife:.62,range:m.range});break;}
  }
 }
 for(const p of g.players){
  for(const key of Object.keys(p.cd))p.cd[key]=Math.max(0,p.cd[key]-dt);
  for(const key of ['flash','invulnerable','frozen','rooted','slowed','actionTime','comboTime','attackLock','shieldTime'])p[key]=Math.max(0,(p[key]||0)-dt);
  if(!p.shieldTime)p.shield=0;if(!p.comboTime)p.combo=0;if(!p.actionTime)p.action='idle';
  if(!p.alive){if(g.mode==='crown'){p.respawn=Math.max(0,p.respawn-dt);if(!p.respawn){p.alive=true;p.hp=p.maxHp;p.x=180+g.players.indexOf(p)*840/Math.max(1,g.players.length-1);p.y=GROUND;p.vy=0;p.energy=p.maxEnergy;p.invulnerable=1.1;p.jumpWas=false;p.bubbled=0;p.rooted=0;p.shield=0;}}continue;}
  if(p.bubbled>0){p.bubbled=Math.max(0,p.bubbled-dt);if(!p.bubbled){const owner=player(p.bubbleOwner);if(owner){strike(owner,{damage:12,range:70,fx:'bubble-pop'},p.x,p.y,{all:true});fx(owner,'impact',p.x,p.y-65,{style:'bubble-pop',range:90});}}}
  const supplied=p.ai?h.aiInput(g,p):raw&&raw[p.id];const a={};for(const k of keys)a[k]=supplied?.[k]===true;
  p.blocking=a.block&&p.y>=GROUND-5&&!p.bubbled;let direction=Number(a.right)-Number(a.left);if(direction&&!p.bubbled)p.face=direction;
  const speed=M.styles[p.character].speed*(p.blocking?.35:1)*(p.frozen||p.slowed?.5:1)*(p.rooted||p.bubbled?0:1);p.moving=!!direction&&speed>0;
  p.x=clamp(p.x+(direction*speed+p.vx)*dt,50,1150);p.vx*=Math.pow(.04,dt);
  if(p.bubbled){p.y=Math.max(170,p.y-72*dt);p.vy=0;}
  else{if(a.jump&&!p.jumpWas&&p.y>=GROUND&&!p.rooted){p.vy=-440;p.action='jump';p.actionTime=.25;}if(a.jump&&p.y<GROUND&&p.energy>0&&!p.rooted){p.vy-=880*dt;p.energy=Math.max(0,p.energy-38*dt);if(!p.actionTime)p.action='fly';}else p.energy=Math.min(p.maxEnergy,p.energy+(p.y>=GROUND?32:7)*dt);p.vy=clamp(p.vy+720*dt,-340,720);p.y=clamp(p.y+p.vy*dt,120,GROUND);if(p.y===GROUND)p.vy=0;if(p.y===120)p.vy=Math.max(0,p.vy);}
  p.jumpWas=a.jump;if(p.blocking){p.action='block';continue;}if(p.bubbled||p.attackLock)continue;
  for(const k of ['special','super','spin','dash','kick','punch'])if(a[k]&&p.cd[k]<=0&&p.energy>=(M.get(p.character,k).cost||0)){cast(p,k);break;}
 }
 for(const q of g.pending){q.delay-=dt;if(q.delay>0)continue;const p=player(q.owner);if(!p||!p.alive){q.done=true;continue;}if(q.kind==='strike'){strike(p,q.move,q.x,q.y,{face:q.face,all:q.all||false});fx(p,'echo',q.x,q.y-65,{style:q.move.fx});}
  if(q.kind==='breath'){strike(p,q.move,p.x,p.y,{face:q.face,cone:true});fx(p,'breath',p.x+q.face*28,p.y-75,{face:q.face,range:q.move.range,life:.23,maxLife:.23});}
  if(q.kind==='dive'){p.x=q.x;p.y=GROUND;p.vy=0;strike(p,q.move,q.x,q.y,{all:true,push:280});fx(p,'impact',q.x,GROUND-10,{style:q.move.fx,range:q.move.range,life:.75,maxLife:.75});}q.done=true;
 }g.pending=g.pending.filter(q=>!q.done);
 for(const z of g.zones){if(z.wait>0){z.wait-=dt;continue;}z.life-=dt;z.pulse-=dt;const p=player(z.owner);if(!p)continue;if(z.pulse<=0){z.pulse+=z.interval;hits.push({...z,face:p.face,all:true,vertical:z.fx==='eruption'?95:120});fx(p,'zone-pulse',z.x,z.y-12,{style:z.fx,range:z.range,life:.5,maxLife:.5});if(z.heal&&p.alive&&Math.abs(p.x-z.x)<z.range&&Math.abs(p.y-z.y)<105){p.hp=Math.min(p.maxHp,p.hp+z.heal);fx(p,'heal',p.x,p.y-90,{amount:z.heal});}}}g.zones=g.zones.filter(z=>z.wait>0||z.life>0);
 for(const b of g.projectiles){b.age+=dt;b.life-=dt;const p=player(b.owner);if(!p){b.life=0;continue;}if(b.boomerang&&!b.returning&&b.age>.52){b.returning=true;b.hit=[];}if(b.returning){b.vx=Math.sign(p.x-b.x)*510;b.vy=clamp((p.y-68-b.y)*4,-300,300);if(Math.abs(p.x-b.x)<24&&b.age>.7)b.life=0;}
  b.vy+=b.gravity*dt;const oldX=b.x,oldY=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;
  const nearby=[...(g.mode==='practice'?[]:g.players.filter(o=>o.id!==p.id&&alive.has(o.id)&&o.invulnerable<=0)),...g.targets.filter(t=>t.hp>0)];
  const collided=nearby.filter(o=>!b.hit.includes(o.id)&&o.x>=Math.min(oldX,b.x)-b.radius-25&&o.x<=Math.max(oldX,b.x)+b.radius+25&&Math.abs(o.y-60-(oldY+b.y)/2)<b.radius+(o.blocking?26:48));
  if(b.splash&&(b.y>=GROUND-10||collided.length)){strike(p,{...b,damage:0},b.x,Math.min(GROUND,b.y+65),{damage:b.damage,range:b.splash,all:true});fx(p,'impact',b.x,Math.min(GROUND-10,b.y),{style:b.fx,range:b.splash,life:.65,maxLife:.65});b.life=0;}
  else for(const o of collided){b.hit.push(o.id);hits.push({...b,x:o.x,y:o.y,range:10,vertical:130,all:true,targetId:o.id});fx(p,'impact',o.x,o.y-65,{style:b.fx,range:55});if(b.hit.length>=b.pierce){b.life=0;break;}}
  if(!b.boomerang&&Math.abs(b.x-b.startX)>b.range)b.life=0;if(b.x<0||b.x>1200||b.y<0||b.y>560)b.life=0;
 }g.projectiles=g.projectiles.filter(b=>b.life>0);
 for(const a of hits){const p=player(a.owner);if(!p)continue;const inRange=o=>(!a.targetId||a.targetId===o.id)&&Math.abs(o.x-a.x)<=a.range&&Math.abs(o.y-a.y)<(a.vertical||112)&&(!a.ground||o.y>=GROUND-35)&&(a.all||(o.x-a.x)*a.face>=-20)&&(!a.cone||Math.abs(o.y-a.y)<45+Math.abs(o.x-a.x)*.25);
  if(g.mode!=='practice')for(const o of g.players)if(o.id!==p.id&&alive.has(o.id)&&o.invulnerable<=0&&inRange(o)){
   let damage=a.damage*(1-o.resistance)*(o.blocking?.3:1);const absorbed=Math.min(o.shield||0,damage);o.shield=Math.max(0,(o.shield||0)-absorbed);damage-=absorbed;o.hp=Math.max(0,o.hp-damage);o.flash=.12;
   o.vx=(Math.sign(o.x-a.x)||a.face||1)*(o.blocking?45:a.push||135);if(a.launch&&!o.blocking){o.vy=-a.launch;o.y=Math.min(o.y,GROUND-1);}if(a.slow)o.slowed=Math.max(o.slowed||0,a.slow);if(a.freeze&&!o.blocking)o.frozen=Math.max(o.frozen||0,a.freeze);if(a.root&&!o.blocking)o.rooted=Math.max(o.rooted||0,a.root);if(a.drain)o.energy=Math.max(0,o.energy-a.drain);if(a.bubble&&!o.blocking){o.bubbled=a.bubble;o.bubbleOwner=p.id;}
   fx(p,absorbed&&damage===0?'shield-hit':'hit',o.x,o.y-65,{style:a.fx,amount:Math.round(damage),life:.32,maxLife:.32});
  }
  for(const t of g.targets)if(t.hp>0&&inRange(t)){t.hp=Math.max(0,t.hp-a.damage);t.flash=.16;if(t.hp===0){p.charges++;t.respawn=1.3;fx(p,'charge',t.x,t.y-80);}}
 }
 for(const p of g.players)if(p.alive&&p.hp<=0){p.alive=false;p.respawn=1.4;p.action='knockout';p.actionTime=1.4;p.blocking=false;fx(p,'knockout',p.x,p.y-45);}
 for(const t of g.targets){t.flash=Math.max(0,t.flash-dt);if(t.hp<=0){t.respawn-=dt;if(t.respawn<=0){t.hp=t.maxHp;t.id='target-'+(++g.targetSerial);}}}
 if(g.mode==='crown'||g.mode==='practice'){const winners=g.players.filter(p=>p.charges>=5);if(winners.length)h.finish(g,winners.length>1?'draw':winners[0].id,g.mode==='practice'?'Practice complete! Five targets defeated.':winners.length>1?'Two Beast Kings!':winners[0].name+' is the Beast King!');}
 else {const live=g.players.filter(p=>p.alive);if(g.players.length>1&&live.length<=1)h.finish(g,live.length?live[0].id:'draw',live.length?live[0].name+' wins!':'A mighty double knockout!');}return g;
}
return {tick};
});
