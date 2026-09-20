import * as THREE from './vendor/three.module.js';
import {t,apply,lang} from './i18n.js';

const $ = id => document.getElementById(id);
const REQUIRED = 8, LIMIT = 300, SPEED = 8.8, GRAVITY = 24, JUMP = 10.8;
// s is distance along the route; the rendered world uses z = -s.
const platforms = [
  {x:0,s:5,w:10,l:18,y:0}, {x:0,s:22,w:6.4,l:10,y:0},
  {x:-1.8,s:34,w:6,l:9,y:.3}, {x:1.8,s:46,w:6.4,l:10,y:.3},
  {x:1.8,s:58,w:5.6,l:8,y:0}, {x:-1.3,s:70,w:6,l:10,y:0},
  {x:-1.3,s:83,w:5.4,l:10,y:.4}, {x:1.5,s:95,w:6.4,l:9,y:.4},
  {x:0,s:107,w:6.2,l:9,y:0}, {x:-1.8,s:119,w:6,l:10,y:0},
  {x:0,s:132,w:6.4,l:10,y:0}, {x:0,s:146,w:10,l:14,y:0}
];
const obstacles = [
  {x:0,s:6,w:3.0,l:1,h:.9,y:0},
  {x:-2.6,s:31.5,w:3.0,l:1,h:.9,y:.3},
  {x:-2.2,s:67,w:3.4,l:1,h:.9,y:0},
  {x:1.3,s:104.5,w:3.0,l:1,h:.9,y:0},
  {x:-.7,s:128.5,w:3.4,l:1,h:.9,y:0}
];
const coinDefs = platforms.map((p,i)=>({x:p.x+(i===0?0:i%3===0?1:0),s:p.s+(i===0?5:0),y:p.y+1.1}));
let state='intro', time=LIMIT, count=0, muted=false, audioCtx, toastUntil=0, simTime=0, last=0, accumulator=0;
let p={x:0,s:2,y:0,vx:0,vs:0,vy:0,grounded:true,coyote:.16,jumpBuffer:0};
let enemy={s:-9,x:0}, collected=new Set(), keys=new Set(), touchKeys=new Map(), particles=[];
let renderer, scene, camera, player, portal, coins=[], skeletons=[], limbs=[], camTarget=new THREE.Vector3();
const QA = new URLSearchParams(location.search).has('qa');
let lastOutcome=null, toastKey=null, toastArgs={}, daylight=false;
const stickInput={id:null,x:0,y:0};
const particleGeo=new THREE.OctahedronGeometry(.07);
const materials={};
const mat=(color,emissive=0)=>{const k=color+':'+emissive;return materials[k]??=new THREE.MeshStandardMaterial({color,roughness:.84,metalness:.08,emissive,emissiveIntensity:emissive?.65:0})};
const boxGeo=new THREE.BoxGeometry(1,1,1);
function box(w,h,d,color,x,y,z,parent=scene,emissive=0){const m=new THREE.Mesh(boxGeo,mat(color,emissive));m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function toast(key,duration=2.1,args={}){toastKey=key;toastArgs=args;$('toast').textContent=t(key,args);$('toast').style.opacity=1;toastUntil=performance.now()+duration*1000;}

function sound(freq=500,duration=.1,type='sine',volume=.045){if(muted||!audioCtx)return;try{const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.setValueAtTime(freq,audioCtx.currentTime);o.frequency.exponentialRampToValueAtTime(freq*.7,audioCtx.currentTime+duration);g.gain.setValueAtTime(volume,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration);}catch{}}
function initAudio(){try{audioCtx??=new (window.AudioContext||window.webkitAudioContext)();audioCtx.resume();}catch{}}
function rig(skeleton=false){const g=new THREE.Group(),bone=skeleton?0xe1dbc6:0xc5fd71,legColor=skeleton?bone:0x253e4c;
  box(.57,.7,.35,skeleton?0x969b8b:0x78b6a4,0,1.04,0,g);
  box(.59,.55,.52,bone,0,1.67,0,g);
  box(.12,.14,.04,skeleton?0xff8558:0x15363d,-.16,1.69,-.279,g,skeleton?0xff4422:0);
  box(.12,.14,.04,skeleton?0xff8558:0x15363d,.16,1.69,-.279,g,skeleton?0xff4422:0);
  if(skeleton){for(let i=0;i<3;i++)box(.76,.07,.41,bone,0,.85+i*.18,0,g);box(.34,.1,.04,0x484d44,0,1.49,-.282,g);box(.18,.3,.2,bone,0,.59,0,g);}
  else{box(.67,.13,.59,0x182f3d,0,1.92,0,g);box(.46,.53,.27,0xe6a959,0,1.03,.29,g);box(.65,.09,.4,0xe9f4bf,0,.8,0,g);}
  const moving=[];for(let side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.19,.69,0);box(skeleton?.13:.23,.6,.22,legColor,0,-.3,0,leg);box(.27,.16,.38,skeleton?bone:0x132c3a,0,-.61,-.06,leg);g.add(leg);moving.push(leg);const arm=new THREE.Group();arm.position.set(side*.4,1.3,0);box(skeleton?.12:.22,.62,.21,bone,0,-.28,0,arm);g.add(arm);moving.push(arm);}g.userData.moving=moving;return g;
}
function routeX(s){for(let i=0;i<platforms.length-1;i++){const a=platforms[i],b=platforms[i+1];if(s>=a.s&&s<=b.s)return THREE.MathUtils.lerp(a.x,b.x,(s-a.s)/(b.s-a.s));}return 0;}
function setup(){
  scene=new THREE.Scene();scene.background=new THREE.Color(0x132633);scene.fog=new THREE.FogExp2(0x183442,.015);
  camera=new THREE.PerspectiveCamera(59,innerWidth/innerHeight,.1,260);
  renderer=new THREE.WebGLRenderer({canvas:$('world'),antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,matchMedia('(pointer:coarse)').matches?1.25:1.7));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=!matchMedia('(pointer:coarse)').matches;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.22;
  scene.add(new THREE.HemisphereLight(0xd7f8f2,0x1b2738,2.1));const sun=new THREE.DirectionalLight(0xffd8a3,3);sun.position.set(-15,35,15);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-25;sun.shadow.camera.right=25;sun.shadow.camera.top=35;sun.shadow.camera.bottom=-35;sun.shadow.camera.far=100;sun.shadow.bias=-.001;scene.add(sun);scene.add(sun.target);scene.userData.sun=sun;
  platforms.forEach((a,i)=>{
    box(a.w,1.25,a.l,0x354d50,a.x,a.y-.625,-a.s);
    box(a.w+.09,.16,a.l+.09,i%3===0?0x6e9076:0x66877a,a.x,a.y-.05,-a.s);
    box(a.w-.35,.05,.2,0xc5fd71,a.x,a.y+.04,-(a.s+a.l/2-.3),scene,0x769940);
    box(a.w-.35,.04,.11,0x87cdc4,a.x,a.y+.04,-(a.s-a.l/2+.4),scene,0x407e78);
    for(let side of [-1,1]){box(.13,.2,a.l-.8,0x365b59,a.x+side*(a.w/2-.1),a.y+.06,-a.s);for(let z of [-1,1]){box(.42,.6,.42,0x344e50,a.x+side*(a.w/2-.3),a.y+.28,-a.s+z*(a.l/2-.35));box(.3,.09,.3,0x6de8d8,a.x+side*(a.w/2-.3),a.y+.63,-a.s+z*(a.l/2-.35),scene,0x24a692);}}
    const rock=new THREE.Mesh(new THREE.ConeGeometry(a.w*.62,4.6,5),mat(0x253e48));rock.rotation.z=Math.PI;rock.position.set(a.x,a.y-3,-a.s);scene.add(rock);
    for(let j=0;j<3;j++)box(a.w*.6,.012,.045,0x4c6a65,a.x,a.y+.039,-a.s+(j-1)*2.3);
  });
  obstacles.forEach(a=>{box(a.w,a.h,a.l,0x674a3b,a.x,a.y+a.h/2,-a.s);box(a.w+.06,.16,a.l+.08,0xe9ad62,a.x,a.y+a.h,-a.s);for(let i=-1;i<=1;i++)box(.23,a.h+.05,a.l+.02,0xc7904f,a.x+i*.65,a.y+a.h/2,-a.s);});
  coins=coinDefs.map((a,i)=>{const g=new THREE.Group();const m=new THREE.Mesh(new THREE.OctahedronGeometry(.42),new THREE.MeshStandardMaterial({color:0x91fff0,emissive:0x18d3c1,emissiveIntensity:1.4,metalness:.3,roughness:.18}));m.scale.y=1.35;g.add(m);const ring=new THREE.Mesh(new THREE.TorusGeometry(.65,.025,5,24),mat(0x79e5d5,0x25a790));ring.rotation.x=Math.PI/2;ring.position.y=-.5;g.add(ring);g.position.set(a.x,a.y,-a.s);scene.add(g);g.userData.id=i;return g;});
  portal=new THREE.Group();portal.position.set(0,0,-148);scene.add(portal);for(let x of [-2,2]){box(.9,5,.9,0x3c5959,x,2.5,0,portal);box(1.2,.4,1.2,0x7fa68b,x,5,0,portal);box(.13,4,.12,0x7beee1,x,2.5,.48,portal,0x24b5a7);}box(5,1,1.2,0x4c7368,0,5.3,0,portal);const disk=new THREE.Mesh(new THREE.CircleGeometry(1.7,40),new THREE.MeshBasicMaterial({color:0x49dbcc,transparent:true,opacity:.24,side:THREE.DoubleSide}));disk.position.set(0,2.5,0);portal.add(disk);const ring=new THREE.Mesh(new THREE.TorusGeometry(1.7,.11,8,40),mat(0x8cffda,0x33dbab));ring.position.set(0,2.5,.03);portal.add(ring);portal.userData.ring=ring;portal.userData.disk=disk;
  // Claude prototype: cyan roadside beacons, adapted to Astra coordinates and shared materials.
  for(let s=0;s<160;s+=24){for(const side of [-1,1]){box(.28,7,.28,0x365b68,side*11,-1,-s);box(.65,.65,.65,0x83f5e2,side*11,2.6,-s,scene,0x28b8ae);}}
  // Fixed-seed scenery keeps screenshots and restarts consistent.
  let seed=17;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  for(let i=0;i<65;i++){const side=i%2?1:-1,x=side*(14+random()*52),s=random()*220-20,y=-9-random()*14;const r=2+random()*6;const rock=new THREE.Mesh(new THREE.IcosahedronGeometry(r,0),mat(i%2?0x244450:0x2e4c51));rock.scale.y=1.8;rock.position.set(x,y,-s);scene.add(rock);if(i%5===0){box(1.6,10,1.6,0x395a60,x,y+7,-s);box(3,.5,3,0x507376,x,y+12,-s);}}
  const moon=new THREE.Mesh(new THREE.SphereGeometry(9,24,16),new THREE.MeshBasicMaterial({color:0xa4c8af}));moon.position.set(-45,49,-185);scene.add(moon);
  const dustGeo=new THREE.BufferGeometry(),positions=[];for(let i=0;i<250;i++)positions.push((random()-.5)*110,random()*32-5,-random()*230);dustGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));scene.add(new THREE.Points(dustGeo,new THREE.PointsMaterial({color:0xa0efd1,size:.09,transparent:true,opacity:.65})));
  player=rig(false);scene.add(player);limbs=player.userData.moving;skeletons=[0,1,2].map(i=>{const sk=rig(true);scene.add(sk);return sk;});
  camera.position.set(9,8,13);camTarget.set(0,1,-15);camera.lookAt(camTarget);
  $('start').disabled=false;$('start').dataset.i18n='start';apply();hud();
  render(0);requestAnimationFrame(frame);
}
function reset(){p={x:0,s:2,y:0,vx:0,vs:0,vy:0,grounded:true,coyote:.16,jumpBuffer:0};enemy={s:-9,x:0};collected.clear();coins.forEach(c=>c.visible=true);particles.forEach(a=>scene.remove(a.mesh));particles=[];count=0;time=LIMIT;simTime=0;accumulator=0;keys.clear();touchKeys.clear();document.querySelectorAll('.active').forEach(b=>b.classList.remove('active'));state='playing';lastOutcome=null;clearInput();document.body.classList.add('playing');['intro','result','paused'].forEach(id=>$(id).classList.add('hidden'));camera.position.set(0,5.8,12);camTarget.set(0,1,-6);hud();toast('go',3.8);initAudio();}
function clearInput(){keys.clear();touchKeys.clear();p.jumpBuffer=0;stickInput.id=null;stickInput.x=0;stickInput.y=0;$('stick').style.transform='translate(0px,0px)';document.querySelectorAll('.active').forEach(b=>b.classList.remove('active'));}
function pause(){if(state!=='playing')return;state='paused';clearInput();$('paused').classList.remove('hidden');$('resume').focus();}
function resume(){if(state!=='paused')return;state='playing';last=performance.now();accumulator=0;$('paused').classList.add('hidden');}
function renderOutcome(){if(!lastOutcome)return;const {win,reason}=lastOutcome;const used=LIMIT-time;const stamp=Math.floor(used/60)+':'+String(Math.floor(used%60)).padStart(2,'0');$('result-tag').textContent=t(win?'winTag':'loseTag');$('result-title').textContent=t(win?'winTitle':reason+'Title');$('result-text').textContent=t(win?'winText':reason+'Text',{n:count,time:stamp});}
function end(win,reason){if(state!=='playing')return;state=win?'won':'lost';lastOutcome={win,reason:reason||'win'};clearInput();document.body.classList.remove('playing');$('result').classList.remove('hidden');renderOutcome();$('restart').focus();sound(win?880:130,win?.45:.6,'triangle',.06);try{localStorage.setItem('michaelLastRun',JSON.stringify({version:'1.1.0',outcome:state,reason:reason||'win',crystals:count,seconds:Math.round((LIMIT-time)*10)/10,recordedAt:new Date().toISOString()}));}catch{}}


function overlaps(x,s,a,r=.3){return Math.abs(x-a.x)<a.w/2+r&&Math.abs(s-a.s)<a.l/2+r;}
function blocked(x,s){return obstacles.some(a=>overlaps(x,s,a)&&p.y<a.y+a.h-.03&&p.y+1.7>a.y);}
function burst(a){for(let i=0;i<9;i++){const m=new THREE.Mesh(particleGeo,mat(0xacfff1,0x4addb7));m.position.copy(a.position);scene.add(m);particles.push({mesh:m,life:.6,v:new THREE.Vector3((Math.random()-.5)*4,1+Math.random()*3,(Math.random()-.5)*4)});}}
function step(dt){
  if(state!=='playing')return;simTime+=dt;time=Math.max(0,time-dt);if(time<=0){end(false,'time');return;}
  const input=k=>keys.has(k)||[...touchKeys.values()].includes(k);
  let dx=Number(input('KeyD')||input('ArrowRight'))-Number(input('KeyA')||input('ArrowLeft'))+stickInput.x;
  let ds=Number(input('KeyW')||input('ArrowUp'))-Number(input('KeyS')||input('ArrowDown'))-stickInput.y;const norm=Math.max(1,Math.hypot(dx,ds));dx/=norm;ds/=norm;
  const blend=1-Math.exp(-18*dt);p.vx=THREE.MathUtils.lerp(p.vx,dx*SPEED,blend);p.vs=THREE.MathUtils.lerp(p.vs,ds*SPEED,blend);
  if(p.grounded)p.coyote=.16;else p.coyote-=dt;p.jumpBuffer-=dt;
  if(p.jumpBuffer>0&&p.coyote>0){p.vy=JUMP;p.grounded=false;p.coyote=0;p.jumpBuffer=0;sound(240,.14,'triangle',.035);}
  const oldY=p.y;let x=p.x+p.vx*dt,s=p.s+p.vs*dt;
  if(!blocked(x,p.s))p.x=x;else p.vx=0;
  if(!blocked(p.x,s))p.s=s;else p.vs=0;
  p.vy-=GRAVITY*dt;p.y+=p.vy*dt;p.grounded=false;
  const supports=[...platforms.map(a=>({...a,top:a.y})),...obstacles.map(a=>({...a,top:a.y+a.h}))];
  if(p.vy<=0){for(const a of supports){if(Math.abs(p.x-a.x)<a.w/2+.12&&Math.abs(p.s-a.s)<a.l/2+.12&&oldY>=a.top-.07&&p.y<=a.top){p.y=a.top;p.vy=0;p.grounded=true;break;}}}
  // Claude-inspired landing buffer: honor a queued jump on the exact landing step.
  if(p.grounded&&p.jumpBuffer>0){p.vy=JUMP;p.grounded=false;p.coyote=0;p.jumpBuffer=0;sound(240,.14,'triangle',.035);}
  if(p.y<-6){end(false,'fall');return;}
  enemy.s+=dt*(simTime<2?2.8:Math.min(8.5,5.6+Math.max(0,p.s-enemy.s-6)*.55));enemy.x=routeX(enemy.s);
  if(enemy.s>=p.s-.7&&Math.abs(enemy.x-p.x)<1.8&&p.y<2.1){end(false,'caught');return;}
  coins.forEach((c,i)=>{const a=coinDefs[i];if(!collected.has(i)&&Math.hypot(p.x-a.x,p.s-a.s)<1.02&&Math.abs(p.y+.9-a.y)<1.5){collected.add(i);count++;c.visible=false;burst(c);sound(540+count*48,.13,'sine');if(count===REQUIRED){toast('unlocked',3);$('flash').style.opacity=.13;setTimeout(()=>$('flash').style.opacity=0,130);}else toast('got',1.1,{n:count});}});
  if(p.s>145.7&&Math.abs(p.x)<2.1&&p.y<2.5){if(count>=REQUIRED)end(true);else if(performance.now()>toastUntil)toast('locked',2,{n:REQUIRED-count});}
  particles=particles.filter(a=>{a.life-=dt;a.mesh.position.addScaledVector(a.v,dt);a.v.y-=dt*5;a.mesh.scale.setScalar(Math.max(0,a.life/.6));if(a.life<=0){scene.remove(a.mesh);return false;}return true;});hud();
}
function hud(){ $('count').textContent=count;$('timer').textContent=`${Math.floor(Math.ceil(time)/60)}:${String(Math.ceil(time)%60).padStart(2,'0')}`;$('timer').style.color=time<30?'#ffa079':'';$('progress-fill').style.width=Math.max(0,Math.min(100,p.s/146*100))+'%';const gap=Math.max(0,p.s-enemy.s);$('danger-fill').style.width=Math.min(100,gap/20*100)+'%';$('danger-fill').style.background=gap<5?'#ff926c':'#c5fd71';$('danger-label').textContent=t(gap<5?'danger0':gap<10?'danger1':'danger2');$('zone').textContent=t(p.s<50?'zone1':p.s<100?'zone2':'zone3');}


function render(t){
  player.position.set(p.x,p.y,-p.s);const speed=Math.hypot(p.vx,p.vs);if(speed>.2)player.rotation.y=Math.atan2(-p.vx,p.vs);limbs.forEach((l,i)=>{l.rotation.x=p.grounded?Math.sin(simTime*13+(i<2?0:Math.PI))*Math.min(.7,speed*.09)*(i%2?-1:1):i%2?-.8:.35;});
  skeletons.forEach((sk,i)=>{const s=enemy.s-i*1.9,x=routeX(s)+(i-1)*.9;let ground=platforms.find(a=>Math.abs(s-a.s)<a.l/2);sk.position.set(x,(ground?.y||0)+Math.abs(Math.sin(t*6+i))*.17,-s);sk.rotation.y=0;sk.userData.moving.forEach((l,j)=>l.rotation.x=Math.sin(t*11+i+(j<2?0:Math.PI))*.7*(j%2?-1:1));});
  coins.forEach((c,i)=>{c.rotation.y=t*1.8+i;c.position.y=coinDefs[i].y+Math.sin(t*2+i)*.13;});portal.userData.ring.rotation.z=t*.3;portal.userData.disk.material.opacity=count>=REQUIRED?.42+Math.sin(t*3)*.12:.13;
  if(state!=='intro'){const desired=new THREE.Vector3(p.x*.55,p.y< -1?5.8:5.8+p.y*.3,-p.s+13.0);camera.position.lerp(desired,.09);camTarget.lerp(new THREE.Vector3(p.x*.7,1.05,-p.s-6.5),.1);const sun=scene.userData.sun;sun.position.set(p.x-15,35,-p.s+15);sun.target.position.set(p.x,0,-p.s-10);}camera.lookAt(camTarget);renderer.render(scene,camera);
}
function frame(now){const elapsed=Math.min((now-(last||now))/1000,.1);last=now;if(state==='playing'){accumulator+=elapsed;while(accumulator>=1/120){step(1/120);accumulator-=1/120;}}if(now>toastUntil)$('toast').style.opacity=0;render(now/1000);requestAnimationFrame(frame);}
$('start').onclick=reset;$('restart').onclick=reset;$('resume').onclick=resume;$('pause').onclick=()=>state==='paused'?resume():pause();$('sound').onclick=()=>{muted=!muted;$('sound').textContent=muted?'×♪':'♪';$('sound').dataset.i18nAria=muted?'soundOn':'soundOff';$('sound').setAttribute('aria-label',t(muted?'soundOn':'soundOff'));if(!muted)initAudio();};
window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='Escape'){if(!e.repeat)state==='paused'?resume():pause();return;}if((e.code==='Enter'||e.code==='Space')&&state==='intro'){reset();return;}if(e.code==='KeyR'&&['won','lost'].includes(state)){reset();return;}if(state!=='playing')return;keys.add(e.code);if(e.code==='Space'&&!e.repeat)p.jumpBuffer=.20;});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
document.querySelectorAll('[data-key]').forEach(button=>{button.addEventListener('pointerdown',e=>{e.preventDefault();if(state!=='playing')return;button.setPointerCapture(e.pointerId);touchKeys.set(e.pointerId,button.dataset.key);button.classList.add('active');});for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,e=>{touchKeys.delete(e.pointerId);button.classList.remove('active');});});
$('jump').addEventListener('pointerdown',e=>{e.preventDefault();if(state==='playing'){p.jumpBuffer=.20;$('jump').setPointerCapture(e.pointerId);$('jump').classList.add('active');}});for(const type of ['pointerup','pointercancel','lostpointercapture'])$('jump').addEventListener(type,()=>{if(type==='pointercancel')p.jumpBuffer=0;$('jump').classList.remove('active');});
window.addEventListener('resize',()=>{if(!renderer)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
try{setup();}catch(error){console.error(error);$('fatal').style.display='block';$('fatal-message').textContent=t('fatalText');}
// Explicit QA mode only; normal play exposes no state mutation controls.
if(QA)window.__obby={get:()=>({state,time,count,p:{...p},enemy:{...enemy},collected:[...collected]}),start:reset,step:n=>{for(let i=0;i<n;i++)step(1/120)},set:values=>{if(values.p)Object.assign(p,values.p);if(values.enemy)Object.assign(enemy,values.enemy);if(values.time!==undefined)time=values.time;},platforms,coinDefs,obstacles,press:code=>keys.add(code),release:code=>keys.delete(code),jump:()=>p.jumpBuffer=.20,pause,resume};

const stick=$('joystick');
function moveStick(e){if(stickInput.id!==e.pointerId)return;const r=stick.getBoundingClientRect(),radius=r.width*.33;let x=(e.clientX-r.left-r.width/2)/radius,y=(e.clientY-r.top-r.height/2)/radius;const len=Math.max(1,Math.hypot(x,y));x/=len;y/=len;stickInput.x=Math.abs(x)<.08?0:x;stickInput.y=Math.abs(y)<.08?0:y;$('stick').style.transform=`translate(${x*radius}px,${y*radius}px)`;}
stick.addEventListener('pointerdown',e=>{e.preventDefault();if(state!=='playing'||stickInput.id!==null)return;stickInput.id=e.pointerId;stick.setPointerCapture(e.pointerId);moveStick(e);});
stick.addEventListener('pointermove',e=>{if(stickInput.id===e.pointerId){e.preventDefault();moveStick(e);}});
for(const type of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(type,e=>{if(e.pointerId===stickInput.id){stickInput.id=null;stickInput.x=0;stickInput.y=0;$('stick').style.transform='translate(0px,0px)';}});
$('lighting').onclick=()=>{daylight=!daylight;scene.background.setHex(daylight?0x87ceeb:0x132633);scene.fog.color.setHex(daylight?0x87ceeb:0x183442);$('lighting').textContent=daylight?'☾':'☀';$('lighting').dataset.i18nAria=daylight?'night':'day';$('lighting').dataset.i18nTitle=daylight?'night':'day';apply();};
window.addEventListener('languagechange',()=>{if(renderer)hud();if(lastOutcome)renderOutcome();if(toastKey)$('toast').textContent=t(toastKey,toastArgs);});
window.addEventListener('orientationchange',pause);
$('world').addEventListener('webglcontextlost',e=>{e.preventDefault();pause();$('fatal').style.display='block';$('fatal-message').textContent=t('fatalText');});
if(QA){window.__obby.input=()=>({stick:{...stickInput},keys:[...keys],touch:[...touchKeys]});window.__obby.config={speed:SPEED,required:REQUIRED,limit:LIMIT,coyote:.16,jumpBuffer:.20,enemySpeedCap:8.5};}
