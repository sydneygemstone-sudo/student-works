/* Reproducible R6 browser checks, run on an isolated GitHub Actions runner. */
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const R=path.resolve(__dirname,'..'),O=path.join(R,'shared/hub-r6/qa');fs.mkdirSync(O,{recursive:true});
let browser,server;const report={release:'2026.09-r6',started:new Date().toISOString(),checks:[],failures:[],screens:[],physical_ipad:false,scope:'Native R5-derived HUBs, consolidated budgets, direct browser solo, language, local saves, pause and navigation. Not a physical-device or full Martin boss campaign certification.'};
const check=(name,value,detail)=>{report.checks.push({name,status:value?'PASS':'FAIL',detail});if(!value)report.failures.push(name+': '+JSON.stringify(detail));};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function screenshot(p,n,fullPage=false){await p.screenshot({path:path.join(O,n+'.png'),fullPage,animations:'disabled'});report.screens.push(n+'.png');}
async function start(frame,id){
 if(id==='skyvale'){await frame.locator('#nickname').fill('Solo Explorer');await frame.locator('#start').click();await frame.waitForFunction(()=>window.__skyvale?.state.online);}
 if(id==='opus'){await frame.locator('#name').fill('SoloExplorer');await frame.locator('#go').click();await frame.waitForFunction(()=>window.__R6Game?.snapshot().connected);}
 if(id==='martin-v2'){await frame.locator('[data-a="new"]').click();await frame.locator('[data-a="starter"]').first().click();await frame.locator('[data-a="story-next"]').click();await frame.waitForFunction(()=>window.MQ?.snapshot().state==='explore');}
 if(id==='martin-v1'){for(const s of ['#btn-go-to-select','#btn-confirm-selection','#btn-start-overworld'])await frame.locator(s).click();await frame.waitForFunction(()=>window.game?.party.length>0);}
 if(id==='aw-v1'){await frame.locator('#btn-title-start').click();await frame.locator('#btn-confirm-avatar').click();await frame.waitForFunction(()=>window.__AW_GAME__?.state.uiState==='PLAY');}
}
async function ready(p){await p.waitForFunction(()=>window.__r6Shell?.ready);const f=p.frames().find(x=>x.url().includes('/game/index.html'));if(!f)throw Error('Missing game frame');return f;}
async function main(){
 try{
 server=http.createServer((req,res)=>{try{let pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);if(!pathname.startsWith('/student-works/'))throw Error('Outside project prefix');let f=path.resolve(R,pathname.slice('/student-works/'.length));if(f!==R&&!f.startsWith(R+path.sep))throw Error('Path');if(fs.statSync(f).isDirectory())f=path.join(f,'index.html');const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));}catch{res.writeHead(404).end('Not found');}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}/student-works/`;
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 const map=JSON.parse(fs.readFileSync(path.join(R,'shared/hub-r6/runtime-map.json')));
 for(const[id,folder]of Object.entries(map))for(const lang of ['zh-CN','en']){
  const c=await browser.newContext({viewport:{width:1180,height:820},hasTouch:true,deviceScaleFactor:1,reducedMotion:'reduce'}),p=await c.newPage(),errors=[],ws=[];c.setDefaultTimeout(20000);p.on('pageerror',e=>errors.push(e.message));p.on('websocket',s=>ws.push(s.url()));
  await c.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
  try{
   await p.goto(base+folder+'/?lang='+lang,{waitUntil:'domcontentloaded'});let f=await ready(p);await start(f,id);await sleep(700);
   check(id+' '+lang+' started with real canvas',(await f.locator('canvas').count())>0);
   const text=await f.locator('body').innerText();fs.writeFileSync(path.join(O,id+'-'+lang+'-visible.txt'),text);
   const chinese=lang==='en'?[...text.matchAll(/[\u3400-\u9fff]{2,}/g)].map(x=>x[0]):[];
   report.checks.push({name:id+' '+lang+' rendered language',status:'REVIEW',remaining_chinese:[...new Set(chinese)]});
   check(id+' '+lang+' iframe locale',(await f.locator('html').getAttribute('lang'))===lang);
   if(lang==='zh-CN')check(id+' Chinese readable text',/[\u3400-\u9fff]/.test(text));
   check(id+' '+lang+' no network game server',ws.length===0,{websockets:ws});
   check(id+' '+lang+' direct project return',(await p.locator('#home').getAttribute('href')).startsWith('../hub/'));
   await screenshot(p,id+'-'+lang);
   await p.locator('#pause').click();await sleep(100);const a=await f.evaluate(()=>performance.now());await sleep(250);const b=await f.evaluate(()=>performance.now());check(id+' '+lang+' simulation clock paused',Math.abs(a-b)<5,{difference:b-a});await p.locator('#resume').click();await sleep(100);check(id+' '+lang+' resume',(await f.evaluate(()=>performance.now()))>b+30);
   await f.evaluate(()=>window.__R6Game?.save?.());const keyCount=await f.evaluate(()=>Object.keys(localStorage).filter(x=>x.startsWith('r6-')||x.includes('r6-v2')).length);check(id+' '+lang+' local checkpoint',keyCount>0,{keys:keyCount});
   if(lang==='zh-CN'){
    await p.locator('#language').click();await p.waitForFunction(()=>window.__r6Shell.ready&&document.documentElement.lang==='en');f=await ready(p);await sleep(250);check(id+' language toolbar switches',(await f.locator('html').getAttribute('lang'))==='en');
    check(id+' language reload preserves a checkpoint',await f.evaluate(()=>Object.keys(localStorage).some(x=>x.startsWith('r6-')||x.includes('r6-v2'))));
   }
   check(id+' '+lang+' no runtime exceptions',errors.length===0,errors);
  }catch(e){check(id+' '+lang+' runtime sequence',false,e.message);try{await screenshot(p,id+'-'+lang+'-failure');const f=p.frames()[1];if(f)fs.writeFileSync(path.join(O,id+'-'+lang+'-failure.txt'),await f.locator('body').innerText());}catch{}}
  await c.close();
 }
 const c=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:true,reducedMotion:'reduce',acceptDownloads:true}),p=await c.newPage();c.setDefaultTimeout(15000);const errors=[],links=new Set();p.on('pageerror',e=>errors.push(e.message));
 for(const [folder,id]of [['martins-monster-quest','martin'],['adventure-world','trio']]){
  const b=JSON.parse(fs.readFileSync(path.join(R,folder,'hub/budget.json')));check(id+' complete budget sum',Math.abs(b.items.reduce((s,x)=>s+x.aud,0)-b.api_equivalent_aud)<.001,b);check(id+' no blank budget rows',b.items.every(x=>Number.isFinite(x.aud)&&x.range.length===2));if(id==='trio')check('Prior Adventure World cost imported',b.items[0].aud===8);
  for(const lang of ['zh-CN','en'])for(const page of ['index','comparison','development','costs','guide','parents','review']){
   try{await p.goto(base+folder+'/hub/'+page+'.html?lang='+lang,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.__studio?.release==='2026.09-r6');let x=await p.evaluate(()=>({text:document.body.innerText,wide:document.documentElement.scrollWidth>innerWidth+2,links:[...document.querySelectorAll('a[href],img[src],script[src],link[href]')].map(e=>e.href||e.src),baseline:window.__studio.nativeBaseline}));check(id+' '+page+' '+lang+' native layout',x.baseline==='CLASSROOM-HUB-R5-20260923'&&!x.wide&&!/undefined|NaN|Infinity/.test(x.text));x.links.forEach(a=>links.add(a));
    if(page==='index'){check(id+' current before historical',await p.evaluate(()=>document.querySelector('#builds').offsetTop<document.querySelector('#history').offsetTop));check(id+' four R5 metric cards',await p.locator('.project-dashboard .metric').count()===4);await p.evaluate(()=>document.querySelectorAll('img').forEach(x=>x.loading='eager'));await sleep(300);if(lang==='zh-CN')await screenshot(p,id+'-hub-desktop',true);}
   }catch(e){check(id+' '+page+' '+lang+' HUB',false,e.message);}
  }
  for(const width of [1024,768,390]){await p.setViewportSize({width,height:900});await p.goto(base+folder+'/hub/');await p.waitForFunction(()=>window.__studio);check(id+' HUB width '+width,await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));if(width===768)await screenshot(p,id+'-hub-tablet',true);}await p.setViewportSize({width:1440,height:1000});
 }
 await p.goto(base+'adventure-world/hub/review.html');await p.waitForFunction(()=>window.__studio);await p.selectOption('#reviewer','Joey');await p.fill('#notes','QA only: device -> action -> expected -> actual');await p.click('#saveFeedback');await p.selectOption('#reviewer','Mia');check('Reviewer drafts are separate',(await p.inputValue('#notes'))==='');await p.selectOption('#reviewer','Joey');check('Reviewer draft restored',(await p.inputValue('#notes')).startsWith('QA only:'));const dl=p.waitForEvent('download');await p.click('#exportFeedback');const d=await dl;const dest=path.join(O,'qa-draft.json');await d.saveAs(dest);check('Feedback JSON export',JSON.parse(fs.readFileSync(dest)).reviewer==='Joey');fs.unlinkSync(dest);
 const bad=[];for(const u of links){if(!u.startsWith(base))continue;const rel=new URL(u).pathname.slice('/student-works/'.length),f=path.join(R,rel);if(rel.endsWith('qa/results.json'))continue;if(!fs.existsSync(f))bad.push(rel);}check('All local links and assets',!bad.length,bad);check('No HUB runtime errors',errors.length===0,errors);await c.close();
 }catch(e){check('QA harness',false,e.stack);}finally{if(browser)await browser.close();if(server){server.closeAllConnections?.();await new Promise(r=>server.close(r));}report.finished=new Date().toISOString();report.status=report.failures.length?'FAIL':'PASS';fs.writeFileSync(path.join(O,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,count:report.checks.length,failures:report.failures},null,2));if(report.failures.length)process.exitCode=1;}
}
main();
