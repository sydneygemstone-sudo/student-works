const http=require('http'), fs=require('fs'), path=require('path'), os=require('os'), crypto=require('crypto');
const PORT=Number(process.env.PORT)||8765, DT=1/30, W=1200, GROUND=470;
const moves={punch:{cd:.36,damage:9,range:100},kick:{cd:.7,damage:15,range:145},spin:{cd:2.5,damage:19,range:155},teleport:{cd:3},super:{cd:4,damage:23,range:380}};
const blank=()=>({left:false,right:false,jump:false,punch:false,kick:false,spin:false,teleport:false,super:false});
function beast(i){return {id:i,name:i?'EMBER':'FROST',x:i?930:270,y:GROUND,vx:0,vy:0,face:i?-1:1,hp:100,energy:100,charges:0,cd:{punch:0,kick:0,spin:0,teleport:0,super:0},action:'',anim:0,flash:0,respawn:0,invuln:0,input:blank(),lastInput:0,jumpWas:false};}
class Game {
 constructor(){this.mode='duel';this.status='lobby';this.reason='Choose a mode. Learn the controls. Then start together.';this.players=[beast(0),beast(1)];this.targets=[];this.effects=[];this.winner=null;this.tick=0;this.targetId=0;}
 reset(){this.players=[beast(0),beast(1)];this.effects=[];this.winner=null;this.targets=[];this.status='lobby';this.reason='Ready for a new round';if(this.mode==='crown')for(let i=0;i<5;i++)this.spawnTarget(i);}
 spawnTarget(i){this.targets.push({id:++this.targetId,x:145+i*225,y:GROUND,hp:28,max:28,respawn:0,flash:0});}
 effect(type,x,y,color){this.effects.push({type,x,y,color,life:.5});}
 attack(p,kind){let m=moves[kind];if(p.cd[kind]>0)return;p.cd[kind]=m.cd;p.action=kind;p.anim=.25;
  if(kind==='teleport'){this.effect('blink',p.x,p.y-50,p.id);p.x=Math.max(55,Math.min(W-55,p.x+p.face*230));this.effect('blink',p.x,p.y-50,p.id);return;}
  this.effect(kind,p.x+p.face*50,p.y-55,p.id);
  const damage=m.damage*(1+p.charges*.12);
  const hit=o=>Math.abs(o.y-p.y)<95&&Math.abs(o.x-p.x)<m.range&&(kind==='spin'||(o.x-p.x)*p.face>-20);
  let other=this.players[1-p.id];if(other.hp>0&&!other.invuln&&hit(other)){other.hp=Math.max(0,other.hp-damage);if(!other.hp&&this.mode==='crown')other.respawn=1.4;other.flash=.18;other.vx=p.face*220;this.effect('hit',other.x,other.y-55,p.id);}
  if(this.mode==='crown')for(let t of this.targets)if(t.hp>0&&hit(t)){t.hp=Math.max(0,t.hp-damage);t.flash=.2;if(!t.hp){p.charges++;t.respawn=1.5;this.effect('crown',t.x,t.y-65,p.id);}}
 }
 step(){this.tick++;if(this.status!=='playing')return;
  this.effects=this.effects.filter(e=>(e.life-=DT)>0);const aliveAtStart=this.players.map(p=>p.hp>0);
  for(let p of this.players){p.flash=Math.max(0,p.flash-DT);p.anim=Math.max(0,p.anim-DT);p.invuln=Math.max(0,p.invuln-DT);for(let k in p.cd)p.cd[k]=Math.max(0,p.cd[k]-DT);
   if(Date.now()-p.lastInput>700)p.input=blank();
   if(!aliveAtStart[p.id]){if(this.mode==='crown'){p.respawn-=DT;if(p.respawn<=0){p.hp=100;p.x=p.id?1030:170;p.y=GROUND;p.vy=0;p.energy=100;p.invuln=1.2;}}continue;}
   const a=p.input,dir=Number(a.right)-Number(a.left);if(dir)p.face=dir;
   p.x=Math.max(50,Math.min(W-50,p.x+(dir*265+p.vx)*DT));p.vx*=.78;
   if(a.jump&&!p.jumpWas&&p.y>=GROUND){p.vy=-460;p.action='jump';p.anim=.2;}
   if(a.jump&&p.energy>0&&p.y<GROUND){p.vy-=850*DT;p.energy=Math.max(0,p.energy-36*DT);}
   else p.energy=Math.min(100,p.energy+(p.y>=GROUND?33:9)*DT);
   p.jumpWas=a.jump;p.vy+=720*DT;p.vy=Math.max(-320,p.vy);p.y+=p.vy*DT;
   if(p.y<150){p.y=150;p.vy=Math.max(0,p.vy);}if(p.y>=GROUND){p.y=GROUND;p.vy=0;}
   for(let kind of Object.keys(moves))if(a[kind])this.attack(p,kind);
  }
  if(this.mode==='duel'){let dead=this.players.filter(p=>p.hp<=0);if(dead.length){this.status='ended';this.winner=dead.length===2?'DRAW':this.players.find(p=>p.hp>0).name;this.reason=this.winner==='DRAW'?'A mighty double knockout!':this.winner+' wins the duel!';}}
  else {for(let p of this.players)if(p.hp<=0&&p.respawn<=0)p.respawn=1.4;
   for(let t of this.targets){t.flash=Math.max(0,t.flash-DT);if(!t.hp&&(t.respawn-=DT)<=0){t.hp=28;t.id=++this.targetId;}}
   const kings=this.players.filter(p=>p.charges>=5);if(kings.length){this.status='ended';this.winner=kings.length===2?'DRAW':kings[0].name;this.reason=this.winner==='DRAW'?'Two mighty Beast Kings!':this.winner+' is the Beast King!';}}
 }
 snapshot(connected){return {mode:this.mode,status:this.status,reason:this.reason,winner:this.winner,tick:this.tick,players:this.players.map(({input,lastInput,jumpWas,...p})=>p),targets:this.targets,effects:this.effects,connected};}
}
const game=new Game(), sessions=[null,null];let urls=[];
const connected=()=>sessions.map(s=>!!s&&s.connected);
function pause(reason){if(game.status==='playing'){game.status='paused';game.reason=reason;}for(let p of game.players)p.input=blank();}
function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
function authenticate(token){return sessions.find(s=>s&&s.token===token);}
function broadcast(){const msg='data: '+JSON.stringify(game.snapshot(connected()))+'\n\n';for(let s of sessions)if(s&&s.stream&&!s.stream.destroyed)s.stream.write(msg);}
async function body(req){let data='';for await(const c of req){data+=c;if(data.length>4096)throw Error('Too large');}return JSON.parse(data||'{}');}
const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://local');
 if(u.pathname==='/health')return send(res,200,{ok:true,port:PORT,urls,players:connected(),status:game.status,mode:game.mode});
 if(u.pathname==='/events'){let s=authenticate(u.searchParams.get('token'));if(!s)return send(res,401,{error:'Join first'});if(s.stream)s.stream.end();res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});res.write(': connected\n\n');s.stream=res;s.connected=true;s.lastSeen=Date.now();req.on('close',()=>{if(s.stream===res){s.connected=false;s.stream=null;s.disconnectedAt=Date.now();pause('A beast disconnected. Rejoin, then resume.');broadcast();}});broadcast();return;}
 if(req.method==='POST'&&u.pathname.startsWith('/api/')){let b=await body(req);
  if(u.pathname==='/api/join'){let s=authenticate(b.token);if(!s){let slot=sessions.findIndex(v=>!v||(!v.connected&&Date.now()-(v.disconnectedAt||v.lastSeen)>15000));if(slot<0)return send(res,409,{error:'Both beasts are taken. Close a player or wait 15 seconds after a disconnect.'});s={token:crypto.randomBytes(24).toString('hex'),slot,connected:false,lastSeen:Date.now(),disconnectedAt:Date.now()};sessions[slot]=s;}return send(res,200,{token:s.token,slot:s.slot});}
  let s=authenticate(b.token);if(!s)return send(res,401,{error:'Session ended. Join again.'});s.lastSeen=Date.now();let p=game.players[s.slot];
  if(u.pathname==='/api/input'){if(!s.connected)return send(res,409,{error:'Reconnect first'});const input=b.input&&typeof b.input==='object'?b.input:{};for(let k in p.input)p.input[k]=input[k]===true;p.lastInput=Date.now();return send(res,200,{ok:true});}
  if(u.pathname==='/api/leave'){if(s.stream)s.stream.end();sessions[s.slot]=null;pause('A beast left. Join another player to continue.');broadcast();return send(res,200,{ok:true});}
  if(u.pathname==='/api/control'){const a=b.action;
   if(a==='pause')pause('Teacher pause - take your time.');
   else if(a==='mode'){if(game.status==='playing'||game.status==='paused')return send(res,409,{error:'Finish or reset the round before changing mode.'});if(!['duel','crown'].includes(b.mode))return send(res,400,{error:'Unknown mode'});game.mode=b.mode;game.reset();}
   else if(a==='rematch'){game.reset();}
   else if(a==='start'||a==='resume'){if(!connected().every(Boolean))return send(res,409,{error:'Join both beasts first.'});if(!['lobby','paused'].includes(game.status))return send(res,409,{error:'Choose rematch first.'});game.status='playing';game.reason='';for(let pp of game.players){pp.input=blank();pp.jumpWas=false;}}
   else return send(res,400,{error:'Unknown action'});broadcast();return send(res,200,{ok:true});}
 }
 const files={'/':'index.html','/client.js':'client.js','/style.css':'style.css'};if(files[u.pathname]){res.writeHead(200,{'Content-Type':u.pathname.endsWith('.js')?'text/javascript':u.pathname.endsWith('.css')?'text/css':'text/html','Cache-Control':'no-store'});return fs.createReadStream(path.join(__dirname,files[u.pathname])).pipe(res);}send(res,404,{error:'Not found'});
 }catch(e){if(!res.headersSent)send(res,400,{error:'Invalid request'});else res.end();}});
if(require.main===module){setInterval(()=>{for(let s of sessions)if(s&&s.connected&&Date.now()-s.lastSeen>3500){s.connected=false;if(s.stream)s.stream.end();s.disconnectedAt=Date.now();pause('Connection lost. Rejoin, then resume.');}game.step();broadcast();},1000/30);server.listen(PORT,'0.0.0.0',()=>{urls=['http://localhost:'+PORT,...Object.values(os.networkInterfaces()).flat().filter(v=>v.family==='IPv4'&&!v.internal).map(v=>'http://'+v.address+':'+PORT)];console.log('Beast Kings - room BEASTS\n'+urls.join('\n'));});}
module.exports={Game,moves,server};


