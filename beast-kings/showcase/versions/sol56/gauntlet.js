(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BeastGauntlet=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const ORDER=['frost','ember','moss','volt','twins','fluffy','water-rat'];
const UPGRADES={
 heart:{id:'heart',icon:'♥',name:'Titan Heart',zh:'泰坦之心',detail:'+30 max HP',zhDetail:'最大生命 +30'},
 power:{id:'power',icon:'✦',name:'Predator Core',zh:'猎王核心',detail:'+12% damage',zhDetail:'伤害 +12%'},
 speed:{id:'speed',icon:'↗',name:'Swift Paws',zh:'疾风之爪',detail:'+10% movement speed',zhDetail:'移动速度 +10%'},
 tempo:{id:'tempo',icon:'⏱',name:'Chrono Claw',zh:'时序利爪',detail:'12% faster cooldowns',zhDetail:'技能冷却加快 12%'},
 battery:{id:'battery',icon:'ϟ',name:'Sky Battery',zh:'天空电池',detail:'+25 combat energy',zhDetail:'战斗能量上限 +25'},
 shell:{id:'shell',icon:'◇',name:'Guardian Shell',zh:'守护甲壳',detail:'+18 starting shield',zhDetail:'每关开局护盾 +18'},
 recovery:{id:'recovery',icon:'✚',name:'Second Wind',zh:'第二阵风',detail:'+15 HP and +10 energy',zhDetail:'生命 +15，能量 +10'},
 fury:{id:'fury',icon:'🔥',name:'King Hunter',zh:'弑王者',detail:'+7% damage and +5% speed',zhDetail:'伤害 +7%，速度 +5%'},
 focus:{id:'focus',icon:'◎',name:'Deep Focus',zh:'深度专注',detail:'+8% damage, 8% faster cooldowns',zhDetail:'伤害 +8%，冷却加快 8%'}
};
const blankBuffs=()=>({hp:0,damage:0,speed:0,cooldown:0,energy:0,shield:0});
function createRun(gameId,character){return{schema:1,runId:'run-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),gameId:String(gameId||''),character:String(character||'frost'),stage:0,wins:0,buffs:blankBuffs(),choices:[],startedAt:new Date().toISOString(),completedAt:null};}
function choicesForStage(stage){const ids=Object.keys(UPGRADES),start=(Math.max(0,stage)*4)%ids.length,result=[];for(let i=0;i<ids.length&&result.length<3;i++){const id=ids[(start+i*3)%ids.length];if(!result.includes(id))result.push(id);}return result;}
function applyChoice(run,id){if(!run||!UPGRADES[id])return run;const next={...run,buffs:{...run.buffs},choices:[...(run.choices||[]),{stage:run.stage,id}],wins:(run.wins||0)+1,stage:(run.stage||0)+1};switch(id){case'heart':next.buffs.hp+=30;break;case'power':next.buffs.damage+=.12;break;case'speed':next.buffs.speed+=.10;break;case'tempo':next.buffs.cooldown+=.12;break;case'battery':next.buffs.energy+=25;break;case'shell':next.buffs.shield+=18;break;case'recovery':next.buffs.hp+=15;next.buffs.energy+=10;break;case'fury':next.buffs.damage+=.07;next.buffs.speed+=.05;break;case'focus':next.buffs.damage+=.08;next.buffs.cooldown+=.08;break;}return next;}
function applyToPlayer(player,run){if(!player||!run)return player;const b=run.buffs||blankBuffs();player.maxHp+=b.hp||0;player.hp=player.maxHp;player.maxEnergy+=(b.energy||0);player.energy=player.maxEnergy;player.attackMultiplier*=(1+(b.damage||0));player.sessionSpeed=(player.sessionSpeed||1)*(1+(b.speed||0));player.sessionCooldown=Math.max(.52,(player.sessionCooldown||1)*(1-(b.cooldown||0)));if(b.shield){player.shield=(player.shield||0)+b.shield;player.shieldTime=9999;}return player;}
function tuneFinalBoss(boss){if(!boss)return boss;boss.name='BEAST KING';boss.maxHp=1040;boss.hp=1040;boss.attackMultiplier=(boss.attackMultiplier||1)*1.18;boss.sessionSpeed=(boss.sessionSpeed||1)*1.08;boss.sessionCooldown=Math.max(.52,(boss.sessionCooldown||1)*.82);return boss;}
function isFinalStage(run){return !!run&&run.stage>=ORDER.length;}
function nextOpponent(run){return isFinalStage(run)?null:ORDER[Math.max(0,run.stage||0)];}
function complete(run){return{...run,completedAt:new Date().toISOString(),wins:ORDER.length+1};}
return{ORDER,UPGRADES,blankBuffs,createRun,choicesForStage,applyChoice,applyToPlayer,tuneFinalBoss,isFinalStage,nextOpponent,complete};
});