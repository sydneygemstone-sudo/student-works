'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto');
const {WebSocketServer,WebSocket}=require('ws');const Engine=require('./shared.js');
function createServer(options={}){
const playUrl=String(options.playUrl??process.env.PLAY_URL??'').slice(0,500);
const port=Number(options.port??process.env.PORT??8765),slots=[null,null,null],spectators=new Set();let game=Engine.createGame({players:[]}),mode='duel',arena='moon',lastBroadcast=0,simTimer=null,urls=[],lastNs=process.hrtime.bigint(),accumulator=0;
const connected=()=>slots.filter(s=>s&&s.ws&&s.ws.readyState===WebSocket.OPEN);
const send=(ws,msg)=>{if(ws&&ws.readyState===WebSocket.OPEN&&ws.bufferedAmount<65536)ws.send(JSON.stringify(msg));};
const error=(ws,message)=>send(ws,{type:'error',message});
const profiles=()=>slots.filter(Boolean).map(s=>({id:s.id,name:s.profile.name,character:s.profile.character,profile:s.profile}));
function newRound(){game=Engine.createGame({mode,arena,players:profiles(),roundId:crypto.randomUUID()});for(const s of slots)if(s){s.input={};}broadcast();}
function state(){const st=Engine.snapshot(game);st.serverTime=Date.now();st.ackSeq={};st.connectedIds=connected().map(s=>s.id);st.slots=slots.map((s,i)=>s?{slot:i,id:s.id,name:s.profile.name,character:s.profile.character,connected:!!s.ws&&s.ws.readyState===WebSocket.OPEN}:null);for(const s of slots)if(s)st.ackSeq[s.id]=s.ackSeq;return st;}
function broadcast(){const msg={type:'state',state:state()};for(const s of connected())send(s.ws,msg);for(const ws of spectators)send(ws,msg);}
function pause(reason){if(game.status==='playing'){game.status='paused';game.reason=reason;}for(const s of slots)if(s)s.input={};}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{let u;try{u=new URL(req.url,'http://localhost');}catch{res.writeHead(400);return res.end('Invalid URL');}if(u.pathname==='/health'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify({ok:true,build:'astra-evolved',port:server.address()?.port||port,urls,playUrl,status:game.status,mode:game.mode,arena:game.arena,players:connected().length,slots:state().slots}));}
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end();}let decoded;try{decoded=decodeURIComponent(u.pathname);}catch{res.writeHead(400);return res.end();}const filename=decoded==='/'?'index.html':decoded.slice(1);const full=path.resolve(__dirname,filename);const publicExtension=/\.(html|js|css|webmanifest|svg|png|jpe?g|webp|gif|ico|woff2?|ttf|mp3|ogg|wav)$/i.test(filename);const privatePath=/(^|[\\/])(data|profiles?)([.\\/]|$)/i.test(filename)||/\.(pem|key|pfx|p12|crt|env)$/i.test(filename);if(!publicExtension||privatePath||!full.startsWith(path.resolve(__dirname)+path.sep)||filename.split(/[\\/]/).some(v=>v.startsWith('.'))||/(^|[\\/])(server[^/]*|package[^/]*|node_modules|.*\.log)([\\/]|$)/i.test(filename)){res.writeHead(404);return res.end();}
 fs.stat(full,(err,stat)=>{if(err||!stat.isFile()){res.writeHead(404);return res.end('Not found');}res.writeHead(200,{'Content-Type':mime[path.extname(full)]||'application/octet-stream','Cache-Control':'no-cache','Service-Worker-Allowed':'/','X-Content-Type-Options':'nosniff'});if(req.method==='HEAD')return res.end();fs.createReadStream(full).on('error',()=>res.destroy()).pipe(res);});});
const wss=new WebSocketServer({server,maxPayload:8192,perMessageDeflate:false});
wss.on('connection',(ws)=>{ws._socket.setNoDelay(true);ws.isAlive=true;ws.session=null;ws.spectator=false;ws.count=0;ws.windowStart=Date.now();const helloTimer=setTimeout(()=>{if(!ws.session&&!ws.spectator)ws.close(1008,'Send hello first');},10000);ws.on('pong',()=>ws.isAlive=true);
 ws.on('message',raw=>{const now=Date.now();if(now-ws.windowStart>=1000){ws.windowStart=now;ws.count=0;}if(++ws.count>240){error(ws,'Too many messages');ws.close(1008,'Rate limit');return;}let msg;try{msg=JSON.parse(raw.toString());}catch{error(ws,'Invalid JSON');return;}if(!msg||typeof msg!=='object'||typeof msg.type!=='string'){error(ws,'Invalid message');return;}
  if(msg.type==='ping'){send(ws,{type:'pong',t:typeof msg.t==='number'?msg.t:null,serverTime:now});return;}
  if(msg.type==='hello'){if(ws.session||ws.spectator){error(ws,'Already joined');return;}const profile=Engine.normalizeProfile(msg.profile);let slot=slots.findIndex(s=>s&&s.id===profile.id),session=slot>=0?slots[slot]:null;
   if(session&&session.ws&&session.ws.readyState===WebSocket.OPEN){error(ws,'This profile is already playing in another tab. Close it before joining here.');ws.close(1008,'Profile already connected');return;}
   if(!session){slot=slots.findIndex(s=>!s||(!s.ws&&now-s.disconnectedAt>15000));if(slot<0){ws.spectator=true;spectators.add(ws);clearTimeout(helloTimer);send(ws,{type:'welcome',id:null,slot:null,spectator:true});error(ws,'Three beasts are playing. You are watching; reconnect when a slot is free.');send(ws,{type:'state',state:state()});return;}
    session={id:profile.id,profile,slot,ws:null,input:{},ackSeq:-1,lastInput:0,disconnectedAt:0};slots[slot]=session;if(game.status!=='lobby'){pause('A new beast joined. Reset to begin a fresh round.');}else newRound();
   }
   session.ws=ws;session.disconnectedAt=0;session.input={};session.ackSeq=-1;session.lastInput=now;ws.session=session;clearTimeout(helloTimer);send(ws,{type:'welcome',id:session.id,slot:session.slot,spectator:false});broadcast();return;
  }
  if(ws.spectator){if(msg.type!=='input')error(ws,'Spectators cannot change the round.');return;}const s=ws.session;if(!s){error(ws,'Join with hello first');return;}
  if(msg.type==='input'){if(!Number.isSafeInteger(msg.seq)||msg.seq<0||msg.seq>2147483647){error(ws,'Input sequence must be a bounded integer');return;}if(msg.seq<=s.ackSeq)return;s.ackSeq=msg.seq;s.input=Engine.inputOf(msg.input);s.lastInput=now;return;}
  if(msg.type==='configure'){if(game.status!=='lobby'){error(ws,'Reset to the lobby before changing equipment, arena, or mode.');return;}if(msg.mode!=null&&!['duel','crown'].includes(msg.mode)){error(ws,'Online modes are duel and crown.');return;}if(msg.arena!=null&&!Object.prototype.hasOwnProperty.call(Engine.ARENAS,msg.arena)){error(ws,'Unknown arena');return;}if(msg.profile){s.profile=Engine.normalizeProfile({...msg.profile,id:s.id});}if(msg.mode)mode=msg.mode;if(msg.arena)arena=msg.arena;newRound();return;}
  if(msg.type==='control'){const action=msg.action;
   if(action==='pause'){pause('Teacher pause. Take your time.');}
   else if(action==='reset'){if(msg.mode!=null&&!['duel','crown'].includes(msg.mode)){error(ws,'Unknown online mode');return;}if(msg.mode)mode=msg.mode;for(let i=0;i<slots.length;i++)if(slots[i]&&!slots[i].ws&&now-slots[i].disconnectedAt>15000)slots[i]=null;newRound();}
   else if(action==='start'||action==='resume'){if(!['lobby','paused'].includes(game.status)){error(ws,'Reset before starting another round');return;}const live=connected();if(live.length<2){error(ws,'Connect at least two beasts to start.');return;}if(game.status==='paused'&&(game.players.length!==live.length||game.players.some(p=>!live.some(s=>s.id===p.id)))){error(ws,'The player lineup changed. Rejoin the missing beast or reset for a new round.');return;}if(game.status==='lobby'){game=Engine.createGame({mode,arena,players:live.map(s=>({id:s.id,name:s.profile.name,character:s.profile.character,profile:s.profile})),roundId:crypto.randomUUID()});}game.status='playing';game.reason='';for(const p of game.players)p.jumpWas=false;for(const item of slots)if(item)item.input={};}
   else {error(ws,'Unknown control action');return;}broadcast();return;
  }error(ws,'Unknown message type');
 });
 ws.on('close',()=>{clearTimeout(helloTimer);spectators.delete(ws);const s=ws.session;if(s&&s.ws===ws){s.ws=null;s.input={};s.disconnectedAt=Date.now();pause(s.profile.name+' disconnected. Rejoin, then resume.');broadcast();}});ws.on('error',()=>{});
});
const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.isAlive){ws.terminate();continue;}ws.isAlive=false;ws.ping();}},3000);heartbeat.unref();
function tick(){const nowNs=process.hrtime.bigint();accumulator+=Math.min(.1,Number(nowNs-lastNs)/1e9);lastNs=nowNs;while(accumulator>=1/60){const inputs={};for(const s of slots)if(s){if(Date.now()-s.lastInput>700)s.input={};inputs[s.id]=s.input;}Engine.step(game,inputs,1/60);accumulator-=1/60;}if(Date.now()-lastBroadcast>=50){lastBroadcast=Date.now();broadcast();}}
function listen(){return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'0.0.0.0',()=>{const actual=server.address().port;urls=['http://localhost:'+actual,...Object.values(os.networkInterfaces()).flat().filter(v=>v.family==='IPv4'&&!v.internal).sort((a,b)=>Number(b.address.startsWith('192.168.'))-Number(a.address.startsWith('192.168.'))).map(v=>'http://'+v.address+':'+actual)];lastNs=process.hrtime.bigint();simTimer=setInterval(tick,8);console.log('Beast Kings Evolved\n'+urls.join('\n'));resolve(server);});});}
function close(){clearInterval(simTimer);clearInterval(heartbeat);for(const ws of wss.clients)ws.terminate();return new Promise(resolve=>wss.close(()=>server.close(resolve)));}
return {server,wss,listen,close,getState:state,getGame:()=>game};
}
if(require.main===module){const app=createServer();app.listen().catch(e=>{console.error(e.message);process.exitCode=1;});}
module.exports={createServer};



