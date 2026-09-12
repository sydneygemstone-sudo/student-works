const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../builds/astra'),base='http://127.0.0.1:18766';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let server;
async function start(){server=spawn(process.execPath,[path.join(root,'server.js')],{cwd:root,env:{...process.env,PORT:'18766'},windowsHide:true,stdio:'ignore'});for(let i=0;i<80;i++){try{if((await fetch(base+'/health')).ok)return;}catch{}await sleep(50);}throw Error('Test server failed to start');}
async function stop(){if(!server||server.exitCode!==null)return;const done=new Promise(r=>server.once('exit',r));server.kill();await done;}
(async()=>{let browser;const results=[],errors=[];try{await start();browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--disable-gpu']});const pages=[];
for(let i=0;i<2;i++){const c=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true});const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base);await p.locator('#join').click();await p.waitForFunction(()=>state!==null);pages.push(p);}
const [a,b]=pages;await a.waitForFunction(()=>state.connected.every(Boolean));await a.locator('#start').click();await b.waitForFunction(()=>state.status==='playing');
await a.context().setOffline(true);await b.waitForFunction(()=>state.status==='paused'&&!state.connected.every(Boolean));await a.locator('#reconnect').waitFor({state:'visible'});results.push('A lost Wi-Fi connection pauses the shared round and shows recovery');
await a.context().setOffline(false);await a.waitForFunction(()=>online&&state.connected.every(Boolean));await b.waitForFunction(()=>state.connected.every(Boolean));assert(await a.locator('#reconnect').isHidden());await a.locator('#resume').click();await b.waitForFunction(()=>state.status==='playing');results.push('Restoring Wi-Fi automatically reconnects both clients; resume works');
await stop();await a.locator('#reconnect').waitFor({state:'visible'});await start();await a.waitForFunction(()=>online&&state.status==='lobby'&&state.connected.every(Boolean),{},{timeout:20000});await b.waitForFunction(()=>online&&state.connected.every(Boolean),{},{timeout:20000});assert.notEqual(await a.evaluate(()=>slot),await b.evaluate(()=>slot));await a.locator('#start').click();await b.waitForFunction(()=>state.status==='playing');results.push('Both existing browser tabs recover automatically after host server restart');
await a.locator('#pause').click();await b.waitForFunction(()=>state.status==='paused');await a.screenshot({path:path.join(__dirname,'acceptance-ready.png')});
await a.locator('#leave').click();await a.locator('#join').waitFor({state:'visible'});await sleep(1300);const health=await(await fetch(base+'/health')).json();assert.equal(health.players.filter(Boolean).length,1);assert.equal(await a.evaluate(()=>token),null);results.push('Leave cancels reconnection and frees the player slot');
assert.deepEqual(errors,[]);results.push('No browser JavaScript errors during network recovery');
}catch(e){results.push({failed:e.message});process.exitCode=1;}finally{if(browser)await browser.close();await stop();fs.writeFileSync(path.join(__dirname,'network-resilience-results.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors},null,2));}})();
