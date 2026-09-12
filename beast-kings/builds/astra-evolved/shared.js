(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BeastGame=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const WIDTH=1200,HEIGHT=600,GROUND=480;
const CHARACTERS={
 frost:{id:'frost',name:'Frost',description:'An ice guardian. Freeze a rival with Crystal Storm.',special:'Crystal Storm',color:'#71dcff'},
 ember:{id:'ember',name:'Ember',description:'A flame guardian. Unleash a powerful fire burst.',special:'Flame Burst',color:'#ffab69'},
 moss:{id:'moss',name:'Moss',description:'A forest guardian. Heal while striking nearby rivals.',special:'Life Bloom',color:'#8eda99'},
 volt:{id:'volt',name:'Volt',description:'A thunder guardian. Blink forward with a lightning strike.',special:'Thunder Rush',color:'#d6b1ff'},
 twins:{id:'twins',name:'Pip & Pebble',description:'Two small beasts, one player. Chain punches into a twin combo.',special:'Twin Comet',color:'#ffdc86'},
 fluffy:{id:'fluffy',name:'Fluffy',description:"Leo's AI Familiar · Fire Dragon / Leo 的火龙使魔. A 2D arena adaptation with a blazing burst.",special:'Dragon Flame / 龙焰',color:'#ff9962'},
 'water-rat':{id:'water-rat',name:'壬子·水鼠 / Water Rat',description:"Nathan's AI Familiar / Nathan 的水鼠使魔. A 2D arena adaptation with a chilling tidal pulse.",special:'Tidal Pulse / 水潮',color:'#85dff2'}
};
const ARENAS={moon:{id:'moon',name:'Moon Sanctuary',description:'A quiet arena under a silver moon.'},forge:{id:'forge',name:'Ember Forge',description:'A glowing technology forge.'},grove:{id:'grove',name:'Ancient Grove',description:'A forest of giant roots and crystals.'}};
const UPGRADES={attack:{id:'attack',name:'Power amplifier',description:'+8% attack per level.',costs:[15,30,50],maxLevel:3},armor:{id:'armor',name:'Shield plating',description:'+8 maximum HP and 3% damage resistance per level.',costs:[15,30,50],maxLevel:3},energy:{id:'energy',name:'Flight capacitor',description:'+15 flight energy per level.',costs:[15,30,50],maxLevel:3}};
const EQUIPMENT={
 'training-claws':{id:'training-claws',name:'Training Claws',slot:'weapon',cost:0,description:'+1 attack.',stats:{attack:1}},
 'crystal-claws':{id:'crystal-claws',name:'Crystal Claws',slot:'weapon',cost:25,description:'+4 attack.',stats:{attack:4}},
 'nova-gauntlet':{id:'nova-gauntlet',name:'Nova Gauntlet',slot:'weapon',cost:60,description:'+7 attack.',stats:{attack:7}},
 'light-hide':{id:'light-hide',name:'Light Hide',slot:'armor',cost:0,description:'+4 maximum HP.',stats:{hp:4}},
 'crystal-vest':{id:'crystal-vest',name:'Crystal Vest',slot:'armor',cost:25,description:'+14 maximum HP and 4% resistance.',stats:{hp:14,resist:.04}},
 'guardian-shell':{id:'guardian-shell',name:'Guardian Shell',slot:'armor',cost:60,description:'+25 maximum HP and 8% resistance.',stats:{hp:25,resist:.08}},
 'flight-core':{id:'flight-core',name:'Flight Core',slot:'tool',cost:0,description:'+10 flight energy.',stats:{energy:10}},
 'wing-booster':{id:'wing-booster',name:'Wing Booster',slot:'tool',cost:25,description:'+30 flight energy.',stats:{energy:30}},
 'phase-compass':{id:'phase-compass',name:'Phase Compass',slot:'tool',cost:45,description:'+20 flight energy and 15% faster blink recovery.',stats:{energy:20,dash:.85}}
};
const DEFAULT_EQUIPMENT={weapon:'training-claws',armor:'light-hide',tool:'flight-core'};
const MOVES={punch:{cooldown:.34,damage:8,range:96},kick:{cooldown:.68,damage:13,range:140},spin:{cooldown:2.4,damage:17,range:155},dash:{cooldown:2.7,damage:0,range:0},super:{cooldown:3.8,damage:22,range:410},block:{cooldown:0},special:{cooldown:5.5,damage:20,range:210}};
const INPUT_KEYS=['left','right','jump','punch','kick','spin','dash','super','block','special'];
const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number.isFinite(Number(v))?Number(v):min));
const integer=(v,min,max)=>Math.floor(clamp(v,min,max));
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const uid=()=> 'round-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12);
function normalizeProfile(raw){raw=raw&&typeof raw==='object'?raw:{};const upgrades={};for(const id of Object.keys(UPGRADES))upgrades[id]=integer(raw.upgrades&&raw.upgrades[id],0,3);
 const owned=[...new Set([...Object.values(DEFAULT_EQUIPMENT),...(Array.isArray(raw.ownedEquipment)?raw.ownedEquipment:[]).filter(id=>typeof id==='string'&&own(EQUIPMENT,id))])];
 const equipment={};for(const slot of Object.keys(DEFAULT_EQUIPMENT)){const id=raw.equipment&&raw.equipment[slot];equipment[slot]=typeof id==='string'&&own(EQUIPMENT,id)&&EQUIPMENT[id].slot===slot&&owned.includes(id)?id:DEFAULT_EQUIPMENT[slot];}
 const id=typeof raw.id==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(raw.id)?raw.id:'beast-'+Math.random().toString(36).slice(2,14);
 const xp=integer(raw.xp,0,100000),evolution=xp>=300?3:xp>=140?2:xp>=50?1:0;
 return {id,name:(typeof raw.name==='string'?raw.name:'Beast').replace(/[<>\x00-\x1f]/g,'').trim().slice(0,24)||'Beast',character:typeof raw.character==='string'&&own(CHARACTERS,raw.character)?raw.character:'frost',gems:integer(raw.gems,0,100000),xp,energy:integer(raw.energy,0,1000),upgrades,equipment,ownedEquipment:owned,rewardIds:[...new Set((Array.isArray(raw.rewardIds)?raw.rewardIds:[]).filter(v=>typeof v==='string'&&v.length<=140))].slice(0,2048),evolution};
}
function buyUpgrade(raw,id){let profile=normalizeProfile(raw);if(!own(UPGRADES,id))return{ok:false,profile,error:'Unknown upgrade'};const level=profile.upgrades[id],cost=UPGRADES[id].costs[level];if(level>=3)return{ok:false,profile,error:'Maximum level reached'};if(profile.gems<cost)return{ok:false,profile,error:'Earn more gems in a round or offline practice.'};profile.gems-=cost;profile.upgrades[id]++;return{ok:true,profile};}
function buyEquipment(raw,id){let profile=normalizeProfile(raw);if(!own(EQUIPMENT,id))return{ok:false,profile,error:'Unknown equipment'};const item=EQUIPMENT[id];if(!profile.ownedEquipment.includes(id)){if(profile.gems<item.cost)return{ok:false,profile,error:'Earn more gems first.'};profile.gems-=item.cost;profile.ownedEquipment.push(id);}profile.equipment[item.slot]=id;return{ok:true,profile};}
function equipItem(raw,id){const profile=normalizeProfile(raw);if(!own(EQUIPMENT,id)||!profile.ownedEquipment.includes(id))return{ok:false,profile,error:'Purchase this item first.'};profile.equipment[EQUIPMENT[id].slot]=id;return{ok:true,profile};}
function grantReward(raw,reward){const profile=normalizeProfile(raw);if(!reward||typeof reward.id!=='string'||!reward.id||reward.id.length>140)return{ok:false,profile,error:'Invalid reward'};if(profile.rewardIds.includes(reward.id))return{ok:true,profile,duplicate:true};if(profile.rewardIds.length>=2048)return{ok:false,profile,error:'Reward record full. Keep this profile backed up.'};profile.rewardIds.push(reward.id);profile.gems=integer(profile.gems+integer(reward.gems,0,100),0,100000);profile.xp=integer(profile.xp+integer(reward.xp,0,100),0,100000);profile.energy=integer(profile.energy+integer(reward.energy,0,100),0,1000);return{ok:true,profile:normalizeProfile(profile),duplicate:false};}
function inputOf(raw){const result={};for(let k of INPUT_KEYS)result[k]=!!raw&&raw[k]===true;return result;}
function playerOf(spec,index,total){spec=spec||{};const profile=normalizeProfile(spec.profile||spec);const character=own(CHARACTERS,spec.character)?spec.character:profile.character;const equipment=Object.values(profile.equipment).map(id=>EQUIPMENT[id].stats);const stat=k=>equipment.reduce((n,e)=>n+(e[k]||0),0);const maxHp=100+profile.upgrades.armor*8+profile.evolution*5+stat('hp'),maxEnergy=100+profile.upgrades.energy*15+stat('energy')+Math.min(20,Math.floor(profile.energy/25));
 return {id:String(spec.id||profile.id),name:String(spec.name||profile.name||CHARACTERS[character].name).slice(0,24),character,x:total===1?300:180+index*(840/Math.max(1,total-1)),y:GROUND,vx:0,vy:0,face:index===total-1&&total>1?-1:1,hp:maxHp,maxHp,energy:maxEnergy,maxEnergy,alive:true,cd:{punch:0,kick:0,spin:0,dash:0,super:0,block:0,special:0},action:'idle',actionTime:0,charges:0,xp:profile.xp,evolution:profile.evolution,flash:0,respawn:0,invulnerable:0,frozen:0,blocking:false,combo:0,comboTime:0,ai:spec.ai===true,profile,attackBonus:stat('attack'),attackMultiplier:1+profile.upgrades.attack*.08+profile.evolution*.07,resistance:Math.min(.4,profile.upgrades.armor*.03+stat('resist')),dashMultiplier:equipment.find(e=>e.dash)?.dash||1,jumpWas:false};
}
function createGame(options){options=options||{};let mode=['duel','crown','practice','quest'].includes(options.mode)?options.mode:'duel';let specs=Array.isArray(options.players)?options.players.slice(0,mode==='practice'||mode==='quest'?1:3):[];if(!specs.length)specs=[{id:'local',name:'You',character:'frost'}];if(mode==='quest')specs.push({id:'guardian',name:'Forge Guardian',character:'ember',ai:true,profile:{id:'guardian',character:'ember'}});
 const g={mode,status:'lobby',arena:own(ARENAS,options.arena)?options.arena:'moon',tick:0,time:0,roundId:typeof options.roundId==='string'?options.roundId.slice(0,48):uid(),players:specs.map((p,i)=>playerOf(p,i,specs.length)),targets:[],effects:[],winnerId:null,reason:'Choose your beast, then start a round.',rewards:[],targetSerial:0};
 if(mode==='practice'||mode==='crown')for(let i=0;i<5;i++)g.targets.push({id:'target-'+(++g.targetSerial),x:140+i*230,y:GROUND,hp:26,maxHp:26,respawn:0,flash:0});return g;
}
function effect(g,type,x,y,player,extra){g.effects.push({id:g.tick+'-'+g.effects.length,type,x,y,life:.35,color:CHARACTERS[player.character].color,playerId:player.id,face:player.face,...extra});if(g.effects.length>50)g.effects.shift();}
function aiInput(g,p){const opponent=g.players.find(o=>!o.ai&&o.alive);if(!opponent)return{};const dx=opponent.x-p.x,dy=opponent.y-p.y,near=Math.abs(dx)<120;return {left:dx<-75,right:dx>75,punch:near&&g.tick%90<45,kick:Math.abs(dx)<145&&g.tick%130<25,super:Math.abs(dx)<380&&g.tick%300<15,jump:dy<-85&&g.tick%180<65,block:near&&g.tick%210>160,special:Math.abs(dx)<190&&g.tick%420<5};}
function finish(g,winnerId,reason){g.status='ended';g.winnerId=winnerId;g.reason=reason;if(winnerId&&winnerId!=='draw'){const p=g.players.find(p=>p.id===winnerId);if(p&&!p.ai){const amounts=g.mode==='practice'?{gems:5,xp:12,energy:8}:g.mode==='quest'?{gems:12,xp:25,energy:15}:{gems:10,xp:20,energy:12};g.rewards=[{id:g.roundId+':'+p.id,playerId:p.id,...amounts}];}}}
function step(g,rawInputs,dt){dt=clamp(dt==null?1/60:dt,0,1/30);if(!g||g.status!=='playing'||dt===0)return g;g.tick++;g.time+=dt;g.effects=g.effects.filter(e=>(e.life-=dt)>0);const living=new Set(g.players.filter(p=>p.alive).map(p=>p.id));const attacks=[];
 for(const p of g.players){for(const k of Object.keys(p.cd))p.cd[k]=Math.max(0,p.cd[k]-dt);p.flash=Math.max(0,p.flash-dt);p.invulnerable=Math.max(0,p.invulnerable-dt);p.frozen=Math.max(0,p.frozen-dt);p.actionTime=Math.max(0,p.actionTime-dt);p.comboTime=Math.max(0,p.comboTime-dt);if(!p.comboTime)p.combo=0;if(!p.actionTime)p.action='idle';
  if(!p.alive){if(g.mode==='crown'){p.respawn=Math.max(0,p.respawn-dt);if(!p.respawn){p.alive=true;p.hp=p.maxHp;p.x=180+g.players.indexOf(p)*(840/Math.max(1,g.players.length-1));p.y=GROUND;p.vy=0;p.energy=p.maxEnergy;p.invulnerable=1.1;p.jumpWas=false;}}continue;}
  const a=inputOf(p.ai?aiInput(g,p):rawInputs&&rawInputs[p.id]);p.blocking=a.block&&p.y>=GROUND-5;const direction=Number(a.right)-Number(a.left);if(direction)p.face=direction;let speed=275*(p.blocking?.38:1)*(p.frozen>0?.4:1);p.x=clamp(p.x+(direction*speed+p.vx)*dt,50,WIDTH-50);p.vx*=Math.pow(.05,dt);
  if(a.jump&&!p.jumpWas&&p.y>=GROUND){p.vy=-440;p.action='jump';p.actionTime=.25;}if(a.jump&&p.y<GROUND&&p.energy>0){p.vy-=880*dt;p.energy=Math.max(0,p.energy-38*dt);p.action='fly';}else p.energy=Math.min(p.maxEnergy,p.energy+(p.y>=GROUND?32:7)*dt);p.jumpWas=a.jump;p.vy=clamp(p.vy+720*dt,-340,720);p.y=clamp(p.y+p.vy*dt,120,GROUND);if(p.y===GROUND)p.vy=0;if(p.y===120)p.vy=Math.max(0,p.vy);
  if(p.blocking){p.action='block';continue;}
  for(const kind of ['punch','kick','spin','dash','super','special'])if(a[kind]&&p.cd[kind]<=0){const m=MOVES[kind];p.cd[kind]=m.cooldown*(kind==='dash'?p.dashMultiplier:1);p.action=kind;p.actionTime=.26;
   if(kind==='dash'){effect(g,'blink',p.x,p.y-50,p);p.x=clamp(p.x+p.face*235,50,WIDTH-50);effect(g,'blink',p.x,p.y-50,p);continue;}
   let damage=m.damage+p.attackBonus,range=m.range,all=kind==='spin';if(p.character==='twins'&&(kind==='punch'||kind==='kick')){p.combo++;p.comboTime=1.2;if(p.combo>=3){damage+=13;range+=35;p.combo=0;p.action='combo';effect(g,'combo',p.x,p.y-65,p);}}
   if(kind==='special'){if((p.character==='frost'||p.character==='water-rat')){range=260;all=true;}if((p.character==='ember'||p.character==='fluffy')){damage+=9;range=230;all=true;}if(p.character==='moss'){p.hp=Math.min(p.maxHp,p.hp+22);all=true;range=160;effect(g,'heal',p.x,p.y-80,p);}if(p.character==='volt'){effect(g,'blink',p.x,p.y-50,p);p.x=clamp(p.x+p.face*180,50,WIDTH-50);range=175;damage+=5;all=true;}if(p.character==='twins'){damage+=16;range=240;all=true;p.action='combo';}}
   attacks.push({p,kind,damage:damage*p.attackMultiplier*(1+p.charges*.1),range,all});effect(g,kind,p.x,p.y-55,p,{range});
  }
 }
 // Every beast alive at the start of this simulation tick resolves its attacks.
 // Damage does not cancel another player's same-tick final blow.
 for(const a of attacks){const p=a.p;const inRange=o=>Math.abs(o.x-p.x)<=a.range&&Math.abs(o.y-p.y)<(o.blocking?64:105)&&(a.all||(o.x-p.x)*p.face>=-20);
  if(g.mode!=='practice')for(const o of g.players)if(o.id!==p.id&&living.has(o.id)&&o.invulnerable<=0&&inRange(o)){let damage=a.damage*(1-o.resistance)*(o.blocking?.3:1);o.hp=Math.max(0,o.hp-damage);o.flash=.15;o.vx=p.face*(o.blocking?45:150);if(a.kind==='special'&&(p.character==='frost'||p.character==='water-rat'))o.frozen=1.2;effect(g,'hit',o.x,o.y-50,p);}
  for(const t of g.targets)if(t.hp>0&&inRange(t)){t.hp=Math.max(0,t.hp-a.damage);t.flash=.16;if(t.hp===0){p.charges++;t.respawn=1.3;effect(g,'charge',t.x,t.y-80,p);}}
 }
 for(const p of g.players)if(p.alive&&p.hp<=0){p.alive=false;p.respawn=1.4;p.action='knockout';p.actionTime=1.4;p.blocking=false;effect(g,'knockout',p.x,p.y-45,p);}
 for(const t of g.targets){t.flash=Math.max(0,t.flash-dt);if(t.hp<=0){t.respawn-=dt;if(t.respawn<=0){t.hp=t.maxHp;t.id='target-'+(++g.targetSerial);}}}
 if(g.mode==='crown'||g.mode==='practice'){const winners=g.players.filter(p=>p.charges>=5);if(winners.length)finish(g,winners.length>1?'draw':winners[0].id,g.mode==='practice'?'Practice complete! Five targets defeated.':winners.length>1?'Two Beast Kings!':winners[0].name+' is the Beast King!');}
 else {const alive=g.players.filter(p=>p.alive);if(g.players.length>1&&alive.length<=1)finish(g,alive.length?alive[0].id:'draw',alive.length?alive[0].name+' wins!':'A mighty double knockout!');}
 return g;
}
function snapshot(g){return {mode:g.mode,status:g.status,arena:g.arena,tick:g.tick,time:g.time,roundId:g.roundId,players:g.players.map(p=>{const {profile,attackBonus,attackMultiplier,resistance,dashMultiplier,jumpWas,...visible}=p;return {...visible,cd:{...p.cd},equipment:{...p.profile.equipment}};}),targets:g.targets.map(t=>({...t})),effects:g.effects.map(e=>({...e})),winnerId:g.winnerId,reason:g.reason,rewards:g.rewards.map(r=>({...r}))};}
return {WIDTH,HEIGHT,GROUND,CHARACTERS,ARENAS,UPGRADES,EQUIPMENT,MOVES,INPUT_KEYS,normalizeProfile,buyUpgrade,buyEquipment,equipItem,grantReward,inputOf,createGame,step,snapshot};
});

