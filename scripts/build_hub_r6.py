#!/usr/bin/env python3
"""R6: two project-native HUBs, original runtime preservation, local solo rules."""
from pathlib import Path
import os,json,re,shutil,hashlib,zipfile,subprocess
R=Path(os.environ.get('R6_ROOT',Path(__file__).resolve().parents[1]));S=R/'shared/hub-r6';S.mkdir(parents=True,exist_ok=True)
SRC=Path(os.environ.get('R6_ASSETS',Path(__file__).parent/'r6-assets'))
def write(p,s):
 p=Path(p);p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s,encoding='utf8')
def dump(p,d):write(p,json.dumps(d,ensure_ascii=False,indent=2)+'\n')
def bi(a,b):return [a,b]
def copytree(a,b):shutil.copytree(a,b,dirs_exist_ok=True)
def read(p):return Path(p).read_text(encoding='utf-8-sig')
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def redirect(p,url):write(p,'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>作品 HUB / Project HUB</title><meta http-equiv="refresh" content="0;url='+url+'"><a href="'+url+'">打开作品 HUB / Open project HUB</a><script>location.replace('+json.dumps(url)+'+location.search+location.hash)</script></html>')
base=R/'classroom-2026-09-22'
for name in ['studio.js','studio.css','studio-r3.css','studio-r5.css']:
 if not (base/name).exists():raise RuntimeError('R5 native source missing: '+name)
if (R/'.git').exists():subprocess.run(['python3',str(R/'scripts/verify_hub_standard.py')],cwd=R,check=True)
provenance={x:sha(base/x) for x in ['studio.js','studio.css','studio-r3.css','studio-r5.css']}
for name in ['studio.css','studio-r3.css','studio-r5.css']:shutil.copy2(base/name,S/name)
for name in ['game-runtime.js','game-shell.js','game-shell.css','strings.js']:shutil.copy2(SRC/name,S/name)
shutil.copy2(base/'touch-guard.js',S/'touch-guard.js')
D=json.loads(read(R/'classroom-2026-09-24/lesson-data.json'));usage=json.loads(read(R/'classroom-2026-09-24/records/usage.json'))
AW=json.loads(read(R/'adventure-world/hub-data.js').split('=',1)[1].strip().rstrip(';'))
rates=json.loads(read(base/'costs.json'));FX=rates['fx']['usd_per_aud'];rate=rates['rates_usd_per_million']
def value(name):
 u=usage[name]['tokens']
 if name!='trio-opus':
  p=rate['gpt-6-astra'];usd=((u['input_tokens']-u['cached_input_tokens'])*p['input']+u['cached_input_tokens']*p['cache_read']+u['output_tokens']*p['output'])/1e6
 else:
  p=rate['claude-opus-5'];usd=(u['input_tokens']*p['input']+u['cache_read_input_tokens']*p['cache_read']+u['cache_creation_input_tokens']*p['cache_write_1h']+u['output_tokens']*p['output'])/1e6
 return round(usd/FX,2)
vals={n:value(n) for n in ['martin','skyvale','trio-opus']}
def item(title,a,lo,hi,note):return dict(title=title,aud=a,range=[lo,hi],note=note)
def measured(title,name):
 a=vals[name];return item(title,a,round(a*.7,2),round(a*1.3,2),bi('已回收用量 × 仓库历史费率/汇率；价格敏感性 ±30%，非实时账单。','Recovered usage × historical repository rates/FX; ±30% price sensitivity, not a live bill.'))
items={'martin':[
 item(bi('9/17 原版完整生产与迭代','17 Sep original production and iterations'),5,2,10,bi('原始 2 AUD 是首个小样上限，随后补地图、选人、3D 与反馈；完整过程估 A$2–10，取 A$5。教师回忆使用 GLM，现有 Git/日志未独立确认模型。','The initial A$2 cap covered the first prototype; maps, selection and 3D followed. Full-history estimate A$2–10, central A$5. Teacher recalls GLM; Git/log evidence does not independently confirm the model.')),
 measured(bi('9/24 Wildbound V2','24 Sep Wildbound V2'),'martin'),
 item(bi('前轮归档、学习记录与展示','Previous recovery, learning record and showcase'),4,2,8,bi('未计量主控的完整工作量分摊估算；不是零，也不是账单。','Allocated workload estimate for the unmetered controller, not zero or an invoice.')),
 item(bi('R6 原生包装、双语与单机 QA','R6 native HUB, language and solo QA'),8,4,16,bi('本轮制作和测试的工具等值预估；有供应商回执后可替换。','Tool-equivalent estimate for this production/test pass; replace with a provider receipt when available.'))],
 'trio':[
 item(bi('9/17 原 Adventure World 完整制作','17 Sep original Adventure World production'),AW['budget']['estimated_api_equivalent'],*AW['budget']['estimated_api_equivalent_range'],bi('直接合并上周 HUB 的 A$8（A$5–12），覆盖实现、操作修订和主线复核；Git 5a1db9d → aac8dc3 → 392ed68。','Directly incorporates the earlier HUB A$8 estimate (A$5–12), covering implementation, controls and core review; Git 5a1db9d → aac8dc3 → 392ed68.')),
 item(bi('9/23 上周作品 HUB 与预算整理','23 Sep earlier project HUB and budget'),3,1,6,bi('旧账本 A$8 只覆盖 9/17 制作；另计前次 HUB 整理，避免漏项。','The old A$8 covers 17 Sep production only; prior HUB preparation is added separately, not double-counted.')),
 measured(bi('9/24 Astra 云间奇遇（含 HUD 修复）','24 Sep Astra Skyvale, including HUD repair'),'skyvale'),measured(bi('9/24 Opus 三人同乐世界（含触屏修订）','24 Sep Opus Trio World, including touch revision'),'trio-opus'),
 item(bi('前轮归档、课堂记录与展示','Previous archive, classroom records and showcase'),4,2,8,bi('未计量主控的项目分摊工作量预估。','Project allocation for the unmetered controller pass.')),
 item(bi('R6 两分支单机、双语、原生 HUB 与 QA','R6 two-branch solo, language, native HUB and QA'),10,5,20,bi('覆盖本轮适配和测试预估；两分支都计入，没有把未选分支当零。','Covers the current adaptation/test estimate for both branches; unselected work is not treated as zero.'))]}
keys={'martin-v2':['martin-monster-quest-r6-v2'],'martin-v1':['r6-martin-v1'],'skyvale':['r6-skyvale-world','r6-skyvale-player'],'opus':['r6-opus-world','r6-opus-client'],'aw-v1':['r6-adventure-v1']};rawfiles={}
def game(project,folder,source,kind):
 out=R/project/folder;raw=out/'game';raw.mkdir(parents=True,exist_ok=True)
 if kind in ['skyvale','opus']:copytree(source,raw)
 elif kind=='martin-v2':
  for n in ['index.html','style.css','game.js']:shutil.copy2(source/n,raw/n)
  copytree(source/'vendor',raw/'vendor')
 elif kind=='martin-v1':
  old=source/'r6-original-index.html'
  if not old.exists():shutil.copy2(source/'index.html',old)
  shutil.copy2(old,raw/'index.html')
  for n in ['style.css','game.js','three.min.js']:shutil.copy2(source/n,raw/n)
 else:
  old=source/'r6-original-index.html'
  if not old.exists():shutil.copy2(source/'index.html',old)
  shutil.copy2(old,raw/'index.html')
  for n in ['styles.css','bundle.js']:shutil.copy2(source/n,raw/n)
  if (source/'assets').exists():copytree(source/'assets',raw/'assets')
 rel=os.path.relpath(S,out).replace('\\','/');rr=os.path.relpath(S,raw).replace('\\','/')
 title=bi('Martin 的怪兽冒险','Martin’s Monster Quest') if project=='martins-monster-quest' else bi('三人共创世界','Adventure World')
 conf=dict(id=kind,title=title,hub='../hub/',keys=keys[kind])
 write(out/'index.html','<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>R6 · Solo</title><link rel="icon" href="data:,"><link rel="stylesheet" href="'+rel+'/game-shell.css"></head><body><nav id="rail" aria-label="Game tools"><a id="home">HUB</a><a id="report">Review</a><button id="language">EN</button><button id="pause">Pause</button><button id="full">Full</button><button id="reset">Reset</button></nav><iframe id="game" title="Solo game" allow="fullscreen; autoplay"></iframe><section id="curtain" hidden><strong id="curtainText"></strong><button id="resume"></button></section><div id="status"></div><script>window.R6_GAME='+json.dumps(conf,ensure_ascii=False)+';</script><script src="'+rel+'/game-shell.js"></script></body></html>')
 html=read(raw/'index.html');inject='<script src="'+rr+'/strings.js"></script><script src="'+rr+'/game-runtime.js"></script><script src="'+rr+'/touch-guard.js"></script>'
 html=html.replace('<head>','<head>'+inject,1).replace('</head>','<style>html,body{overscroll-behavior:none}canvas{touch-action:none}input,select,textarea{font-size:16px!important}.panel,.card{max-width:100%}#roomLabel,#invite,#chatin,#tChat{display:none!important}</style></head>')
 if kind=='skyvale':
  server=read(R/'adventure-world/builds/skyvale-3d/server.mjs');logic=server[server.index('function fresh()'):server.index('server.listen(')]
  logic=logic.replace('world:fresh()','world:loadWorld()').replace('room.players.set(player.id,player);',"try{const q=JSON.parse(localStorage.getItem('r6-skyvale-player')||'null');if(q){player.x=q.x;player.z=q.z;player.power=q.power||0;}}catch{}room.players.set(player.id,player);")
  logic=logic.replace('broadcast(r,snapshot(r));}},1000/30)','broadcast(r,snapshot(r));if(tick%30===0)saveWorld();}},1000/30)')
  local="import {TREES,RINGS,ANIMALS,FIRE,CABIN,move} from './shared.js';\nconst rooms=new Map();const crypto={randomBytes:()=>({toString:()=>Math.random().toString(16).slice(2,14)})};const wss={on:(_,fn)=>window.__r6Accept=fn};\n"
  local+="function loadWorld(){try{return JSON.parse(localStorage.getItem('r6-skyvale-world'))||fresh();}catch{return fresh();}}function saveWorld(){const r=[...rooms.values()][0];if(!r)return;try{localStorage.setItem('r6-skyvale-world',JSON.stringify(r.world));const p=[...r.players.values()][0];if(p)localStorage.setItem('r6-skyvale-player',JSON.stringify({x:p.x,z:p.z,power:p.power}));}catch{}}\n"
  local+=logic+"\nwindow.WebSocket=window.R6LocalSocket;window.__R6Game={save:saveWorld,snapshot:()=>{const r=[...rooms.values()][0];return r?JSON.parse(JSON.stringify(snapshot(r))):null;}};addEventListener('pagehide',saveWorld);"
  write(raw/'solo.js',local)
  gs=read(raw/'game.js').replace("import * as T from './three.module.js';","import './solo.js';\nimport * as T from './three.module.js';")
  gs=gs.replace("$('room').value=params.get('room')||'SKY'+Math.random().toString(36).slice(2,6).toUpperCase();","$('room').value='SOLO';$('room').closest('label')?.style.setProperty('display','none');")
  gs=re.sub(r"\$\('network'\)\.textContent=`[^`]+`;","$('network').textContent='单人 · 本机存档';",gs);write(raw/'game.js',gs)
  html=html.replace('三片天地，等你们一起发现。','独自探索三片天地。').replace('叫上两个伙伴，一起出发。','独自探索三片天地。').replace('三个人填写同一个房间码','本机独立进度').replace('支持电脑与平板 · 每个房间最多 3 人','浏览器单人试玩 · 本机自动保存').replace('进入共同的世界','开始单人冒险')
 elif kind=='opus':
  server=read(R/'adventure-world/builds/trio-world-opus/server.js');logic=server[server.index('const world ='):server.index('server.listen(')]
  logic=logic.replace('const wss = new WebSocketServer({ server });','const wss={on:(_,fn)=>window.__r6Accept=fn};').replace('const players = new Map();',"try{Object.assign(world,JSON.parse(localStorage.getItem('r6-opus-world')||'{}'));}catch{}\nconst players = new Map();").replace('function patch(obj) {','function patch(obj) { saveWorld();')
  logic+="\nfunction saveWorld(){try{localStorage.setItem('r6-opus-world',JSON.stringify(world));}catch{}}window.WebSocket=window.R6LocalSocket;window.__r6WorldSave=saveWorld;\n";write(raw/'solo.js',logic)
  html=html.replace("import * as THREE from './vendor/three.module.js';","import './solo.js';\nimport * as THREE from './vendor/three.module.js';").replace('`👥 在线 ${others.size + 1} 人<br>🟢 ${esc(me.name)}（你）`','`🎮 单人 · 本机存档<br>🟢 ${esc(me.name)}`')
  savecode="""let qi = 0;
let r6Saved=null;try{r6Saved=JSON.parse(localStorage.getItem('r6-opus-client')||'null');if(r6Saved){Object.assign(inv,r6Saved.inv||{});Object.assign(Q,r6Saved.q||{});renderInv();qi=Math.max(0,Math.min(STEPS.length-1,r6Saved.qi||0));if(r6Saved.pos)me.pos.set(...r6Saved.pos);}}catch{}
function r6Save(){try{window.__r6WorldSave?.();localStorage.setItem('r6-opus-client',JSON.stringify({inv,q:Q,qi,pos:me.pos.toArray()}));}catch{}}
window.__R6Game={save:r6Save,snapshot:()=>JSON.parse(JSON.stringify({inv,q:Q,qi,pos:me.pos.toArray(),world,connected}))};setInterval(r6Save,1200);addEventListener('pagehide',r6Save);
"""
  html=html.replace('let qi = 0;',savecode).replace('木头不够就回生存区捡；三个人一起盖更快','木头不够就回生存区捡').replace('和朋友一起到处逛逛、比比谁飞得高','全部完成！自由玩耍吧')
 elif kind=='martin-v2':
  js=read(raw/'game.js').replace("const KEY='martin-monster-quest-v2-wildbound-1'","const KEY='martin-monster-quest-r6-v2'")
  js+='\nwindow.__R6Game={save,snapshot:()=>window.MQ.snapshot(),canSwitch:()=>!["battle","acting","switch"].includes(state)};\n';write(raw/'game.js',js)
 elif kind=='martin-v1':write(raw/'game.js',read(raw/'game.js')+'\n'+read(SRC/'martin-legacy-save.js'))
 elif kind=='aw-v1':
  js=read(raw/'bundle.js').replace('adventure-world:save:v1','r6-adventure-v1')
  js=js.replace('window.__AW_GAME__ = game;',"window.__AW_GAME__ = game;game.state.locale=window.R6_LANG==='en'?'en':'zh';game.updateLocaleUI();window.__R6Game={save:()=>game.saveMgr.save(game.state,true),snapshot:()=>game.state};")
  write(raw/'bundle.js',js)
 write(raw/'index.html',html);rawfiles[kind]=out.relative_to(R).as_posix()
for project,folder,source,kind in [('martins-monster-quest','home-v2',R/'martins-monster-quest/v2','martin-v2'),('martins-monster-quest','home-v1',R/'martins-monster-quest','martin-v1'),('adventure-world','solo-skyvale',R/'adventure-world/builds/skyvale-3d/public','skyvale'),('adventure-world','solo-trio',R/'adventure-world/builds/trio-world-opus/public','opus'),('adventure-world','home-v1',R/'adventure-world','aw-v1')]:game(project,folder,source,kind)
js=read(base/'studio.js')
js=js.replace("const link=page=>P.id+'-'+page+'.html?lang='+(L?'en':'zh-CN');","const link=page=>(page==='hub'?'index':page)+'.html?lang='+(L?'en':'zh-CN');")
js=js.replace('v=20260923-r5','v=20260925-r6').replace("fetch('studio-data.json?v=20260925-r6')","fetch('project.json?v=r6')")
for name,body in re.findall(r'// FUNCTION (\w+)\n(.*?)(?=\n// FUNCTION |\Z)',read(SRC/'hub-functions.js'),re.S):
 js,count=re.subn(r'function '+name+r'\(.*?(?=\nfunction |\nfetch\(|\Z)',lambda m:body.rstrip(),js,count=1,flags=re.S)
 if count!=1:raise RuntimeError('R5 component not located: '+name)
js=js.replace('已记录投入 / 总池','工具总估算 / 总池').replace('recorded spend / pool','estimated tools / pool').replace("'预算使用','Budget used'","'预算估算','Estimated budget used'")
js=js.replace("'人工估算 ÷ 已记录值'","'人工估算 ÷ 同阶段估算'").replace("'Manual estimate ÷ recorded value'","'Manual estimate ÷ same-stage estimate'").replace("'已记录工具费','Recorded tool equivalent'","'工具费率折算估计','Estimated tool equivalent'")
js=js.replace('href="../">GEMSTONE','href="${link(\'hub\')}">GEMSTONE').replace("'学员作品','STUDENT WORKS'","'作品 HUB','PROJECT HUB'")
start="k?t('从飞船与救地球的要求，追到两个原型、家庭适配和融合方向。','Trace the ships-and-Earth brief through two prototypes, home adaptation and the merge proposal.'):t('从宝箱与职业克制的构想，追到并行制作、课堂故障、取舍和单机打磨。','Trace chest/role-counter ideas through parallel builds, classroom faults, the decision and solo refinement.')"
js=js.replace(start,'v(P.route_start)').replace('r3/r4 已发布验收与本轮 UI 核验分别标识，不把旧测试算成本轮新测试。','历史验收与本轮 R6 核验分别标识，不把旧测试算成本轮新测试。').replace('Previous r3/r4 tests and current UI checks are distinguished.','Historical and current R6 checks are distinguished.')
js=js.replace('R3-${i+1}','R6-${i+1}').replace('studio-r3-feedback-','studio-r6-feedback-').replace('-r3-feedback.json','-r6-feedback.json')
js=js.replace('<label>${t(\'版本\',\'Build\')}<select id="buildChoice">','<label>${t(\'记录人\',\'Reviewer\')}<select id="reviewer">${P.people_names.map(x=>`<option>${x}</option>`).join(\'\')}</select></label><label>${t(\'版本\',\'Build\')}<select id="buildChoice">')
js=js.replace("const key='studio-r6-feedback-'+P.id;","let key='studio-r6-feedback-'+P.id+'-'+document.getElementById('reviewer').value;document.getElementById('reviewer').onchange=()=>{key='studio-r6-feedback-'+P.id+'-'+document.getElementById('reviewer').value;let x={};try{x=JSON.parse(localStorage.getItem(key)||'{}')}catch{};for(const f of ['buildChoice','device','rating','notes'])document.getElementById(f).value=x[f]||'';};")
js=js.replace("status:'LOCAL_DRAFT'","reviewer:document.getElementById('reviewer').value,status:'LOCAL_DRAFT'")
js=js.replace('刷新会重开，不宣称已经实现云存档。','刷新读取本版本本机进度；战斗时请先结束战斗再切换语言。不提供云存档。').replace('Reloading restarts; there is no cloud-save claim.','Reloading reads this edition’s local progress; finish battles before changing language. No cloud saving is provided.')
js=re.sub(r"if\(Q==='comparison'&&document\.getElementById\('testSummary'\)\).*?(?=\nfunction render)",'}',js,flags=re.S)
js=js.replace("window.__studio={project:P.id,release:D.release};","window.__studio={project:P.id,release:D.release,nativeBaseline:'CLASSROOM-HUB-R5-20260923'};")
write(S/'studio.js',js)
write(S/'r6.css','''/* Only R6 additions; native R5 styles are retained byte-for-byte. */
.history-zone{margin-top:70px;padding-top:22px;border-top:2px solid #c8dec344}.history-zone .modelcard{opacity:.92}.learning blockquote{margin:18px 0;padding:20px;border-left:3px solid var(--gold);background:#24434b;font-size:19px;border-radius:0 12px 12px 0}.project-dashboard .metric strong{white-space:normal}.builds .actions{margin-top:auto}.modelcard .cardBody{display:flex;flex-direction:column}.modelcard .scores{margin-top:auto}.pageHeader h1{overflow-wrap:anywhere}.tableWrap td{min-width:110px}label{display:block;margin:16px 0}input,textarea{font-size:16px}.metric-caption span{line-height:1.4}@media(max-width:600px){.heroContent h1{font-size:36px}.two{grid-template-columns:1fr}.metric strong{font-size:23px}.project-dashboard{grid-template-columns:repeat(2,minmax(0,1fr))}.learning blockquote{font-size:16px}}
''')
for sid,folder in [('martin','martins-monster-quest'),('trio','adventure-world')]:
 q=D['projects'][sid];dest=R/folder/'hub';dest.mkdir(exist_ok=True);(dest/'assets').mkdir(exist_ok=True)
 for a in (R/'classroom-2026-09-24/assets').iterdir():
  if a.is_file():shutil.copy2(a,dest/'assets'/a.name)
 total=round(sum(x['aud']for x in items[sid]),2);rng=[round(sum(x['range'][i]for x in items[sid]),2)for i in [0,1]]
 budget=dict(budget_aud=q['budget'],api_equivalent_aud=total,range=rng,items=items[sid],total_tokens=sum(b['tokens']or 0 for b in q['branches']),method=bi('所有条目采用工具/API 等值；历史值、用量折价和工作量估算分别注明，各阶段不重复累计。','Each tool/API-equivalent item states its historical, usage-based or workload-estimated basis. Stages are not counted twice.'),rate_assumptions=rate,fx_assumption=rates['fx'])
 specs=[('martin-v2','home-v2',False,vals['martin']),('martin-v1','home-v1',True,5)]if sid=='martin'else[('skyvale-hud1','solo-skyvale',False,vals['skyvale']),('opus-touch','solo-trio',False,vals['trio-opus']),('aw-v1','home-v1',True,8)]
 branches=[]
 for bid,path,legacy,cost in specs:
  b=next(x for x in q['branches']if x['id']==bid)
  name=b['name'];strength=b['strength']
  if bid=='skyvale-hud1':name=bi('Astra · 云间奇遇单人版','Astra · Skyvale solo');strength=bi('星环、采果、生火、喂动物与建屋由浏览器本机规则驱动，保留 HUD 修复和任务指引。','Rings, fruit, fire, feeding and cabin building run locally, retaining HUD repairs and quest guidance.')
  if bid=='opus-touch':name=bi('Opus · 三人同乐世界单人版','Opus · Trio World solo');strength=bi('大厅与三区、三种能力、五套外观、天气、采集、喂养和五阶段小屋，完整保留在单人试玩中。','Lobby, three zones, powers, five appearances, weather, collection, feeding and the five-stage cabin are retained in solo play.')
  branches.append(dict(key=bid,name=name,tag=bi('历史对照 · R6 单机包装','Historical comparison · R6 solo')if legacy else bi('最新 R6 · 单机双语','Latest R6 · solo bilingual'),tool='Historical / GLM recalled'if legacy else('Opus'if bid=='opus-touch'else'Astra'),release=bi('历史游戏 · 当前试玩适配','Historical game · current play adapter')if legacy else bi('当前单机修订 R6','Current solo revision R6'),subtitle=strength,strength=strength,limit=bi('本版本保留原玩法；旧问题与原测试不抹去。浏览器适配检查不等于实体 iPad 全流程验收。','Original gameplay retained; historical issues/tests remain. Browser adaptation checks are not full physical-iPad acceptance.'),detail=bi('原课堂版记录：'+b['limit'][0],'Original classroom record: '+b['limit'][1]),path='../'+path+'/',image=b['image'],tokens=b['tokens'],aud=cost,legacy=legacy,status='retained',scores=None))
 human_tasks=[dict(task=x[0],range=x[1:])for x in q['human_tasks']]+[dict(task=bi('本轮双语、单机适配与回归','This pass: bilingual, solo adaptation and regression'),range=[4,8]if sid=='martin'else[8,14])]
 hr=[sum(x['range'][i]for x in human_tasks)for i in [0,1]];hm=sum(hr)/2;h=dict(hours_range=hr,hours_mid=hm,aud_range=[round(x*63.44,2)for x in hr],aud_mid=round(hm*63.44,2),scope=q['human_scope'])
 ph=[18,30]if sid=='martin'else[30,50];sec=15*60+47 if sid=='martin'else 26*60;tool=vals['martin']if sid=='martin'else vals['skyvale']+vals['trio-opus'];pm=sum(ph)/2
 efficiency=dict(stage=bi('9/24 新原型阶段','24 Sep new prototypes'),manual_hours_range=ph,manual_hours_mid=pm,manual_aud_mid=round(pm*63.44,2),elapsed_seconds=sec,elapsed_display=str(sec//60)+'m '+str(sec%60)+'s',tool_cost_aud=round(tool,2),time_ratio_mid=pm/(sec/3600),time_ratio_range=[x/(sec/3600)for x in ph],cost_ratio_mid=pm*63.44/tool,cost_ratio_range=[x*63.44/tool for x in ph],note=bi('只比较 9/24 新原型阶段，人工为规划估算，费用使用历史费率假设。并行窗口取联合跨度，不把并行时长相加；不是全项目成本节省。','Only the 24 Sep prototype stage is compared. Labour is estimated; tools use historical-rate assumptions. Parallel work uses a joint elapsed window, not summed durations; this is not total-project savings.'))
 journey=[]
 if sid=='trio':
  for i,x in enumerate(AW['journey']):journey.append(dict(id='old-'+str(i),date=x['date'],title=x['title'],summary=x['brief'],brief=x['brief'],tool=x['tools'],tech=x['tech'],result=x['result'],source=x['source'],status='done'))
 for i,x in enumerate(q['journey']):
  if sid=='trio'and i==0:continue
  journey.append(dict(id='source-'+str(i),date=x['date'],title=x['title'],summary=x['brief'],brief=x['brief'],tool=x['tools'],tech=x['tech'],result=x['result'],source=x['source'],status='done'))
 journey.append(dict(id='r6',date='R6 · 2026-09-25',title=bi('从 R5 原生组件升级到 R6 单机作品 HUB','Native R5 components upgraded to an R6 solo project HUB'),summary=bi('最新优先、旧版隔开、预算完整合并、保留学习记录。','Latest first, history separated, complete consolidated budget and learning retained.'),brief=bi('每作品一个入口；每个保留版本可直接单人双语试玩。','One entrance per work; every exposed edition supports bilingual solo play.'),tool=bi('读 R5 原生组件 → 分离传输和规则 → 双语/暂停/返回 → 浏览器验证 → GitHub','Read native R5 components → separate rules/transport → language/pause/return → browser checks → GitHub'),tech=bi('原游戏规则在浏览器运行，独立存档命名空间；暂停冻结逻辑时钟；继承 R5 渲染器组件。','Original rules run on-device with isolated saves; pause freezes the simulation clock; native R5 components are inherited.'),result=bi('R6 待教师审阅；实体 iPad 完整体验仍需确认。','R6 awaits teacher review; complete physical-iPad play still needs confirmation.'),source='R6',status='done'))
 p=dict(id=sid,name=q['names'],title=q['title'],heroTitle=bi('怪兽冒险<br><em>捕捉、交易与成长</em>'if sid=='martin'else'三片天地，一个家<br><em>现在，一个人也能探索</em>','Monster Quest<br><em>Capture, trade and grow</em>'if sid=='martin'else'Three zones, one home<br><em>Now ready to explore solo</em>'),intro=q['intro'],hero=q['hero'],theme=q['theme'],budget=q['budget'],people_names=q['names'].split(' · '),cost=budget,human=h,human_tasks=human_tasks,efficiency=efficiency,branches=branches,learning=q['learning'],questions=q['questions'],requirements=[[x['title'],x['detail']]for x in q['requirements']],journey=journey,
 decision=bi('主按钮进入 R6 单人试玩；中英切换、暂停、返回本作品 HUB 均在左栏。原始开发版本独立保留，历史预算与课堂学习已合并于本 HUB。','Primary buttons open R6 solo play; language, pause and return controls are on the left. Original builds remain preserved; historical budgets and learning are consolidated here.'),
 route_title=q['title'],route_start=bi('上周需求与制作 → 9/24 试玩与新开发 → R6 双语单机与完整作品记录。','Earlier requirements/production → 24 Sep playtests/new builds → R6 bilingual solo and complete project records.'),
 flow_lanes=[dict(id='r6',name=b['name'],state='retained',desc=bi('旧版保留作对照；从游戏直接回本 HUB。'if b['legacy']else'原课堂版 → 双语本机规则 → 当前单人试玩。','Historical comparison; return directly to this HUB.'if b['legacy']else'Classroom original → bilingual local rules → current solo play.'))for b in branches],
 next_title=bi('真实 iPad 长流程与教师最终确认','Full physical-iPad play and teacher sign-off'),next_scope=bi('分别体验当前单机版本，确认操作、任务和展示；多人原型的实机验收与最终取舍另外记录。','Review current solo controls, quests and presentation. Physical multiplayer testing and final branch selection remain separate.'),snapshot_note=bi('原 V1/V2、HUD 修复前文件及 Opus 最早 Write 均在 Git 归档；当前可玩入口只打开本作品内的 R6 试玩，不再进入旧 HUB。','Original V1/V2, pre-HUD files and the earliest Opus Write remain in Git. Play entries open this project’s R6 preview, not an old HUB.'),
 cost_note=bi('这是完整工具等值总估算：历史值、当前用量折价、未计量的前轮整理及本轮适配均已计入；不是实付发票。','A complete tool-equivalent estimate includes history, usage-based values and unmetered previous/current controller work; not a paid invoice.'),metric_scope_note=bi('首页、版本卡与预算表共用同一账本；总额、区间和余额可核对。','Dashboard, build cards and the budget table use one ledger with a verifiable total, range and balance.'),
 milestone_note=bi('六个数字交付阶段；第七关实机与教师确认仍开放。','Six digital-delivery gates; physical play and teacher sign-off remain open.'),milestones=[dict(name=x,status='complete'if i<6 else'pending')for i,x in enumerate([bi('构想','Idea'),bi('Brief','Brief'),bi('原型','Prototype'),bi('版本评估','Review'),bi('家庭适配','Home build'),bi('验证与呈现','Test & present'),bi('实机与定稿','Final approval')])],milestone_evidence=[bi('需求已记录','Recorded'),bi('范围已明确','Aligned'),bi('版本已保留','Preserved'),bi('反馈已合并','Consolidated'),bi('双语单机','Bilingual solo'),bi('见 R6 验收','R6 checks'),bi('待实机确认','Device check')],progress_scope=bi('七个等权交付阶段','Seven equally weighted gates'),progress_next=bi('请用真实 iPad 复测完整任务链，再确认展示与版本选择。','Test the full quest on a physical iPad, then approve the presentation and version choice.'),
 rate_note=bi('A$63.44/h 沿用 R5 历史规划参数，不是工资或新市场报价。','A$63.44/h is the R5 historical planning assumption, not wages or a new quote.'),prototype_estimate_basis=bi('倍数仅比较 9/24 新原型阶段，不把全部历史人工除以一次短调用。','Ratios compare only the 24 Sep new-prototype stage, not all historical labour against a short call.'),
 guide=bi('直接点版本卡即可单人玩。左栏提供 HUB、测评、语言、暂停、全屏和重开。各版本独立保存；语言切换读取本版本进度。Martin 战斗中请先结束战斗。无需游戏服务器。','Click a version card to play solo. The left rail has HUB, review, language, pause, fullscreen and restart. Editions save separately; language switching reads that edition’s progress. Finish Martin battles before changing language. No game server is required.'),
 changes=[[bi('双语与单机','Bilingual solo'),bi('传输层本机化，保留玩法规则；所有试玩有左栏和返回入口。','Transport is local while game rules remain; every preview has a utility rail and return control.')],[bi('合并历史与预算','Merged history and budget'),bi('旧记录直接并入数据源，当前与历史版本分区展示。','Earlier records are imported into this data source; current and historical builds are separated.')]],runtime_release='2026.09-r6',sources=[])
 p['sources']=[dict(id=x['id'],label=x['title'],note=x['note'])for x in D['sources']if x['id'].startswith('M-'if sid=='martin'else'T-')]
 if sid=='trio':p['sources']+=[dict(id=x[0],label=x[1],note=bi('上周资料已合并；原来源：'+str(x[2]),'Prior records imported; original source: '+str(x[2])))for x in AW['sources']]
 p['sources']+=[dict(id='R6',label='R6 native upgrade',note=bi('继承锁定 R5 原生渲染器和三个样式文件，来源指纹已记录。','Derived from the locked native R5 renderer and three stylesheets; source fingerprints are recorded.'))]
 dump(dest/'project.json',dict(release='2026.09-r6',classDate=D['date'],projects={sid:p},native_R5=provenance));dump(dest/'budget.json',budget);dump(dest/'learning-record.json',p)
 for page in ['hub','comparison','development','costs','guide','parents','review']:
  html=read(base/'kehan-hub.html').replace('data-project="kehan"','data-project="'+sid+'"').replace('data-page="hub"','data-page="'+page+'"').replace('Star Rescue · Classroom Studio',q['title'][1]+' · HUB R6')
  for n in ['studio.css','studio-r3.css','studio-r5.css','studio.js']:html=html.replace(n+'?v=20260923-r5','../../shared/hub-r6/'+n+'?v=r6')
  html=html.replace('</head>','<link rel="stylesheet" href="../../shared/hub-r6/r6.css?v=r6"></head>');write(dest/('index.html'if page=='hub'else page+'.html'),html)
 redirect(R/folder/'hub.html','hub/');redirect(R/folder/'index.html','hub/')
 if sid=='trio':redirect(R/folder/'hub-20260924.html','hub/')
 for page in ['hub','comparison','development','costs','guide','parents','review']:redirect(R/'classroom-2026-09-24'/f'{sid}-{page}.html',f'../{folder}/hub/'+(''if page=='hub'else page+'.html'))
redirect(R/'classroom-2026-09-24/index.html','../')
index=read(R/'index.html');index=re.sub(r'<article class="card featured-value" id="classroom-20260924">.*?</article>','',index,flags=re.S);index=index.replace('href="martins-monster-quest/hub.html"','href="martins-monster-quest/hub/"').replace('href="adventure-world/hub-20260924.html"','href="adventure-world/hub/"');write(R/'index.html',index)
dump(R/'docs/hub-standard/R6.json',dict(version='4.0.0',presentation='HUB R6',status='REVIEW_READY_NOT_YET_APPROVED',base='CLASSROOM-HUB-R5-20260923',source_fingerprints=provenance,scope=['martins-monster-quest','adventure-world'],requirements=['native R5 components','complete estimated budget','latest/history separation','bilingual games','browser solo','one HUB per work']))
dump(S/'runtime-map.json',rawfiles)
serve="""import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import{fileURLToPath}from'node:url';const root=path.dirname(fileURLToPath(import.meta.url));http.createServer((req,res)=>{try{let p=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(root+path.sep))p=path.join(root,'index.html');if(fs.statSync(p).isDirectory())p=path.join(p,'index.html');res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.json':'application/json','.html':'text/html','.png':'image/png','.webp':'image/webp','.txt':'text/plain;charset=utf-8'})[path.extname(p)]||'application/octet-stream');fs.createReadStream(p).pipe(res);}catch{res.writeHead(404).end('Not found');}}).listen(Number(process.env.PORT||8080),'127.0.0.1',()=>console.log('http://127.0.0.1:8080/'));
"""
for sid,folder,dirs in [('martin','martins-monster-quest',['hub','home-v2','home-v1']),('trio','adventure-world',['hub','solo-skyvale','solo-trio','home-v1'])]:
 out=R/folder/'downloads/r6-latest.zip';out.parent.mkdir(exist_ok=True)
 with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED)as z:
  for root in [S]+[R/folder/n for n in dirs]:
   for f in root.rglob('*'):
    if f.is_file()and f.suffix!='.zip':
     if f==S/'studio.js':z.writestr(str(f.relative_to(R)),read(f).replace('href="../downloads/r6-latest.zip" download','href="../../README.txt"'))
     else:z.write(f,f.relative_to(R))
  z.writestr('serve.mjs',serve);z.writestr('index.html','<!doctype html><meta http-equiv="refresh" content="0;url='+folder+'/hub/"><a href="'+folder+'/hub/">Open project HUB</a>')
  z.writestr('README.txt','电脑已安装 Node.js 后，在此目录运行 node serve.mjs，再打开 http://127.0.0.1:8080/ 。网页单人试玩无需 Node。\nWith Node.js installed, run node serve.mjs, then open http://127.0.0.1:8080/. Online solo play needs no Node.\nThis is already the complete project package.\n')
 with zipfile.ZipFile(out)as z:assert z.testzip()is None
print(json.dumps({'built':'HUB R6','budgets':{k:round(sum(i['aud']for i in v),2)for k,v in items.items()},'source':provenance,'games':rawfiles},ensure_ascii=False,indent=2))
