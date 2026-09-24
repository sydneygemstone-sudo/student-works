from pathlib import Path
import json,re,subprocess
R=Path(__file__).resolve().parents[1];S=R/'shared/hub-r6'
# The original classroom server used /game.js and /style.css. A project Pages path must be relative.
p=R/'adventure-world/solo-skyvale/game/index.html';s=p.read_text();s=re.sub(r'(src|href)="/(?!/)',r'\1="./',s);s=s.replace('云间奇遇 · 三个人，一个世界','云间奇遇 · 单人冒险');p.write_text(s)
# GameApp.init is asynchronous. Locale/UI/saving must wait for the real state object.
p=R/'adventure-world/home-v1/game/bundle.js';s=p.read_text();old="game.init();\n  window.__AW_GAME__ = game;game.state.locale=window.R6_LANG==='en'?'en':'zh';game.updateLocaleUI();window.__R6Game={save:()=>game.saveMgr.save(game.state,true),snapshot:()=>game.state};";new="game.init().then(()=>{game.state.locale=window.R6_LANG==='en'?'en':'zh';game.updateLocaleUI();window.__R6Game={save:()=>game.saveMgr.save(game.state,true),snapshot:()=>game.state};});\n  window.__AW_GAME__ = game;";assert old in s;s=s.replace(old,new);p.write_text(s)
# More complete static and dynamic labels, including split DOM nodes and canvas signage.
extra='''单人冒险|Solo adventure
小小世界，大大冒险。|A LITTLE WORLD. A BIG ADVENTURE.
我的队伍|My team
WASD / 方向键 · E 互动 · 或点击地标前往|WASD / arrows · E interact · or tap a destination
自动保存 · V2|Auto-saved · V2
存档不可用，请保持此页面打开|Storage unavailable — keep this page open
晴朗|Sunny
单人|Solo
你|You
星环|Star ring
燃烧|Burning
收获|Harvest
还需|Needed
世界地图|ISLAND MAP
星光大厅|CENTRAL PLAZA
星环乐园|STARLIGHT PARK
野外营地|WILD GROVE
暖阳农场|SUNNY FARM
我们的冒险|OUR ADVENTURE
火焰火花|Flame Spark
叶刃|Leaf Slice
水之脉冲|Water Pulse
快速撞击|Quick Tackle
电击|Thunder Shock
岩石撞击|Rock Smash
火焰吐息|Fire Breath
荆棘斩击|Thorn Slash
潮汐冲击|Tidal Wave
巨龙地狱火|Dragon Inferno
巨岩守卫|Giga-Golem
技能 1|Move 1
技能 2|Move 2
技能 3|Move 3
选择特性：|CHOOSE A PERK FOR
获得巨大的巨龙力量，|Gained immense draconic power,
并解锁了|and unlocked
哇！|WHAT?
等级|Lv.
经验|XP
勇气|Courage
生命已满|Full HP
准备战斗|Battle ready
把敌人生命降低后再捕获|Lower the enemy HP before capture
制作|Make
技能|Move
攻击|Attack
投掷|Throw
捕获球|Capture Orb
倒下了|fainted
你的回合|Your turn
使用了|used
造成|dealt
伤害|damage
效果拔群！|It's super effective!
效果不佳……|It's not very effective...
加入了你的队伍|joined your party
挣脱了捕获球|broke free
获得|gained
生命|Health
还有|left
治疗|Healing
并且|and
已击败|defeated
伙伴|partner
选择|Select
怪兽|monster
伙伴|companion
命中|hit
等级|level
生命|HP
攻击|ATK
防御|DEF
力量|Power
速度|Speed
现在|now
正要|is about to
继续|CONTINUE
守护者|Guardian
远古|Ancient
已解锁|unlocked
获胜|wins
战斗结束|Battle over
选择另一位伙伴|Choose another partner
进化|Evolving
已进化|Evolved
回合|turn
传奇|Legendary
冠军|Champion'''
rows=[l.split('|',1)for l in extra.splitlines()if'|'in l];p=S/'strings.js';p.write_text(p.read_text()+'\nwindow.R6_STRINGS.push(...'+json.dumps(rows,ensure_ascii=False)+');\n')
# Report JavaScript exceptions even if a preceding UI wait times out.
p=R/'scripts/qa_hub_r6.cjs';s=p.read_text();s=s.replace("false,e.message);try{await screenshot(p,id", "false,{error:e.message,exceptions:errors});try{await screenshot(p,id");p.write_text(s)
# Run exact shipped local rules as a separate deterministic test, without altering the game state in browser QA.
p=S/'qa';p.mkdir(exist_ok=True)
proc=subprocess.run(['node',str(R/'scripts/r6-assets/rules-check.cjs'),str(R)],capture_output=True,text=True,check=True)
(p/'solo-rules.json').write_text(proc.stdout)
print('Skyvale relative paths, async Adventure World setup, extra bilingual labels and solo rule tests: complete')
