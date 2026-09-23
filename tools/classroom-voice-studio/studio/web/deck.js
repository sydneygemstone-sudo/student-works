/** Immediate pitch-preserving rate changes; never synthesizes on fader movement. */
export function applyPlayback(audio,rate=1,volume=1){
  const r=Math.max(.65,Math.min(1.4,Number(rate)||1));
  audio.preservesPitch=true;
  if('webkitPreservesPitch' in audio)audio.webkitPreservesPitch=true;
  if('mozPreservesPitch' in audio)audio.mozPreservesPitch=true;
  audio.playbackRate=r;audio.defaultPlaybackRate=r;
  audio.volume=Math.max(0,Math.min(1,Number(volume)));
}
export class AuditionDeck {
  constructor(root,{save,onError=()=>{}}){
    this.root=root;this.save=save;this.onError=onError;this.audio=null;this.asset=null;this.tailLoop=false;this.bindings=new WeakMap();
    root.innerHTML=`
     <div class="deck-heading"><div><span class="deck-kicker">LIVE VOICE DESK</span><h3 data-deck-name>点任意人声，开始即时调音</h3></div><span class="deck-status" data-deck-state>音高保持</span></div>
     <div class="deck-controls"><div class="transport"><button data-deck-play>播放 / 暂停</button><button data-deck-start>回到开头</button><button data-deck-tail aria-pressed="false">循环句尾</button><button data-deck-reset>还原 1.00×</button></div>
      <label class="fader speed-fader">语速 <output data-rate-label>1.00×</output><input data-deck-rate type="range" min=".65" max="1.4" step=".01" value="1" aria-label="即时语速"><span class="ticks">0.65 · 慢　　1.00 · 原速　　1.40 · 快</span></label>
      <label class="fader">音量 <output data-volume-label>100%</output><input data-deck-volume type="range" min="0" max="1" step=".01" value="1" aria-label="即时音量"></label>
     </div><div class="deck-position"><input data-deck-seek type="range" min="0" max="1" step=".01" value="0" aria-label="播放位置"><span data-deck-time>0:00 / 0:00</span><button data-deck-save>保存到这个声音版本</button></div>
     <p class="deck-help">播放中拖动立即生效 · 保持音高 · 无需重新生成。循环句尾只影响试听，保存语速后可用于候选游戏。</p>`;
    this.el={};for(const name of ['name','state','play','start','tail','reset','rate','volume','seek','time','save'])this.el[name]=root.querySelector('[data-deck-'+name+']');
    this.rateLabel=root.querySelector('[data-rate-label]');this.volumeLabel=root.querySelector('[data-volume-label]');
    this.el.rate.oninput=()=>this.adjust();this.el.volume.oninput=()=>this.adjust();
    this.el.reset.onclick=()=>{this.el.rate.value='1';this.adjust();};
    this.el.play.onclick=()=>{if(!this.audio)return;this.audio.paused?this.audio.play().catch(this.onError):this.audio.pause();};
    this.el.start.onclick=()=>{if(this.audio)this.audio.currentTime=0;};
    this.el.tail.onclick=()=>{this.tailLoop=!this.tailLoop;this.el.tail.setAttribute('aria-pressed',String(this.tailLoop));if(this.tailLoop&&this.audio&&Number.isFinite(this.audio.duration)){this.audio.currentTime=Math.max(0,this.audio.duration-2.4);this.audio.play().catch(this.onError);}};
    this.el.seek.oninput=()=>{if(this.audio&&Number.isFinite(this.audio.duration))this.audio.currentTime=+this.el.seek.value;};
    this.el.save.onclick=async()=>{if(!this.asset)return;try{await this.save(this.asset.id,+this.el.rate.value,+this.el.volume.value);this.el.state.textContent='已保存 · 原音频保留';this.asset.playback={rate:+this.el.rate.value,volume:+this.el.volume.value};}catch(e){this.onError(e);}};
    this.timer=setInterval(()=>this.tick(),80);
  }
  register(audio,asset,label){
    if(this.bindings.has(audio))return;
    this.bindings.set(audio,asset);
    if(asset.kind==='voice')applyPlayback(audio,asset.playback?.rate??1,asset.playback?.volume??1);
    audio.addEventListener('play',()=>{if(asset.kind==='voice')this.focus(audio,asset,label);});
    audio.addEventListener('ended',()=>{if(audio===this.audio&&this.tailLoop){audio.currentTime=Math.max(0,audio.duration-2.4);audio.play().catch(this.onError);}});
  }
  focus(audio,asset,label){
    if(this.audio===audio)return;
    this.audio=audio;this.asset=asset;this.el.name.textContent=label;
    this.el.rate.value=String(audio.playbackRate);this.el.volume.value=String(audio.volume);
    this.rateLabel.textContent=audio.playbackRate.toFixed(2)+'×';this.volumeLabel.textContent=Math.round(audio.volume*100)+'%';
    this.el.state.textContent='即时试听 · 保持音高';this.tick();
  }
  adjust(){
    this.rateLabel.textContent=(+this.el.rate.value).toFixed(2)+'×';this.volumeLabel.textContent=Math.round(+this.el.volume.value*100)+'%';
    if(this.audio)applyPlayback(this.audio,+this.el.rate.value,+this.el.volume.value);
    this.el.state.textContent='即时生效 · 尚未保存';
  }
  tick(){
    const a=this.audio;if(!a)return;
    const duration=Number.isFinite(a.duration)?a.duration:0;this.el.seek.max=String(duration||1);
    if(document.activeElement!==this.el.seek)this.el.seek.value=String(a.currentTime||0);
    const fmt=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
    this.el.time.textContent=fmt(a.currentTime||0)+' / '+fmt(duration);
    if(this.tailLoop&&!a.paused&&duration>0&&a.currentTime>=duration-.04){a.currentTime=Math.max(0,duration-2.4);}
  }
  destroy(){clearInterval(this.timer);this.audio?.pause();this.audio=null;}
}
