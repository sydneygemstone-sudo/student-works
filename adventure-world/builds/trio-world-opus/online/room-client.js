/* Online-only room UI. It does not replace or pause the multiplayer simulation clock. */
const DEFAULT_API='https://trio-world-opus.sydney-gemstone-games.workers.dev';
export class NetworkRoom {
 constructor(){
  this.api=window.TRIO_API_BASE||DEFAULT_API;this.en=new URLSearchParams(location.search).get('lang')==='en';this.callbacks={};this.connected=false;this.retry=0;this.terminal=false;this.ws=null;this.personal=null;
  const h=new URLSearchParams(location.hash.slice(1)),q=new URLSearchParams(location.search);this.code=h.get('room')||q.get('room')||'';
  if(!/^\d{6}$/.test(this.code)){if(this.code)this.status(this.t('旧邀请不再用于新房间，请新建六位数字房间。','Create a new six-digit room for this release.'));this.code='';}
  document.getElementById('room').value=this.code;this.load();
  document.getElementById('newRoom').onclick=()=>this.create();document.getElementById('copyRoom').onclick=()=>this.copyInvite();
  document.getElementById('onlineReview').onclick=()=>this.openReview();document.getElementById('onlineStatus').onclick=()=>this.openStatus();
  document.getElementById('onlineLanguage').onclick=()=>{if(parent!==window){parent.postMessage({type:'trio-language',lang:this.en?'zh-CN':'en'},location.origin);return;}const u=new URL(location.href);u.searchParams.set('lang',this.en?'zh-CN':'en');location.href=u.href;};
  document.getElementById('onlineLanguage').textContent=this.en?'中文':'EN';
  this.paint();
  addEventListener('pagehide',()=>{this.terminal=true;clearInterval(this.heartbeat);clearTimeout(this.retryTimer);this.ws?.close(1000,'LEAVING');});
  addEventListener('message',e=>{const f=document.querySelector('#trioReviewOverlay iframe');if(e.origin===location.origin&&e.source===f?.contentWindow&&e.data?.type==='trio-review-saved'){this.send({t:'checkpoint'});document.getElementById('onlineReview').textContent=this.t('查看我的测评','My submitted review');}});
 }
 t(zh,en){return this.en?en:zh;}
 status(s){const e=document.getElementById('cloudStatus');if(e)e.textContent=s;}
 load(){try{this.session=JSON.parse(localStorage.getItem('trio-session:'+this.code)||'null')||{};}catch{this.session={};}if(this.session.name)document.getElementById('name').value=this.session.name;}
 remember(){try{localStorage.setItem('trio-session:'+this.code,JSON.stringify(this.session));const recent=JSON.parse(localStorage.getItem('trio-recent-rooms')||'[]').filter(x=>x.code!==this.code);recent.unshift({code:this.code,name:this.session.name||'',at:Date.now(),viewKey:this.session.viewKey});localStorage.setItem('trio-recent-rooms',JSON.stringify(recent.slice(0,12)));}catch{this.status(this.t('浏览器不允许保存，刷新可能无法恢复身份；请保持页面打开。','Browser storage is blocked. Keep this page open to preserve your player identity.'));}}
 select(code){this.code=code;document.getElementById('room').value=code;history.replaceState(null,'',location.pathname+location.search+'#room='+code);this.load();this.paint();parent.postMessage({type:'trio-room-selected',room:code},location.origin);}
 async create(){
  const b=document.getElementById('newRoom');b.disabled=true;this.status(this.t('正在创建房间…','Creating room…'));
  try{const r=await fetch(this.api+'/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});const x=await r.json();if(!r.ok)throw Error(x.error);this.select(x.code);this.session.viewKey=x.viewKey;this.remember();this.status(this.t('房间已创建。把六位数字或邀请链接私下发给两位伙伴。','Room created. Privately share the six digits or invite link with two friends.'));}
  catch(e){this.status(this.t('创建失败，请稍后重试：','Unable to create a room: ')+e.message);}finally{b.disabled=false;}
 }
 async prepare(){let code=document.getElementById('room').value.trim();if(!code){await this.create();code=this.code;}if(!/^\d{6}$/.test(code)){this.status(this.t('房间码必须恰好是六位数字。','The room code must be exactly six digits.'));return false;}this.select(code);return true;}
 async copyInvite(){const code=document.getElementById('room').value.trim();if(!/^\d{6}$/.test(code)){this.status(this.t('先创建房间，或输入伙伴给的六位数字。','Create a room or enter a friend’s six-digit code first.'));return;}const u=new URL('./',location.href);u.search=location.search;u.hash='room='+code;try{await navigator.clipboard.writeText(u.href);this.status(this.t('已复制游戏邀请；最多三名玩家。','Game invite copied; maximum three players.'));}catch{this.status(this.t('请复制此链接：','Copy this link: ')+u.href);}}
 connect(name,skin,callbacks){this.name=name;this.skin=skin;this.callbacks=callbacks;this.terminal=false;this.dial();}
 dial(){
  clearTimeout(this.retryTimer);clearInterval(this.heartbeat);this.callbacks.connection?.(false,this.t('正在连接共同的世界…','Connecting to the shared world…'));
  const ws=new WebSocket(this.api.replace(/^http/,'ws')+'/ws2/'+this.code);this.ws=ws;
  ws.onopen=()=>{ws.send(JSON.stringify({t:'join',name:this.name,skin:this.skin,resumeToken:this.session.token||undefined}));this.heartbeat=setInterval(()=>{if(ws.readyState===1)ws.send('ping');},25000);};
  ws.onmessage=e=>{if(e.data==='pong')return;let m;try{m=JSON.parse(e.data);}catch{return;}
   if(m.t==='error'){this.terminal=true;this.callbacks.connection?.(false,m.text||m.code);this.status(m.text||m.code);return;}
   if(m.t==='init'){this.connected=true;this.retry=0;this.session={...this.session,token:m.resumeToken,viewKey:m.viewKey,id:m.id,name:m.personal.name};this.personal=m.personal;this.remember();this.callbacks.connection?.(true);}
   if(m.t==='personal')this.personal=m.personal;
   this.callbacks.message?.(m);this.paint();
   if((m.t==='init'||m.t==='personal')&&this.personal?.completed===14&&this.personal?.review.status!=='submitted'&&!this.prompted){this.prompted=true;setTimeout(()=>this.openReview(),200);}
  };
  ws.onclose=()=>{this.connected=false;clearInterval(this.heartbeat);this.callbacks.clearPlayers?.();this.paint();if(this.terminal)return;this.retry++;const note=this.retry>6?this.t('未能重新连接。请检查房间码与网络后刷新；本机身份仍保留。','Unable to reconnect. Check the room code/network and refresh; your saved identity is retained.'):this.t('网络中断，正在重新连接…','Disconnected, reconnecting…');this.callbacks.connection?.(false,note);if(this.retry<=6)this.retryTimer=setTimeout(()=>this.dial(),Math.min(10000,700*2**this.retry));};
  ws.onerror=()=>{};
 }
 send(m){if(!this.connected||this.ws?.readyState!==1)return false;this.ws.send(JSON.stringify(m));return true;}
 paint(){const r=document.getElementById('onlineReview'),s=document.getElementById('roomMini');if(s)s.textContent=this.t('房间 ','Room ')+(this.code||'------')+this.t(' · 最多3人',' · max 3');if(r)r.textContent=this.personal?.review.status==='submitted'?this.t('已提交 · 我的测评','Submitted · my review'):this.personal?.completed===14?this.t('通关了 · 填测评','Finished · review'):this.t('测评 ','Review ')+(this.personal?.completed||0)+'/14';}
 statusLink(){const u=new URL('../../../../adventure-world/hub/online-reviews.html',location.href);u.searchParams.set('lang',this.en?'en':'zh-CN');u.hash=new URLSearchParams({room:this.code,view:this.session.viewKey||''}).toString();return u.href;}
 openStatus(){if(!this.session.viewKey){this.status(this.t('先创建或进入房间，才能查看本房间的测评。','Create or join a room to view its reviews.'));return;}window.open(this.statusLink(),'_blank','noopener');}
 openReview(){
  if(!this.session.token){this.status(this.t('先进入房间。完成14个任务后会自动显示完整测评表。','Join the room first. The complete review opens after 14 tasks.'));return;}
  if(document.getElementById('trioReviewOverlay'))return;window.__trioReviewOpen=true;dispatchEvent(new Event('trio-review-open'));
  const overlay=document.createElement('section');overlay.id='trioReviewOverlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',this.t('通关测评表','Completion review'));
  const header=document.createElement('header'),title=document.createElement('strong');title.textContent=this.t('我的通关测评','My completion review');const close=document.createElement('button');close.textContent=this.t('继续游戏 ×','Return to game ×');close.onclick=()=>{overlay.remove();window.__trioReviewOpen=false;dispatchEvent(new Event('trio-review-close'));};header.append(title,close);
  const iframe=document.createElement('iframe');iframe.title=this.t('完整测评表','Complete playtest review');iframe.src='./review.html?lang='+(this.en?'en':'zh-CN')+'#room='+this.code;overlay.append(header,iframe);document.body.append(overlay);close.focus();
 }
}
