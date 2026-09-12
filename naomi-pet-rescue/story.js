/* Naomi's story theatre. Original game rules remain in game-core.js. */
(() => {
  'use strict';
  const scenes = {
    party: {title:'藏好了吗？派对开始啦！',text:'花园里正在开派对。小动物们吃过点心，跑到树后、花丛里，玩起了捉迷藏。',label:'花园派对',x:0,y:0,mood:'sunny',seconds:11,alt:'阳光下，小动物们在有彩旗和点心的花园里开心地玩捉迷藏。'},
    storm: {title:'轰隆！雨云追来了……',text:'忽然，天空黑了下来，风把彩旗吹得呼啦啦响。小伙伴们还散落在花园里：“我们害怕，谁来接我们回家？”',label:'突如其来的暴风雨',x:100,y:0,mood:'storm',seconds:15,alt:'黑色雨云和远处的闪电笼罩花园，分散在花丛里的小动物担心地等待帮助。'},
    rescue: {title:'别怕，我们来接你们！',text:'小熊和小兔牵起手：“一个也不能落下！”赶在暴风雨前，把八位小伙伴都送回中间的小屋吧。',label:'小小救援队，出发',x:0,y:100,mood:'brave',seconds:13,alt:'小熊抱着小鸡，小兔伸手迎接小猫，两位救援伙伴勇敢地走上花园小路。'},
    feast: {title:'这一桌好吃的，送给小英雄！',text:'八位小伙伴都到家了！大家端来蛋糕、水果和热汤：“谢谢小熊和小兔！”窗外下着雨，屋里暖暖的。我们的派对，终于又团圆啦！',label:'大家都平安，派对继续',x:100,y:100,mood:'celebrate',seconds:18,alt:'八位小伙伴和小熊小兔在温暖的小屋中团聚，大家端出蛋糕、水果和热汤感谢救援英雄。'}
  };
  const root = document.createElement('div');
  root.className='story-shell';root.hidden=true;root.id='storyTheatre';
  root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','storyTitle');
  root.innerHTML=`<article class="story-book"><header class="story-top"><span class="story-brand">NAOMI · 小动物回家</span><span class="story-chapter" id="storyChapter"></span></header><figure class="story-picture" id="storyPicture"><div class="story-art" id="storyArt" role="img"></div><div class="story-weather" aria-hidden="true"></div><span class="story-scene-mark" id="storyLabel"></span><span class="story-ornament" aria-hidden="true">✦</span></figure><div class="story-copy" aria-live="polite" aria-atomic="true"><h2 id="storyTitle"></h2><p id="storyText"></p></div><div class="story-progress" id="storyProgress" aria-hidden="true"></div><p class="story-sound-note" id="storySoundNote" role="status"></p><footer class="story-controls"><button id="storyPause" type="button">暂停演出</button><button id="storySound" type="button" aria-pressed="true">声音已开启</button><label class="story-volume">音量 <input id="storyVolume" aria-label="演出音量" type="range" min="0" max="100" value="25"></label><button id="storySkip" type="button" class="story-skip">跳过故事</button><button id="storyNext" type="button" class="story-next">下一幕 →</button></footer></article>`;
  document.body.append(root);
  const $=id=>document.getElementById(id);
  const voice=new Audio();voice.preload='auto';voice.id='storyNarration';voice.hidden=true;root.append(voice);
  let active=false,paused=false,muted=false,volume=.25,sequence=[],index=0,elapsed=0,lastTick=0,frame=0,onDone=null,previousFocus=null,inertStates=[],run=0;
  let ctx=null,master=null,musicBus=null,rainBus=null,musicClock=null,noteIndex=0,currentMood='sunny',sceneDuration=0,thunderSource=null;
  const image=new Image();image.src='assets/story/garden-story.png';
  function syncSound(){voice.volume=muted?0:Math.min(1,volume*2.4);if(master&&ctx)master.gain.setTargetAtTime(muted?0:volume,ctx.currentTime,.05);$('storySound').textContent=muted?'声音已关闭':'声音已开启';$('storySound').setAttribute('aria-pressed',String(!muted));$('storyVolume').value=String(Math.round(volume*100));}
  function note(freq,delay,length,strength=.13){if(!ctx||ctx.state!=='running')return;const oscillator=ctx.createOscillator(),gain=ctx.createGain();oscillator.type='sine';oscillator.frequency.value=freq;const t=ctx.currentTime+delay;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(strength,t+.025);gain.gain.exponentialRampToValueAtTime(.001,t+length);oscillator.connect(gain).connect(musicBus);oscillator.start(t);oscillator.stop(t+length+.05);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};}
  function initAudio(){
    if(ctx){ctx.resume().catch(()=>{});return;}
    const AudioEngine=window.AudioContext||window.webkitAudioContext;if(!AudioEngine)return;
    try{ctx=new AudioEngine();master=ctx.createGain();master.connect(ctx.destination);musicBus=ctx.createGain();musicBus.gain.value=.55;musicBus.connect(master);rainBus=ctx.createGain();rainBus.gain.value=0;rainBus.connect(master);
      const buffer=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate),data=buffer.getChannelData(0);let sample=0;for(let i=0;i<data.length;i++){sample=(sample+(Math.random()*2-1)*.025)/1.025;data[i]=sample*2;}
      const rain=ctx.createBufferSource(),filter=ctx.createBiquadFilter();rain.buffer=buffer;rain.loop=true;filter.type='lowpass';filter.frequency.value=1100;rain.connect(filter).connect(rainBus);rain.start();ctx.resume().catch(()=>{});syncSound();
    }catch{ctx=null;}
  }
  function stopThunder(){if(thunderSource){try{thunderSource.stop();}catch{}thunderSource=null;}}
  function setMood(mood){currentMood=mood;noteIndex=0;stopThunder();if(ctx&&rainBus){rainBus.gain.setTargetAtTime(mood==='storm'?.85:mood==='brave'?.3:0,ctx.currentTime,.7);if(mood==='storm'){const buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/data.length*3);const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=160;gain.gain.setValueAtTime(0,ctx.currentTime);gain.gain.linearRampToValueAtTime(.35,ctx.currentTime+.2);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+2);source.connect(filter).connect(gain).connect(master);source.start();source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};thunderSource=source;}}}
  function startMusic(){clearInterval(musicClock);musicClock=setInterval(()=>{if(!active||paused)return;const melodies={sunny:[523.25,659.25,783.99,659.25,587.33,659.25,523.25,0],storm:[220,0,261.63,0,196,0,220,0],brave:[392,440,523.25,0,493.88,440,392,0],celebrate:[523.25,659.25,783.99,1046.5,880,783.99,659.25,523.25]};const melody=melodies[currentMood],freq=melody[noteIndex%melody.length];if(freq)note(freq,0,.85,currentMood==='storm'?.1:.13);if(noteIndex%4===0)note(currentMood==='storm'?110:130.81,0,1.7,.1);noteIndex++;},440);}
  function playVoice(){if(!active||paused)return;const thisRun=run;voice.play().catch(()=>{if(active&&run===thisRun){$('storySoundNote').textContent='可继续看字幕；点“声音已开启”两次，可重试声音。';}});}
  function displayScene(){
    const key=sequence[index],scene=scenes[key];run++;voice.pause();voice.src=`assets/story/${key}-indextts25.wav`;voice.load();elapsed=0;sceneDuration=scene.seconds;lastTick=performance.now();
    $('storyTitle').textContent=scene.title;$('storyText').textContent=scene.text;$('storyLabel').textContent=scene.label;$('storyChapter').textContent=sequence.length===1?'胜利 · 团圆宴会':`故事 ${index+1} / ${sequence.length}`;
    $('storyArt').style.setProperty('--frame-x',scene.x+'%');$('storyArt').style.setProperty('--frame-y',scene.y+'%');$('storyArt').setAttribute('aria-label',scene.alt);$('storyPicture').dataset.mood=scene.mood;
    $('storyArt').style.animation='none';void $('storyArt').offsetWidth;$('storyArt').style.animation='';
    $('storyNext').textContent=index<sequence.length-1?'下一幕 →':sequence.length===1?'收下感谢 ♥':'出发救援 →';
    $('storySkip').textContent=sequence.length===1?'回到胜利页':'跳过故事';$('storySoundNote').textContent='';
    $('storyProgress').innerHTML=sequence.map((_,i)=>`<span><i style="--progress:${i<index?100:0}%"></i></span>`).join('');
    setMood(scene.mood);syncSound();playVoice();
  }
  voice.addEventListener('loadedmetadata',()=>{if(active&&Number.isFinite(voice.duration))sceneDuration=Math.max(scenes[sequence[index]].seconds,voice.duration+1.3);});
  voice.addEventListener('error',()=>{if(active)$('storySoundNote').textContent='这段旁白暂时无法播放，可以继续看字幕。';});
  function next(){if(!active)return;if(index<sequence.length-1){index++;displayScene();}else finish();}
  function tick(now){if(!active)return;if(!paused){elapsed+=Math.max(0,(now-lastTick)/1000);const bar=$('storyProgress').children[index]?.firstElementChild;if(bar)bar.style.setProperty('--progress',Math.min(100,elapsed/sceneDuration*100)+'%');if(elapsed>=sceneDuration)next();}lastTick=now;if(active)frame=requestAnimationFrame(tick);}
  function setPaused(value){paused=value;root.classList.toggle('story-paused',paused);$('storyPause').textContent=paused?'继续演出':'暂停演出';$('storyPause').setAttribute('aria-pressed',String(paused));if(paused){voice.pause();if(ctx)ctx.suspend().catch(()=>{});}else{lastTick=performance.now();if(ctx)ctx.resume().catch(()=>{});playVoice();}}
  function finish(){if(!active)return;active=false;run++;cancelAnimationFrame(frame);clearInterval(musicClock);stopThunder();voice.pause();voice.removeAttribute('src');voice.load();if(ctx)ctx.suspend().catch(()=>{});root.hidden=true;inertStates.forEach(([el,was])=>{el.inert=was;});document.body.style.overflow=oldOverflow;const done=onDone;onDone=null;if(previousFocus?.isConnected)previousFocus.focus();if(done)done();}
  let oldOverflow='';
  function play(kind,complete){if(active)return;sequence=kind==='ending'?['feast']:['party','storm','rescue'];index=0;active=true;paused=false;onDone=complete||null;previousFocus=document.activeElement;oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';inertStates=Array.from(document.body.children).filter(el=>el!==root&&!['SCRIPT','LINK','STYLE'].includes(el.tagName)).map(el=>[el,el.inert]);inertStates.forEach(([el])=>{el.inert=true;});root.hidden=false;root.classList.remove('story-paused');$('storyPause').textContent='暂停演出';$('storyPause').setAttribute('aria-pressed','false');initAudio();displayScene();startMusic();$('storyPause').focus();cancelAnimationFrame(frame);frame=requestAnimationFrame(tick);}
  $('storyPause').onclick=()=>setPaused(!paused);$('storyNext').onclick=next;$('storySkip').onclick=finish;
  $('storySound').onclick=()=>{muted=!muted;syncSound();if(!muted&&!paused){initAudio();playVoice();}};
  $('storyVolume').oninput=e=>{volume=Number(e.target.value)/100;muted=volume===0;syncSound();};
  root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();setPaused(!paused);}if(e.key==='Tab'){const items=Array.from(root.querySelectorAll('button,input')).filter(el=>!el.disabled);const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}e.stopPropagation();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&active&&!paused)setPaused(true);});
  window.addEventListener('pagehide',()=>{if(active)finish();});
  window.NaomiStory=Object.freeze({play,isActive:()=>active});
})();
