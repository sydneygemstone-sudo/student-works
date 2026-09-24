from pathlib import Path
import hashlib,json,re,shutil
R=Path(__file__).resolve().parents[2];SRC=Path(__file__).parent;BASE=R/'adventure-world/builds/trio-world-opus';O=BASE/'online';C=BASE/'cloudflare';H=R/'adventure-world/hub';O.mkdir(exist_ok=True)
def read(p):return Path(p).read_text(encoding='utf-8-sig')
def write(p,s):Path(p).parent.mkdir(parents=True,exist_ok=True);Path(p).write_text(s,encoding='utf8')
def dump(p,s):write(p,json.dumps(s,ensure_ascii=False,indent=2)+'\n')
raw=(BASE/'public/index.html').read_bytes();blob=hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest();assert blob=='0383acf33132227d69596b3ff2c7a0e5debecbe3',('Archived LAN source changed',blob)
if not (C/'worker-r1.mjs').exists():
 old=(C/'worker.mjs').read_bytes();assert hashlib.sha1(b'blob '+str(len(old)).encode()+b'\0'+old).hexdigest()=='403213af608055bb4861cdaf78de6d7323cba4e7';shutil.copy2(C/'worker.mjs',C/'worker-r1.mjs')
for n in ['worker.mjs','review-schema.mjs']:shutil.copy2(SRC/n,C/n)
for n in ['room-client.js','review-app.js','review-schema.mjs','online.css','hub-online.js']:shutil.copy2(SRC/n,O/n)
# Preserve the earlier online adapter for provenance. The original LAN version remains untouched.
html=raw.decode('utf8')
def rep(a,b):
 global html
 assert html.count(a)==1,(a[:100],html.count(a));html=html.replace(a,b)
rep('<title>三人同乐世界</title>','<title>Trio World · 六位数字联机与通关测评</title><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><script src="../../../../shared/hub-r6/strings.js"></script><script src="online-strings.js"></script><script src="translate.js"></script><link rel="stylesheet" href="online.css">')
rep('<input id="name" maxlength="10" placeholder="输入你的名字">','''<input id="name" maxlength="12" placeholder="游戏昵称" autocomplete="off"><label for="room">六位数字房间邀请码</label><input id="room" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="off" placeholder="输入六位数字，或创建新房间"><div class="roomActions"><button id="newRoom" type="button">创建新房间</button><button id="copyRoom" type="button">复制游戏邀请</button></div><p id="cloudStatus" role="status">每个房间最多3名玩家。只把房间码发给认识的伙伴。刷新后在原浏览器恢复自己的身份与任务。</p>''')
rep('<button id="go">进入世界 ▶</button>','<button id="go">加入房间，一起玩 ▶</button>')
rep('<body>','<body><nav id="onlineTools"><span id="roomMini"></span><button id="onlineReview">通关测评</button><button id="onlineStatus">测评状态</button><button id="onlineLanguage">EN</button></nav>')
rep("import * as THREE from './vendor/three.module.js';","import * as THREE from '../public/vendor/three.module.js';\nimport {NetworkRoom} from './room-client.js';")
rep('renderSkinPick();\n\n// ================= 声音','renderSkinPick();\nconst ROOM=new NetworkRoom();\n\n// ================= 声音')
rep("try { mySkin = +(localStorage.getItem('tw_skin') || 0) % SKINS.length;", "try { mySkin = Math.max(0, Math.min(4, Math.floor(+(localStorage.getItem('tw_skin') || 0)) || 0));")
# Fourteen real tasks: the last one requires a validated fountain celebration.
rep("{ t: '🎉 全部完成！自由玩耍吧', h: '和朋友一起到处逛逛、比比谁飞得高', done: () => false, at: () => null },","{ t: '回到大厅喷泉庆祝 🎉', h: '回到喷泉旁，按互动完成第14个任务，然后填写完整测评表。', done: () => Q.celebrate, at: () => new THREE.Vector3(0,0,0) },")
rep("  const s = STEPS[qi];","  const s = STEPS[Math.min(qi,STEPS.length-1)];")
rep("  $('qnum').textContent = `${Math.min(qi + 1, STEPS.length)}/${STEPS.length}`;","  $('qnum').textContent = `${qi}/${STEPS.length}`;\n  if(qi===14){$('qnow').textContent='14个任务全部完成！';$('qhint').textContent='完整测评表已解锁；也可以继续自由探索。';$('qlist').textContent='✓ 14/14';return;}")
a=html.index('function checkQuest() {');b=html.index('\n// 目标光柱',a)
html=html[:a]+'''function checkQuest(){ renderQuest(); }
function applyPersonal(x,restore=false){
 const previous=qi;qi=Math.max(0,Math.min(14,x.completed));Object.assign(Q,x.stats);Object.assign(inv,x.inventory);
 if(restore&&x.position){me.pos.set(x.position.x,x.position.y,x.position.z);me.vel.set(0,0,0);me.name=x.name;}
 renderInv();renderQuest();
 if(qi>previous){SFX.quest();toast(qi===14?'14个任务全部完成！':('任务完成：'+qi+'/14'));}
}
''' + html[b:]
a=html.index('let ws = null, connected = false;');b=html.index('const pending = new Set();',a)
html=html[:a]+'''let connected=false;
function connect(){ROOM.connect(me.name,mySkin,{
 connection:(ok,note)=>{connected=ok;$('banner').style.display=ok?'none':'block';if(note)$('banner').textContent=note;},
 clearPlayers:()=>{for(const id of [...others.keys()])removeOther(id);renderOnline();},
 message:m=>{switch(m.t){
  case 'init':me.id=m.id;serverOffset=(m.now||Date.now())-Date.now();m.players.forEach(addOther);applyWorld({...m.world,_init:true});applyPersonal(m.personal,true);renderOnline();break;
  case 'personal':applyPersonal(m.personal);break;
  case 'join':addOther(m);toast('👋 '+m.name+' 加入了世界');renderOnline();break;
  case 'leave':removeOther(m.id);renderOnline();break;
  case 'pos':for(const[id,x,y,z,ry,anim]of m.list){if(id===me.id)continue;const o=others.get(id);if(o){o.target.set(x,y,z);o.ry=ry;o.anim=anim;}}break;
  case 'skin':{const o=others.get(m.id);if(o){o.root.remove(o.char.g);o.char=makeChar(m.skin);o.root.add(o.char.g);o.skin=m.skin;}}break;
  case 'fx':{const o=others.get(m.id);if(o){const p=o.root.position.clone();if(m.kind==='p1'||m.kind==='p3')burst(p.setY(1),[0xff6fb5,0xffffff]);else if(m.kind==='p2')ring(p,0xffd000);else if(m.kind==='tp')burst(p.setY(1.5));}}break;
  case 'world':applyWorld(m.patch);break;
  case 'got':onGot(m.kind,m.id);break;
  case 'deny':SFX.deny();break;
  case 'toast':toast(m.text);break;
  case 'chat':chatLine(m.name,m.text);SFX.chat();break;
 }} });}
function net(msg){if(!connected)return false;if(msg.t!=='pos'&&started)ROOM.send({t:'pos',x:+me.pos.x.toFixed(2),y:+me.pos.y.toFixed(2),z:+me.pos.z.toFixed(2),ry:+me.ry.toFixed(2),anim:me.anim});return ROOM.send(msg);}
Object.defineProperty(window,'__TRIO_QA__',{value:()=>({connected,id:me.id,others:others.size,completed:qi,position:{x:me.pos.x,y:me.pos.y,z:me.pos.z},world:JSON.parse(JSON.stringify(world)),reviewOpen:!!window.__trioReviewOpen})});
''' + html[b:]
rep("function interact() { if (focus) focus.act(); }","function interact(){if(!connected||window.__trioReviewOpen)return;if(qi===13&&Math.hypot(me.pos.x,me.pos.z)<8){net({t:'celebrate'});return;}if(focus)focus.act();}")
rep('function start() {\n  if (started) return; started = true;',"async function start(){\n  if(started)return;const b=$('go');b.disabled=true;if(!await ROOM.prepare()){b.disabled=false;return;}started=true;")
rep("  consider(Math.hypot(feedBin.position.x - P.x, feedBin.position.z - P.z), 3.2, { txt: '拿饲料 🌾', act: () => { inv.feed += 3; renderInv(); SFX.pick(); toast('🌾 +3 饲料'); checkQuest(); } });","  consider(Math.hypot(feedBin.position.x-P.x,feedBin.position.z-P.z),3.2,{txt:'拿饲料 🌾',act:()=>{net({t:'feed_supply'});SFX.pick();}});")
rep("act: () => { if (!Q.fire) { Q.fire = 1; toast('🔥 好暖和！'); } SFX.fire(); checkQuest(); }","act:()=>{net({t:'warm_fire'});toast('🔥 好暖和！');SFX.fire();}")
rep('    focus = findFocus();',"    focus=findFocus();if(qi===13&&Math.hypot(me.pos.x,me.pos.z)<8)focus={txt:'在喷泉庆祝 🎉',act:()=>net({t:'celebrate'})};")
rep('    const target = STEPS[qi].at();','    const target=qi<14?STEPS[qi].at():null;')
rep('function power(n) {','function power(n) {\n  if(!connected||window.__trioReviewOpen)return;')
rep('function applyWorld(p) {',"function applyWorld(p){if(p._init){for(const k of ['fruits','wood','stars','fedAnimals'])world[k]={};for(const id of Object.keys(produceMeshes))if(!p.produce||!p.produce[id]){scene.remove(produceMeshes[id]);delete produceMeshes[id];delete produceKinds[id];}world.produce={};}")
rep('function renderOnline() {',"function renderOnline() { $('online').dataset.connected=String(connected);")
# Block only this player's input while the form is open; other players keep playing.
rep("addEventListener('pointerdown', () => { if (AC && AC.state !== 'running') AC.resume(); });", "addEventListener('trio-review-open',()=>{for(const k in keys)keys[k]=false;joy.id=null;joy.x=joy.y=joy.mag=0;dragging=false;chatting=true;me.vel.x=me.vel.z=0;});addEventListener('trio-review-close',()=>{chatting=false;});\naddEventListener('pointerdown',()=>{if(AC&&AC.state!=='running')AC.resume();});")
write(O/'game.html',html)
# Frame gives the multiplayer edition the same non-overlapping R6 tool rail as solo editions.
write(O/'index.html','''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><title>Trio World · 多人联机</title><link rel="stylesheet" href="../../../../shared/hub-r6/game-shell.css"></head><body><nav id="rail"><a href="../../../hub/" id="back">HUB</a><button id="review">测评</button><button id="statusRoom">状态</button><button id="language">EN</button><button id="full">全屏</button><a href="../../../hub/guide.html#multiplayer" id="help">说明</a></nav><iframe id="game" title="Trio World online" allow="fullscreen; autoplay"></iframe><div id="status">最多3人</div><script src="online-shell.js"></script></body></html>''')
write(O/'online-shell.js',"""(()=>{const f=document.getElementById('game'),en=new URLSearchParams(location.search).get('lang')==='en';document.documentElement.lang=en?'en':'zh-CN';document.getElementById('review').textContent=en?'Review':'测评';document.getElementById('statusRoom').textContent=en?'Status':'状态';document.getElementById('help').textContent=en?'Guide':'说明';document.getElementById('language').textContent=en?'中文':'EN';document.getElementById('full').textContent=en?'Full':'全屏';document.getElementById('status').textContent=en?'Max 3 players':'最多3名玩家';f.src='./game.html'+location.search+location.hash;const click=id=>f.contentWindow?.document.getElementById(id)?.click();document.getElementById('review').onclick=()=>click('onlineReview');document.getElementById('statusRoom').onclick=()=>click('onlineStatus');document.getElementById('language').onclick=()=>click('onlineLanguage');document.getElementById('full').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{document.getElementById('status').textContent=en?'Fullscreen optional':'无需全屏也能玩';}};addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==f.contentWindow)return;if(e.data?.type==='trio-room-selected'&&/^\\d{6}$/.test(e.data.room))history.replaceState(null,'',location.pathname+location.search+'#room='+e.data.room);if(e.data?.type==='trio-language'){const u=new URL(location.href);u.searchParams.set('lang',e.data.lang==='en'?'en':'zh-CN');location.href=u.href;}});})();""")
# Correct canonical invitation URLs when the game is inside the R6 frame.
p=O/'room-client.js';s=read(p).replace("this.load();this.paint();}","this.load();this.paint();parent.postMessage({type:'trio-room-selected',room:code},location.origin);}")
s=s.replace("document.getElementById('onlineLanguage').onclick=()=>{const u=new URL(location.href);", "document.getElementById('onlineLanguage').onclick=()=>{if(parent!==window){parent.postMessage({type:'trio-language',lang:this.en?'zh-CN':'en'},location.origin);return;}const u=new URL(location.href);")
s=s.replace("const u=new URL(location.href);u.hash='room='+code;","const u=new URL('./',location.href);u.search=location.search;u.hash='room='+code;")
write(p,s)
extra=[['六位数字房间邀请码','Six-digit room invitation code'],['输入六位数字，或创建新房间','Enter six digits or create a room'],['创建新房间','Create a new room'],['复制游戏邀请','Copy game invite'],['游戏昵称','Nickname'],['加入房间，一起玩 ▶','Join the room ▶'],['每个房间最多3名玩家。只把房间码发给认识的伙伴。刷新后在原浏览器恢复自己的身份与任务。','Maximum 3 players per room. Share the code only with friends. Return in the original browser to restore your identity and progress.'],['回到大厅喷泉庆祝 🎉','Return to the plaza fountain to celebrate 🎉'],['回到喷泉旁，按互动完成第14个任务，然后填写完整测评表。','Return to the fountain and Interact to finish task 14, then complete the playtest review.'],['14个任务全部完成！','All 14 tasks complete!'],['完整测评表已解锁；也可以继续自由探索。','The complete review is unlocked; free exploration remains available.'],['在喷泉庆祝 🎉','Celebrate at the fountain 🎉'],['任务完成：','Tasks completed: '],['通关测评','Completion review'],['测评状态','Review status'],['中','Medium']]
write(O/'online-strings.js','window.R6_STRINGS.push(...'+json.dumps(extra,ensure_ascii=False)+');\n')
# Translation only: do not reuse the solo timer/pause/WebSocket adapter in the online edition.
write(O/'translate.js',r"""(()=>{const en=new URLSearchParams(location.search).get('lang')==='en';document.documentElement.lang=en?'en':'zh-CN';const map=new Map();for(const[z,e]of window.R6_STRINGS||[]){const a=en?z:e,b=en?e:z;if(a&&!map.has(a))map.set(a,b);}const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),parts=[...map.keys()].sort((a,b)=>b.length-a.length).map(s=>en?esc(s):(/^[A-Za-z]/.test(s)?'(?<![A-Za-z])':'')+esc(s)+(/[A-Za-z]$/.test(s)?'(?![A-Za-z])':''));const regex=new RegExp(parts.join('|'),'g'),T=s=>typeof s==='string'?s.replace(regex,a=>map.get(a)):s,last=new WeakMap();for(const n of ['fillText','strokeText','measureText']){const old=CanvasRenderingContext2D.prototype[n];CanvasRenderingContext2D.prototype[n]=function(s,...a){return old.call(this,T(String(s)),...a);};}function walk(root){if(!root)return;if(root.nodeType===3){if(last.get(root)===root.nodeValue)return;const t=T(root.nodeValue);last.set(root,t);root.nodeValue=t;return;}if(![1,9,11].includes(root.nodeType))return;if(root.nodeType===1&&/SCRIPT|STYLE|INPUT|TEXTAREA/.test(root.tagName))return;for(const n of root.childNodes)walk(n);if(root.querySelectorAll)for(const n of root.querySelectorAll('[placeholder]'))n.setAttribute('placeholder',T(n.getAttribute('placeholder')));}const ob=new MutationObserver(rs=>{ob.disconnect();for(const r of rs){if(r.type==='characterData')walk(r.target);else for(const n of r.addedNodes)walk(n);}ob.observe(document.body,{subtree:true,childList:true,characterData:true});});addEventListener('DOMContentLoaded',()=>{walk(document.body);ob.observe(document.body,{subtree:true,childList:true,characterData:true});if(parent!==window)document.getElementById('onlineTools').style.display='none';});window.__TRIO_TRANSLATE__=T;})();""")
def page(mode):
 return '''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><title>Trio World · Review</title>'''+('''<link rel="stylesheet" href="../../../../shared/hub-r6/studio.css"><link rel="stylesheet" href="../../../../shared/hub-r6/studio-r5.css"><link rel="stylesheet" href="online.css">'''if mode=='form'else'''<link rel="stylesheet" href="../../shared/hub-r6/studio.css"><link rel="stylesheet" href="../../shared/hub-r6/studio-r5.css"><link rel="stylesheet" href="../builds/trio-world-opus/online/online.css">''')+'''</head><body class="forest reviewPage" data-mode="'''+mode+'''"><nav><a class="brand" id="hubLink" href="'''+('../../../hub/'if mode=='form'else'./')+'''">HUB</a><button class="btn" id="language">English</button></nav><main><header class="pageHeader"><span class="eyebrow">TRIO WORLD · PLAY / REFLECT / IMPROVE</span><h1 id="reviewTitle"></h1><p id="reviewSubtitle"></p></header><div id="reviewApp"></div></main><script type="module" src="'''+('./review-app.js'if mode=='form'else'../builds/trio-world-opus/online/review-app.js')+'''"></script></body></html>'''
write(O/'review.html',page('form'));write(H/'online-reviews.html',page('status'))
# Add an extension to this one work, after native rendering. Martin and R5/R6 base components are not touched.
for p in H.glob('*.html'):
 if p.name=='online-reviews.html':continue
 s=read(p);needle='<script defer src="../builds/trio-world-opus/online/hub-online.js?v=online-r2"></script>'
 if needle not in s:s=s.replace('</body>',needle+'</body>')
 write(p,s)
# Preserve all earlier estimates; separately identify this user-authorized enhancement.
budget=json.loads(read(H/'budget.json'));item={'id':'online-r2-reviews','title':['六位数字联机、任务保存与通关测评','Six-digit rooms, saved progress and completion reviews'],'aud':8,'range':[4,16],'note':['本轮追加制作与测试的工具等值规划估算；不是供应商实付，也不把持续云运行费用算零。','Incremental tool-equivalent planning estimate for this implementation and tests, not a paid bill; ongoing hosting is not assumed to cost zero.']}
budget['items']=[x for x in budget['items']if x.get('id')!=item['id']]+[item];budget['api_equivalent_aud']=round(sum(x['aud']for x in budget['items']),2);budget['range']=[round(sum(x['range'][i]for x in budget['items']),2)for i in [0,1]];dump(H/'budget.json',budget)
for name in ['project.json','learning-record.json']:
 d=json.loads(read(H/name));p=d['projects']['trio']if name=='project.json'else d;p['cost']=budget;p['online']={'revision':'trio-online-r2-reviews-20260925','url':'https://trio-world-opus.sydney-gemstone-games.workers.dev/','max_players':3,'room_code_digits':6,'task_count':14,'review_entry':'online-reviews.html','access':'Room-scoped view capability; review text is not public GitHub content'}
 p['journey']=[x for x in p['journey']if x.get('id')!='online-r2']+[{'id':'online-r2','date':'2026-09-25 · R6 联机扩展','title':['多人房间、14任务与通关测评','Multiplayer rooms, 14 tasks and completion reviews'],'summary':['教师批准现有 R6，追加真实联机入口与动态测评。','Teacher accepted the current R6 and requested online play and dynamic reviews.'],'brief':['六位数字邀请、最多三人、通关后完整测评、HUB 查看状态。','Six-digit invitations, three players, post-completion review and live HUB status.'],'tool':['核验现有 Worker → 保留旧房间 → 新任务与存储 → 表单与状态页 → 验收发布。','Verify existing Worker → preserve legacy rooms → tasks/storage → form/dashboard → test and publish.'],'tech':['按房间持久化、个人任务与共享世界分开、表单校验、专属查看权限。','Room persistence, separate personal/shared state, validated forms and scoped review access.'],'result':['原生 R6 和单机版本保留；多人反馈无需公开仓库写入。','Native R6 and solo editions remain; multiplayer feedback is not written publicly to the repository.'],'source':'ONLINE-R2','status':'done'}]
 p['sources']=[x for x in p['sources']if x.get('id')!='ONLINE-R2']+[{'id':'ONLINE-R2','label':['联机与测评修订','Online and review revision'],'note':['见当前项目 cloudflare/ONLINE-R2.md 与独立验收回执。','See cloudflare/ONLINE-R2.md and its dedicated acceptance report.']}]
 dump(H/name,d)
dump(C/'online-r2-release.json',{'revision':'trio-online-r2-reviews-20260925','status':'BUILT_REQUIRES_DEPLOYMENT_READBACK','source_lan_git_blob':blob,'max_players':3,'digits':6,'tasks':14,'original_namespace_preserved':True})
print('Built scoped Trio online R2: six digits, 3 players, 14 tasks, private cloud reviews. R6 base and Martin untouched.')
