from pathlib import Path
import json,re
R=Path(__file__).resolve().parents[1];S=R/'shared/hub-r6'
def get(p):return Path(p).read_text(encoding='utf8')
def put(p,x):Path(p).write_text(x,encoding='utf8')
def dump(p,x):put(p,json.dumps(x,ensure_ascii=False,indent=2)+'\n')
# A single longest-source match prevents a translated phrase being translated again.
p=S/'game-runtime.js';s=get(p);a=s.index('const pairs=');b=s.index('window.R6_T=T;',a)
translate=r'''const table=new Map();for(const [zh,eng] of window.R6_STRINGS||[]){const from=en?zh:eng,to=en?eng:zh;if(from&&!table.has(from))table.set(from,to);}
const sources=[...table.keys()].sort((a,b)=>b.length-a.length);const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const patterns=sources.map(s=>en?escape(s):(/^[A-Za-z]/.test(s)?'(?<![A-Za-z])':'')+escape(s)+(/[A-Za-z]$/.test(s)?'(?![A-Za-z])':''));const regex=new RegExp(patterns.join('|'),'g'),memo=new Map();function T(text){if(typeof text!=='string'||!text.trim())return text;if(memo.has(text))return memo.get(text);const result=text.replace(regex,hit=>table.get(hit));if(memo.size>10000)memo.clear();memo.set(text,result);return result;}
'''
# Use the standard literal regex escape; avoid accidental Python/JS double escaping.
translate=translate.replace("s.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&')","s.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&')")
put(p,s[:a]+translate+s[b:])
# Mixed bilingual source labels are normalized before applying the language dictionary.
p=R/'adventure-world/solo-skyvale/game/index.html';s=get(p).replace('移动 MOVE','移动').replace('OUR ADVENTURE / 共同冒险','我们的冒险').replace('<h1>云间<span>奇遇</span><i>Skyvale</i></h1>','<h1>云间奇遇</h1>');put(p,s)
p=R/'adventure-world/solo-skyvale/game/game.js';s=get(p).replace("['☀ 晴朗 · SUNNY','☁ 微风 · BREEZY','☂ 小雨 · RAIN'][currentWeather]","(window.R6_LANG==='en'?['☀ SUNNY','☁ BREEZY','☂ RAIN']:['☀ 晴朗','☁ 微风','☂ 小雨'])[currentWeather]");put(p,s)
# Cover the historical game's formerly hard-coded victory and quest notifications.
extra=[['我们的冒险','OUR ADVENTURE'],['我的冒险','My adventure'],['WASD 或点击地面移动｜E 或点击气泡互动｜F 飞行｜I 隐形｜L 手电筒','WASD or Click Ground to Move | [E] or Click Bubble to Interact | [F] Fly | [I] Invis | [L] Torch'],['飞行','FLY'],['隐形','INVIS'],['手电筒','TORCH'],['印章：','Stamps:'],['线索：','Clues:'],['获得游园印章！','STAMP COLLECTED!'],['集齐所有印章！准备好夜间探险了吗？','All stamps collected! Ready for night adventure?'],['找到星星线索：','FOUND STAR CLUE:'],['已集齐三条线索！前往大厅的星光控制台！','All 3 clues gathered! Head to the Starglow Console in the Plaza!'],['水上乐园','WATERPARK'],['动物园','ZOO'],['小狗','PUPPY'],['天空','SKY'],['安静','QUIET'],['踪迹','TRAIL']]
p=S/'strings.js';put(p,get(p)+'\nwindow.R6_STRINGS.push(...'+json.dumps(extra,ensure_ascii=False)+');\n')
# Import the entire prior HUB record, not an embedded link to that HUB.
AW=json.loads(get(R/'adventure-world/hub-data.js').split('=',1)[1].strip().rstrip(';'))
lessons=json.loads(get(R/'classroom-2026-09-24/lesson-data.json'))
for folder,sid in [('martins-monster-quest','martin'),('adventure-world','trio')]:
 h=R/folder/'hub';d=json.loads(get(h/'project.json'));p=d['projects'][sid];q=lessons['projects'][sid]
 p['recorded_issues']=q['issues'];p['historical_context']=({k:v for k,v in AW.items()if k!='hero'}if sid=='trio'else{'origin':'Original V1 source and DEVLOG.md','classroom_requirements':q['requirements'],'historical_snapshot':q['branches'][0]})
 dump(h/'historical-context.json',p['historical_context']);dump(h/'project.json',d);dump(h/'learning-record.json',p)
p=S/'studio.js';s=get(p);where=s.index('\nfetch(')
addon='''
function historicalRecords(){const h=P.historical_context;return `<section class="paper"><span class="eyebrow">IMPORTED HISTORY · NO OLD HUB DETOUR</span><h2>${t('早期资料已合并到这里','Earlier records are consolidated here')}</h2><p>${t('以下保留当时的需求、问题与验收口径；历史状态不是本轮新验收结论。','Earlier requirements, issues and test scopes are preserved below; historical statuses are not this revision’s verdict.')}</p>${h.requirements?`<details><summary>${t('最早的四项作品需求','The four original requirements')}</summary><div class="brief-grid">${h.requirements.map(([a,b])=>`<div><h3>${v(a)}</h3><p>${v(b)}</p></div>`).join('')}</div></details>`:''}${h.tests?`<details><summary>${t('上周的完整测试记录','Earlier complete test record')}</summary>${h.tests.map(([a,b,c])=>`<div class="changeRow"><div><h3>${v(a)}</h3><p>${v(b)}</p><p class="fine">${v(c)}</p></div></div>`).join('')}</details>`:''}<a class="btn" href="historical-context.json">${t('查看合并的全部历史数据','All imported historical data')} ↗</a></section>`;}
function recordedIssues(){return `<section class="paper"><h2>${t('课堂问题与修复跟踪','Classroom issues and follow-up')}</h2>${P.recorded_issues.map(x=>`<div class="changeRow"><span class="badge">${esc(x[0])}</span><div><h3>${v(x[1])}</h3><p>${v(x[2])}</p><small>${v(x[3])} · ${t('原记录状态保留，R6 验收另列','Original status retained; R6 acceptance is separate')}</small></div></div>`).join('')}${P.historical_context.issues?`<details><summary>${t('上周已记录的问题','Issues recorded in the earlier HUB')}</summary>${P.historical_context.issues.map(x=>`<h3>${esc(x[0])} · ${v(x[2])}</h3><p>${v(x[3])}</p>`).join('')}</details>`:''}</section>`;}
const originalDevelopment=development;development=()=>originalDevelopment()+historicalRecords();const originalReview=review;review=()=>originalReview()+recordedIssues();
'''
put(p,s[:where]+addon+s[where:])
# Candidate standards remain unapproved until the teacher reviews them.
p=R/'docs/hub-standard/HUB-R6-REQUEST.json';x=json.loads(get(p));x['status']='IMPLEMENTED_AWAITING_TEACHER_REVIEW';x['canonical_hubs']=['martins-monster-quest/hub/','adventure-world/hub/'];dump(p,x)
print('History fully imported, classroom issue tracking retained, single-pass bilingual rendering ready.')
