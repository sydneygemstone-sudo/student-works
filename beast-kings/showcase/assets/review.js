(()=>{const KEY='beast-kings-showcase-review-v1',form=document.getElementById('reviewForm'),state=document.getElementById('saveState');const fields=()=>Object.fromEntries(new FormData(form).entries());const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));const lang=()=>window.BeastKingsI18n?.get?.()||'zh';function today(){const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)}function save(announce=false){const data={schema:1,updatedAt:new Date().toISOString(),...fields()};try{localStorage.setItem(KEY,JSON.stringify(data));state.textContent=announce?(lang()==='zh'?'已保存到这台设备。':'Saved on this device.'):(lang()==='zh'?'草稿已自动保存。':'Draft autosaved.')}catch{state.textContent=lang()==='zh'?'浏览器存储不可用，请马上导出。':'Browser storage unavailable—export now.'}return data}function load(){let data=null;try{data=JSON.parse(localStorage.getItem(KEY)||'null')}catch{}if(data)for(const [k,v] of Object.entries(data)){const el=form.elements.namedItem(k);if(el&&typeof v==='string')el.value=v}if(!form.elements.date.value)form.elements.date.value=today()}function reportText(d){return `BEAST KINGS PLAYTEST / 试玩测评
Date / 日期: ${d.date||''}
Players / 试玩者: ${d.players||''}
Build / 版本: ${d.build||''}
Device / 设备: ${d.device||''}
Mode / 模式: ${d.mode||''}
Beast / Game ID: ${d.character||''}

BEST / 最好玩
${d.best||'—'}

WORST / 最糟或最烦
${d.worst||'—'}

CHECKS / 检查
Touch: ${d.touch||'—'}
Accidental zoom: ${d.zoom||'—'}
2.5D depth: ${d.depth||'—'}
Boss telegraph: ${d.boss||'—'}
Energy boosts: ${d.energy||'—'}
Replay voluntarily: ${d.replay||'—'}

BUG / 问题
${d.bug||'—'}

REPRO / 复现
${d.steps||'—'}

EXPECTED vs ACTUAL / 期望 vs 实际
${d.expected||'—'}

ONE NEXT CHANGE / 下一轮只改一个
${d.next||'—'}

QUOTE / 原话
${d.quote||'—'}

This review evaluates the game, not the child. / 本测评评价游戏，不评价孩子。`}function reportHtml(d){const rows=[['日期 / Date',d.date],['试玩者 / Players',d.players],['版本 / Build',d.build],['设备 / Device',d.device],['模式 / Mode',d.mode],['Beast / Game ID',d.character],['触控 / Touch',d.touch],['误缩放 / Zoom',d.zoom],['2.5D depth',d.depth],['Boss telegraph',d.boss],['Energy',d.energy],['Replay',d.replay]];return `<!doctype html><html><head><meta charset="utf-8"><title>Beast Kings Playtest</title><style>body{font-family:Arial,'Microsoft YaHei',sans-serif;max-width:900px;margin:40px auto;line-height:1.55;color:#18232a}h1{color:#173b43}table{width:100%;border-collapse:collapse}td,th{border:1px solid #cad5d7;padding:8px;text-align:left;vertical-align:top}section{margin-top:24px}pre{white-space:pre-wrap;font:inherit;background:#f4f7f7;padding:14px;border-radius:8px}.note{color:#667;font-size:12px}</style></head><body><h1>Beast Kings · 试玩测评 / Playtest Review</h1><table>${rows.map(r=>`<tr><th>${esc(r[0])}</th><td>${esc(r[1])}</td></tr>`).join('')}</table>${[['最好玩 / Best',d.best],['最糟 / Worst',d.worst],['Bug',d.bug],['复现 / Reproduction',d.steps],['期望 vs 实际 / Expected vs actual',d.expected],['下一轮只改一个 / One next change',d.next],['原话 / Quote',d.quote]].map(r=>`<section><h2>${esc(r[0])}</h2><pre>${esc(r[1]||'—')}</pre></section>`).join('')}<p class="note">本测评评价游戏，不评价孩子。 / This review evaluates the game, not the child.</p></body></html>`}function dl(name,content,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}form.addEventListener('input',()=>save());form.addEventListener('change',()=>save());document.getElementById('saveNow').onclick=()=>save(true);document.getElementById('downloadJson').onclick=()=>{const d=save();dl('beast-kings-playtest-'+(d.date||today())+'.json',JSON.stringify(d,null,2),'application/json')};document.getElementById('downloadHtml').onclick=()=>{const d=save();dl('beast-kings-playtest-'+(d.date||today())+'.html',reportHtml(d),'text/html;charset=utf-8')};document.getElementById('downloadDoc').onclick=()=>{const d=save();dl('beast-kings-playtest-'+(d.date||today())+'.doc','\ufeff'+reportHtml(d),'application/msword')};document.getElementById('emailReport').onclick=()=>{const d=save();const subject='Beast Kings Playtest — '+(d.players||d.date||today()),body=reportText(d);location.href='mailto:?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body)};document.getElementById('newReview').onclick=()=>{if(!confirm(lang()==='zh'?'新建会清空当前表单；请先导出需要保留的报告。继续吗？':'Starting a new review clears the current form. Export anything you need first. Continue?'))return;try{localStorage.removeItem(KEY)}catch{}form.reset();form.elements.date.value=today();state.textContent=lang()==='zh'?'已新建空白测评。':'New blank review created.'};load();save();})();