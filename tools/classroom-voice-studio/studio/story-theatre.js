import {SceneMixer} from './scene-mixer.js';
const ASSET_BASE=new URL('../../assets/story/',import.meta.url).href;
const SCENES={
 party:{title:'藏好了吗？派对开始喽！',label:'花园派对',text:'花园里正在开派对。小动物们吃过点心，跑到树后、花丛和树篱迷宫里，玩起了捉迷藏。',x:0,y:0},
 storm:{title:'轰隆！雨云追来了……',label:'突如其来的暴风雨',text:'忽然，天空黑了下来，风把彩旗吹得呼啦啦响。小伙伴们还散落在花园各处：“我们害怕，谁来接我们回家？”',x:100,y:0},
 rescue:{title:'别怕，我们来接你们！',label:'双人救援队，出发！',text:'小熊和小兔牵起手：“一个也不能落下！”赶在暴风雨前，穿过迷宫与森林，把八位小伙伴都送回中间的小屋吧。',x:0,y:100},
 feast:{title:'这一桌好吃的，送给小英雄！',label:'救援大胜利！团圆宴会',text:'八位小伙伴都平安到家啦！大家端来蛋糕、水果和热汤：“谢谢小熊和小兔！”窗外下着雨，屋里暖暖的，我们的派对团圆啦！',x:100,y:100}
};
const EN={
 party:{title:'Ready or not, the party begins!',label:'Garden party'},
 storm:{title:'Rumble! Here come the rain clouds…',label:'A storm is coming'},
 rescue:{title:"Don't worry! We're coming!",label:'The rescue team sets off'},
 feast:{title:'A feast for our little heroes!',label:'Everyone is home'}
};
const SEEN_KEY='naomi-private-candidate-intro-seen';
export class StoryTheatre {
 constructor({gardenAudio=null}={}){
  this.active=false;this.muted=false;this.sequence=[];this.index=0;this.onDone=null;this.language='ZH';this.epoch=0;this.gardenAudio=gardenAudio;
  this.mixer=new SceneMixer({onDuck:(value,levels,muted)=>gardenAudio?.setStoryMix(value,levels,muted),onStatus:status=>{if(this.el&&status==='tap-to-play')this.el.status.textContent=this.language==='ZH'?'点“重播本幕”开启声音':'Tap Replay to enable sound';}});
  this.manifestPromise=this.loadManifest();this.buildDom();
 }
 async loadManifest(){
  try{const r=await fetch('/audio-manifest.json',{cache:'no-store'});if(!r.ok)return null;return await r.json();}catch{return null;}
 }
 buildDom(){
  this.root=document.createElement('div');this.root.className='modal-backdrop';this.root.style.cssText='display:none;z-index:60';
  this.root.innerHTML=`
   <div class="modal-box" style="max-width:680px;max-height:95vh;overflow:auto">
    <div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:10px"><b>NAOMI · 小动物回家</b><span data-chapter></span></div>
    <div style="position:relative;aspect-ratio:3/2;border-radius:14px;overflow:hidden;background:#243b32;margin-bottom:14px">
     <div data-art style="position:absolute;inset:0;background-image:url('${ASSET_BASE}garden-story.png');background-size:200% 200%;transition:background-position .8s"></div>
     <div data-badge style="position:absolute;bottom:10px;left:10px;background:#000a;color:#fff;padding:5px 12px;border-radius:8px"></div>
    </div><div class="modal-title" data-title></div><div class="modal-desc" data-text style="min-height:66px"></div>
    <p data-status style="font-size:12px;color:#64748b"></p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0">
     <select data-language aria-label="故事语言" style="padding:10px;border-radius:8px"><option value="ZH">中文</option><option value="EN">English</option></select>
     <button type="button" data-audio class="btn-ctl" style="padding:0 12px;height:42px">声音开启</button>
     <button type="button" data-replay class="btn-ctl" style="padding:0 12px;height:42px">重播本幕</button>
     <button type="button" data-skip class="btn-ctl" style="padding:0 12px;height:42px">跳过故事</button>
     <button type="button" data-next class="solo-entry-btn" style="width:auto;padding:0 22px;height:42px;margin:0">下一幕 →</button>
    </div><details><summary style="font-size:12px;cursor:pointer">声音音量 / Sound levels</summary><div data-levels style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px"></div></details>
   </div>`;
  document.body.appendChild(this.root);this.el={};
  for(const key of ['chapter','art','badge','title','text','status','audio','next','language','levels'])this.el[key]=this.root.querySelector('[data-'+key+']');
  this.el.next.onclick=()=>this.next();this.root.querySelector('[data-skip]').onclick=()=>this.finish();this.el.audio.onclick=()=>this.toggleAudio();
  this.root.querySelector('[data-replay]').onclick=()=>this.showScene();
  this.el.language.onchange=()=>{this.language=this.el.language.value;this.showScene();};
  for(const [bus,label] of Object.entries({voice:'旁白 / Voice',animals:'动物 / Animals',environment:'环境 / Ambience',music:'音乐 / Music'})){
    const wrap=document.createElement('label');wrap.style.fontSize='12px';wrap.textContent=label;
    const input=document.createElement('input');input.type='range';input.min='0';input.max='1';input.step='.01';input.value=String(this.mixer.levels[bus]);input.dataset.bus=bus;
    input.oninput=()=>{this.levelsEdited=true;this.mixer.configure({[bus]:+input.value});};wrap.appendChild(input);this.el.levels.appendChild(wrap);
  }
 }
 hasSeenIntro(){try{return sessionStorage.getItem(SEEN_KEY)==='1';}catch{return false;}}
 markIntroSeen(){try{sessionStorage.setItem(SEEN_KEY,'1');}catch{}}
 play(mode='intro',onComplete=null){
  if(this.active)return;
  if(mode==='intro'&&this.hasSeenIntro()){onComplete?.();return;}
  this.sequence=mode==='ending'?['feast']:['party','storm','rescue'];this.mode=mode;this.index=0;this.active=true;this.onDone=onComplete;
  this.manifestPromise=this.loadManifest();this.gardenAudio?.beginStory();this.root.style.display='flex';this.showScene();
 }
 async showScene(){
  const epoch=++this.epoch;this.mixer.stop();
  if(!this.active||this.index>=this.sequence.length){this.finish();return;}
  const key=this.sequence[this.index],scene=SCENES[key],en=this.language==='EN';
  this.el.chapter.textContent=(this.index+1)+' / '+this.sequence.length;
  this.el.title.textContent=en?EN[key].title:scene.title;this.el.badge.textContent=en?EN[key].label:scene.label;
  this.el.art.style.backgroundPosition=scene.x+'% '+scene.y+'%';
  this.el.text.textContent=en?'':scene.text;this.el.status.textContent='';
  this.el.next.textContent=this.index<this.sequence.length-1?(en?'Next →':'下一幕 →'):(en?'Continue →':'继续 →');
  const manifest=await this.manifestPromise;
  if(epoch!==this.epoch||!this.active)return;
  const approved=manifest?.scenes?.[key];
  this.el.text.textContent=approved?.texts?.[this.language]||(en?'Narration text unavailable':scene.text);
  if(!this.levelsEdited&&manifest?.mix){this.mixer.configure(manifest.mix);for(const input of this.el.levels.querySelectorAll('input'))input.value=String(this.mixer.levels[input.dataset.bus]);}
  const voice=approved?.voice?.[this.language];
  if(!voice){this.el.status.textContent=en?'Candidate narration is awaiting listening and approval.':'候选旁白等待试听和选用；目前可阅读故事、测试玩法。';return;}
  await this.mixer.play({voice,animals:approved.animals,environment:approved.environment});
 }
 toggleAudio(){this.muted=!this.muted;this.mixer.setMuted(this.muted);this.el.audio.textContent=this.muted?'声音已静音':'声音开启';}
 next(){if(this.index<this.sequence.length-1){this.index++;this.showScene();}else this.finish();}
 finish(){
  this.epoch++;this.mixer.stop();if(!this.active)return;this.active=false;this.root.style.display='none';this.gardenAudio?.endStory();
  if(this.mode==='intro')this.markIntroSeen();const cb=this.onDone;this.onDone=null;cb?.();
 }
 destroy(){this.finish();this.mixer.destroy();this.root.remove();}
}
