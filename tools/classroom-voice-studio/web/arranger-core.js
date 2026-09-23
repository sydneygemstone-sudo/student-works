/* Pure, dependency-free arrangement utilities. No network or storage access. */
(function(root){'use strict';
const finite=(x,min,max,name)=>{if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)throw Error('Invalid '+name);return x;};
const safePath=s=>typeof s==='string'&&s.length<240&&!s.includes('..')&&!s.includes('\\')&&!/^(?:[a-z]+:|\/)/i.test(s);
function validate(p){
 if(!p||p.schema!=='classroom-audio-arrangement/1.0')throw Error('Unsupported project schema');
 if(!Array.isArray(p.tracks)||p.tracks.length<1||p.tracks.length>32||!Array.isArray(p.samples)||p.samples.length>64||!Array.isArray(p.scenes)||p.scenes.length<1||p.scenes.length>32)throw Error('Project limits exceeded');
 const ids=new Set();p.tracks.forEach(t=>{if(typeof t.id!=='string'||ids.has(t.id))throw Error('Duplicate track');ids.add(t.id);finite(t.gain,0,2,'gain');finite(t.pan,-1,1,'pan');});
 const samples=new Set();p.samples.forEach(s=>{if(samples.has(s.id)||!ids.has(s.track)||!safePath(s.file))throw Error('Invalid sample');samples.add(s.id);finite(s.duration,.001,120,'sample duration');});
 const scenes=new Set();p.scenes.forEach(s=>{if(scenes.has(s.id))throw Error('Duplicate scene');scenes.add(s.id);finite(s.duration,.1,180,'scene duration');if(!Array.isArray(s.stems)||!Array.isArray(s.events)||s.events.length>500)throw Error('Invalid scene');s.stems.forEach(st=>{if(!ids.has(st.track)||!safePath(st.file))throw Error('Invalid stem');});s.events.forEach(e=>{if(!samples.has(e.sample)||!ids.has(e.track))throw Error('Unknown event sample or track');const sample=p.samples.find(x=>x.id===e.sample);if(e.track!==sample.track)throw Error('Sample-track mismatch');finite(e.at,0,s.duration,'event time');finite(e.velocity,0,1,'velocity');finite(e.offset||0,0,sample.duration,'offset');finite(e.duration,.001,sample.duration,'event duration');if(e.at+e.duration>s.duration+.001||e.duration+(e.offset||0)>sample.duration+.001)throw Error('Event would truncate');});});
 return p;
}
function trackEnabled(t,tracks){return !t.mute&&(!tracks.some(x=>x.solo)||!!t.solo);}
function vlq(value){let n=Math.max(0,Math.round(value));const out=[n&127];while((n>>=7)>0)out.unshift((n&127)|128);return out;}
function midi(p,scene,tempo=120){
 validate(p);finite(tempo,40,240,'tempo');const ppq=480;const ev=[];const us=Math.round(60000000/tempo);
 const bytes=[0,255,81,3,(us>>16)&255,(us>>8)&255,us&255];
 scene.events.forEach(e=>{const sample=p.samples.find(s=>s.id===e.sample);const t=p.tracks.find(t=>t.id===e.track);if(!trackEnabled(t,p.tracks)||e.velocity<=0)return;const note=sample.midi_note||60;const channel=p.samples.indexOf(sample)%16;ev.push({tick:e.at*ppq*tempo/60,bytes:[144|channel,note,Math.max(1,Math.round(e.velocity*127))],off:false},{tick:(e.at+e.duration)*ppq*tempo/60,bytes:[128|channel,note,0],off:true});});
 ev.sort((a,b)=>a.tick-b.tick||(a.off?-1:1));let previous=0;ev.forEach(e=>{const tick=Math.round(e.tick);bytes.push(...vlq(tick-previous),...e.bytes);previous=tick;});bytes.push(0,255,47,0);
 const head=[77,84,104,100,0,0,0,6,0,0,0,1,1,224,77,84,114,107];const len=bytes.length;return new Uint8Array([...head,(len>>>24)&255,(len>>>16)&255,(len>>>8)&255,len&255,...bytes]);
}
function wav(buffer){
 const channels=buffer.numberOfChannels,n=buffer.length,sr=buffer.sampleRate;const out=new ArrayBuffer(44+n*channels*2),v=new DataView(out);const text=(at,s)=>[...s].forEach((c,i)=>v.setUint8(at+i,c.charCodeAt(0)));
 text(0,'RIFF');v.setUint32(4,out.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,channels,true);v.setUint32(24,sr,true);v.setUint32(28,sr*channels*2,true);v.setUint16(32,channels*2,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,n*channels*2,true);
 const data=Array.from({length:channels},(_,c)=>buffer.getChannelData(c));let peak=0;data.forEach(a=>{for(const x of a)peak=Math.max(peak,Math.abs(x));});const gain=peak>.891? .891/peak:1;let offset=44;for(let i=0;i<n;i++)for(let c=0;c<channels;c++){const x=Math.max(-1,Math.min(1,data[c][i]*gain));v.setInt16(offset,Math.round(x*(x<0?32768:32767)),true);offset+=2;}return {bytes:out,normalizationGain:gain,peak};
}
function envelope(buffer,hz=20){const x=buffer.getChannelData(0),hop=Math.round(buffer.sampleRate/hz),frames=[];for(let start=0;start<x.length;start+=hop){let energy=0;const end=Math.min(start+hop,x.length);for(let i=start;i<end;i++)energy+=x[i]*x[i];frames.push({t:+(start/buffer.sampleRate).toFixed(3),mouthOpen:+Math.min(1,Math.sqrt(energy/(end-start))*7).toFixed(3)});}return {schema:'speaking-envelope/1.0',method:'audio RMS; not phoneme-accurate lip sync',fps:hz,frames};}
const api={validate,safePath,trackEnabled,vlq,midi,wav,envelope};root.ArrangerCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
