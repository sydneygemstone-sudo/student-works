const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');const R=path.resolve(__dirname,'..'),live=!!process.env.HUB_QA_BASE,O=path.join(R,'shared/hub-r6/qa-final-presentation',live?'live':'local');fs.mkdirSync(O,{recursive:true});
const report={revision:'R6.1-final-presentation',scope:'Presentation-only verification. No room creation, gameplay writes, Worker deployment, or student review access.',live,checks:[],failures:[]};let browser,server;
function check(name,value,detail){report.checks.push({name,status:value?'PASS':'FAIL',detail});assert(value,name);}
async function visible(p){return p.locator('#language').evaluate(b=>{const r=b.getBoundingClientRect(),s=getComputedStyle(b);return {fixed:s.position==='fixed',inside:r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight,visible:s.display!=='none'&&s.visibility==='visible'&&r.height>=44,text:b.textContent.trim()};});}
(async()=>{try{
 let base=process.env.HUB_QA_BASE;
 if(!base){server=http.createServer((req,res)=>{try{const u=new URL(req.url,'http://local');let p=path.resolve(R,'.'+decodeURIComponent(u.pathname));if(p!==R&&!p.startsWith(R+path.sep))throw Error('path');if(fs.statSync(p).isDirectory())p=path.join(p,'index.html');res.setHeader('Content-Type',({'.html':'text/html;charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp'})[path.extname(p)]||'application/octet-stream');res.end(fs.readFileSync(p));}catch{res.writeHead(404).end('Not found');}});await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}/`;}
 browser=await chromium.launch({headless:true});const c=await browser.newContext({viewport:{width:1280,height:900},hasTouch:true,reducedMotion:'reduce'}),p=await c.newPage(),errors=[];c.setDefaultTimeout(15000);p.on('pageerror',e=>errors.push(e.message));
 await c.route('**/*',r=>{const u=r.request().url();return u.startsWith(base)||u.startsWith('data:')?r.continue():r.abort();});
 for(const project of ['adventure-world','martins-monster-quest'])for(const page of ['index','comparison','development','costs','guide','parents','review']){
  const route=project+'/hub/'+page+'.html';await p.goto(base+route+'?lang=zh-CN&source=final-check#preserved-anchor',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.__studioData);
  check(route+' uses a button, never a language dropdown',(await p.locator('button#language').count())===1&&(await p.locator('select#language').count())===0);
  let a=await visible(p);check(route+' Chinese offers English',a.text==='English'&&a.fixed&&a.inside&&a.visible,a);
  await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await p.waitForTimeout(100);a=await visible(p);check(route+' button stays in the viewport after scrolling',a.fixed&&a.inside&&a.visible,a);
  await p.locator('#language').tap();await p.waitForFunction(()=>document.documentElement.lang==='en');check(route+' one tap switches to English and offers 中文',(await p.locator('#language').innerText())==='中文');
  let u=new URL(p.url());check(route+' preserves query and hash',u.searchParams.get('source')==='final-check'&&u.hash==='#preserved-anchor');
  await p.locator('#language').focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>document.documentElement.lang==='zh-CN');check(route+' keyboard switching works',(await p.locator('#language').innerText())==='English');
 }
 await p.goto(base+'adventure-world/hub/?lang=zh-CN');await p.waitForFunction(()=>window.__studioData);
 check('Opus is the first current version',(await p.locator('.modelcard').first().getAttribute('id'))==='opus-touch');
 check('Hero image matches the Opus source',(await p.locator('.hero .cover').getAttribute('src')).includes('trio-opus'));
 check('Hero clearly identifies the favourite as Opus',(await p.locator('.hero h1').innerText()).includes('Opus'));
 check('Primary hero play enters the deployed Opus online game',(await p.locator('.hero a.primary').getAttribute('href')).startsWith('https://trio-world-opus.sydney-gemstone-games.workers.dev/'));
 check('Opus solo remains directly accessible',(await p.locator('[data-featured-solo]').getAttribute('href')).includes('solo-trio'));
 check('Astra remains available separately',await p.locator('#skyvale-hud1').count()===1);
 check('History remains in a separate lower section',await p.evaluate(()=>document.getElementById('history').getBoundingClientRect().top>document.getElementById('builds').getBoundingClientRect().top));
 check('Stable R6 metrics remain',await p.locator('.project-dashboard .metric').count()===4);
 await p.waitForSelector('#onlineFeature');check('Multiplayer and room review entry preserved',await p.locator('#onlineFeature a[data-room-link]').count()===1);
 await p.screenshot({path:path.join(O,'opus-first-desktop.png'),fullPage:false});
 for(const width of [768,390]){await p.setViewportSize({width,height:844});await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await p.waitForTimeout(150);const a=await visible(p);check('Persistent language button at '+width+'px',a.fixed&&a.inside&&a.visible,a);check('No horizontal overflow at '+width+'px',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await p.screenshot({path:path.join(O,'language-bottom-'+width+'.png')});}
 await p.goto(base+'adventure-world/hub/review.html?lang=zh-CN');await p.waitForFunction(()=>window.__studioData);await p.selectOption('#reviewer','Mia');await p.fill('#notes','Unsaved QA note must survive language switching.');await p.fill('#device','QA iPad');await p.locator('#language').tap();await p.waitForFunction(()=>document.documentElement.lang==='en');check('Unsaved feedback and selected reviewer survive the language switch',(await p.inputValue('#notes'))==='Unsaved QA note must survive language switching.'&&(await p.inputValue('#reviewer'))==='Mia'&&(await p.inputValue('#device'))==='QA iPad');
 for(const route of ['adventure-world/hub/online-reviews.html','adventure-world/builds/trio-world-opus/online/review.html']){await p.goto(base+route+'?lang=zh-CN');await p.waitForSelector('#language');let a=await visible(p);check(route+' keeps a fixed English button',a.fixed&&a.inside&&a.visible&&a.text==='English');await p.locator('#language').tap();await p.waitForFunction(()=>document.documentElement.lang==='en');check(route+' English offers 中文',(await p.locator('#language').innerText())==='中文');}
 check('No runtime exceptions',errors.length===0,errors);
 report.status='PASS';await c.close();
 }catch(e){report.status='FAIL';report.failures.push(e.message);console.error(e);}finally{if(browser)await browser.close();if(server){server.closeAllConnections?.();await new Promise(r=>server.close(r));}report.completedAt=new Date().toISOString();fs.writeFileSync(path.join(O,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,checks:report.checks.length,failures:report.failures},null,2));if(report.status!=='PASS')process.exitCode=1;}})();
