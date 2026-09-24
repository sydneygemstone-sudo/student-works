from pathlib import Path
import sys,json,re,hashlib,subprocess,os,zipfile
from data import REV,SOURCE_REF,SOURCES,RUBRIC,REVIEWS,GRAPHS,TYPES,lifecycle,bi
R=Path(__file__).resolve().parents[2];HERE=Path(__file__).parent;SH=R/'shared/hub-r6';D=R/'docs/hub-standard';OUT=SH/'lifecycle-qa';OUT.mkdir(parents=True,exist_ok=True)
def read(p):return Path(p).read_text(encoding='utf-8-sig')
def write(p,s):Path(p).parent.mkdir(parents=True,exist_ok=True);Path(p).write_text(s,encoding='utf8')
def dump(p,x):write(p,json.dumps(x,ensure_ascii=False,indent=2)+'\n')
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def protected():
 roots=['classroom-2026-09-22','adventure-world/builds','adventure-world/solo-trio','adventure-world/solo-skyvale','adventure-world/home-v1','martins-monster-quest/v2','martins-monster-quest/home-v1','martins-monster-quest/home-v2']
 return {p.relative_to(R).as_posix():sha(p)for root in roots for p in (R/root).rglob('*')if p.is_file()}
if '--packages' in sys.argv:
 ledger={}
 for folder in ['adventure-world','martins-monster-quest']:
  zpath=R/folder/'downloads/r6-latest.zip'
  if not zpath.exists():raise RuntimeError('Missing prior standalone package: '+str(zpath))
  with zipfile.ZipFile(zpath)as z:files={n:z.read(n)for n in z.namelist()}
  # Update only files already carried by the standalone package plus new project governance assets.
  for n in list(files):
   p=R/n
   if n.startswith(('shared/hub-r6/',folder+'/hub/')) and p.is_file():files[n]=p.read_bytes()
  for root in [R/folder/'hub',OUT]:
   for p in root.rglob('*'):
    if p.is_file():files[p.relative_to(R).as_posix()]=p.read_bytes()
  files['shared/hub-r6/lifecycle.css']=(SH/'lifecycle.css').read_bytes()
  key='shared/hub-r6/studio.js';files[key]=files[key].decode().replace('href="../downloads/r6-latest.zip" download','href="../../README.txt"').encode()
  # Online review entry is a real online service, not a pretend offline review.
  for n,b in list(files.items()):
   if n.startswith(folder+'/hub/')and n.endswith('.html'):
    s=b.decode();s=s.replace('<script defer src="../builds/trio-world-opus/online/hub-online.js?v=online-r2"></script>','');files[n]=s.encode()
  files['LIFECYCLE-PACKAGE-NOTE.txt']='本包单机玩法不变；新增三阶段计划、AI理据评分和版本图。联机与云测评需要网络，请通过正式作品HUB进入。\nSolo gameplay is unchanged. Lifecycle, AI review and lineage are updated. Multiplayer/cloud reviews require the live work HUB.\n'.encode()
  temp=zpath.with_suffix('.next.zip')
  with zipfile.ZipFile(temp,'w',zipfile.ZIP_DEFLATED)as z:
   for n,b in files.items():z.writestr(n,b)
  with zipfile.ZipFile(temp)as z:assert z.testzip()is None
  temp.replace(zpath);ledger[folder]={'file_count':len(files),'sha256':sha(zpath),'bytes':zpath.stat().st_size}
 dump(OUT/'packages.json',ledger);print(json.dumps(ledger,indent=2));sys.exit()
before=protected()
subprocess.run(['python3',str(R/'scripts/verify_hub_standard.py')],cwd=R,check=True)
sources={}
for id,(path,title)in SOURCES.items():
 p=R/path;assert p.exists(),path
 sources[id]={'path':path,'title':title,'sha256':sha(p),'source_ref':SOURCE_REF,'href':'https://github.com/sydneygemstone-sudo/student-works/blob/'+SOURCE_REF+'/'+path}
# Generate every diagram from the exact edge ledger used by the accessible text table.
render_jobs=[]
def mm_quote(s):return s.replace('&','&amp;').replace('"','&quot;').replace('<','&lt;').replace('>','&gt;').replace('\n','<br/>')
def mermaid(g,lang):
 rows=['%% '+REV,'flowchart '+g.get('direction','TB')]
 for n in g['nodes']:
  text=mm_quote(n['title'][lang]);shape='{"'+text+'"}'if n['state']=='decision'else'["'+text+'"]';rows.append('  '+n['id']+shape+':::'+n['state'])
 for i,e in enumerate(g['edges']):
  symbol='-.->'if e['type']in ['requirements','review','future']else'==>'if e['type']=='select'else'-->'
  rows.append('  '+e['source']+' '+symbol+'|"'+mm_quote(e['label'][lang])+'"| '+e['target'])
 rows+=['  classDef version fill:#173c46,stroke:#88aaa2,color:#f6ecd3,stroke-width:1.5px','  classDef archive fill:#273944,stroke:#80949d,color:#d8dfd9,stroke-width:1px','  classDef repair fill:#493b31,stroke:#dc9e6e,color:#ffebd6,stroke-width:2px','  classDef decision fill:#454630,stroke:#d2c27a,color:#fff1b6,stroke-width:2px','  classDef main fill:#184c41,stroke:#95d4a9,color:#edffec,stroke-width:3px','  classDef pending fill:#23313b,stroke:#839298,color:#d1d9d4,stroke-dasharray:6 4']
 for i,e in enumerate(g['edges']):
  if e['type']=='repair':rows.append(f'  linkStyle {i} stroke:#dca275,stroke-width:2.5px')
  if e['type']=='select':rows.append(f'  linkStyle {i} stroke:#90d1a6,stroke-width:3.5px')
 return '\n'.join(rows)+'\n'
for sid,folder in [('martin','martins-monster-quest'),('trio','adventure-world')]:
 h=R/folder/'hub';lc=lifecycle(sid)
 for p in lc['phases']:
  p['completed_gates']=sum(g['status']=='complete'for g in p['gates']);p['total_gates']=len(p['gates']);p['completion_percent']=p['completed_gates']/p['total_gates']*100
 lc['overall_percent']=sum(p['completion_percent']for p in lc['phases'])/3
 reviews={'revision':REV,'assessed_on':'2026-09-25','reviewer_type':'AI','scope':'MVP','source_ref':SOURCE_REF,'formula':'stars = sum(earned points) / 20; round to one decimal','rubric':RUBRIC,'reviews':REVIEWS[sid],'sources':sources}
 for r in reviews['reviews']:
  assert all(0<=n<=d['max']for n,d in zip(r['points'],RUBRIC));assert len(r['reasons'])==len(RUBRIC);assert r['total']==sum(r['points'])
 lineage={'revision':REV,'edge_types':TYPES,'graphs':GRAPHS[sid],'no_merge_statement':bi('评审收敛与源码合并是不同关系；本档案没有证据支持 Astra→Opus 或 V1→V2 的源码融合，因此不会画出该合并。','Review convergence and source merging are different. No evidence supports an Astra→Opus or V1→V2 source merge, so none is drawn.'),'sources':sources}
 for g in lineage['graphs']:
  ids={n['id']for n in g['nodes']};assert len(ids)==len(g['nodes']);assert len({(e['source'],e['target'])for e in g['edges']})==len(g['edges'])
  assert all(e['source']in ids and e['target']in ids and e['type']in TYPES for e in g['edges'])
  assert all(e['evidence']or e['type']=='future' for e in g['edges'])
  # All graphs must be DAGs; feedback is documented as revisions, not circular pseudo-code inheritance.
  visiting=set();done=set()
  def visit(n):
   if n in visiting:raise AssertionError('Cycle in '+g['id'])
   if n in done:return
   visiting.add(n)
   for e in g['edges']:
    if e['source']==n:visit(e['target'])
   visiting.remove(n);done.add(n)
  for n in ids:visit(n)
  for lang,key in [(0,'zh'),(1,'en')]:
   name='lineage-'+g['id']+'-'+key;write(h/(name+'.mmd'),mermaid(g,lang));render_jobs.append(str((h/(name+'.mmd')).relative_to(R)))
 for lang,key in [(0,'zh'),(1,'en')]:
  names=[bi('01 MVP核心玩法\n6/7 · 85.7%','01 MVP core gameplay\n6/7 · 85.7%'),bi('最终正常流程测试\n通过后冻结MVP','Final normal-path test\nfreeze MVP only after pass'),bi('02 完整资产与视听呈现\n0/8 · 尚未成套验收','02 Full assets and audiovisuals\n0/8 · no complete acceptance'),bi('资产集成验收通过','Pass integrated asset acceptance'),bi('03 平台销售发布与运营准备\n0/6 · 尚未正式发布','03 Platform sales and operations readiness\n0/6 · no commercial release'),bi('持续运营\n监控 / 支持 / 更新','Ongoing operation\nmonitoring / support / updates')]
  nodes=[{'id':'p'+str(i),'title':n,'state':'main'if i==0 else'pending'}for i,n in enumerate(names)]
  edges=[{'source':'p'+str(i),'target':'p'+str(i+1),'type':'future','label':bi('通过后进入下一步','Proceed only after acceptance')}for i in range(5)]
  path=h/('lifecycle-flow-'+key+'.mmd');write(path,mermaid({'nodes':nodes,'edges':edges,'direction':'TB'},lang));render_jobs.append(str(path.relative_to(R)))
 for file,value in [('lifecycle.json',lc),('ai-reviews.json',reviews),('version-lineage.json',lineage)]:dump(h/file,value)
 for filename in ['project.json','learning-record.json']:
  d=json.loads(read(h/filename));p=d['projects'][sid]if filename=='project.json'else d
  p['lifecycle']=lc;p['ai_reviews']=reviews;p['version_lineage']=lineage;p['governance_sources']=sources;p['presentation_revision']=REV
  # Legacy fields remain compatibility data for old renderer helpers, not total product progress.
  p['milestones']=[{'name':g['title'],'status':g['status']}for g in lc['phases'][0]['gates']]
  p['milestone_evidence']=[bi('已有证据','Evidenced')if g['status']=='complete'else bi('最终测试待完成','Final test pending')for g in lc['phases'][0]['gates']]
  p['milestone_note']=bi('6/7只属于第一阶段MVP；三阶段总进度28.6%，按等权里程碑完成率计算。','6/7 belongs only to MVP phase 1; three-phase overall progress is 28.6% on an equal-phase milestone basis.')
  p['progress_scope']=bi('阶段一：MVP核心玩法，不是整个产品','Phase 1 MVP gameplay, not the entire product')
  p['progress_next']=lc['phase1_final_tests']
  for b in p['branches']:
   b['ai_review_id']=b['key'];b['scores']=None
  p['sources']=[s for s in p['sources']if s['id']!='LIFECYCLE']+[{'id':'LIFECYCLE','label':bi('三阶段、版本关系与AI理据评分','Lifecycle, lineage and AI reasoned ratings'),'note':bi('来自用户本轮明确要求与当前源码/测试记录；AI分值为判断，不是自动测试事实。','From this revision’s explicit user requirements and source/test records; AI scores are judgments, not automated-test facts.')}]
  dump(h/filename,d)
 for html in h.glob('*.html'):
  if html.name=='online-reviews.html':continue
  s=read(html);s=re.sub(r'(shared/hub-r6/studio\.js)(\?[^"\s]*)?',r'\1?v='+REV,s)
  css='<link rel="stylesheet" href="../../shared/hub-r6/lifecycle.css?v='+REV+'">'
  s=re.sub(r'<link rel="stylesheet" href="../../shared/hub-r6/lifecycle\.css[^>]*>','',s);s=s.replace('</head>',css+'</head>');write(html,s)
js=read(SH/'studio.js');js=re.sub(r'\n// LIFECYCLE_OVERLAY_BEGIN[^]*?// LIFECYCLE_OVERLAY_END\n','\n',js)if False else re.sub(r'\n// LIFECYCLE_OVERLAY_BEGIN[\s\S]*?// LIFECYCLE_OVERLAY_END\n','\n',js)
needle="document.documentElement.lang=L?'en':'zh-CN';if(!document.getElementById('language'))"
assert js.count(needle)==1,'Current renderer bootstrap changed; refusing a guessed insertion'
ui=read(HERE/'ui.js').replace('不称教师评分，也不直接改写 AI 星级','不作为教学成绩，也不直接改写 AI 星级').replace('they are not teacher grades and do not directly rewrite AI stars','they are not learning grades and do not directly rewrite AI stars')
js=js.replace(needle,'// LIFECYCLE_OVERLAY_BEGIN\n'+ui+'\n// LIFECYCLE_OVERLAY_END\n'+needle)
js=js.replace("t('待教师评分','Awaiting teacher rating')","t('AI 理据评分','AI reasoned rating')").replace("t('待教师确认','Teacher review')","t('MVP 待最终测试','MVP final test pending')")
js=js.replace("fetch('project.json?v=r6-final-1')","fetch('project.json?v="+REV+"')")
js=js.replace("window.__studioData=P;","window.__studioData=P;window.__hubLifecycle={revision:P.presentation_revision,overall:P.lifecycle.overall_percent,phase1:P.lifecycle.phases[0].completion_percent};")
write(SH/'studio.js',js);write(SH/'lifecycle.css',read(HERE/'style.css'))
assert before==protected(),'A protected game, online service or R5 baseline changed'
meta={'revision':REV,'source_ref':SOURCE_REF,'protected_file_count':len(before),'protected_game_files_unchanged':True,'phase1':{'completed':6,'total':7,'percent':600/7},'assets':{'completed':0,'total':8},'release':{'completed':0,'total':6},'overall_percent':600/21,'diagrams':render_jobs,'scope':'Only HUB presentation, lifecycle/review/lineage data and specification; no gameplay, server, budgets or stored review mutations.'}
dump(OUT/'build-model.json',meta)
dump(HERE/'render-jobs.json',render_jobs)
dump(HERE/'mermaid-config.json',{'theme':'base','htmlLabels':False,'securityLevel':'strict','themeVariables':{'fontFamily':'Noto Sans CJK SC, WenQuanYi Zen Hei, Arial, sans-serif','fontSize':'18px','primaryColor':'#173c46','primaryTextColor':'#f6ecd3','primaryBorderColor':'#88aaa2','lineColor':'#8ba69e','edgeLabelBackground':'#183340','background':'#0e2531'},'flowchart':{'curve':'linear','nodeSpacing':35,'rankSpacing':48,'padding':16,'useMaxWidth':False}})
# Preserve R5 lock identifiers; explicitly route current presentation to the new contract.
p=R/'HUB-ENTRY.json';entry=json.loads(read(p));entry['lifecycle_overlay']={'revision':REV,'standard':'docs/hub-standard/R6-LIFECYCLE-AND-AI-REVIEW.md','scope':['martins-monster-quest/hub/','adventure-world/hub/'],'preflight':'python3 scripts/hub-lifecycle/build.py; node scripts/hub-lifecycle/qa.cjs','no_fallback':'Do not restore single-stage total progress, placeholder human star grading or untyped merge arrows.'};dump(p,entry)
text='''# R6：三阶段生命周期、AI理据评分与版本演进

## 本规范覆盖的错误口径

版本星级不是教师评分，也不是玩家意见平均数。由AI在固定维度下阅读需求、源码、QA和实际问题，给出阶段性评分、逐项理由、来源、风险及下一项验证。AI判断与自动测试事实必须分开，不伪造模型比赛、人工打分或已完成实机验收。

当前是第一阶段MVP的6/7，不能说整个产品已完成86%。本次不启动新阶段生产、不擅改预算、不改游戏或云服务。

## 三阶段与算法

1. MVP核心玩法定稿：7个验收项，当前6项有证据，最后是正常流程最终测试并冻结MVP范围。
2. 完整资产与视听呈现：8项，完整故事、引导、资产规格、视觉、音乐、音效、配音、集成验收。程序化原型资产不自动等于正式资产完成。
3. 平台发布、销售与长期服务运营准备：6项，发行商业方案、权利隐私平台要求、发行兼容、商店宣传、正式发布、运营能力准备。已有公网原型URL不是商业发布。长期运营本身是持续活动，100%仅能表示定义的发布/运营准备验收项已完成。

每阶段完成率＝已完成验收项/该阶段总项。总进度＝三个阶段完成率的算术平均。三个阶段等权，是里程碑覆盖率，不是工时、成本或周期估算。不凭空发明阶段工作量权重。当前(6/7 + 0/8 + 0/6)/3 = 28.6%；第一阶段85.7%，第二、三阶段暂计0%，表示尚无成套验收，不是现有资产不存在。

## AI星级

MVP评审维度：核心玩法/需求30，可玩性/输入/引导25，稳定性/证据20，MVP视听反馈15，可追溯与可交付性10。总分100，星级＝总分/20，保留一位小数。每个版本有自己的证据，禁止把另一个分支或云版本的验收直接套用。阶段二/三进入后须明确评分范围并重评，不能沿用MVP星级作为商业发行认证。

玩家体验表和通关测评继续保留，但与AI版本星级分开标注。最终测试由实际执行证据闭环，不存在“等待教师打星”门槛。

## 版本图

单一数据源version-lineage.json生成Mermaid与SVG，也生成可读的箭头解释。每条边须区分源码派生、仅复用需求、同分支大修、评审输入、主线选择、保留对照和待办。未完成节点使用虚线样式，历史日志阶段不冒充可恢复发行版。

三人组：旧单机反馈→同一新Brief→Astra/Opus独立发散；Astra输入/HUD修复→单机对照；Opus桌面初稿→触屏修复→单机与云端再发散→Cloud R1/R2；评审收敛选择Opus联机首推并保留单机。没有证据说明Astra代码合并进Opus，禁止画成已融合。

Martin：早期2D小样→补冒险→3D与镜头/战斗大修→V1历史；9/24新Brief驱动独立V2，不表示源码继承；正常流程→组合测试夹具失败→夹具与曝光修正→边界重跑→R6候选→最终测试待定稿。旧版、初稿和失败证据均保留。

## 不变项与回归要求

继续Opus首推，语言按钮常驻，中文页面显示English、英文页面显示中文。保留6位邀请码、3人上限、14任务与动态测评、单机入口、预算和学习记录。三阶段/AI评审/版本图均中英双语；检验公式、箭头含义、图渲染、触屏宽度、常驻语言按钮和草稿保留。R5黄金源与游戏/服务器文件不改写。

## English contract

Version stars are authored, evidence-based AI judgments, not teacher grades or player-vote averages. Use the stated 100-point MVP rubric, show reasons and source scope per version, and separate judgment from actual test outcomes.

The lifecycle is (1) MVP core-gameplay freeze, (2) complete story/guidance/visual/music/sound/voice assets and integration, (3) platform/sales release plus long-term service readiness. Overall is the mean of the three phase gate-completion rates, not a labour estimate. Current rates are 6/7, 0/8 and 0/6; overall 28.6%, MVP 85.7%. Existing prototype art/audio and online testing do not automatically complete phases 2 or 3. This revision defines those phases without authorizing their execution.

Typed lineage edges distinguish requirements reuse, source derivation, in-branch repair, review input and selection. Two implementation branches are not a source merge. Pending gates and historical-log-only nodes remain explicit. Mermaid/SVG and text explanations are generated from the same graph ledger.
'''
write(D/'R6-LIFECYCLE-AND-AI-REVIEW.md',text)
print(json.dumps(meta,ensure_ascii=False,indent=2))
