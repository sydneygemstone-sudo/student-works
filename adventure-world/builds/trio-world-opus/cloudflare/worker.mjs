// Opus classroom protocol -> Cloudflare SQLite Durable Objects.
// Original LAN server and artwork are preserved. No classroom host is required.
const REVISION = 'opus-cloud-r1-20260925';
const WEATHER = ['sunny','cloudy','rain','sunny','sunset'];
const TTL = 7*24*60*60*1000;
const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
const num = (v,a,b) => typeof v==='number' && Number.isFinite(v) && v>=a && v<=b;
const text = (v,n) => String(v??'').replace(/[\u0000-\u001f\u007f-\u009f]/g,'').trim().slice(0,n);
function fresh() {
  return {world:{fruits:Object.fromEntries(Array.from({length:12},(_,i)=>['f'+i,true])),wood:Object.fromEntries(Array.from({length:8},(_,i)=>['w'+i,true])),stars:Object.fromEntries(Array.from({length:8},(_,i)=>['s'+i,true])),campfire:false,fedAnimals:{},produce:{},house:0,weather:'sunny'},respawns:[],pendingProduce:[],fireUntil:0,epoch:Date.now(),idleSince:0};
}
function json(data,status=200) {
  return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'}});
}
export default {
  async fetch(request,env) {
    const u=new URL(request.url);
    if(u.pathname==='/health') return json({ok:true,service:'trio-world-opus',revision:REVISION,maxPlayers:3,protocol:1});
    if(u.pathname==='/') return Response.redirect('https://sydneygemstone-sudo.github.io/student-works/adventure-world/builds/trio-world-opus/online/',302);
    const m=u.pathname.match(/^\/ws\/([a-f0-9]{24})$/);
    if(!m) return json({error:'NOT_FOUND'},404);
    if(request.method!=='GET'||request.headers.get('Upgrade')?.toLowerCase()!=='websocket') return json({error:'WEBSOCKET_REQUIRED'},426);
    if(request.headers.get('Origin')!=='https://sydneygemstone-sudo.github.io') return json({error:'ORIGIN_DENIED'},403);
    return env.ROOMS.get(env.ROOMS.idFromName(m[1]),{locationHint:'oc'}).fetch(request);
  }
};
export class TrioRoom {
  constructor(ctx,env) {
    this.ctx=ctx; this.env=env; this.players=new Map(); this.rates=new WeakMap(); this.lastBroadcast=0;
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping','pong'));
    ctx.blockConcurrencyWhile(async()=>{
      this.state=await ctx.storage.get('room-v1')||fresh();
      for(const ws of ctx.getWebSockets()) {const p=ws.deserializeAttachment();if(p?.id)this.players.set(ws,p);}
      if(!this.players.size&&this.state.idleSince&&Date.now()-this.state.idleSince>TTL){await ctx.storage.deleteAll();this.state=fresh();}
    });
  }
  send(ws,m){try{ws.send(JSON.stringify(m));}catch{}}
  broadcast(m,except){for(const [ws,p]of this.players)if(p.joined&&ws!==except)this.send(ws,m);}
  patch(patch){this.broadcast({t:'world',patch});}
  publicPlayer(p){return{id:p.id,name:p.name,skin:p.skin,x:p.x,y:p.y,z:p.z,ry:p.ry,anim:p.anim};}
  async save(){await this.ctx.storage.put('room-v1',this.state);await this.schedule();}
  async schedule(){
    const now=Date.now(),s=this.state;
    if(!this.players.size){if(!s.idleSince)s.idleSince=now;await this.ctx.storage.setAlarm(s.idleSince+TTL);return;}
    const times=[s.epoch+(Math.floor((now-s.epoch)/45000)+1)*45000];
    for(const p of this.players.values())if(!p.joined)times.push(p.connectedAt+10000);
    for(const e of [...s.respawns,...s.pendingProduce])times.push(e.at);
    if(s.fireUntil)times.push(s.fireUntil);
    await this.ctx.storage.setAlarm(Math.max(now+20,Math.min(...times)));
  }
  advance(now=Date.now()){
    const s=this.state,w=s.world,p={};
    s.respawns=s.respawns.filter(e=>{if(e.at>now)return true;w[e.kind][e.id]=true;(p[e.kind]??={})[e.id]=true;return false;});
    s.pendingProduce=s.pendingProduce.filter(e=>{if(e.at>now)return true;w.produce[e.id]=e.value;(p.produce??={})[e.id]=e.value;return false;});
    if(s.fireUntil&&s.fireUntil<=now){s.fireUntil=0;w.campfire=false;p.campfire=false;}
    const weather=WEATHER[Math.floor((now-s.epoch)/45000)%WEATHER.length];
    if(w.weather!==weather){w.weather=weather;p.weather=weather;}
    if(Object.keys(p).length)this.patch(p);
  }
  async fetch(){
    const [client,ws]=Object.values(new WebSocketPair());this.ctx.acceptWebSocket(ws);
    if(this.players.size>=3){this.send(ws,{t:'error',code:'ROOM_FULL',text:'房间已满（最多三人） / Room full (3 players)'});ws.close(1008,'ROOM_FULL');return new Response(null,{status:101,webSocket:client});}
    const p={id:crypto.randomUUID(),name:'',skin:0,x:0,y:0,z:8,ry:0,anim:0,joined:false,connectedAt:Date.now()};
    ws.serializeAttachment(p);this.players.set(ws,p);this.state.idleSince=0;this.advance();await this.save();
    return new Response(null,{status:101,webSocket:client});
  }
  rateAllowed(ws,type){
    const now=Date.now();let r=this.rates.get(ws);
    if(!r||now-r.since>=1000){r={since:now,total:0,actions:0};this.rates.set(ws,r);}
    r.total++;if(type!=='pos')r.actions++;return r.total<=60&&r.actions<=12;
  }
  async webSocketMessage(ws,raw){
    const p=this.players.get(ws);if(!p)return;
    if(typeof raw!=='string'||raw.length>2048){ws.close(1009,'MESSAGE_TOO_LARGE');return;}
    if(raw==='ping'){ws.send('pong');return;}
    let m;try{m=JSON.parse(raw);}catch{return;}
    if(!m||typeof m!=='object'||!this.rateAllowed(ws,m.t))return;
    if(m.t==='join'&&!p.joined){
      p.joined=true;p.name=text(m.name,12)||'Player';p.skin=Number.isInteger(m.skin)&&m.skin>=0&&m.skin<5?m.skin:0;ws.serializeAttachment(p);this.advance();
      this.send(ws,{t:'init',id:p.id,players:[...this.players].filter(([s,v])=>s!==ws&&v.joined).map(([,v])=>this.publicPlayer(v)),world:this.state.world,now:Date.now(),revision:REVISION});
      this.broadcast({t:'join',...this.publicPlayer(p)},ws);await this.schedule();return;
    }
    if(!p.joined)return;const w=this.state.world;
    switch(m.t){
      case 'pos':
        if(![m.x,m.z].every(v=>num(v,-500,500))||!num(m.y,-100,250)||!num(m.ry,-10000,10000)||!Number.isInteger(m.anim)||m.anim<0||m.anim>5)return;
        Object.assign(p,{x:m.x,y:m.y,z:m.z,ry:m.ry,anim:m.anim});ws.serializeAttachment(p);
        if(Date.now()-this.lastBroadcast>=60){this.lastBroadcast=Date.now();const list=[...this.players.values()].filter(v=>v.joined).map(v=>[v.id,v.x,v.y,v.z,v.ry,v.anim]);if(list.length>1)this.broadcast({t:'pos',list});}return;
      case 'skin':
        if(!Number.isInteger(m.skin)||m.skin<0||m.skin>4)return;p.skin=m.skin;ws.serializeAttachment(p);this.broadcast({t:'skin',id:p.id,skin:p.skin},ws);return;
      case 'fx':if(['p1','p2','p3','tp'].includes(m.kind))this.broadcast({t:'fx',id:p.id,kind:m.kind},ws);return;
      case 'chat':{const v=text(m.text,80);if(v)this.broadcast({t:'chat',id:p.id,name:p.name,text:v});return;}
      case 'take':{
        const k=m.kind,id=m.id;if(!['fruits','wood','stars','produce'].includes(k)||typeof id!=='string'||id.length>80)return;
        if(!own(w[k],id)||!w[k][id]){this.send(ws,{t:'deny',kind:k,id});return;}
        if(k==='produce')delete w.produce[id];else{w[k][id]=false;this.state.respawns.push({kind:k,id,at:Date.now()+(k==='stars'?25000:20000)});}
        this.patch({[k]:{[id]:false}});this.send(ws,{t:'got',kind:k,id});break;
      }
      case 'campfire':
        if(w.campfire)return;w.campfire=true;this.state.fireUntil=Date.now()+90000;this.patch({campfire:true});this.broadcast({t:'toast',text:p.name+' 点燃了篝火 / lit the campfire!'});break;
      case 'feed':{
        const kinds=['cow','cow','chicken','chicken','chicken','sheep','sheep'];
        if(typeof m.id!=='string'||!/^a[0-6]$/.test(m.id)||m.kind!==kinds[Number(m.id.slice(1))])return;
        const now=Date.now();if(w.fedAnimals[m.id]&&now-w.fedAnimals[m.id]<8000)return;
        if(Object.keys(w.produce).length+this.state.pendingProduce.length>=64)return;
        const at=Array.isArray(m.at)&&m.at.length===2&&m.at.every(v=>num(v,-500,500))?m.at:[p.x,p.z];
        w.fedAnimals[m.id]=now;this.patch({fedAnimals:{[m.id]:now}});this.state.pendingProduce.push({id:'p'+m.id+'_'+now,at:now+1500,value:{k:m.kind,x:at[0]+1,z:at[1]+1}});break;
      }
      case 'build':if(w.house>=5)return;w.house++;this.patch({house:w.house});if(w.house===5)this.broadcast({t:'toast',text:'小屋盖好啦 / The shared house is ready!'});break;
      default:return;
    }
    await this.save();
  }
  async disconnect(ws){const p=this.players.get(ws);if(!p)return;this.players.delete(ws);if(p.joined)this.broadcast({t:'leave',id:p.id});if(!this.players.size)this.state.idleSince=Date.now();await this.save();}
  async webSocketClose(ws,code,reason){try{ws.close(code===1005?1000:code,reason);}catch{}await this.disconnect(ws);}
  async webSocketError(ws){try{ws.close(1011,'CONNECTION_ERROR');}catch{}await this.disconnect(ws);}
  async alarm(){
    const now=Date.now();for(const [ws,p]of this.players)if(!p.joined&&now-p.connectedAt>=10000){ws.close(1008,'JOIN_TIMEOUT');this.players.delete(ws);}
    if(!this.players.size){if(this.state.idleSince&&now-this.state.idleSince>=TTL){await this.ctx.storage.deleteAll();this.state=fresh();return;}if(!this.state.idleSince)this.state.idleSince=now;await this.save();return;}
    this.advance(now);await this.save();
  }
}
