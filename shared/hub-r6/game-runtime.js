/* HUB R6 game adapter. Game simulation stays on this device; no remote WebSocket. */
(()=>{'use strict';
const setStorage=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(window.__R6Reset)return;return setStorage.call(this,k,v);};
const params=new URLSearchParams(location.search),lang=params.get('lang')==='en'?'en':'zh-CN';
const en=lang==='en';window.R6_LANG=lang;document.documentElement.lang=lang;
const realNow=Date.now.bind(Date),realPerf=performance.now.bind(performance),raf=window.requestAnimationFrame.bind(window),nativeTimeout=setTimeout.bind(window),nativeInterval=setInterval.bind(window);
let paused=false,pausedAt=0,offset=0;const elapsed=()=>offset+(paused?realNow()-pausedAt:0);
Date.now=()=>realNow()-elapsed();try{Object.defineProperty(performance,'now',{value:()=>realPerf()-elapsed(),configurable:true});}catch{}
window.requestAnimationFrame=fn=>{let id;const loop=()=>{if(paused){id=raf(loop);return;}fn(performance.now());};return raf(loop);};
const timers=new Map();let next=10000000;const schedule=(fn,delay,repeat,args)=>{const id=next++;timers.set(id,{fn,at:performance.now()+Math.max(0,+delay||0),delay:Math.max(1,+delay||0),repeat,args});return id;};
window.setTimeout=(fn,delay,...args)=>schedule(fn,delay,false,args);window.setInterval=(fn,delay,...args)=>schedule(fn,delay,true,args);
const oldCT=clearTimeout.bind(window),oldCI=clearInterval.bind(window);window.clearTimeout=id=>timers.has(id)?timers.delete(id):oldCT(id);window.clearInterval=id=>timers.has(id)?timers.delete(id):oldCI(id);
nativeInterval(()=>{if(paused)return;const now=performance.now();for(const[id,t]of [...timers])if(t.at<=now){if(t.repeat)t.at=now+t.delay;else timers.delete(id);try{typeof t.fn==='function'?t.fn(...t.args):Function(t.fn)();}catch(e){console.error(e);}}},16);
function pause(value){if(value===paused)return;if(value){pausedAt=realNow();paused=true;}else{offset+=realNow()-pausedAt;paused=false;}window.__R6Game?.save?.();document.dispatchEvent(new Event('r6-pause'));}
window.addEventListener('message',e=>{if(e.source!==parent||e.origin!==location.origin)return;const x=e.data;if(x?.type==='r6-pause')pause(!!x.paused);if(x?.type==='r6-save')window.__R6Game?.save?.();});
window.__r6Pause={set:pause,get paused(){return paused;}};
const pairs=window.R6_STRINGS||[],ordered=[...pairs].sort((a,b)=>Math.max(b[0].length,b[1].length)-Math.max(a[0].length,a[1].length));
const memo=new Map();function T(text){if(typeof text!=='string'||!text.trim())return text;const key=lang+'|'+text;if(memo.has(key))return memo.get(key);let out=text;
for(const[zh,eng]of ordered){const from=en?zh:eng,to=en?eng:zh;if(!from||from===to)continue;if(en)out=out.split(from).join(to);else{const escaped=from.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const left=/^[A-Za-z]/.test(from)?'(?<![A-Za-z])':'',right=/[A-Za-z]$/.test(from)?'(?![A-Za-z])':'';out=out.replace(new RegExp(left+escaped+right,'g'),()=>to);}}
if(memo.size>10000)memo.clear();memo.set(key,out);return out;}
window.R6_T=T;
// Canvas labels and HUD text use the same dictionary. Do not translate object keys or gameplay IDs.
for(const name of ['fillText','strokeText','measureText']){const old=CanvasRenderingContext2D.prototype[name];CanvasRenderingContext2D.prototype[name]=function(text,...rest){return old.call(this,T(String(text)),...rest);};}
const original=new WeakMap(),last=new WeakMap();function text(node){const value=node.nodeValue;if(last.get(node)===value)return;original.set(node,value);const translated=T(value);last.set(node,translated);if(value!==translated)node.nodeValue=translated;}
function walk(root){if(root.nodeType===3){text(root);return;}if(root.nodeType!==1&&root.nodeType!==9&&root.nodeType!==11)return;if(root.nodeType===1&&/^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|INPUT|OPTION)$/.test(root.tagName)){if(root.tagName==='OPTION')for(const n of root.childNodes)if(n.nodeType===3)text(n);return;}const tw=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>/^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/.test(n.parentElement?.tagName)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});for(let n; n=tw.nextNode();)text(n);if(root.querySelectorAll)for(const el of root.querySelectorAll('[placeholder],[title],[aria-label]'))for(const a of ['placeholder','title','aria-label'])if(el.hasAttribute(a)){const v=el.getAttribute(a),t=T(v);if(t!==v)el.setAttribute(a,t);}}
const observer=new MutationObserver(records=>{observer.disconnect();for(const r of records){if(r.type==='characterData')text(r.target);else if(r.type==='childList')for(const n of r.addedNodes)walk(n);else if(r.type==='attributes'){const x=r.target.getAttribute(r.attributeName),t=T(x);if(x!==t)r.target.setAttribute(r.attributeName,t);}}observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['placeholder','title','aria-label']});});
function init(){walk(document.body);observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['placeholder','title','aria-label']});parent.postMessage({type:'r6-ready',lang},location.origin);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
window.__r6Translate={T,scan:()=>walk(document.body),language:lang};
// This shim routes exactly the original messages to the local authoritative rules.
window.R6LocalSocket=class {
static CONNECTING=0;static OPEN=1;static CLOSING=2;static CLOSED=3;
constructor(){this.readyState=0;this.handlers={};this.url='local://solo';nativeTimeout(()=>{if(this.readyState===3)return;this.readyState=1;const h={};this.peer={readyState:1,on:(event,fn)=>h[event]=fn,send:data=>queueMicrotask(()=>{this.onmessage?.({data});this.handlers.message?.({data});}),close:()=>this.close()};this.toServer=h;window.__r6Accept?.(this.peer);this.onopen?.();this.handlers.open?.();},0);}
addEventListener(event,fn){this.handlers[event]=fn;}
send(data){if(this.readyState!==1)throw new Error('Solo simulation not ready');this.toServer.message?.(data);}
close(){if(this.readyState===3)return;this.readyState=3;if(this.peer)this.peer.readyState=3;this.toServer?.close?.();this.onclose?.();this.handlers.close?.();}
};
})();
