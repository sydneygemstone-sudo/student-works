#!/usr/bin/env python3
"""Apply the teacher's final R6 presentation corrections; no game/Worker changes."""
from pathlib import Path
import hashlib,json,re,zipfile
ROOT=Path(__file__).resolve().parents[1]
MARK='R6_FINAL_PRESENTATION_20260925'
AMENDMENT='docs/hub-standard/R6-FINAL-PRESENTATION.md'
def read(p):return Path(p).read_text(encoding='utf-8-sig')
def write(p,s):p=Path(p);p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s,encoding='utf8')
def dump(p,x):write(p,json.dumps(x,ensure_ascii=False,indent=2)+'\n')
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def replace(p,old,new,required=True):
 s=read(p)
 if new in s and old not in s:return
 if old not in s:
  if required:raise ValueError('Expected source changed: '+str(p)+' / '+old[:70])
  return
 write(p,s.replace(old,new))

def apply(root=ROOT,packages=False):
 root=Path(root);shared=root/'shared/hub-r6';online=root/'adventure-world/builds/trio-world-opus/online'
 # Sort actual source data so every page, not only the visible DOM, uses the same decision.
 for name in ['project.json','learning-record.json']:
  f=root/'adventure-world/hub'/name;d=json.loads(read(f));p=d['projects']['trio']if name=='project.json'else d
  ranks={'opus-touch':0,'skyvale-hud1':1};p['branches'].sort(key=lambda b:(bool(b.get('legacy')),ranks.get(b['key'],10)))
  assert p['branches'][0]['key']=='opus-touch'
  p['hero']=p['branches'][0]['image']
  p['heroTitle']=['三人同乐世界<br><em>Opus · 课堂好评版</em>','Trio World<br><em>Opus · classroom favourite</em>']
  p['featured_play']={'branch':'opus-touch','tool':'Opus','url':'https://trio-world-opus.sydney-gemstone-games.workers.dev/','label':['试玩 Opus 好评版 · 联机','Play the Opus favourite · online'],'basis':'Teacher explicitly identified Opus as the latest well-received version; no numeric rating inferred.'}
  p['decision']=['教师确认：最新好评版由 Opus 制作，现作为首推版本。上方直接进入 Opus 联机版；单人试玩同样优先展示 Opus。Astra 保留对照，旧版另区归档，学习记录与动态测评继续保留。','Teacher confirmed: the latest well-received version was made with Opus, now the featured build. The main button opens Opus online, and Opus leads the solo previews too. Astra remains a comparison; older builds, learning records and live reviews are retained.']
  p['branches'][0]['tag']=['首推 · Opus 好评版','Featured · Opus favourite']
  p['branches'][0]['recommendation']='teacher_confirmed_favourite'
  for b in p['branches']:
   if b['key']=='skyvale-hud1':b['tag']=['对照保留 · Astra','Retained comparison · Astra']
  p['next_title']=['Opus 主版本的后续体验与改进','Further playtesting and improvements to the featured Opus build']
  p['next_scope']=['以教师确认的 Opus 好评版为主入口；继续收集实际试玩与通关测评。Astra 的独立成果保留，不把首推决定改写成删除其他版本。','Use the teacher-confirmed Opus favourite as the main entry, and continue collecting playtests and completion reviews. Astra is retained; featuring Opus does not authorize deleting another version.']
  p['sources']=[x for x in p.get('sources',[])if x.get('id')!='TEACHER-FINAL-R6']+[{'id':'TEACHER-FINAL-R6','label':['教师最终呈现纠正','Teacher’s final presentation correction'],'note':['最新好评版是 Opus，不是 Astra；Opus 置顶。语言按钮始终可见，显示切换目标语言。','The latest well-received build is Opus, not Astra; show Opus first. Keep a visible button labelled with the destination language.']}]
  if p.get('flow_lanes'):p['flow_lanes'].sort(key=lambda x:0 if 'Opus' in str(x.get('name')) else 1)
  dump(f,d)
 # Preserve native R5/R6 layout; replace only the ambiguous language selector.
 js=shared/'studio.js';s=read(js)
 old='<select id="language" aria-label="Language"><option value="0" ${L?\'\':\'selected\'}>简体中文</option><option value="1" ${L?\'selected\':\'\'}>English</option></select>'
 if old in s:s=s.replace(old,'${languageButton()}')
 elif '${languageButton()}'not in s:raise ValueError('Native R6 language control no longer matches')
 handler="document.querySelector('#language').onchange=e=>{L=+e.target.value;history.replaceState(null,'','?lang='+(L?'en':'zh-CN'));render();};"
 if handler in s:s=s.replace(handler,'bindLanguageButton();')
 elif 'bindLanguageButton();'not in s:raise ValueError('Native R6 language handler no longer matches')
 if MARK not in s:
  functions=r'''
// R6_FINAL_PRESENTATION_20260925 — target-language button, not a dropdown.
function languageButton(){return `<button id="language" class="hub-language-toggle" type="button" lang="${L?'zh-CN':'en'}" aria-label="${L?'切换为中文':'Switch to English'}">${L?'中文':'English'}</button>`;}
function bindLanguageButton(){const button=document.getElementById('language');if(!button)return;button.onclick=()=>{
 const y=window.scrollY,values=[...app.querySelectorAll('input[id],select[id],textarea[id]')].map(x=>({id:x.id,value:x.value,checked:x.checked}));
 L=L?0:1;const url=new URL(location.href);url.searchParams.set('lang',L?'en':'zh-CN');history.replaceState(null,'',url.pathname+url.search+url.hash);document.documentElement.lang=L?'en':'zh-CN';
 if(P){render();const reviewer=values.find(x=>x.id==='reviewer');if(reviewer&&document.getElementById('reviewer')){document.getElementById('reviewer').value=reviewer.value;document.getElementById('reviewer').dispatchEvent(new Event('change'));}for(const x of values){const field=document.getElementById(x.id);if(field){field.value=x.value;if('checked'in field)field.checked=x.checked;}}requestAnimationFrame(()=>{window.scrollTo(0,y);document.getElementById('language')?.focus({preventScroll:true});});}
 else{button.outerHTML=languageButton();bindLanguageButton();}
};}
'''
  idx=s.index('function render()');s=s[:idx]+functions+s[idx:]
  idx=s.index("fetch('project.json")
  s=s[:idx]+"document.documentElement.lang=L?'en':'zh-CN';if(!document.getElementById('language'))document.getElementById('nav').insertAdjacentHTML('beforeend',languageButton());bindLanguageButton();\n"+s[idx:]
 a="href=\"${gameLink(current[0])}\">${t('试玩最新单机版','Play the latest solo build')}"
 b="href=\"${P.featured_play?P.featured_play.url+'?lang='+(L?'en':'zh-CN'):gameLink(current[0])}\">${P.featured_play?v(P.featured_play.label):t('试玩最新单机版','Play the latest solo build')}"
 if a in s:s=s.replace(a,b)
 elif b not in s:raise ValueError('Primary hero link no longer matches')
 anchor='<a class="btn" href="${link(\'development\')}">${t(\'看完整开发过程\',\'See the full development\')} →</a>'
 if 'data-featured-solo'not in s:
  assert anchor in s
  s=s.replace(anchor,'${P.featured_play?`<a class="btn" data-featured-solo href="${gameLink(current[0])}">${t(\'Opus 单人试玩\',\'Opus solo preview\')} ↗</a>`:\'\'}'+anchor,1)
 write(js,s)
 css='''/* R6 final presentation: always visible, one click, destination language. */
#nav #language,.reviewPage #language{position:fixed!important;top:max(12px,env(safe-area-inset-top));right:max(14px,env(safe-area-inset-right));z-index:10000;display:inline-flex!important;align-items:center;justify-content:center;min-width:100px;min-height:46px;padding:10px 18px;margin:0;border:1px solid #f0d8a8;border-radius:12px;background:#e4c486;color:#142a31;box-shadow:0 5px 22px #0005;font:800 16px/1.25 system-ui,-apple-system,'PingFang SC',sans-serif;letter-spacing:0;cursor:pointer;touch-action:manipulation;white-space:nowrap;transform:none!important;opacity:1!important;visibility:visible!important}
#nav #language:hover,.reviewPage #language:hover{background:#f5dea9}
#nav #language:focus-visible,.reviewPage #language:focus-visible{outline:3px solid #a3e8d5;outline-offset:4px}
#nav,.reviewPage>nav{padding-right:140px}
@media(max-width:600px){#nav{padding:16px 132px 16px 20px;min-height:78px}#nav .brand span,#nav .navright>a{display:none}#nav .brand{font-size:12px;letter-spacing:1px}#nav .navright{gap:0}#nav #language,.reviewPage #language{right:max(12px,env(safe-area-inset-right));min-width:96px}.reviewPage>nav{padding-right:134px;min-height:76px}.reviewPage .brand{font-size:12px;letter-spacing:0}}
'''
 write(shared/'language-button.css',css)
 for folder in ['martins-monster-quest','adventure-world']:
  for p in (root/folder/'hub').glob('*.html'):
   text=read(p)
   if 'language-button.css'not in text:text=text.replace('</head>','<link rel="stylesheet" href="../../shared/hub-r6/language-button.css?v=r6-final-1"></head>')
   text=text.replace('studio.js?v=r6','studio.js?v=r6-final-1')if 'studio.js?v=r6-final-1'not in text else text
   write(p,text)
 review=online/'review.html'
 if review.exists():
  text=read(review)
  if 'language-button.css'not in text:text=text.replace('</head>','<link rel="stylesheet" href="../../../../shared/hub-r6/language-button.css?v=r6-final-1"></head>')
  write(review,text)
 # Existing game language controls remain in their fixed rail, with an intelligible label.
 for p in [shared/'game-shell.js',root/'scripts/r6-assets/game-shell.js',online/'online-shell.js',online/'room-client.js',root/'scripts/trio-online/room-client.js']:
  if p.exists():
   text=read(p).replace("?'中文':'EN'","?'中文':'English'");write(p,text)
 for folder in ['martins-monster-quest/home-v1','martins-monster-quest/home-v2','adventure-world/home-v1','adventure-world/solo-trio','adventure-world/solo-skyvale','adventure-world/builds/trio-world-opus/online']:
  p=root/folder/'index.html'
  if p.exists():write(p,read(p).replace('id="language">EN</button>','id="language">English</button>'))
 for p in [online/'hub-online.js',root/'scripts/trio-online/hub-online.js']:
  if p.exists():write(p,read(p).replace("'三人同乐世界 · 多人联机','Trio World · online multiplayer'","'Opus 好评版 · 多人联机','Opus favourite · online multiplayer'"))
 # Language switching on the completion form saves the local draft before navigation.
 for p in [online/'review-app.js',root/'scripts/trio-online/review-app.js']:
  if p.exists():write(p,read(p).replace("document.getElementById('language').onclick=()=>{const u=new URL(location.href);","document.getElementById('language').onclick=()=>{document.getElementById('saveDraft')?.click();const u=new URL(location.href);"))
 # Current specification overlays the archived R5 baseline without changing golden examples.
 doc='''# HUB R6 — final presentation amendment / 最终呈现规范补充

Status: Teacher-approved R6 base with the requested final corrections implemented.

## 语言切换：必须一直看得见

HUB 首页、版本页、开发记录、预算、指南、学习记录、反馈与动态测评页必须始终提供明显的语言按钮。按钮固定在可视区右上角；游戏内沿用始终可见的左侧工具栏。页面滚动后、窄屏和触屏上不得消失、被遮挡或移出屏幕。

中文状态显示 **English**；英文状态显示 **中文**。按钮用目标语言命名，点击一次直接切换。禁止下拉选择器、只显示当前语言、藏在菜单中，或只使用不易理解的 EN／ZH 缩写。使用真正的 button、至少44px触控高度和清楚的键盘焦点。保留当前页面、查询参数及锚点；切换时不能丢失正在填写的测评草稿。

Keep a prominent language button visible on every project-HUB and review page. Fix it at the viewport’s top right; games retain their persistent left toolbar. In Chinese, label it **English**. In English, label it **中文**. One click switches directly. No dropdown, hidden menu, current-language-only label or EN/ZH abbreviation. Maintain at least a 44px target, keyboard focus, page/query/hash and unsaved feedback.

## 首推版本：以教师确认的作品为准

Joey、Mia、Chloe 的最新好评版由 **Opus** 制作，不是 Astra。首页封面、标题、主试玩、当前版本卡的第一项以及指南的第一入口必须一致指向 Opus。主入口是已经部署的 Opus 联机版；同时保留明确的 Opus 单人试玩。Astra 留作对照，旧版本独立置于历史区。不能根据模型名称强弱擅自排序，也不能把教师的好评虚构为具体星级或全部实机验收。

For Joey, Mia and Chloe, **Opus** is the teacher-confirmed latest favourite. Align the cover, heading, primary play button, first current build and first guide entry. Feature the deployed Opus multiplayer edition and keep a clear Opus solo option. Retain Astra for comparison and older releases in their separate archive. Do not invent numeric ratings or physical-device acceptance.

## 继承与验收

R5 黄金样板及原始规则文件保持不变。当前 R6 通过 HUB-ENTRY.json 的 presentation_overlay 指向本规范；复用 R5 仍需原锁校验，发布当前 R6 还需通过本轮呈现验收。

Verify both languages, desktop/tablet/narrow viewports, fixed visibility after scrolling, actual button clicks, retained draft fields, correct Opus image and links, and continued presence of the multiplayer/review entry. This amendment does not change room capacity, task rules, Worker code, stored reviews, game physics or budgets.
'''
 write(root/AMENDMENT,doc)
 r6=root/'docs/hub-standard/R6.json';meta=json.loads(read(r6));meta.update(version='4.0.1',presentation='HUB R6.1',status='APPROVED_BASE_WITH_REQUESTED_FINAL_CORRECTIONS',presentation_amendment=AMENDMENT,language_control={'type':'button','always_visible':True,'zh-CN_label':'English','en_label':'中文','dropdown':False},featured_trio_branch='opus-touch');dump(r6,meta)
 entry=json.loads(read(root/'HUB-ENTRY.json'));entry['presentation_overlay']={'standard_id':'CLASSROOM-HUB-R6-FINAL-20260925','version':'4.0.1','standard':AMENDMENT,'metadata':'docs/hub-standard/R6.json','implementation':'scripts/hub-r6-final-presentation.py','precedence':'Required for current and new R6 HUBs; overlays presentation only. Preserve and verify the archived R5 base.'};dump(root/'HUB-ENTRY.json',entry)
 lock=root/'docs/hub-standard/LOCK.json';locked=json.loads(read(lock));locked['artifacts_sha256']['HUB-ENTRY.json']=sha(root/'HUB-ENTRY.json');locked['presentation_overlay_sha256']={AMENDMENT:sha(root/AMENDMENT)};dump(lock,locked)
 readme=root/'README.md';text=read(readme);block='<!-- '+MARK+' -->\n**当前 HUB 呈现补充 / Current presentation amendment:** [R6.1：Opus 首推与常驻语言按钮]('+AMENDMENT+')。此补充由 `HUB-ENTRY.json.presentation_overlay` 定位，优先约束当前 R6；下方 R5 锁仍用于保护原始基准。\n\n'
 if MARK not in text:write(readme,block+text)
 # Regeneration must not silently reintroduce Astra-first or a dropdown.
 hook="\n# R6_FINAL_PRESENTATION_20260925: apply teacher-approved presentation after generation.\nif (R/'scripts/hub-r6-final-presentation.py').exists():\n import runpy\n runpy.run_path(str(R/'scripts/hub-r6-final-presentation.py'))['apply'](R,packages=False)\n"
 for p in [root/'scripts/r6_finalize.py',root/'scripts/trio-online/build.py']:
  if p.exists()and MARK not in read(p):write(p,read(p)+hook)
 if packages:update_packages(root)
 return {'status':'PASS','version':'R6.1','opus_first':True,'language':'persistent target-language buttons','worker_changed':False,'budgets_changed':False}

def update_packages(root):
 # Update presentation files inside existing offline ZIPs; preserve game payloads and launchers.
 for project in ['martins-monster-quest','adventure-world']:
  target=root/project/'downloads/r6-latest.zip'
  if not target.exists():continue
  with zipfile.ZipFile(target)as z:files={n:z.read(n)for n in z.namelist()if not n.endswith('/')}
  for n in list(files):
   f=root/n
   if f.is_file()and(n.startswith('shared/hub-r6/')or n.startswith(project+'/hub/')or n.endswith('/index.html')and n.startswith(project+'/')):
    files[n]=f.read_bytes()
  files['shared/hub-r6/language-button.css']=(root/'shared/hub-r6/language-button.css').read_bytes()
  if project=='adventure-world':
   for n in ['hub-online.js','online.css']:
    f=root/project/'builds/trio-world-opus/online'/n
    files[f.relative_to(root).as_posix()]=f.read_bytes()
   # Online review state is served on the authorized public origin, not the offline HTTP server.
   files[project+'/hub/online-reviews.html']=b'<!doctype html><meta http-equiv="refresh" content="0;url=https://sydneygemstone-sudo.github.io/student-works/adventure-world/hub/online-reviews.html"><a href="https://sydneygemstone-sudo.github.io/student-works/adventure-world/hub/online-reviews.html">Open online review status</a>'
  k='shared/hub-r6/studio.js';files[k]=files[k].decode().replace('href="../downloads/r6-latest.zip" download','href="../../README.txt"').encode()
  tmp=target.with_suffix('.tmp')
  with zipfile.ZipFile(tmp,'w',zipfile.ZIP_DEFLATED)as z:
   for n,b in files.items():z.writestr(n,b)
  with zipfile.ZipFile(tmp)as z:assert z.testzip()is None
  tmp.replace(target)

if __name__=='__main__':
 print(json.dumps(apply(packages=True),ensure_ascii=False,indent=2))
