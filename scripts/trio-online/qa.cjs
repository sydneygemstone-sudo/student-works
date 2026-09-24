const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const DEPS=process.env.TRIO_TEST_DEPS||'/tmp/trio-online-qa/node_modules';const {Miniflare}=require(DEPS+'/miniflare'),{chromium}=require(DEPS+'/playwright'),WS=require(DEPS+'/ws');
const R=path.resolve(__dirname,'../..'),O=path.join(R,'adventure-world/builds/trio-world-opus/cloudflare/qa-r2');fs.mkdirSync(O,{recursive:true});const report={revision:'trio-online-r2-reviews-20260925',scope:'Synthetic rooms only. Real Worker runtime via Miniflare, original protocol actions and browser forms. Protocol movement is simulated; not physical-iPad/full human gameplay certification.',checks:[],failures:[],started:new Date().toISOString()};
const wait=ms=>new Promise(r=>setTimeout(r,ms));let mf,server,browser,api,front;const sockets=[];
const check=(name,passed,detail)=>{report.checks.push({name,status:passed?'PASS':'FAIL',detail});if(!passed)report.failures.push(name);assert(passed,name+(detail?' '+JSON.stringify(detail):''));};
async function until(f,ms=8000){const t=Date.now();while(Date.now()-t<ms){const x=await f();if(x)return x;await wait(40);}throw Error('Timed out waiting for condition');}
async function req(url,opts={}){const r=await fetch(api+url,{...opts,headers:{Origin:front||'https://sydneygemstone-sudo.github.io','Content-Type':'application/json',...opts.headers}});return {status:r.status,data:await r.json()};}
async function connect(code,name,resumeToken){const client={messages:[],personal:null};const ws=new WS(api.replace(/^http/,'ws')+'/ws2/'+code,{origin:front||'https://sydneygemstone-sudo.github.io'});sockets.push(ws);client.ws=ws;ws.on('message',raw=>{if(raw.toString()==='pong')return;const x=JSON.parse(raw);client.messages.push(x);if(x.personal)client.personal=x.personal;});ws.on('error',e=>{client.error=e.message;});await until(()=>ws.readyState===1||client.messages.some(x=>x.t==='error')||client.error);if(client.error)throw Error(client.error);if(ws.readyState===1)ws.send(JSON.stringify({t:'join',name,skin:0,resumeToken}));await until(()=>client.messages.some(x=>['init','error'].includes(x.t)));client.init=client.messages.find(x=>x.t==='init');client.send=async obj=>{ws.send(JSON.stringify(obj));await wait(175);};return client;}
async function move(c,x,z,y=0){await c.send({t:'pos',x,y,z,ry:0,anim:0});}
async function count(c,n){await until(()=>c.personal?.completed===n);check('Server completed '+n+'/14',true);}
async function startRuntime(){mf=new Miniflare({modules:true,scriptPath:path.join(R,'adventure-world/builds/trio-world-opus/cloudflare/worker.mjs'),compatibilityDate:'2025-04-01',durableObjects:{ROOMS:{className:'TrioRoom',useSQLite:true}},durableObjectsPersist:'/tmp/trio-r2-db',bindings:{TEST_ORIGIN:front}});api=(await mf.ready).origin;}
async function main(){try{
 server=http.createServer((req,res)=>{try{let p=path.resolve(R,'.'+new URL(req.url,'http://localhost').pathname);if(p!==R&&!p.startsWith(R+path.sep))throw Error();if(fs.statSync(p).isDirectory())p=path.join(p,'index.html');res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp'})[path.extname(p)]||'application/octet-stream');res.end(fs.readFileSync(p));}catch{res.writeHead(404).end('Not found');}});await new Promise(r=>server.listen(0,'127.0.0.1',r));front=`http://127.0.0.1:${server.address().port}`;await startRuntime();
 const h=await req('/health');check('Protocol 2 reports 6 digits, 3 players, 14 tasks',h.data.protocol===2&&h.data.roomCodeDigits===6&&h.data.maxPlayers===3&&h.data.tasks===14);
 const created=await req('/api/rooms',{method:'POST',body:'{}'});check('Six-digit room allocation',created.status===201&&/^\d{6}$/.test(created.data.code));const room=created.data;
 const denied=await req('/api/rooms/'+room.code+'/status');check('A numeric invitation alone cannot read reviews',denied.status===403);
 const a=await connect(room.code,'QA-A'),b=await connect(room.code,'QA-B'),c=await connect(room.code,'QA-C');check('Three distinct players join',!!a.init&&!!b.init&&!!c.init);
 const fourth=await connect(room.code,'QA-Fourth');check('Fourth player rejected',fourth.messages.some(x=>x.code==='ROOM_FULL'));
 const auth={Authorization:'Bearer '+a.init.resumeToken},view={'X-Room-View':room.viewKey};
 check('Premature review refused',(await req('/api/rooms/'+room.code+'/review',{method:'PUT',headers:auth,body:'{}'})).status===409);
 await a.send({t:'checkpoint',completed:14,stats:{celebrate:1}});check('Client cannot set completion directly',a.personal.completed===0);
 await move(a,0,4);await count(a,1);await move(a,0,-70);await count(a,2);await a.send({t:'fx',kind:'p1'});await count(a,3);await a.send({t:'fx',kind:'p3'});await count(a,4);
 for(const[i,x,z]of [[0,-6,-73],[1,8,-71],[2,-18,-75]]){await move(a,x,z);await a.send({t:'take',kind:'stars',id:'s'+i});}await count(a,5);
 await move(a,-85,0);await count(a,6);
 for(let j=0;j<3;j++){const angle=j/3*Math.PI*2;await move(a,-97+Math.cos(angle)*2.2,-10+Math.sin(angle)*2.2);await a.send({t:'take',kind:'fruits',id:'f'+j});}await count(a,7);
 async function wood(i){const angle=i/8*Math.PI*2+.2,d=7+i%3*3;await move(a,-85+Math.cos(angle)*d,Math.sin(angle)*d);await a.send({t:'take',kind:'wood',id:'w'+i});}
 await wood(0);await wood(1);await count(a,8);await move(a,-85,3);await a.send({t:'campfire'});await count(a,9);check('Campfire debits two wood',a.personal.inventory.wood===0);
 await move(a,65,0);await count(a,10);await move(a,79,-4);await a.send({t:'feed_supply'});await move(a,87,-10);await a.send({t:'feed',id:'a0',kind:'cow'});await move(a,75,2);await a.send({t:'feed',id:'a1',kind:'cow'});await count(a,11);
 const products=await until(()=>{const all={};for(const m of a.messages)if(m.t==='world'&&m.patch.produce)Object.assign(all,m.patch.produce);return Object.entries(all).filter(([,x])=>x&&typeof x==='object').length>=2?all:null;},10000);
 for(const[id,v]of Object.entries(products)){if(!v)continue;await move(a,v.x,v.z);await a.send({t:'take',kind:'produce',id});}await count(a,12);
 for(let i=2;i<7;i++)await wood(i);await move(a,81,7);for(let i=0;i<5;i++)await a.send({t:'build'});await count(a,13);
 check('Thirteenth task does not unlock submission',(await req('/api/rooms/'+room.code+'/review',{method:'PUT',headers:auth,body:'{}'})).status===409);
 await a.send({t:'celebrate'});check('Celebration away from fountain refused',a.personal.completed===13);
 await move(a,0,4);await a.send({t:'celebrate'});await count(a,14);check('Completion timestamp recorded',!!a.personal.completedAt);
 const access={code:room.code,token:a.init.resumeToken,viewKey:room.viewKey,id:a.init.id,name:'QA-A'};
 for(const s of sockets)if(s.readyState<2)s.close();await wait(200);await mf.dispose();await startRuntime();
 const me=await req('/api/rooms/'+room.code+'/me',{headers:auth});check('Progress survives Worker restart',me.status===200&&me.data.personal.completed===14&&me.data.personal.inventory.milk===2);
 check('Empty completion form rejected',(await req('/api/rooms/'+room.code+'/review',{method:'PUT',headers:auth,body:'{}'})).status===400);
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 const ctx=await browser.newContext({viewport:{width:1180,height:820},hasTouch:true,reducedMotion:'reduce'});ctx.setDefaultTimeout(20000);
 await ctx.addInitScript(({api,access})=>{window.TRIO_API_BASE=api;localStorage.setItem('trio-session:'+access.code,JSON.stringify(access));},{api,access});
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(front+'/adventure-world/builds/trio-world-opus/online/?lang=en#room='+room.code,{waitUntil:'domcontentloaded'});
 const game=await until(()=>page.frames().find(f=>f.url().includes('/online/game.html')));await game.locator('#go').tap();
 await game.waitForFunction(()=>window.__TRIO_QA__?.().connected);await game.waitForSelector('#trioReviewOverlay');check('Completed returning player automatically sees the full review',true);
 const form=await until(()=>page.frames().find(f=>f.url().includes('/online/review.html')));await form.waitForSelector('#reviewForm');
 await form.selectOption('[name="device"]','ipad');await form.selectOption('[name="browser"]','safari');await form.selectOption('[name="orientation"]','landscape');
 for(const name of ['overall','fun','visuals','controls','guidance','network','teamwork'])await form.selectOption('[name="rating-'+name+'"]','4');
 await form.selectOption('[name="difficulty"]','right');await form.selectOption('[name="replay"]','yes');
 for(const name of ['favorite','improvement','learning','expression'])await form.fill('[name="note-'+name+'"]','QA synthetic response: clear goals and shared progress.');
 await form.check('[name="knowledge"][value="shared-state"]');await form.selectOption('[name="bugPresent"]','yes');await form.selectOption('[name="severity"]','minor');
 for(const k of ['steps','expected','actual'])await form.fill('[name="bug-'+k+'"]','QA synthetic reproducible evidence '+k);await form.check('[name="consent"]');await form.locator('#saveDraft').tap();check('Local draft saved',await form.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('trio-review-draft:'))));
 await form.locator('#submitReview').tap();await form.waitForFunction(()=>document.getElementById('formMessage').textContent.includes('Submitted.'));check('Complete form submits from touch-enabled browser',true);
 const status=await req('/api/rooms/'+room.code+'/status',{headers:view});check('Cloud dashboard includes submitted answers and pending members',status.data.submitted===1&&status.data.players.length===3&&status.data.players[0].review.answers.bug.present);
 const answers=status.data.players[0].review.answers;const repeated=await req('/api/rooms/'+room.code+'/review',{method:'PUT',headers:auth,body:JSON.stringify(answers)});check('Submission idempotency avoids duplicates',repeated.data.idempotent===true&&repeated.data.review.revision===1);
 await page.goto(front+'/adventure-world/hub/online-reviews.html?lang=en#room='+room.code+'&view='+room.viewKey);await page.waitForSelector('.playerRow');await page.locator('details.report summary').click();await page.waitForSelector('.answer');
 await page.screenshot({path:path.join(O,'room-reviews-en.png'),fullPage:true});check('HUB state page reads complete submitted review',await page.locator('#roomLive').innerText().then(x=>x.includes('QA-A')&&x.includes('QA synthetic')));
 await wait(1600);answers.submissionId=crypto.randomUUID();answers.notes.improvement='QA live update without reloading the dashboard';await req('/api/rooms/'+room.code+'/review',{method:'PUT',headers:auth,body:JSON.stringify(answers)});
 await page.waitForFunction(()=>document.getElementById('roomLive').textContent.includes('QA live update without reloading'),null,{timeout:12000});check('Dashboard updates automatically after an edit',true);
 for(const width of [768,390]){await page.setViewportSize({width,height:900});check('Review dashboard fits width '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));}
 await page.goto(front+'/adventure-world/hub/?lang=zh-CN');await page.waitForSelector('#onlineFeature');check('R6 original four metrics retained',await page.locator('.project-dashboard .metric').count()===4);check('Actual deployed multiplayer link is on HUB',await page.locator('#onlineFeature a').first().getAttribute('href').then(x=>x.startsWith('https://trio-world-opus.sydney-gemstone-games.workers.dev/')));await page.setViewportSize({width:1280,height:900});await page.screenshot({path:path.join(O,'hub-online-zh.png'),fullPage:true});
 await page.goto(front+'/adventure-world/hub/guide.html?lang=en#multiplayer');await page.waitForSelector('#multiplayer');check('Bilingual guide explains capacity and review access',await page.locator('#multiplayer').innerText().then(x=>x.includes('3')&&x.includes('14')&&x.includes('six-digit')));
 check('No browser runtime exceptions',errors.length===0,errors);
 await ctx.close();await browser.close();browser=null;await mf.dispose();await startRuntime();const after=await req('/api/rooms/'+room.code+'/status',{headers:view});check('Submitted review survives a second Worker restart',after.data.submitted===1&&after.data.players[0].review.revision===2);
 const stranger=await req('/api/rooms/'+room.code+'/me',{headers:{Authorization:'Bearer '+'0'.repeat(64)}});check('Wrong player token cannot claim a review',stranger.status===403);
 const corsBad=await fetch(api+'/api/rooms',{method:'POST',headers:{Origin:'https://untrusted.example','Content-Type':'application/json'},body:'{}'});check('Untrusted web origin refused',corsBad.status===403);
 report.status='PASS';
 }catch(err){report.status='FAIL';report.failures.push(err.stack);console.error(err);}finally{for(const s of sockets)try{s.close();}catch{}if(browser)await browser.close();if(mf)try{await mf.dispose();}catch{}if(server){server.closeAllConnections?.();await new Promise(r=>server.close(r));}report.finished=new Date().toISOString();fs.writeFileSync(path.join(O,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,checks:report.checks.length,failures:report.failures},null,2));if(report.status!=='PASS')process.exitCode=1;}}
main();
