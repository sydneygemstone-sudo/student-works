export const ROLES = {
 fighter:{name:'Fighter',hp:190,speed:5.1,range:3.2,damage:27,rate:.65,cooldown:12,skill:'Lava Punch'},
 mage:{name:'Mage',hp:135,speed:6.1,range:11,damage:19,rate:.55,cooldown:14,skill:'Fire Ring'},
 jet:{name:'Jet',hp:100,speed:8.7,range:13,damage:10,rate:.19,cooldown:10,skill:'Bomb Strike'}
};
export const BALANCE={botAttackIntervalScale:1.8,botDamageScale:1,botSkillLimit:1,botSkillCooldownScale:2,botReaction:.70,reviveSeconds:5,remoteReviveSeconds:22,bossPhaseHP:440,bossContactDamage:22,bossSlamDamage:40,bossSlamRadius:5.8};
export const TYPES=['armor','magic','speed'];
export const COUNTER={armor:'fighter',magic:'mage',speed:'jet'};
export function multiplier(role,type){return COUNTER[type]===role?2.6:({fighter:'magic',mage:'speed',jet:'armor'}[role]===type?.4:1);}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export class Game {
 constructor({random=Math.random}={}){this.random=random;this.players=Object.keys(ROLES).map((role,i)=>({id:role,role,name:ROLES[role].name+' Bot',bot:true,x:(i-1)*3,z:5,hp:ROLES[role].hp,maxHp:ROLES[role].hp,cd:0,shot:0,down:0,facing:0,input:{},kills:0}));this.reset();}
 reset(){this.state='lobby';this.wave=0;this.time=0;this.enemies=[];this.events=[];this.seq=0;this.enemySeq=0;this.spawn=0;this.pending=[];this.intermission=0;this.chest=null;this.totalKills=0;this.bossPhases=[];for(const [i,p] of this.players.entries()){Object.assign(p,{x:(i-1)*3,z:5,hp:p.maxHp,cd:0,shot:0,down:0,kills:0,botSkillsUsed:0,botThink:0,botTarget:null,attacksMade:0,skillsMade:0,input:{}});}}
 emit(type,data={}){this.events.push({id:++this.seq,type,...data});if(this.events.length>70)this.events.shift();}
 join(role,name){const p=this.players.find(p=>p.role===role);if(!p||!p.bot)return false;p.bot=false;p.name=String(name).trim().slice(0,16)||ROLES[role].name;return true;}
 leave(role){const p=this.players.find(p=>p.role===role);if(p){p.bot=true;p.name=ROLES[role].name+' Bot';p.input={};}}
 start(){if(this.state!=='lobby')return;this.state='playing';this.nextWave();}
 nextWave(){this.wave++;this.intermission=0;for(const p of this.players){p.hp=Math.min(p.maxHp,Math.max(0,p.hp)+p.maxHp*(p.bot?.38:.45));p.down=0;p.botSkillsUsed=0;p.botThink=0;p.botTarget=null;}if(this.wave===5){this.addEnemy('armor',true);this.emit('wave',{wave:5});return;}const count=[0,9,15,21,18][this.wave];this.pending=Array.from({length:count},(_,i)=>TYPES[i%3]);this.spawn=.2;this.emit('wave',{wave:this.wave});}
 addEnemy(type,boss=false){const a=this.random()*Math.PI*2;const elite=this.wave===4;const hp=boss?BALANCE.bossPhaseHP:(55+this.wave*11)*(elite?1.35:1);const e={id:++this.enemySeq,type,boss,elite,x:Math.sin(a)*21,z:Math.cos(a)*21,hp,maxHp:hp,attack:1,phase:0,slam:4,warning:0,stun:0};if(boss){e.x=0;e.z=-14;}this.enemies.push(e);return e;}
 hurtEnemy(e,p,damage){if(e.hp<=0)return;let mult=multiplier(p.role,e.type);if(e.boss&&COUNTER[e.type]!==p.role)mult=.12;const value=Math.round(damage*mult*(p.bot?BALANCE.botDamageScale:1));e.hp-=value;this.emit('hit',{x:e.x,z:e.z,damage:value,strong:mult>1,weak:mult<1,role:p.role});if(e.hp<=0&&e.boss){if(COUNTER[e.type]!==p.role){e.hp=1;return;}this.bossPhases.push(p.role);if(e.phase<2){e.phase++;e.type=TYPES[e.phase];e.hp=e.maxHp;e.stun=1.2;e.warning=0;this.emit('phase',{role:COUNTER[e.type],phase:e.type});return;}}
 if(e.hp<=0){p.kills++;this.totalKills++;this.emit('poof',{x:e.x,z:e.z,type:e.type,boss:e.boss});if(e.boss){this.state='treasure';this.chest={x:0,z:0};this.emit('treasure');}else if(this.totalKills%5===0){for(const ally of this.players)if(ally.hp>0)ally.hp=Math.min(ally.maxHp,ally.hp+12);}}
 }
 attack(p,skill=false){const r=ROLES[p.role];if(skill&&p.bot&&p.botSkillsUsed>=BALANCE.botSkillLimit)return false;if(p.hp<=0||(skill?p.cd>0:p.shot>0))return false;const targets=this.enemies.filter(e=>e.hp>0&&dist(p,e)<(skill?11:r.range));targets.sort((a,b)=>dist(p,a)-dist(p,b));if(!targets.length&&!skill)return false;if(skill){p.cd=r.cooldown*(p.bot?BALANCE.botSkillCooldownScale:1);p.skillsMade++;if(p.bot)p.botSkillsUsed++;this.emit('skill',{role:p.role,x:p.x,z:p.z});for(const e of targets){this.hurtEnemy(e,p,p.role==='fighter'?75:p.role==='mage'?65:56);e.stun=.8;const d=dist(p,e)||1;e.x=clamp(e.x+(e.x-p.x)/d*3,-22,22);e.z=clamp(e.z+(e.z-p.z)/d*3,-22,22);}}else{p.shot=r.rate*(p.bot?BALANCE.botAttackIntervalScale:1);p.attacksMade++;const target=targets[0];p.facing=Math.atan2(target.x-p.x,target.z-p.z);this.emit('attack',{role:p.role,x:p.x,z:p.z,tx:target.x,tz:target.z});for(const e of targets){if(e===target||(p.role==='mage'&&dist(e,target)<2.7)||(p.role==='fighter'&&dist(e,target)<2)){this.hurtEnemy(e,p,r.damage);}}}return true;}
 tick(dt){if(!['playing','treasure'].includes(this.state))return;this.time+=dt;for(const p of this.players){p.cd=Math.max(0,p.cd-dt);p.shot=Math.max(0,p.shot-dt);if(p.hp<=0){const ally=this.players.some(a=>a!==p&&a.hp>0&&dist(p,a)<3);p.down+=dt*(ally?1:BALANCE.reviveSeconds/BALANCE.remoteReviveSeconds);if(p.down>=BALANCE.reviveSeconds){p.hp=p.maxHp*.45;p.down=0;this.emit('revive',{role:p.role});}continue;}let {x=0,z=0,attack=false,skill=false,interact=false}=p.input;
 if(p.bot){
 const fallenHuman=this.players.filter(a=>a!==p&&a.hp<=0).sort((a,b)=>(a.bot?1:0)-(b.bot?1:0)+.02*(dist(p,a)-dist(p,b)))[0];
 p.botThink-=dt;
 if(p.botThink<=0){p.botThink=BALANCE.botReaction;const candidates=this.enemies.filter(e=>e.hp>0).sort((a,b)=>(COUNTER[b.type]===p.role?16:0)-(COUNTER[a.type]===p.role?16:0)+dist(p,a)-dist(p,b));p.botTarget=candidates[0]?.id??null;}
 const target=this.enemies.find(e=>e.id===p.botTarget&&e.hp>0);
 if(fallenHuman){const d=dist(p,fallenHuman)||1;if(d>2){x=(fallenHuman.x-p.x)/d;z=(fallenHuman.z-p.z)/d;}attack=!!target;skill=false;}
 else if(target){const d=dist(p,target)||1,desired=p.role==='fighter'?2.4:6.2;if(d>desired){x=(target.x-p.x)/d;z=(target.z-p.z)/d;}else if(d<desired-1.5&&p.role!=='fighter'){x=-(target.x-p.x)/d;z=-(target.z-p.z)/d;}attack=true;const crowd=this.enemies.filter(e=>e.hp>0&&dist(p,e)<10&&COUNTER[e.type]===p.role).length;skill=p.botSkillsUsed<BALANCE.botSkillLimit&&(p.hp<p.maxHp*.4||(this.wave>=4&&crowd>=4));}
 else{const lead=this.players.find(a=>!a.bot&&a.hp>0);if(lead&&dist(p,lead)>4){const d=dist(p,lead);x=(lead.x-p.x)/d;z=(lead.z-p.z)/d;}}
}

 const len=Math.hypot(x,z);if(len>1){x/=len;z/=len;}p.x=clamp(p.x+x*ROLES[p.role].speed*dt,-22,22);p.z=clamp(p.z+z*ROLES[p.role].speed*dt,-22,22);if(len>.05)p.facing=Math.atan2(x,z);if(this.state==='playing'){if(skill)this.attack(p,true);if(attack)this.attack(p);}if(this.state==='treasure'&&!p.bot&&(interact||attack)&&dist(p,this.chest)<4){this.state='victory';this.emit('victory');}}
 if(this.state!=='playing')return;if(this.players.every(p=>p.hp<=0)){this.state='defeat';this.emit('defeat');return;}
 if(this.pending.length){this.spawn-=dt;if(this.spawn<=0){this.addEnemy(this.pending.shift());this.spawn=this.wave===1?.9:this.wave===4?.85:.55;}}
 for(const e of this.enemies){if(e.hp<=0)continue;e.attack-=dt;if(e.stun>0){e.stun-=dt;continue;}const target=this.players.filter(p=>p.hp>0).sort((a,b)=>dist(a,e)-dist(b,e))[0];if(!target)continue;const d=dist(e,target)||1;const speed=e.boss?3.1+e.phase*.3:e.type==='speed'?4.4:e.type==='magic'?2.5:1.9;
 if(e.boss){e.slam-=dt;if(e.warning>0){e.warning-=dt;if(e.warning<=0){for(const p of this.players)if(p.hp>0&&dist(p,{x:e.wx,z:e.wz})<5.8)p.hp=Math.max(0,p.hp-BALANCE.bossSlamDamage);this.emit('slam',{x:e.wx,z:e.wz});}continue;}if(e.slam<=0){e.slam=4.8-e.phase*.4;e.warning=1.4-e.phase*.15;const aim=this.players.find(p=>!p.bot&&p.hp>0)||target;e.wx=aim.x;e.wz=aim.z;this.emit('warning',{x:e.wx,z:e.wz,duration:e.warning,radius:BALANCE.bossSlamRadius});continue;}}
 if(d>1.65){e.x+=(target.x-e.x)/d*speed*dt;e.z+=(target.z-e.z)/d*speed*dt;}if(d<2.1&&e.attack<=0){target.hp=Math.max(0,target.hp-(e.boss?BALANCE.bossContactDamage:e.elite?12:8));e.attack=e.type==='speed'?.9:1.3;this.emit('ouch',{role:target.role});}}
 this.enemies=this.enemies.filter(e=>e.hp>0);if(!this.pending.length&&!this.enemies.length){if(!this.intermission){this.intermission=3;this.emit('clear',{wave:this.wave});}this.intermission-=dt;if(this.intermission<=0)this.nextWave();}}
 snapshot(){return {state:this.state,wave:this.wave,time:this.time,players:this.players.map(({input,...p})=>p),enemies:this.enemies,events:this.events,chest:this.chest,pending:this.pending.length,kills:this.totalKills,bossPhases:this.bossPhases,intermission:this.intermission};}
}
