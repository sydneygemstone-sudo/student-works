import {TrioRoom as LegacyRoom} from './worker-r1.mjs';
import {validateReview,TASKS,REVIEW_VERSION} from './review-schema.mjs';
const REVISION='trio-online-r2-reviews-20260925';
const ORIGIN='https://sydneygemstone-sudo.github.io',ENTRY=ORIGIN+'/student-works/adventure-world/builds/trio-world-opus/online/';
const CAP=3,DAY=86400000,roomCode=v=>/^\d{6}$/.test(v||''),own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const number=(x,a,b)=>typeof x==='number'&&Number.isFinite(x)&&x>=a&&x<=b;
const text=(x,n)=>String(x??'').replace(/[\u0000-\u001f\u007f-\u009f]/g,'').trim().slice(0,n);
const token=()=>crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
async function hash(x){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(x)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
function json(x,status=200){return new Response(JSON.stringify(x),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex,nofollow','Referrer-Policy':'no-referrer'}});}
function cors(r,origin){const h=new Headers(r.headers);h.set('Access-Control-Allow-Origin',origin);h.set('Vary','Origin');h.set('Access-Control-Allow-Methods','GET,POST,PUT,OPTIONS');h.set('Access-Control-Allow-Headers','Content-Type,Authorization,X-Room-View');h.set('Access-Control-Max-Age','600');return new Response(r.body,{status:r.status,headers:h});}
async function body(request){const reader=request.body?.getReader();if(!reader)return {};let size=0,chunks=[];while(true){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>14000){await reader.cancel();throw Error('BODY_TOO_LARGE');}chunks.push(r.value);}let bytes=new Uint8Array(size),at=0;for(const x of chunks){bytes.set(x,at);at+=x.length;}return JSON.parse(new TextDecoder().decode(bytes)||'{}');}
function stub(env,id){return env.ROOMS.get(env.ROOMS.idFromName(id),{locationHint:'oc'});}
export default {async fetch(request,env){
 const u=new URL(request.url),origin=request.headers.get('Origin'),allowed=origin===ORIGIN||(env.TEST_ORIGIN&&origin===env.TEST_ORIGIN);
 if(u.pathname==='/health')return cors(json({ok:true,service:'trio-world-opus',revision:REVISION,maxPlayers:CAP,roomCodeDigits:6,tasks:TASKS.length,reviews:'durable-room-private',protocol:2}),allowed?origin:ORIGIN);
 if(u.pathname==='/'){const dest=new URL(ENTRY);if(u.searchParams.get('lang')==='en')dest.searchParams.set('lang','en');if(roomCode(u.searchParams.get('room')))dest.hash='room='+u.searchParams.get('room');return Response.redirect(dest,302);}
 if(!allowed)return json({error:'ORIGIN_DENIED'},403);
 if(request.method==='OPTIONS')return cors(new Response(null,{status:204}),origin);
 try{
  const legacy=u.pathname.match(/^\/ws\/([a-f0-9]{24})$/);if(legacy){if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return cors(json({error:'WEBSOCKET_REQUIRED'},426),origin);return stub(env,legacy[1]).fetch(request);}
  const directory=stub(env,'trio-six-digit-directory-r2');
  const ipHash=await hash(request.headers.get('CF-Connecting-IP')||'unknown');
  if(u.pathname==='/api/rooms'&&request.method==='POST'){
   const r=await directory.fetch(new Request('https://internal/create',{method:'POST',headers:{'X-Client-Key':ipHash}}));return cors(r,origin);
  }
  const route=u.pathname.match(/^\/(ws2|api\/rooms)\/(\d{6})(?:\/(status|me|review))?$/);
  if(!route)return cors(json({error:'NOT_FOUND'},404),origin);
  const isWS=route[1]==='ws2',code=route[2],op=route[3]||'';
  if(isWS&&(request.method!=='GET'||request.headers.get('Upgrade')?.toLowerCase()!=='websocket'))return cors(json({error:'WEBSOCKET_REQUIRED'},426),origin);
  if(!isWS&&!['status','me','review'].includes(op))return cors(json({error:'NOT_FOUND'},404),origin);
  const resolved=await directory.fetch(new Request('https://internal/resolve?code='+code,{headers:{'X-Client-Key':ipHash}}));if(!resolved.ok)return cors(resolved,origin);
  const {id}=await resolved.json(),url=new URL(request.url);url.pathname=isWS?'/connect':'/'+op;
  const r=await stub(env,id).fetch(new Request(url,request));return isWS?r:cors(r,origin);
 }catch(e){return cors(json({error:e.message==='BODY_TOO_LARGE'?'BODY_TOO_LARGE':'REQUEST_FAILED'},e.message==='BODY_TOO_LARGE'?413:400),origin);}
}};
function worldState(){return {world:{fruits:Object.fromEntries(Array.from({length:12},(_,i)=>['f'+i,true])),wood:Object.fromEntries(Array.from({length:8},(_,i)=>['w'+i,true])),stars:Object.fromEntries(Array.from({length:8},(_,i)=>['s'+i,true])),campfire:false,fedAnimals:{},produce:{},house:0,weather:'sunny'},respawns:[],pendingProduce:[],fireUntil:0,epoch:Date.now()};}
const STAR=[[-6,1.5,-73],[8,1.5,-71],[-18,1.5,-75],[0,9,-77],[6,12,-83],[18,1.5,-87],[-2,14,-105],[14,18,-99]],TREE=[[-12,-10],[10,-12],[-14,12],[12,10]],ANIMALS=[[87,-10,'cow'],[75,2,'cow'],[91,4,'chicken'],[87,6,'chicken'],[93,-2,'chicken'],[73,-12,'sheep'],[83,-16,'sheep']];
function location(kind,id){let i=Number(id.slice(1));if(!Number.isInteger(i)||i<0)return null;if(kind==='stars'&&i<8)return STAR[i];if(kind==='wood'&&i<8){const a=i/8*Math.PI*2+.2,d=7+i%3*3;return[-85+Math.cos(a)*d,.3,Math.sin(a)*d];}if(kind==='fruits'&&i<12){const t=Math.floor(i/3),j=i%3,a=j/3*Math.PI*2+t;return[-85+TREE[t][0]+Math.cos(a)*2.2,4.2+j%2*.8,TREE[t][1]+Math.sin(a)*2.2];}return null;}
function near(p,x,z,r){return Math.hypot(p.x-x,p.z-z)<=r;}
function count(p,w){const s=p.stats,a=[s.fountain,s.park,s.power1,s.power3,s.stars>=3,s.wild,s.fruits>=3,s.wood>=2,s.fire,s.farm,s.fed>=2,s.produce>=2,w.house>=5,s.celebrate];let n=0;while(n<a.length&&a[n])n++;return n;}
function member(name,skin,tokenHash){return{id:crypto.randomUUID(),tokenHash,name:text(name,12)||'Explorer',skin:Number.isInteger(skin)&&skin>=0&&skin<5?skin:0,x:0,y:0,z:8,ry:0,anim:0,joined:true,startedAt:Date.now(),updatedAt:Date.now(),completedAt:null,completed:0,inventory:{fruit:0,wood:0,feed:0,star:0,milk:0,egg:0,wool:0},stats:{fountain:0,park:0,wild:0,farm:0,power1:0,power3:0,stars:0,fruits:0,wood:0,fire:0,fed:0,produce:0,celebrate:0},review:null};}
export class TrioRoom extends LegacyRoom {
 constructor(ctx,env){super(ctx,env);this.r2=null;this.ipRates=new Map();ctx.blockConcurrencyWhile(async()=>{this.r2=await ctx.storage.get('r2')||null;});}
 connections(){return this.ctx.getWebSockets().filter(ws=>ws.deserializeAttachment()?.r2);}
 joined(){return this.connections().filter(ws=>ws.deserializeAttachment()?.memberId);}
 broadcastR2(m,except){for(const ws of this.joined())if(ws!==except)this.send(ws,m);}
 syncProgress(p){p.completed=count(p,this.r2.state.world);if(p.completed===14&&!p.completedAt)p.completedAt=Date.now();p.updatedAt=Date.now();}
 personal(p){return{id:p.id,name:p.name,completed:p.completed,total:14,stats:p.stats,inventory:p.inventory,position:{x:p.x,y:p.y,z:p.z},startedAt:p.startedAt,completedAt:p.completedAt,review:p.review?{id:p.review.id,revision:p.review.revision,updatedAt:p.review.updatedAt,status:'submitted'}:{status:p.completed===14?'awaiting_review':'playing'}};}
 sendPersonal(ws,p){this.syncProgress(p);this.send(ws,{t:'personal',personal:this.personal(p)});}
 async saveR2(){await this.ctx.storage.put('r2',this.r2);if(this.r2.kind==='room')await this.scheduleR2();}
 async scheduleR2(){if(!this.connections().length){await this.ctx.storage.deleteAlarm();return;}const s=this.r2.state,now=Date.now(),times=[now+45000];for(const a of [...s.respawns,...s.pendingProduce])times.push(a.at);if(s.fireUntil)times.push(s.fireUntil);for(const ws of this.connections()){const a=ws.deserializeAttachment();if(!a.memberId)times.push(a.at+10000);}await this.ctx.storage.setAlarm(Math.max(now+25,Math.min(...times)));}
 advanceR2(){const s=this.r2.state,w=s.world,now=Date.now(),patch={};s.respawns=s.respawns.filter(x=>{if(x.at>now)return true;w[x.kind][x.id]=true;(patch[x.kind]??={})[x.id]=true;return false;});s.pendingProduce=s.pendingProduce.filter(x=>{if(x.at>now)return true;w.produce[x.id]=x.value;(patch.produce??={})[x.id]=x.value;return false;});if(s.fireUntil&&s.fireUntil<=now){s.fireUntil=0;w.campfire=false;patch.campfire=false;}const weather=['sunny','cloudy','rain','sunny','sunset'][Math.floor((now-s.epoch)/45000)%5];if(weather!==w.weather){w.weather=weather;patch.weather=weather;}if(Object.keys(patch).length)this.broadcastR2({t:'world',patch});}
 limit(key,kind){const now=Date.now(),windowMs=60000,k=kind+key;let r=this.ipRates.get(k);if(!r||now-r.at>windowMs){r={at:now,n:0};this.ipRates.set(k,r);}if(this.ipRates.size>3000)for(const[a,b]of this.ipRates)if(now-b.at>windowMs)this.ipRates.delete(a);return ++r.n<=(kind==='create'?8:100);}
 async auth(request){const t=request.headers.get('Authorization')?.replace(/^Bearer /,'');if(!t||t.length!==64)return null;const h=await hash(t);return Object.values(this.r2.members).find(p=>p.tokenHash===h)||null;}
 async fetch(request){const u=new URL(request.url);
  if(u.hostname==='internal'&&['/create','/resolve'].includes(u.pathname)){
   if(!this.r2){this.r2={kind:'directory'};await this.saveR2();}
   const kind=u.pathname==='/create'?'create':'resolve';if(!this.limit(request.headers.get('X-Client-Key')||'',kind))return json({error:'RATE_LIMITED'},429);
   if(kind==='resolve'){const code=u.searchParams.get('code');if(!roomCode(code))return json({error:'ROOM_NOT_FOUND'},404);const row=await this.ctx.storage.get('code:'+code);return row?json({id:row.id}):json({error:'ROOM_NOT_FOUND'},404);}
   for(let i=0;i<24;i++){const n=crypto.getRandomValues(new Uint32Array(1))[0];if(n>=4294000000)continue;const code=String(n%1000000).padStart(6,'0');const claim=await this.ctx.storage.transaction(async tx=>{if(await tx.get('code:'+code))return null;const id='trio-r2-'+token();await tx.put('code:'+code,{id,at:Date.now()});return id;});if(!claim)continue;
    const viewKey=token();const r=await stub(this.env,claim).fetch(new Request('https://internal/initialize',{method:'POST',body:JSON.stringify({code,viewKey})}));if(!r.ok)return json({error:'ROOM_CREATE_FAILED'},503);return json({code,viewKey,maxPlayers:CAP,tasks:14,revision:REVISION},201);
   }return json({error:'ROOM_CREATE_BUSY'},503);
  }
  if(u.hostname==='internal'&&u.pathname==='/initialize'){
   if(this.r2)return json({error:'ALREADY_EXISTS'},409);const x=await body(request);if(!roomCode(x.code)||typeof x.viewKey!=='string'||x.viewKey.length!==64)return json({error:'BAD_INIT'},400);
   this.r2={kind:'room',code:x.code,viewKey:x.viewKey,createdAt:Date.now(),state:worldState(),members:{}};await this.saveR2();return json({ok:true});
  }
  if(!this.r2)return super.fetch(request);
  if(this.r2.kind!=='room')return json({error:'NOT_FOUND'},404);
  if(u.pathname==='/status'&&request.method==='GET'){
   if(request.headers.get('X-Room-View')!==this.r2.viewKey)return json({error:'VIEW_ACCESS_REQUIRED'},403);
   const active=new Set(this.joined().map(w=>w.deserializeAttachment().memberId)),members=Object.values(this.r2.members);
   return json({code:this.r2.code,revision:REVISION,maxPlayers:CAP,totalTasks:14,updatedAt:Date.now(),players:members.map(p=>({id:p.id,name:p.name,online:active.has(p.id),completed:p.completed,total:14,completedAt:p.completedAt,status:p.review?'submitted':p.completed===14?'awaiting_review':'playing',review:p.review})),submitted:members.filter(p=>p.review).length,finished:members.filter(p=>p.completed===14).length,registered:members.length});
  }
  if(['/me','/review'].includes(u.pathname)){
   const p=await this.auth(request);if(!p)return json({error:'PLAYER_ACCESS_REQUIRED'},403);
   if(u.pathname==='/me'&&request.method==='GET')return json({personal:this.personal(p),review:p.review,code:this.r2.code,revision:REVISION});
   if(u.pathname==='/review'&&request.method==='PUT'){
    if(p.completed!==14||!p.completedAt)return json({error:'QUESTS_NOT_COMPLETE',completed:p.completed,total:14},409);
    const x=validateReview(await body(request));if(!x.ok)return json({error:'INVALID_REVIEW',fields:x.errors},400);
    if(p.review?.answers.submissionId===x.value.submissionId)return json({ok:true,review:p.review,idempotent:true});
    if(p.review&&Date.now()-p.review.updatedAt<1500)return json({error:'RATE_LIMITED'},429);
    p.review={id:p.review?.id||crypto.randomUUID(),revision:(p.review?.revision||0)+1,createdAt:p.review?.createdAt||Date.now(),updatedAt:Date.now(),gameRevision:REVISION,completed:14,completedAt:p.completedAt,elapsedMs:p.completedAt-p.startedAt,answers:x.value};await this.saveR2();for(const ws of this.joined())if(ws.deserializeAttachment().memberId===p.id)this.sendPersonal(ws,p);this.broadcastR2({t:'review_changed'});return json({ok:true,review:p.review});
   }return json({error:'METHOD_NOT_ALLOWED'},405);
  }
  if(u.pathname!=='/connect')return json({error:'NOT_FOUND'},404);
  const [client,ws]=Object.values(new WebSocketPair());this.ctx.acceptWebSocket(ws);ws.serializeAttachment({r2:true,at:Date.now()});
  if(this.connections().length>CAP){this.send(ws,{t:'error',code:'ROOM_FULL',text:'房间最多3人 / Maximum 3 players'});ws.close(1008,'ROOM_FULL');return new Response(null,{status:101,webSocket:client});}
  this.advanceR2();await this.scheduleR2();return new Response(null,{status:101,webSocket:client});
 }
 async webSocketMessage(ws,raw){
  if(!this.r2)return super.webSocketMessage(ws,raw);if(this.r2.kind!=='room')return;
  const attachment=ws.deserializeAttachment();if(!attachment?.r2)return;if(raw==='ping'){ws.send('pong');return;}
  if(typeof raw!=='string'||raw.length>2048){ws.close(1009,'MESSAGE_TOO_LARGE');return;}
  let m;try{m=JSON.parse(raw);}catch{return;}if(!m||!this.rateAllowed(ws,m.t))return;
  if(m.t==='join'&&!attachment.memberId){
   let p,issuedToken=null;
   if(m.resumeToken){if(typeof m.resumeToken!=='string'||m.resumeToken.length!==64)return this.refuse(ws,'RESUME_INVALID');const h=await hash(m.resumeToken);p=Object.values(this.r2.members).find(x=>x.tokenHash===h);if(!p)return this.refuse(ws,'RESUME_INVALID');}
   else {if(Object.keys(this.r2.members).length>=CAP)return this.refuse(ws,'ROOM_FULL');issuedToken=token();p=member(m.name,m.skin,await hash(issuedToken));this.r2.members[p.id]=p;}
   if(this.joined().some(w=>w!==ws&&w.deserializeAttachment().memberId===p.id))return this.refuse(ws,'SESSION_IN_USE');
   ws.serializeAttachment({...attachment,memberId:p.id});this.advanceR2();this.syncProgress(p);await this.saveR2();
   this.send(ws,{t:'init',id:p.id,players:this.joined().filter(w=>w!==ws).map(w=>this.publicPlayer(this.r2.members[w.deserializeAttachment().memberId])),world:this.r2.state.world,now:Date.now(),revision:REVISION,maxPlayers:CAP,roomCode:this.r2.code,viewKey:this.r2.viewKey,resumeToken:issuedToken||m.resumeToken,personal:this.personal(p)});this.broadcastR2({t:'join',...this.publicPlayer(p)},ws);return;
  }
  const p=this.r2.members[attachment.memberId];if(!p)return;const w=this.r2.state.world,now=Date.now();
  if(m.t==='pos'){
   if(![m.x,m.z].every(x=>number(x,-165,165))||!number(m.y,-5,200)||!number(m.ry,-10000,10000)||!Number.isInteger(m.anim)||m.anim<0||m.anim>5)return;
   const before=p.completed;Object.assign(p,{x:m.x,y:m.y,z:m.z,ry:m.ry,anim:m.anim});if(near(p,0,0,7))p.stats.fountain=1;if(near(p,0,-85,36))p.stats.park=1;if(near(p,-85,0,36))p.stats.wild=1;if(near(p,85,0,36))p.stats.farm=1;this.syncProgress(p);
   ws.serializeAttachment({...attachment,position:{x:p.x,y:p.y,z:p.z}});
   if(now-this.lastBroadcast>=70){this.lastBroadcast=now;const list=this.joined().map(s=>{const q=this.r2.members[s.deserializeAttachment().memberId];return[q.id,q.x,q.y,q.z,q.ry,q.anim];});if(list.length>1)this.broadcastR2({t:'pos',list});}
   if(before!==p.completed){await this.saveR2();this.sendPersonal(ws,p);}else if(now-(p.savedAt||0)>5000){p.savedAt=now;await this.saveR2();}return;
  }
  if(m.t==='checkpoint'){await this.saveR2();this.sendPersonal(ws,p);return;}
  if(m.t==='skin'){if(Number.isInteger(m.skin)&&m.skin>=0&&m.skin<5){p.skin=m.skin;this.broadcastR2({t:'skin',id:p.id,skin:p.skin},ws);await this.saveR2();}return;}
  if(m.t==='chat'){const v=text(m.text,80);if(v)this.broadcastR2({t:'chat',id:p.id,name:p.name,text:v});return;}
  if(m.t==='fx'){
   if(!['p1','p2','p3','tp'].includes(m.kind))return;
   if(['p1','p3'].includes(m.kind)){const k=m.kind==='p1'?'power1':'power3',cd=m.kind==='p1'?1800:8500;if(now-(p['used'+k]||0)<cd)return;p['used'+k]=now;p.stats[k]=1;}
   this.broadcastR2({t:'fx',id:p.id,kind:m.kind},ws);
  }else if(m.t==='take'){
   const k=m.kind,id=m.id;if(!['fruits','wood','stars','produce'].includes(k)||typeof id!=='string'||id.length>80)return;
   const point=k==='produce'&&w.produce[id]?[w.produce[id].x,0,w.produce[id].z]:location(k,id);
   if(!point||!near(p,point[0],point[2],k==='fruits'?5:4)||k==='stars'&&Math.abs(p.y-point[1])>5||!own(w[k],id)||!w[k][id]){this.send(ws,{t:'deny',kind:k,id});this.sendPersonal(ws,p);return;}
   if(k==='produce'){const type=w.produce[id].k;delete w.produce[id];p.inventory[{cow:'milk',chicken:'egg',sheep:'wool'}[type]||'egg']++;p.stats.produce++;}
   else {w[k][id]=false;this.r2.state.respawns.push({kind:k,id,at:now+(k==='stars'?25000:20000)});p.inventory[{fruits:'fruit',wood:'wood',stars:'star'}[k]]++;p.stats[k]++;}
   this.broadcastR2({t:'world',patch:{[k]:{[id]:false}}});this.send(ws,{t:'got',kind:k,id});
  }else if(m.t==='feed_supply'){
   if(!near(p,79,-4,4)||p.inventory.feed>=30)return;p.inventory.feed=Math.min(30,p.inventory.feed+3);
  }else if(m.t==='campfire'||m.t==='warm_fire'){
   if(!near(p,-85,0,5))return;
   if(!w.campfire){if(m.t==='warm_fire'||p.inventory.wood<2)return;p.inventory.wood-=2;w.campfire=true;this.r2.state.fireUntil=now+90000;this.broadcastR2({t:'world',patch:{campfire:true}});}
   p.stats.fire=1;
  }else if(m.t==='feed'){
   const i=/^a[0-6]$/.test(m.id||'')?Number(m.id[1]):-1,a=ANIMALS[i];if(!a||m.kind!==a[2]||!near(p,a[0],a[1],9)||p.inventory.feed<1||now-(w.fedAnimals[m.id]||0)<8000||Object.keys(w.produce).length+this.r2.state.pendingProduce.length>=64){this.sendPersonal(ws,p);return;}
   p.inventory.feed--;p.stats.fed++;w.fedAnimals[m.id]=now;this.broadcastR2({t:'world',patch:{fedAnimals:{[m.id]:now}}});this.r2.state.pendingProduce.push({id:'p'+m.id+'_'+now,at:now+1500,value:{k:a[2],x:p.x+1,z:p.z+1}});
  }else if(m.t==='build'){
   if(!near(p,81,7,6)||p.inventory.wood<1||w.house>=5){this.sendPersonal(ws,p);return;}p.inventory.wood--;w.house++;this.broadcastR2({t:'world',patch:{house:w.house}});
   for(const s of this.joined()){const q=this.r2.members[s.deserializeAttachment().memberId];this.syncProgress(q);this.sendPersonal(s,q);}
  }else if(m.t==='celebrate'){
   this.syncProgress(p);if(!near(p,0,0,8)||p.completed<13)return;p.stats.celebrate=1;
  }else return;
  this.syncProgress(p);await this.saveR2();this.sendPersonal(ws,p);
 }
 refuse(ws,code){this.send(ws,{t:'error',code,text:code==='ROOM_FULL'?'本房间最多3名玩家；请另建房间 / This room has 3 players; create a new room':code==='SESSION_IN_USE'?'同一玩家已在另一个标签页 / This player is already in another tab':'本机凭证无效，请用原浏览器或新建房间 / Invalid saved access; use the original browser or create a room'});ws.close(1008,code);}
 async webSocketClose(ws,code,reason){if(!this.r2)return super.webSocketClose(ws,code,reason);const a=ws.deserializeAttachment();try{ws.close(code===1005?1000:code,reason);}catch{}if(this.r2.kind==='room'){if(a?.memberId)this.broadcastR2({t:'leave',id:a.memberId},ws);await this.saveR2();}}
 async webSocketError(ws){return this.webSocketClose(ws,1011,'CONNECTION_ERROR');}
 async alarm(){if(!this.r2)return super.alarm();if(this.r2.kind!=='room')return;for(const ws of this.connections()){const a=ws.deserializeAttachment();if(!a.memberId&&Date.now()-a.at>10000)ws.close(1008,'JOIN_TIMEOUT');}this.advanceR2();await this.saveR2();}
}
