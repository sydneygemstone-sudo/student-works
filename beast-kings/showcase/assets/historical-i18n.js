(()=>{'use strict';
const STATIC=new Map([
['试玩测评 / Playtest review →','试玩测评 →'],['玩一轮，记录一个改进。自动保存，下次继续。 / Play a round. Save one improvement for next time.','玩一轮，记录一个改进。自动保存，下次继续。'],
['THE LEGENDS UPDATE','LEGENDS 传奇更新'],['Little guardians.','小小守护兽。'],['Legendary moves.','传奇招式。'],['YOUR NAME','玩家名称'],['Your name','你的名字'],
['Progress saved on this device','进度已保存在这台设备'],['⌂ Lobby','⌂ 大厅'],['◇ Beasts','◇ Beast'],['⚒ Tech base','⚒ 技术基地'],['◎ Quests','◎ 任务'],
['YOUR GUARDIAN','你的守护兽'],['Change ↗','更换 ↗'],['PLAY TOGETHER','一起玩'],['One arena.','同一个竞技场。'],['Up to three rivals.','最多三位对手。'],
['Join through Tailscale. Everyone controls their own beast.','通过 Tailscale 加入。每个人控制自己的 Beast。'],['⚔ Battle','⚔ 对战'],['Last beast standing','最后存活的 Beast 获胜'],
['♛ Crown Hunt','♛ 王冠争夺'],['Race for 5 targets','争先击破 5 个目标'],['Join the shared arena','加入共享竞技场'],['Start together →','一起开始 →'],['Leave room','离开房间'],['Ready when you are','准备好就开始'],
['Practice range','练习场'],['Try every move. Earn by hitting targets.','试用每个技能，击破目标获得成长。'],['SET THE SCENE','选择场景'],['Choose your battleground','选择战斗场地'],
['FIND YOUR PLAY STYLE','找到你的打法'],['Seven guardians. Your familiars, too.','七位守护兽，也包括你们的使魔。'],['ALL BEASTS AVAILABLE','全部 Beast 可用'],['Move book','技能手册'],
['BUILD YOUR ADVANTAGE','建立你的优势'],['The technology base','技术基地'],['Spend earned gems on upgrades and equipment. Nothing here costs real money.','用实战获得的宝石购买升级和装备。这里没有真钱消费。'],
['Permanent upgrades','永久升级'],['Weapons, armor & tools','武器、护甲与工具'],['EARN BY PLAYING','通过游玩获得成长'],['Your next mission','下一项任务'],
['Finish a quest or practice challenge to earn gems, XP, and stored energy.','完成任务或练习挑战，获得宝石、XP 与储存 Energy。'],['01 / PRACTICE','01 / 练习'],['Target technician','目标训练师'],
['Defeat five training targets. Experiment with your powers in a safe arena.','击破五个训练目标，在安全场地实验你的技能。'],['Train and earn →','训练并获得奖励 →'],['02 / SOLO QUEST','02 / 单人任务'],['The sentinel trial','守卫试炼'],
['Face an AI guardian in one complete round. Keep moving, block, and use your special.','与 AI 守卫打一整局。持续移动、格挡并使用特殊技能。'],['Enter the trial →','进入试炼 →'],
['BATTLE','对战'],['LOCAL TRAINING','本地训练'],['Ⅱ Pause','Ⅱ 暂停'],['⌂ Lobby','⌂ 大厅'],['FLY','飞行'],['BLOCK','格挡'],['POWER + FLIGHT','技能 + 飞行'],['Turn your iPad sideways for more space.','把 iPad 横过来获得更大的操作空间。'],
['TAKE YOUR TIME','慢慢来'],['Paused','已暂停'],['Resume →','继续 →'],['Play again ↻','再玩一局 ↻'],['Return to lobby','返回大厅'],
['Your play settings','游戏设置'],['Reduced effects','减少特效'],['Smoother play, fewer particles, no screen shake.','优先流畅度：减少粒子，不使用屏幕震动。'],['Sound effects','音效'],['Quiet sounds for moves and results.','为技能和结果播放轻量音效。'],
['CREATED WITH NATHAN + LEO','NATHAN + LEO 共同创作'],['Explore. Practise. Evolve.','探索 · 练习 · 进化'],
['⚔ Beast Battle','⚔ Beast 对战'],['☠ Boss Hunt','☠ Boss 围猎'],['Team up vs the Crown Golem','组队挑战王冠魔像'],['MINI-GAME · race for 5 targets','小游戏 · 争先击破 5 个目标'],['⚡ START BOOST','⚡ 开局强化'],['Spend stored Energy on a temporary head start.','消耗储存 Energy，获得临时开局优势。'],['⚡ Energy is your battle reserve: spend it on temporary boosts before or during a fight. ◆ Gems stay for permanent upgrades.','⚡ Energy 是战斗储备，可在战前或战斗中购买临时强化。◆ Gems 用于永久升级。'],['CROWN GOLEM','王冠魔像'],['STALKING','追猎'],['SLAM','重砸'],['ARM SWEEP','横扫'],['CHARGE','冲锋'],['CRYSTAL RAIN','水晶雨'],['PHASE ROAR','阶段咆哮'],['STAGGERED','失衡'],['Red circle! Move out, then punish the golem.','红圈警告！离开范围，再反击魔像。'],['Step back or up/down — the arm covers a wide line.','向后或前后纵深移动——手臂会扫过一整条区域。'],['Sidestep up or down, then hit it from the side.','向上/下纵深侧移，躲开后从侧面攻击。'],['Leave every glowing floor spot.','离开所有发光的地面区域。'],['New phase! Regroup and spread out.','新阶段！重新集合并拉开站位。'],['WEAK POINT OPEN — everyone attack now!','弱点开启——现在全员输出！'],['Spread out. Watch for the next red warning.','分散站位，观察下一次红色预警。'],['⚡ BOOST','⚡ 强化'],['⚡ Spend Energy Reserve','⚡ 消耗 Energy 储备'],['Boosts are temporary and reset when the round ends. Gems stay for permanent upgrades.','强化只在本局生效并在结束时重置；宝石用于永久升级。'],['Landscape iPad recommended · GLM 5.3 comparison upgrade.','建议 iPad 横屏 · GLM 5.3 对比升级版。']
]);
const ZH_STYLE={
frost:['冰晶狼','冰矛与水晶陷阱。减速对手，再保持距离。'],ember:['熔岩犀牛','重甲、熔岩弹与延迟喷发。让地面变得危险。'],moss:['林地守护者','藤蔓攻击更远，治疗自己并用根须控制敌人。'],volt:['风暴猞猁','高速利爪、连锁闪电与残影攻击。'],twins:['Pip 与 Pebble','两只小兽共同战斗，擅长回声连击与夹击。'],fluffy:['Leo 的火焰使魔','Fluffy 使用龙息、火瓣与云端俯冲。'],'water-rat':['Nathan 的壬子·水鼠','用水波滑步、泡泡护盾和高速水柱作战。']
};
const ZH_SHOP={
'Power amplifier':'力量增幅器','+8% attack per level.':'每级攻击 +8%。','Shield plating':'护盾装甲','+8 max HP and +3% resistance per level.':'每级最大生命 +8，并增加 3% 伤害抗性。','Flight capacitor':'飞行电容','+15 flight energy per level.':'每级飞行能量 +15。',
'Training Claws':'训练爪','+1 attack.':'攻击 +1。','Crystal Claws':'水晶爪','+4 attack.':'攻击 +4。','Nova Gauntlet':'新星拳套','+7 attack.':'攻击 +7。',
'Light Hide':'轻型兽皮','+4 max HP.':'最大生命 +4。','Crystal Vest':'水晶背心','+14 max HP, +4% resistance.':'最大生命 +14，抗性 +4%。','Guardian Shell':'守护甲壳','+25 max HP, +8% resistance.':'最大生命 +25，抗性 +8%。',
'Flight Core':'飞行核心','+10 flight energy.':'飞行能量 +10。','Wing Booster':'翼能推进器','+30 flight energy.':'飞行能量 +30。','Phase Compass':'相位罗盘','+20 flight energy, 15% faster blink recovery.':'飞行能量 +20，Blink 恢复加快 15%。',
'Maximum level ✓':'已到最高等级 ✓','Equipped ✓':'已装备 ✓','Equip':'装备','Buy':'购买'
};
const ZH_MOVES={
'Ice claw':'冰爪','Fang rise':'獠牙上挑','Snow ring':'雪环','Ice slide':'冰面滑行','Ice lance':'冰晶长矛','Crystal cage':'水晶牢笼',
'Stone fist':'岩石重拳','Quake kick':'震地踢','Magma roll':'熔岩翻滚','Armor rush':'装甲冲锋','Lava bomb':'熔岩炸弹','Eruption':'火山喷发',
'Vine whip':'藤鞭','Shell bash':'甲壳撞击','Briar ring':'荆棘环','Leaf guard':'叶盾','Root seed':'缠根种子','Living grove':'生命林地',
'Spark claw':'电爪','Thunder heel':'雷霆后跟','Pulse ring':'脉冲环','Flash step':'闪步','Chain bolt':'连锁闪电','Afterstrike':'残影连击',
'Double paw':'双爪','Twin flip':'双兽翻踢','Orbit dance':'环绕舞步','Partner swap':'伙伴换位','Return comet':'回旋彗星','Pincer star':'夹击星',
'Warm paw':'暖焰爪','Dragon tail':'龙尾横扫','Fire petals':'火焰花瓣','Cloud ride':'乘云突进','Dragon breath':'龙息','Sky dive':'天降俯冲',
'Splash paw':'水花爪','Foam flip':'泡沫翻踢','Bubble guard':'泡泡护盾','Ripple slip':'涟漪滑步','Water jet':'高压水柱','Bubble prison':'泡泡监牢'
};
let lang='zh',busy=false;const originals=new WeakMap();
function dictionary(){const d=new Map(STATIC);for(const [k,v] of Object.entries(ZH_SHOP))d.set(k,v);for(const [k,v] of Object.entries(ZH_MOVES))d.set(k,v);const M=window.BeastMoves;if(M){for(const [id,s] of Object.entries(M.styles||{})){const z=ZH_STYLE[id];if(s.zhTitle)d.set(s.title,s.zhTitle);else if(z)d.set(s.title,z[0]);if(s.zhDescription)d.set(s.description,s.zhDescription);else if(z)d.set(s.description,z[1]);for(const m of Object.values(M.sets?.[id]||{})){if(m.zhLabel)d.set(m.label,m.zhLabel);else if(ZH_MOVES[m.label])d.set(m.label,ZH_MOVES[m.label]);if(m.zhDetail)d.set(m.detail,m.zhDetail);}}}return d}
function translateString(s,d){const trimmed=s.trim();if(!trimmed)return s;let z=d.get(trimmed);if(z)return s.replace(trimmed,z);
 const patterns=[[/^Choose (.+)$/,'选择 $1'],[/^Selected ✓$/,'已选择 ✓'],[/^(.+) · Move book$/,'$1 · 技能手册'],[/^FORM ([IV]+)$/,'形态 $1'],[/^(.+)s cooldown$/,'$1秒冷却'],[/^(.+) energy$/,'$1 能量'],[/^Earned ◆ /,'获得 ◆ '],[/ TO EVOLVE$/,' 进化']];
 let out=trimmed;for(const [re,rep] of patterns)out=out.replace(re,rep);return out===trimmed?s:s.replace(trimmed,out)}
function walk(root){const d=dictionary(),walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while((n=walker.nextNode())){if(n.parentElement?.closest('.museum-lang'))continue;if(!originals.has(n))originals.set(n,n.nodeValue);const en=originals.get(n);n.nodeValue=lang==='zh'?translateString(en,d):en}}
function apply(next){lang=next==='en'?'en':'zh';document.documentElement.lang=lang==='zh'?'zh-CN':'en';busy=true;walk(document.body);document.querySelectorAll('.museum-lang button').forEach(b=>b.classList.toggle('active',b.dataset.langSet===lang));busy=false}
function mount(){const bar=document.createElement('div');bar.className='museum-lang';bar.innerHTML='<a href="../../index.html">♛ HUB</a><button data-lang-set="zh">中文</button><button data-lang-set="en">EN</button>';document.body.append(bar);bar.addEventListener('click',e=>{const b=e.target.closest('button');if(b){try{localStorage.setItem('beast-kings-showcase-lang',b.dataset.langSet)}catch{}apply(b.dataset.langSet)}});let start='zh';try{start=new URLSearchParams(location.search).get('lang')||localStorage.getItem('beast-kings-showcase-lang')||'zh'}catch{}apply(start);new MutationObserver(ms=>{if(busy)return;busy=true;for(const m of ms)for(const node of m.addedNodes)if(node.nodeType===1)walk(node);busy=false}).observe(document.body,{subtree:true,childList:true});window.addEventListener('bk-language',e=>apply(e.detail.lang))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();