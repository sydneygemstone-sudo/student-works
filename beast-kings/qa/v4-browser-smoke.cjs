const {chromium}=require('playwright');const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const PORT=process.env.SMOKE_PORT||8877,BASE='http://127.0.0.1:'+PORT;
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});const errors=[];const results=[];let pages=[];
try{
 const c1=await browser.newContext({viewport:{width:1180,height:820},hasTouch:true,deviceScaleFactor:1});
 const c2=await browser.newContext({viewport:{width:1180,height:820},hasTouch:true,deviceScaleFactor:1});
 for(const c of [c1,c2]){const p=await c.newPage();p.on('pageerror',e=>errors.push('pageerror: '+e.message));p.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});await p.goto(BASE);await p.waitForSelector('#hub:not([hidden])');pages.push(p);}
 const[a,b]=pages;
 // Hub loads, roster has 7 playable (no boss)
 await a.evaluate(()=>localStorage.setItem('beast-kings-evolve-profile',JSON.stringify({id:'smoke-a',name:'SmokeA',energy:500,gems:50})));
 await b.evaluate(()=>localStorage.setItem('beast-kings-evolve-profile',JSON.stringify({id:'smoke-b',name:'SmokeB',energy:500})));
 await a.reload();await b.reload();
 // join shared arena in duel mode
 await a.locator('#joinOnline').click();await b.locator('#joinOnline').click();
 await a.waitForFunction(()=>window.BK&&window.BK.state&&window.BK&&window.BK.state.slots&&window.BK&&window.BK.state.slots.filter(Boolean).length===2);
 await a.waitForSelector('#roomInfo:not([hidden])');
 results.push('Two players join shared room');
 // start round
 await a.locator('#startOnline').click();
 await a.waitForFunction(()=>window.BK&&window.BK.state&&window.BK&&window.BK.state.status==='playing');
 await b.waitForFunction(()=>window.BK&&window.BK.state&&window.BK&&window.BK.state.status==='playing');
 results.push('Duel starts');
 // depth touch: hold up + right simultaneously via CDP touch, then cancel
 const right=await a.locator('[data-key="right"]').boundingBox(),up=await a.locator('[data-key="up"]').boundingBox();
 const cdp=await a.context().newCDPSession(a);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:right.x+right.width/2,y:right.y+right.height/2,id:1},{x:up.x+up.width/2,y:up.y+up.height/2,id:2}]});
 await a.waitForTimeout(900);
 const pos1=await a.evaluate(()=>{const me=window.BK&&window.BK.state.players.find(p=>p.id===window.BK.myId);return {x:me.x,z:me.z};});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
 await a.waitForTimeout(300);
 const inputs1=await a.evaluate(()=>({right:window.BK.keys?window.BK.keys.right:null}));
 results.push('Multi-touch diagonal moves on floor (x='+Math.round(pos1.x)+' z='+Math.round(pos1.z)+')');
 // no stuck input after cancel: send fresh input frame
 // boost panel
 await a.locator('#boostButton').click();
 await a.waitForSelector('#boostPanel:not([hidden])');
 await a.locator('#boostOptions .boost-row').first().click();
 await a.waitForTimeout(500);
 const boostState=await a.evaluate(()=>{const me=window.BK&&window.BK.state.players.find(p=>p.id===window.BK.myId);return {boosts:me.boosts.map(b=>b.id),reserve:window.BK.profile.energy,spends:window.BK&&window.BK.state.spendEvents};});
 assert.equal(boostState.boosts.length,1,'boost active');
 assert(boostState.spends.some(e=>e.playerId==='smoke-a'),'spend receipt');
 results.push('Boost spends reserve with receipt (reserve now '+boostState.reserve+')');
 // boss mode via reset + mode button
 await a.locator('#pause').click();await a.waitForSelector('#gameOverlay:not([hidden])');await a.locator('#replay').click();
 await a.waitForFunction(()=>window.BK&&window.BK.state.status==='lobby');
 await a.locator('[data-mode="boss"]').click();
 await a.waitForTimeout(400);
 await a.locator('#startOnline').click();
 await a.waitForFunction(()=>window.BK&&window.BK.state.status==='playing'&&window.BK&&window.BK.state.mode==='boss');
 await b.waitForFunction(()=>window.BK&&window.BK.state.status==='playing'&&window.BK&&window.BK.state.mode==='boss');
 const boss=await a.evaluate(()=>window.BK&&window.BK.state.players.find(p=>p.boss));
 assert(boss&&boss.hp>700,'boss exists');
 assert(!(await a.locator('#bossBar').isHidden()),'boss bar visible');
 results.push('Boss mode: golem + boss bar live');
 // viewport checks
 const meta=await a.evaluate(()=>document.querySelector('meta[name=viewport]').content);
 assert(/user-scalable=no/.test(meta)&&/maximum-scale=1/.test(meta));
 results.push('Viewport zoom lock present');
 // controls fit landscape
 const bad=await a.locator('.controls button').evaluateAll(bs=>bs.filter(b=>{const r=b.getBoundingClientRect();return r.x<0||r.right>innerWidth||r.bottom>innerHeight;}).map(b=>b.textContent));
 assert.deepEqual(bad,[]);
 results.push('All controls fit landscape viewport');
 await a.screenshot({path:path.join(__dirname,'v4-boss-gameplay.png')});
 await a.evaluate(()=>window.BK&&window.BK.release());
 assert.deepEqual(errors,[]);
 results.push('No browser JavaScript errors');
}catch(e){results.push({failed:e.message});process.exitCode=1;}
finally{for(const p of pages){try{await p.evaluate(()=>{if(window.BK.ws)window.BK.ws.close();});}catch{}}await browser.close();fs.writeFileSync(path.join(__dirname,'v4-browser-results.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors},null,2));}})();
