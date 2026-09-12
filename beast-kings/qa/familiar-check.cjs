const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--disable-gpu']});
 const results=[],errors=[],contexts=[];const url=process.env.GAME_URL||'http://127.0.0.1:8767/';
 try{
  const pages=[];
  for(const [name,character] of [['QA Leo','fluffy'],['QA Nathan','water-rat']]){
   const context=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true});contexts.push(context);const p=await context.newPage();pages.push(p);p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.locator('#playerName').fill(name);await p.locator('#playerName').blur();await p.locator('[data-tab=roster]').click();assert.equal(await p.locator('[data-character]').count(),7);await p.locator('[data-character="'+character+'"]').click();await p.reload();assert.equal(await p.evaluate(()=>BeastApp.profile.character),character);await p.locator('[data-tab=roster]').click();await p.screenshot({path:path.join(__dirname,'familiar-'+character+'.png'),fullPage:true});await p.locator('[data-tab=lobby]').click();await p.locator('#practice').click();await p.waitForFunction(()=>BeastApp.state?.status==='playing');assert.equal(await p.evaluate(()=>BeastApp.state.players[0].character),character);await p.keyboard.down('o');await p.waitForTimeout(150);await p.keyboard.up('o');assert((await p.evaluate(()=>BeastApp.state.players[0].cd.special))>0);await p.reload();await p.locator('#joinOnline').click();await p.waitForFunction(()=>BeastApp.networkUp);results.push(character+': roster, refresh persistence, solo practice and special passed');
  }
  await pages[0].waitForFunction(()=>BeastApp.state?.players?.length===2);await pages[0].locator('#startOnline').click();for(const p of pages){await p.waitForFunction(()=>BeastApp.state?.status==='playing');assert.deepEqual(await p.evaluate(()=>BeastApp.state.players.map(p=>p.character)),['fluffy','water-rat']);}
  const before=await pages[1].evaluate(()=>BeastApp.state.players[0].x);await pages[0].keyboard.down('d');await pages[0].waitForTimeout(160);await pages[0].keyboard.up('d');await pages[1].waitForFunction(x=>BeastApp.state.players[0].x>x,before);results.push('Two independent browser profiles retain familiar identities and synchronize movement');
  await pages[0].evaluate(()=>{const s=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host);s.close();});
  assert.deepEqual(errors,[]);
 }finally{await browser.close();fs.writeFileSync(path.join(__dirname,'familiar-results.json'),JSON.stringify({results,errors,physicalIPadTested:false},null,2));console.log(JSON.stringify({results,errors},null,2));}
})().catch(e=>{console.error(e);process.exitCode=1;});
