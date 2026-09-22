import {Game} from './engine.mjs';
if(new URLSearchParams(location.search).get('mode')!=='coop'){
const Native=window.WebSocket;
class SoloSocket extends EventTarget{
 static CONNECTING=0;static OPEN=1;static CLOSING=2;static CLOSED=3;
 constructor(){super();this.readyState=0;this.game=new Game();this.joined=false;this.role=null;this.bufferedAmount=0;this.protocol='';this.extensions='';this.url='local://solo';window.__soloEngine=this.game;
 setTimeout(()=>{this.readyState=1;this.fire('open',new Event('open'));},0);
 this.lastTick=performance.now();this.timer=setInterval(()=>{const now=performance.now();let remaining=Math.min(.25,Math.max(0,(now-this.lastTick)/1000));this.lastTick=now;if(this.readyState!==1||!this.joined)return;while(remaining>0.000001){const step=Math.min(remaining,1/30);this.game.tick(step);remaining-=step;}this.message({type:'state',...this.game.snapshot()});},1000/30);}
 fire(type,event){this.dispatchEvent(event);const handler=this['on'+type];if(typeof handler==='function')handler.call(this,event);}
 message(data){this.fire('message',new MessageEvent('message',{data:JSON.stringify(data)}));}
 send(raw){if(this.readyState!==1)throw new Error('Local solo engine is not open');const m=JSON.parse(raw);const g=this.game;
 if(m.type==='join'&&!this.joined){if(!g.join(m.role,m.name)){this.message({type:'error',message:'Choose a hero / 请选择角色'});return;}this.role=m.role;this.joined=true;this.message({type:'joined',role:m.role,room:'SOLO',host:true});return;}
 if(!this.joined)return;const p=g.players.find(p=>p.role===this.role);
 if(m.type==='input'){const number=v=>Number.isFinite(v)?Math.max(-1,Math.min(1,v)):0;p.input={x:number(m.x),z:number(m.z),attack:!!m.attack,skill:!!m.skill,interact:!!m.interact};if(m.skill&&g.state==='playing')g.attack(p,true);if(m.interact&&g.state==='treasure')g.tick(0);}
 if(m.type==='start')g.start();
 if(m.type==='pause'){if(g.state==='paused')g.state=this.resumeState||'playing';else if(['playing','treasure'].includes(g.state)){this.resumeState=g.state;g.state='paused';}}
 if(m.type==='restart'){g.reset();g.start();}}
 close(){if(this.readyState===3)return;clearInterval(this.timer);this.readyState=3;this.fire('close',new CloseEvent('close',{code:1000,wasClean:true}));}
}
Object.assign(SoloSocket.prototype,{CONNECTING:0,OPEN:1,CLOSING:2,CLOSED:3});window.WebSocket=SoloSocket;window.__networkSocket=Native;
const room=document.querySelector('#room');if(room){room.value='SOLO';room.readOnly=true;}
const note=document.querySelector('.join-note');if(note)note.textContent='单机模式：你 + 两名电脑队友。不需要房间、账号或联机服务器。 / Solo: you + two bot buddies. No room, account or game server.';
const join=document.querySelector('#join');if(join)join.textContent='开始单机 / PLAY SOLO';
}
