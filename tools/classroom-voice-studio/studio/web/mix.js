/** Four independent tracks with epoch cancellation and voice ducking. */
export class SceneMixer {
  constructor({ audioFactory = () => new Audio(), onDuck = () => {}, onStatus = () => {} } = {}) {
    this.epoch=0;this.onDuck=onDuck;this.onStatus=onStatus;this.muted=false;
    this.levels={voice:.9,animals:.32,environment:.2,music:.12,duck:.28};
    this.tracks={};this.trackGains={};
    for(const bus of ['voice','animals','environment','music']){
      const a=audioFactory();a.preload='auto';this.tracks[bus]=a;this.trackGains[bus]=1;
    }
    const voice=this.tracks.voice;
    for(const event of ['playing','pause','ended','error','waiting'])voice.addEventListener(event,()=>this.apply());
  }
  configure(levels){Object.assign(this.levels,levels);this.apply();}
  apply(){
    const voice=this.tracks.voice;
    const talking=!this.muted&&!voice.paused&&!voice.ended&&this.voiceActive;
    const duck=talking?this.levels.duck:1;
    for(const [bus,a] of Object.entries(this.tracks)){
      a.volume=this.muted?0:Math.max(0,Math.min(1,this.levels[bus]*this.trackGains[bus]*(bus==='voice'?1:duck)));
    }
    this.onDuck(duck,this.levels,this.muted);
  }
  stop(){
    this.epoch++;this.voiceActive=false;
    for(const a of Object.values(this.tracks)){a.pause();try{a.currentTime=0;}catch{}a.removeAttribute('src');a.load();}
    this.apply();this.onStatus('stopped');
  }
  async play(scene){
    this.stop();const epoch=this.epoch;const promises=[];let blocked=false;
    for(const [bus,a] of Object.entries(this.tracks)){
      const track=scene[bus];if(!track?.url)continue;
      a.src=track.url;a.loop=!!track.loop;
      a.preservesPitch=true;
      if('webkitPreservesPitch' in a)a.webkitPreservesPitch=true;
      a.playbackRate=track.playbackRate??1;
      this.trackGains[bus]=track.volume??1;
      if(bus==='voice')this.voiceActive=true;
      promises.push(Promise.resolve(a.play()).then(()=>{
        // A delayed promise from an old scene must not stop a newer scene.
        if(epoch!==this.epoch)return;
        this.apply();
      }).catch(()=>{
        if(epoch===this.epoch){blocked=true;if(bus==='voice')this.voiceActive=false;this.apply();this.onStatus('tap-to-play');}
      }));
    }
    this.apply();await Promise.all(promises);
    if(epoch===this.epoch&&!blocked)this.onStatus('playing');
  }
  setMuted(muted){this.muted=!!muted;this.apply();}
  destroy(){this.stop();this.onDuck=()=>{};this.onStatus=()=>{};}
}
