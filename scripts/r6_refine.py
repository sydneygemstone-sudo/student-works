from pathlib import Path
import sys,json,zipfile,hashlib
R=Path(__file__).resolve().parents[1];S=R/'shared/hub-r6'
def patch(p,old,new):
 p=Path(p);s=p.read_text();assert old in s,(str(p),old[:80]);p.write_text(s.replace(old,new))
if '--packages' in sys.argv:
 for project,dirs in [('martins-monster-quest',['hub','home-v1','home-v2']),('adventure-world',['hub','home-v1','solo-skyvale','solo-trio'])]:
  p=R/project/'downloads/r6-latest.zip'
  with zipfile.ZipFile(p)as z:extra={n:z.read(n)for n in ['serve.mjs','index.html','README.txt']}
  with zipfile.ZipFile(p,'w',zipfile.ZIP_DEFLATED)as z:
   for root in [S]+[R/project/x for x in dirs]:
    for f in root.rglob('*'):
     if f.is_file()and f.suffix!='.zip':
      data=f.read_bytes()
      if f==S/'studio.js':data=data.decode().replace('href="../downloads/r6-latest.zip" download','href="../../README.txt"').encode()
      z.writestr(str(f.relative_to(R)),data)
   for n,data in extra.items():z.writestr(n,data)
  with zipfile.ZipFile(p)as z:assert z.testzip()is None
  print(project,'complete ZIP verified',p.stat().st_size,hashlib.sha256(p.read_bytes()).hexdigest())
 sys.exit()
# Ignore late autosaves/pagehide writes from the old iframe while Reset replaces it.
p=S/'game-runtime.js';s=p.read_text();s=s.replace("const params=new URLSearchParams", "const setStorage=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(window.__R6Reset)return;return setStorage.call(this,k,v);};\nconst params=new URLSearchParams",1);p.write_text(s)
patch(S/'game-shell.js','f.contentWindow.__R6Game=null;','f.contentWindow.__R6Reset=true;f.contentWindow.__R6Game=null;')
# Restored consumables must have respawn timers rather than remain missing forever.
p=R/'adventure-world/solo-trio/game/solo.js';s=p.read_text();s+='\nfor(const kind of ["fruits","wood","stars"])for(const id in world[kind])if(!world[kind][id])respawnLater(kind,id,20000);\n';p.write_text(s)
# Reload language assertions wait for the new iframe document, not an old ready flag.
p=R/'scripts/qa_hub_r6.cjs';s=p.read_text();s=s.replace("window.__r6Shell.ready&&document.documentElement.lang==='en'","window.__r6Shell.ready&&document.documentElement.lang==='en'&&document.getElementById('game').contentWindow.__r6Translate?.language==='en'");p.write_text(s)
# Keep broad educational records and playable history inside the current work.
p=S/'studio.js';s=p.read_text().replace('单机不等于离线存档','单机与存档').replace('Solo is not cloud saving','Solo play and saving');p.write_text(s)
extra='''自信|Confident
专注|Focused
准备好了！|Ready!
初始伙伴在翡翠山谷训练到 2 级，再挑战峡谷入口的巨岩守卫 🗿！|Train your starter in Emerald Valley, reach Lv. 2, and defeat Gatekeeper Giga-Golem 🗿 at the gorge!
进入低语峡谷，挑战对手 Sky，触发 3D 超级进化！|Enter Whispering Gorge and challenge Rival Sky to trigger 3D Mega Evolution!
登上雷霆山峰，击败觉醒的雷霆巨兽！|Climb Thunder Peak Summit and conquer the Awakened Titan Stormjaw ⚡!
怪兽世界的大师！所有巨兽都已击败！|Master of the Monster Realm! All 3D Titans have been conquered!
在山谷训练伙伴，再挑战巨岩守卫！|Train your starter in the valley & challenge Gatekeeper Giga-Golem 🗿!
欢迎来到 3D 怪兽冒险！|Welcome to 3D Monster Quest!
3D 世界版本|REAL 3D WEBGL EDITION
Martin 的 3D 怪兽冒险|MARTIN'S MONSTER QUEST 3D
探索生动的 3D 世界，带上立体伙伴，体验超级进化与 3D 战斗！|Explore a vibrant 3D world with detailed 3D characters, Mega Evolutions, and real-time 3D battles!
3D 火焰龙|3D Fire Dragon
3D 叶骑士|3D Leaf Knight
3D 潮汐领主|3D Tidal Lord
3D 守门巨兽|3D Gatekeeper
3D 最终巨兽|3D Titan Boss
键盘 WASD · iPad 方向键 · 点地面移动 · 滑动转镜头|Keyboard (WASD) • iPad Touch D-Pad • Tap 3D Ground to Walk • Swipe 3D Camera
训练师与伙伴实验室|3D HERO & PARTNER LAB
选择训练师与初始伙伴|CHOOSE YOUR 3D TRAINER & STARTER
1. 选择训练师外观|1. Choose 3D Trainer Avatar
2. 选择初始伙伴|2. Choose Starter Companion
红帽子、蓝夹克|Red Cap & Blue Jacket
绿头巾探险员|Green Bandana Scout
金色护目镜技师|Gold Goggles Tech
火焰幼兽|Fire Cub
自然小兔|Nature Bunny
水系幼犬|Water Pup
火焰火花|Flame Spark
叶刃|Leaf Slice
水之脉冲|Water Pulse
高攻击火系幼兽，有立体火焰尾巴。招牌技能：|High Attack Fire cub with 3D flaming tail. Signature Move:
高防御自然小兔，有立体叶子耳朵。招牌技能：|High Defense Nature bunny with floppy 3D leaf ears. Signature Move:
均衡水系幼兽，有立体水滴耳朵。招牌技能：|Balanced Water seal with 3D droplet ears. Signature Move:
进化为立体的有翼火龙|Evolves into the 3D winged fire dragon
进化成为|Evolves into
有翼火龙|Winged Fire Dragon
自然骑士|Nature Knight
海洋领主|Ocean Emperor
欢迎，|Welcome,
看看你的立体伙伴|Look at your 3D companion
活力满满！|full of energy!
前方有三种壮丽地貌：|Ahead lies 3 grand biomes:
击败守门巨兽|Defeat the Gatekeeper
挑战对手，触发|duel your Rival for
再征服觉醒的巨兽|and conquer the Awakened Titan
3D 超级进化|3D MEGA EVOLUTION
怪兽世界研究员|Monster Realm Researcher
Elm 教授|Professor Elm
开始 3D 探索！|LET'S EXPLORE IN 3D!
镜头：战斗特写！|Camera: 3D Action Close-Up!
镜头：冒险全景|Camera: 3D Adventure Overview
已静音|Sound Muted
声音已开启|Sound Enabled
切换镜头模式|Toggle 3D Camera Mode
切换声音|Toggle Sound
Martin 的立体表情|Martin's 3D Face (Live Emotion)
非常开心！|Super Happy!
Martin 笑着挥了挥拳头！|Martin smiled and pumped his fist!
一起探索 3D 世界！伙伴：|Exploring in 3D with
开心的伙伴！|Happy Companion!
开心地绕着你转了一圈！|happily circled around your feet in 3D!
恢复好了！|Restored!
水晶泉水恢复了全部生命！|Full HP restored in the Crystal Spring!
在治疗泉水复活！多训练，再挑战巨兽！|Revived at the 3D Healing Spring! Train more before challenging the Titans!
准备战斗！|Battle Ready!
对手挑战！|Rival Challenge!
对手 Sky 向你发起进化对决！|Rival Sky challenges you to a 3D Evolution Duel!
释放攻击！|Unleashing Attack!
受到克制！|Resisted!
投出捕获球！|Throwing Orb!
捕获成功！|Caught!
加入了你的队伍！|joined your 3D party!
挣脱了！|Broke Free!
受到攻击！|Taking Hit!
倒下了！|Fainted!
巨兽觉醒！|Titan Awakens!
冠军！|Champion!
冠军|CHAMPION
升级啦！|LEVEL UP!
选择一个强大特性|CHOOSE A POWERFUL PERK
自定义技能|CUSTOMIZE SKILLS
选择 1 个特性，让伙伴更强！|Select 1 perk to empower your creature!
增加 35% 暴击伤害，并提高暴击几率。|Adds +35% Critical Hit damage & higher crit chance.
被动：受到的所有伤害减少 30%。|Passive: Reduces all incoming damage by 30%.
攻击会将伤害的 40% 转化为生命恢复。|Attacks restore 40% of damage dealt back to HP.
速度强化：25% 几率一回合攻击两次。|Speed boost: 25% chance to strike twice in a turn.
被动：属性克制攻击伤害提高 25%。|Passive: Boosts all super-effective attacks by +25%.
陨石冲击|Meteor Impact
巨兽护甲|Titan Armor
吸血恢复|Vampire Drain
雷霆速度|Thunder Speed
元素怒火|Elemental Fury
正在进化！|IS EVOLVING!
古老基石产生了共鸣！|THE ANCIENT KEYSTONE RESONATED!
进化成为巨大的超级巨兽|transformed into the colossal 3D Mega Titan
获得巨龙之翼或护甲，最大生命 +40，攻击 +14，并学会终极技能！|Gained Draconic Wings/Armor, +40 Max HP, +14 Attack, and learned the ultimate finisher!
看看你的超级进化伙伴！雷霆山峰开放了！|Look at your 3D Mega Evolved companion! Thunder Peak is open!
全部伙伴都倒下了！|ALL CREATURES FAINTED!
山峰巨兽很强！先在草地升级、进化，并去泉水恢复，再来挑战。|The 3D mountain titans are fierce! Level up in the meadow, evolve your monster, and heal at the spring before challenging again.
在治疗泉水复活|REVIVE AT HEALING SPRING
Martin 获胜！|MARTIN WINS!
你击败了巨岩守卫和雷霆巨兽！|You conquered Giga-Golem and the Thunder Titan Stormjaw!
你和进化后的队伍，成为怪兽世界的传奇冠军！|You and your evolved team became the Legendary Grand Champions of the 3D Monster Realm!
Martin 的方向键|MARTIN'S 3D PAD
[A] 互动 / [B] 逃跑|[A] Action / [B] Run
互动/攻击|Action/Attack
取消/逃跑|Cancel/Run
最大生命 +8，攻击 +3|Max HP +8 | Attack +3
翡翠山谷|Emerald Valley
低语峡谷|Whispering Gorge
雷霆山峰|Thunder Peak
获得了|acquired
达到等级|reached Level
巨龙地狱火|Dragon Inferno
冰冻水流|Aqua Jet
种子爆弹|Seed Bomb
电光一闪|Thunder Spark
身体撞击|Body Slam
强力|Pwr
最大生命|Max HP
暴击|CRITICAL
效果拔群！|SUPER EFFECTIVE!
效果不佳。|Not very effective.
我们的家完工了！|Our home is complete!
拿饲料|Get feed
小屋盖好啦！大家一起进去看看！|The cabin is complete! Explore your new home!
点燃了篝火！|lit the campfire!
物品栏|Inventory
方向|Direction
角色|Character
加入游戏|Join game
回到大厅|Return to plaza
金币不足|Not enough coins
背包|Bag
喂养|Feeding
奖励|Reward
当前任务|Current quest'''
# Extra pairs are resolved with the same source-aware dictionary before runtime initializes.
rows=[]
for line in extra.splitlines():
 if '|' in line:rows.append(line.split('|',1))
p=S/'strings.js';p.write_text(p.read_text()+'\nwindow.R6_STRINGS.push(...'+json.dumps(rows,ensure_ascii=False)+');\n')
print('R6 refinements applied: local reset isolation, restored resource timers, language navigation and extended bilingual copy.')
