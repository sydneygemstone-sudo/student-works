(function(){'use strict';
const KEY='beast-kings-review-v1',HISTORY='beast-kings-review-history-v1',form=document.querySelector('#reviewForm');
const checks=[
 ['join','联机加入 / Joining','两或三台设备显示正确玩家并开始同一轮。 / Two or three devices join and start the same round.'],
 ['touch','双指操作 / Multitouch','同时移动、飞行和攻击；松开后及时停止。 / Move, fly and attack together; release stops input.'],
 ['smooth','流畅与同步 / Smoothness & sync','记录卡顿、瞬移、可见延迟和屏幕 FPS，不猜原因。 / Record stutter, jumps, visible delay and displayed FPS without assuming a cause.'],
 ['moves','角色与技能 / Beasts & powers','特殊技能、格挡、双兽组合的反馈可辨认。 / Recognise special, block and paired-beast feedback.'],
 ['round','胜负与重玩 / Result & replay','能看懂本轮结果，并重新开始一轮。 / Understand the result and start another round.'],
 ['pause','暂停与重连 / Pause & reconnect','所有设备一起暂停；断开重连后能恢复或重开。 / Pause together; reconnect and resume or reset.'],
 ['progress','收益与升级 / Earnings & upgrades','通关获得收益；购买扣除正确；刷新保留进度。 / Completing play earns rewards; purchases charge correctly; reload retains progress.'],
 ['offline','离线任务 / Offline quests','在线保存完成后，断网重开、通关并保留收益。 / After caching online, reopen offline, finish a challenge and retain earnings.'],
 ['clarity','画面与易用性 / Visual clarity','角色、生命值、按钮可看清，触控区域不被遮挡。 / Beasts, HP and buttons are readable and touch targets are unobstructed.']
];
const statusNames={untested:'未测试 / Not tested',pass:'通过 / Pass',fail:'未通过 / Fail',blocked:'受阻 / Blocked',na:'不适用 / N/A'};
function el(tag,text){const n=document.createElement(tag);if(text)n.textContent=text;return n;}
for(const [id,title,task]of checks){const row=el('div');row.className='check-row';const intro=el('div');intro.append(el('h3',title),el('p',task));const label=el('label','结果 / Result');const select=el('select');select.name='check_'+id;select.setAttribute('aria-label',title+' — 结果 / Result');for(const [value,text]of Object.entries(statusNames)){const option=el('option',text);option.value=value;select.append(option);}label.append(select);const note=el('label','观察记录 / Observation');note.className='note';const input=el('textarea');input.name='note_'+id;input.maxLength=1200;input.rows=2;note.append(input);row.append(intro,label,note);document.querySelector('#checks').append(row);}
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))||fallback;}catch{return fallback;}}
function today(){const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);}
let record=read(KEY,null),history=read(HISTORY,[]);if(!Array.isArray(history))history=[];
function fresh(){return{schemaVersion:1,id:crypto.randomUUID(),createdAt:new Date().toISOString(),fields:{date:today(),version:'Evolve 2.0',decision:'pending'}};}
if(!record||typeof record.fields!=='object')record=fresh();
function fill(){form.reset();for(const [name,value]of Object.entries(record.fields)){const field=form.elements.namedItem(name);if(field&&typeof value==='string')field.value=value;}count();}
function collect(){record.fields=Object.fromEntries(new FormData(form).entries());record.updatedAt=new Date().toISOString();return record;}
function count(){const tested=checks.filter(([id])=>!['untested','na'].includes(form.elements.namedItem('check_'+id).value)).length;document.querySelector('#completion').textContent=tested+' / '+checks.length+' 已测试 / tested';}
function persist(){collect();count();try{localStorage.setItem(KEY,JSON.stringify(record));document.querySelector('#saveState').textContent='已自动保存 / Draft saved';}catch{document.querySelector('#saveState').textContent='保存失败，请导出 / Save failed — export now';}}
form.addEventListener('input',persist);form.addEventListener('change',persist);form.addEventListener('submit',e=>e.preventDefault());
function download(text,extension,type){const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='beast-kings-review-'+(record.fields.date||today())+'-'+record.id.slice(0,8)+'.'+extension;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function textValue(value){return String(value||'—').replaceAll('|','\\|').replace(/\r?\n/g,'<br>');}
function markdown(){collect();const f=record.fields,lines=['# Beast Kings · 试玩测评 / Playtest review','',...['date','testers','version','device','mode','connection'].map((key,i)=>'**'+['日期 / Date','测试者 / Testers','版本 / Version','设备 / Device','模式 / Mode','连接 / Connection'][i]+'**: '+textValue(f[key])),'','## 一轮检查 / Round checks','','| 检查 / Check | 结果 / Result | 观察 / Observation |','| --- | --- | --- |'];for(const[id,title]of checks)lines.push('| '+title+' | '+statusNames[f['check_'+id]||'untested']+' | '+textValue(f['note_'+id])+' |');lines.push('','## 反馈与下一步 / Feedback and next step','');const fields={fun:'好玩程度 / Fun (1–5)',ease:'操作容易程度 / Control ease (1–5)',favourite:'最喜欢的部分与发言者 / Favourite and speaker',friction:'困惑 / Friction',issue:'一个问题 / One issue',priority:'优先级 / Priority',frequency:'复现频率 / Frequency',steps:'复现步骤 / Steps',expected:'期望 / Expected',observed:'实际 / Observed',evidence:'证据 / Evidence',acceptance:'复测标准 / Retest criterion',decision:'老师决定 / Teacher decision',teacher:'确认者 / Confirmed by',nextTime:'下一轮时间 / Next time limit',nextBudget:'下一轮预算 / Next budget'};for(const[k,label]of Object.entries(fields))lines.push('### '+label,'',f[k]||'未填写 / Not recorded','');lines.push('本表评价游戏，不评价孩子。工程测试不代表老师或孩子已验收。','This form evaluates the game, not the child. Engineering tests do not replace teacher or child acceptance.');return lines.join('\n');}
document.querySelector('#exportMarkdown').onclick=()=>{persist();download(markdown(),'md','text/markdown;charset=utf-8');};document.querySelector('#exportJSON').onclick=()=>{persist();download(JSON.stringify(record,null,2),'json','application/json');};
function saveHistory(){try{localStorage.setItem(HISTORY,JSON.stringify(history));return true;}catch{document.querySelector('#saveState').textContent='历史保存失败，请先导出 / History save failed — export first';return false;}}
function renderHistory(){const root=document.querySelector('#history');root.replaceChildren();for(const item of [...history].reverse()){const button=el('button',(item.fields.date||'—')+' · '+(item.fields.testers||'未命名 / Untitled'));button.className='secondary';button.onclick=()=>{persist();history=history.filter(r=>r.id!==record.id);history.push(record);if(!saveHistory())return;record=JSON.parse(JSON.stringify(item));fill();persist();renderHistory();};root.append(button);}if(!history.length)root.append(el('p','暂无 / None yet'));}
document.querySelector('#newSession').onclick=()=>{persist();history=history.filter(r=>r.id!==record.id);history.push(record);if(!saveHistory())return;record=fresh();fill();persist();renderHistory();window.scrollTo({top:0,behavior:'smooth'});};document.querySelector('#print').onclick=()=>window.print();fill();persist();renderHistory();
if('serviceWorker'in navigator&&window.isSecureContext)navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
