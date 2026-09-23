import {SceneMixer} from '/mix.js';
import {AuditionDeck} from '/deck.js';
let state,activeTab='voice',lastSignature='',dirty=false,mixDirty=false;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={natural:'自然',happy:'开心',angry:'生气',sad:'难过',afraid:'害怕'};
const modes={reference:'Naomi 情绪录音',text:'文字描述语气',vector:'情绪参数'};
const itemLabel=i=>i.kind==='voice'&&i.stage==='sample'?(i.language==='ZH'?'中文':'English')+' · '+names[i.emotion]:i.label;
const mixer=new SceneMixer({onStatus:s=>$('#mix-status').textContent={playing:'正在一起试听',stopped:'已停止','tap-to-play':'请再点一次播放以启用声音'}[s]||s});
const deck=new AuditionDeck($('#voice-deck'),{save:async(id,rate,volume)=>{
  await api('/api/playback',{asset_id:id,rate,volume});
  const asset=state.assets.find(a=>a.id===id);if(asset)asset.playback={rate,volume};
  notice('语速和音量已保存到这个版本，音频原件保留。');
},onError:e=>notice(e.message||String(e),true)});
function notice(text,error=false){$('#notice').textContent=text;$('#notice').classList.toggle('error',error);}
async function api(route,body){
  const r=await fetch(route,{method:'POST',headers:{'Content-Type':'application/json','X-Studio-Token':state.token},body:JSON.stringify(body)});
  const data=await r.json();if(!r.ok)throw Error(data.error||'操作失败');return data;
}
async function action(fn){try{await fn();await refresh(true);}catch(e){notice(e.message,true);}}
function options(values,selected){return Object.entries(values).map(([v,label])=>'<option value="'+esc(v)+'" '+(v===String(selected)?'selected':'')+'>'+esc(label)+'</option>').join('');}
function number(item,key,label,min,max,step){if(key==='speed')label='重新生成的基础语速';return '<label>'+label+'<input type="number" data-field="'+key+'" value="'+item[key]+'" min="'+min+'" max="'+max+'" step="'+step+'"></label>';}
function form(item){
 const isVoice=item.kind==='voice';
 return '<article class="card" data-item="'+item.id+'"><div class="card-top"><h3>'+esc(isVoice&&item.stage==='sample'?(item.language==='ZH'?'中文':'English')+' · '+names[item.emotion]:item.label)+'</h3><span class="tag">'+(isVoice?'Naomi 的音色':'独立音效')+'</span></div>'+
 '<label>'+(isVoice?'台词':'声音描述')+'<textarea data-field="'+(isVoice?'text':'prompt')+'">'+esc(isVoice?item.text:item.prompt)+'</textarea></label>'+
 (isVoice?'<details><summary>对照 Naomi 原声</summary><audio controls preload="none" src="/reference/'+item.speaker_reference+'"></audio></details>':'')+
 '<div class="takes" data-takes="'+item.id+'"></div><details class="parameters"><summary>编辑语气与生成参数</summary>'+
 (isVoice?'<div class="fields"><label>语言<select data-field="language">'+options({ZH:'中文',EN:'English'},item.language)+'</select></label><label>语气<select data-field="emotion">'+options(names,item.emotion)+'</select></label><label>语气来源<select data-field="emotion_mode">'+options(modes,item.emotion_mode)+'</select></label><label>情绪参考<select data-field="emotion_reference">'+options(Object.fromEntries(Object.keys(state.profile.references).map(k=>[k,names[k]||'难过（备选）'])),item.emotion_reference)+'</select></label></div><label>文字语气描述<input data-field="emotion_text" value="'+esc(item.emotion_text)+'"></label><div class="fields">'+number(item,'intensity','情绪强度',0,1,.05)+number(item,'speed','语速',.65,1.4,.05)+number(item,'pause_ms','分段停顿（毫秒）',0,1500,20)+number(item,'volume','片段音量',0,1,.05)+'</div><label>音色参考<select data-field="speaker_reference">'+options(Object.fromEntries(Object.keys(state.profile.references).map(k=>[k,names[k]||'难过（备选）'])),item.speaker_reference)+'</select></label><div class="fields"><label>参数预设<select data-preset><option value="">选择预设</option>'+options(Object.fromEntries(Object.keys(state.presets).map(k=>[k,k])),null)+'</select></label><button class="quiet" data-save-preset>保存为预设</button></div><details><summary>对照 Naomi 原声</summary><audio controls preload="none" src="/reference/'+item.speaker_reference+'"></audio><p class="muted">参考录音仅用于私密试听，不是生成结果。</p></details>':
 '<div class="fields">'+number(item,'seconds','时长（秒）',1,30,1)+number(item,'variants','生成变体',1,4,1)+number(item,'volume','片段音量',0,1,.05)+number(item,'seed','种子',0,2147483647,1)+'</div>')+
 '<div class="actions"><button data-save>保存修改</button><button class="quiet" data-generate>重做这一段</button></div></details></article>';
}
function takes(item,route=null){
 const assets=state.assets.filter(a=>a.item_id===item.id&&(!route||(a.item_snapshot.route||'original')===route)).slice().reverse();
 if(!assets.length)return '<p class="muted">还没有生成结果。队列中的任务完成后会出现在这里。</p>';
 return assets.map((a,index)=>{
   const stale=Object.keys({...item,...a.item_snapshot}).some(k=>!['volume','label'].includes(k)&&JSON.stringify(item[k])!==JSON.stringify(a.item_snapshot[k]));
   return '<div class="take"><div class="take-title"><b>'+(a.selected?'✓ 已选用 · ':'')+esc(a.item_snapshot.take_label||'V1 · 原版')+'</b><span>'+a.qa.duration+' 秒 · '+a.qa.sample_rate/1000+' kHz</span></div><audio controls preload="none" data-generated="'+a.id+'" src="/media/'+a.id+'"></audio><button class="'+(a.selected?'quiet':'')+'" '+(stale?'data-restore':'data-approve')+'="'+a.id+'">'+(stale?'采用此版本参数并选用':a.selected?'已选用，重新确认':'试听满意，选用此版')+'</button><details><summary>生成记录</summary><p>峰值 '+a.qa.peak_dbfs+' dBFS · 削波 '+a.qa.clipped_samples+' · 用时 '+a.elapsed_seconds+' 秒</p><pre>'+esc(JSON.stringify({parameters:a.parameters,text:a.item_snapshot.text,prompt:a.item_snapshot.prompt},null,2))+'</pre></details></div>';
 }).join('');
}
function collect(card){
 const item=structuredClone(state.project.items.find(i=>i.id===card.dataset.item));
 for(const input of card.querySelectorAll('[data-field]'))item[input.dataset.field]=input.type==='number'?Number(input.value):input.value;
 return item;
}
function renderForms(){
 for(const tab of ['voice','sfx','story']){
   const items=state.project.items.filter(i=>tab==='story'?i.stage==='story':i.stage==='sample'&&i.kind===tab);
   $('#'+tab+'-items').innerHTML=items.map(form).join('');
 }
 document.querySelectorAll('[data-item]').forEach(card=>{
   card.addEventListener('input',()=>{dirty=true;});
   card.querySelector('[data-save]').onclick=()=>action(async()=>{await api('/api/item',{item:collect(card)});dirty=false;notice('修改已保存；已有声音版本仍保留。');});
   card.querySelector('[data-generate]').onclick=()=>action(async()=>{const item=collect(card);await api('/api/item',{item});const r=await api('/api/generate',{scope:item.stage==='sample'?'samples':'story',ids:[item.id]});dirty=false;notice(r.jobs.length?'已进入生成队列':'同一版本已在队列中');});
   if(card.querySelector('[data-preset]'))card.querySelector('[data-preset]').onchange=e=>{const preset=state.presets[e.target.value];if(preset)for(const [k,v] of Object.entries(preset))card.querySelector('[data-field="'+k+'"]').value=v;dirty=true;};
   if(card.querySelector('[data-save-preset]'))card.querySelector('[data-save-preset]').onclick=()=>action(async()=>{const name=prompt('预设名称');if(name)await api('/api/preset',{name,values:collect(card)});});
 });
 renderTakes();renderMix();
}
function bindAudio(){
 document.querySelectorAll('audio').forEach(a=>{
   a.onplay=()=>{mixer.stop();if(deck.audio&&deck.audio!==a)deck.audio.pause();document.querySelectorAll('audio').forEach(other=>{if(a!==other)other.pause();});};
   const asset=state.assets.find(x=>x.id===a.dataset.generated);
   if(asset)deck.register(a,asset,itemLabel(state.project.items.find(i=>i.id===asset.item_id))+' · '+(asset.item_snapshot.take_label||'V1'));
 });
}
function renderComparison(){
 const titles={playing:'玩耍',startled:'受惊',reunion:'团圆'};
 $('#sfx-comparison').innerHTML=Object.entries(titles).map(([group,title])=>{
   const item=state.project.items.find(i=>i.id==='sfx-'+group);
   return '<section class="comparison-scene"><h3>'+title+'</h3><div class="comparison-grid"><article class="card route-a"><div class="route-label">A · 动画片情绪版</div><p>动物音色的欢笑、惊呼、咿呀声。</p>'+takes(item,'cartoon')+'</article><article class="card route-b"><div class="route-label">B · 八种动物版</div><p>猫头鹰、松鼠、狐狸、浣熊、兔宝宝、小鹿、刺猬、乌龟。安静动物以动作声表现。</p>'+takes(item,'ensemble')+'</article></div></section>';
 }).join('');
 $('#animal-library').innerHTML=(state.library||[]).map(a=>'<div class="animal-stem"><b>'+esc(a.label)+'</b><audio controls preload="none" src="/media/'+a.id+'"></audio></div>').join('')||'<p>八种动物正在按独立音轨制作，完成后可在这里逐个试听。</p>';
}
function renderTakes(){
 document.querySelectorAll('[data-takes]').forEach(el=>{const item=state.project.items.find(i=>i.id===el.dataset.takes);el.innerHTML=takes(item,item.kind==='sfx'&&item.stage==='sample'?'original':null);});
 renderComparison();
 document.querySelectorAll('.route-b audio[data-generated]').forEach(audio=>{
   const asset=state.assets.find(a=>a.id===audio.dataset.generated),cues=asset?.parameters?.cues||[];
   if(!cues.length)return;
   const row=document.createElement('div');row.className='cue-markers';row.setAttribute('aria-label','八种动物出现的位置');
   for(const cue of cues){const button=document.createElement('button');button.className='quiet';button.textContent=cue.label;button.title='从 '+cue.start+' 秒试听';button.onclick=async()=>{try{await audio.play();audio.currentTime=cue.start;}catch(e){notice(e.message,true);}};row.append(button);}
   audio.after(row);
 });
 document.querySelectorAll('[data-approve]').forEach(b=>b.onclick=()=>action(async()=>{await api('/api/approve',{asset_id:b.dataset.approve});notice('已选用这个版本。');}));
 document.querySelectorAll('[data-restore]').forEach(b=>b.onclick=()=>action(async()=>{
   if(dirty)throw Error('请先保存当前修改，再恢复旧版本');
   const a=state.assets.find(a=>a.id===b.dataset.restore),item=structuredClone(a.item_snapshot);
   item.volume=state.project.items.find(i=>i.id===item.id).volume;
   await api('/api/item',{item});await api('/api/approve',{asset_id:a.id});
   notice('已恢复此版本的台词与生成参数，并选用音频。');
 }));
 bindAudio();
}
function renderMix(){
 $('#mix-controls').innerHTML='<h3>各条音轨音量</h3>'+Object.entries({voice:'旁白',animals:'动物',environment:'环境',music:'音乐',duck:'旁白播放时的背景比例'}).map(([key,label])=>'<label>'+label+' <output>'+Math.round(state.project.mix[key]*100)+'%</output><input data-mix="'+key+'" type="range" min="0" max="1" step=".01" value="'+state.project.mix[key]+'"></label>').join('')+'<button id="save-mix">保存音量</button>';
 document.querySelectorAll('[data-mix]').forEach(el=>el.oninput=()=>{mixDirty=true;el.previousElementSibling.textContent=Math.round(el.value*100)+'%';mixer.configure({[el.dataset.mix]:+el.value});});
 $('#save-mix').onclick=()=>action(async()=>{const mix=Object.fromEntries([...document.querySelectorAll('[data-mix]')].map(el=>[el.dataset.mix,+el.value]));await api('/api/mix',{mix});mixDirty=false;notice('混音已保存；若改动首批风格，请重新确认。');});
 updateMixChoices();
}
function updateMixChoices(){
 for(const [selector,kind] of [['#mix-voice','voice'],['#mix-sfx','sfx']]){
   const old=$(selector).value;
   $(selector).innerHTML=state.assets.filter(a=>a.kind===kind&&a.stage==='sample').slice().reverse().map(a=>'<option value="'+a.id+'">'+esc(itemLabel(state.project.items.find(i=>i.id===a.item_id)))+' · '+esc(a.item_snapshot.take_label||'V1')+(a.selected?' ✓':'')+'</option>').join('');
   if([...$(selector).options].some(o=>o.value===old))$(selector).value=old;
   else{const preferred=state.assets.slice().reverse().find(a=>kind==='voice'?a.item_id==='sample-zh-natural':a.item_id==='sfx-playing'&&a.item_snapshot.route==='cartoon');if(preferred)$(selector).value=preferred.id;}
 }
}
function renderStatus(){
 const selected=state.assets.filter(a=>a.selected&&a.stage==='sample').length;
 $('#stage').textContent=state.style_ready?'声音风格已确认 · 可以制作全套':'先试听，再让声音进入故事';
 $('#counts').textContent='已生成 '+state.assets.length+' 个版本 · 已选用 '+selected+' / 13 组首批声音';
 $('#approve-style').disabled=selected<13||state.style_ready;
 $('#generate-story').disabled=!state.style_ready;
 $('#story-gate').textContent=state.style_ready?'可以生成完整双语故事；生成后仍需逐段试听并选用。':'先确认十条人声与三组动物声音，才能开始全套制作。';
 $('#jobs').innerHTML=state.jobs.length?state.jobs.slice().reverse().map(j=>'<div class="job"><div><b>'+({index:'Naomi 人声',moss:'动物／环境音'}[j.engine])+' · '+({queued:'排队中',running:'正在生成',completed:'完成',failed:'失败',partial:'部分完成',interrupted:'中断'}[j.status]||j.status)+'</b><small>'+j.id+' · 已完成 '+(j.progress.assets?.length||0)+' 个版本'+(j.progress.current?' · '+esc(j.progress.current):'')+'</small>'+(j.progress.gpu_peak_mb?'<small>显存峰值 '+j.progress.gpu_peak_mb+' MB</small>':'')+'</div>'+(['failed','partial','interrupted'].includes(j.status)?'<button class="quiet" data-retry="'+j.id+'">重试失败段落</button>':'')+'</div>').join(''):'<p class="muted">还没有生成任务</p>';
 document.querySelectorAll('[data-retry]').forEach(b=>b.onclick=()=>action(async()=>{await api('/api/retry',{job_id:b.dataset.retry});notice('失败段落已重新排队。');}));
 if(state.jobs.some(j=>j.status==='queued'&&j.waiting_for_gpu))$('#jobs').insertAdjacentHTML('afterbegin','<p class="muted">声音制作正在等待显卡空闲，任务与已完成的声音会保留。</p>');
}
async function refresh(force=false){
 const r=await fetch('/api/state');if(!r.ok)throw Error('工作室连接失败');const next=await r.json();
 const signature=next.assets.map(a=>a.id+!!a.selected).join('|')+'|'+(next.library||[]).map(a=>a.id).join('|');state=next;if(!mixDirty)mixer.configure(state.project.mix);
 if(!lastSignature||force&&!dirty&&!mixDirty){renderForms();lastSignature=signature||'empty';}
 else if(signature!==lastSignature&&!([...document.querySelectorAll('audio')].some(a=>!a.paused))){renderTakes();updateMixChoices();lastSignature=signature||'empty';}
 renderStatus();
}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{mixer.stop();deck.audio?.pause();document.querySelectorAll('audio').forEach(a=>a.pause());activeTab=b.dataset.tab;document.querySelectorAll('.panel').forEach(p=>p.hidden=p.id!==activeTab);document.querySelectorAll('[data-tab]').forEach(n=>n.classList.toggle('active',n===b));history.replaceState(null,'','#'+activeTab);});
function followHash(){const tab=location.hash.slice(1);if(['voice','sfx','story','mix'].includes(tab))document.querySelector('[data-tab="'+tab+'"]').click();}
followHash();window.addEventListener('hashchange',followHash);
document.querySelectorAll('[data-batch]').forEach(b=>b.onclick=()=>action(async()=>{if(dirty)throw Error('请先保存修改');const r=await api('/api/generate',{scope:'samples',kind:b.dataset.batch,changed_only:true});notice(r.jobs.length?'已开始批量制作':'所有小样已有相同参数的结果，或正在生成。');}));
document.querySelectorAll('[data-comparison]').forEach(b=>b.onclick=()=>action(async()=>{const r=await api('/api/generate',{scope:'samples',kind:'sfx',comparison_route:b.dataset.comparison});notice(r.jobs.length?'对比版本已排队制作，已有结果保留。':'相同版本已在队列中');}));
$('#generate-story').onclick=()=>action(async()=>{if(dirty)throw Error('请先保存修改');await api('/api/generate',{scope:'story',changed_only:true});notice('完整故事已进入生成队列。');});
$('#approve-style').onclick=()=>action(async()=>{if(dirty)throw Error('请先保存修改');const r=await api('/api/approve-style',{});notice(r.message);});
$('#play-mix').onclick=()=>{deck.audio?.pause();document.querySelectorAll('audio').forEach(a=>a.pause());const voice=state.assets.find(a=>a.id===$('#mix-voice').value),sfx=state.assets.find(a=>a.id===$('#mix-sfx').value);if(!voice||!sfx)return notice('需要一条人声和一条动物音效',true);mixer.play({voice:{url:'/media/'+voice.id,volume:state.project.items.find(i=>i.id===voice.item_id).volume*(voice.playback?.volume??1),playbackRate:voice.playback?.rate??1},animals:{url:'/media/'+sfx.id,volume:state.project.items.find(i=>i.id===sfx.item_id).volume*(sfx.playback?.volume??1),playbackRate:sfx.playback?.rate??1}});};
$('#stop-mix').onclick=()=>mixer.stop();
window.addEventListener('pagehide',()=>{mixer.destroy();deck.destroy();});
refresh().catch(e=>notice(e.message,true));
const timer=setInterval(()=>refresh().catch(e=>notice(e.message,true)),4000);
window.addEventListener('pagehide',()=>clearInterval(timer));
