'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const BASE=process.env.BK_SHOWCASE_BASE||'http://127.0.0.1:8899/beast-kings/showcase';
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:CHROME,args:['--disable-background-networking','--no-first-run']});
 const results=[];
 async function visit(name,path,fn){
   const page=await browser.newPage({viewport:{width:1180,height:820}});
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errors.push('console: '+m.text())});
   await page.goto(BASE+path,{waitUntil:'domcontentloaded',timeout:15000});
   await page.waitForTimeout(300);
   await fn(page);
   assert.deepEqual(errors,[],name+' browser errors: '+errors.join(' | '));
   results.push(name);console.log('PASS '+name);await page.close();
 }
 await visit('hub zh','/index.html?lang=zh',async p=>assert.match(await p.locator('body').innerText(),/四个主版本/));
 await visit('hub en','/index.html?lang=en',async p=>assert.match(await p.locator('body').innerText(),/Four main builds/));
 await visit('development bilingual','/development.html?lang=zh',async p=>{const t=await p.locator('body').innerText();assert.match(t,/19,164,679/);assert.match(t,/US\$5\.87/);await p.click('[data-lang-set="en"]');assert.match(await p.locator('body').innerText(),/Model investment/);});
 await visit('parent report bilingual','/parents.html?lang=zh',async p=>{assert.match(await p.locator('body').innerText(),/为什么这个项目其实很难/);await p.click('[data-lang-set="en"]');assert.match(await p.locator('body').innerText(),/Why this project is technically difficult/);});
 await visit('review save and export','/review.html?lang=zh',async p=>{
   await p.fill('[name="players"]','Nathan + Leo');await p.fill('[name="best"]','Combat feedback');
   await p.click('#saveNow');assert.match(await p.locator('#saveState').innerText(),/已保存/);
   const dl=await Promise.all([p.waitForEvent('download'),p.click('#downloadDoc')]);assert.match(dl[0].suggestedFilename(),/\.doc$/);
   await p.click('[data-lang-set="en"]');const en=await p.locator('body').innerText();assert.match(en,/PLAYTEST EVIDENCE/);assert.match(en,/Save Word document/);
 });
 await visit('original static replay','/versions/original/index.html?lang=zh',async p=>{
   assert.match(await p.locator('#connection').innerText(),/Git 单机重现/);
   await p.click('#start');await p.waitForTimeout(100);assert.equal(await p.locator('#overlay').isHidden(),true);
 });
 await visit('Astra Legends bilingual solo','/versions/astra-legends/index.html?lang=zh',async p=>{
   assert.match(await p.locator('body').innerText(),/LEGENDS 传奇更新/);
   await p.click('#practice');await p.waitForTimeout(150);assert.equal(await p.locator('#game').isHidden(),false);
 });
 await visit('GLM bilingual build','/versions/glm53/index.html?lang=zh',async p=>{
   const t=await p.locator('body').innerText();assert.match(t,/GLM 5\.3 UPGRADE/);assert.match(t,/LEGENDS 传奇更新/);await p.click('#practice');await p.waitForTimeout(150);assert.equal(await p.locator('#game').isHidden(),false);
 });
 await visit('SOL gauntlet end-to-end UI','/versions/sol56/index.html?mode=gauntlet&lang=zh',async p=>{
   await p.waitForSelector('#game:not([hidden])',{timeout:5000});assert.match(await p.locator('#gameMode').innerText(),/BEAST KING 车轮战/);
   const viewport=await p.locator('meta[name="viewport"]').getAttribute('content');assert.match(viewport,/user-scalable=no/);
   for(let stage=0;stage<7;stage++){
     await p.evaluate(()=>{const s=window.BeastApp.state;s.status='ended';s.winnerId=window.BeastApp.myId;});
     await p.waitForSelector('#gauntletOverlay:not([hidden])',{timeout:3000});
     const choices=p.locator('.gauntlet-choice');assert.equal(await choices.count(),3);await choices.first().click();await p.waitForTimeout(80);
   }
   await p.evaluate(()=>{const s=window.BeastApp.state;s.status='ended';s.winnerId='heroes';});
   await p.waitForSelector('#gauntletCertificate:not([hidden])',{timeout:3000});assert.match(await p.locator('#gauntletTitle').innerText(),/BEAST KING/);
   await p.click('#gauntletCertificate');assert.equal(await p.locator('#certificateDialog').getAttribute('open'),'');
   assert.ok((await p.locator('#certificateId').innerText()).length>8);
   await p.locator('#certificateDialog .certificate-close').click();
   await p.evaluate(()=>{Object.defineProperty(document.documentElement,'requestFullscreen',{value:undefined,configurable:true});Object.defineProperty(document.documentElement,'webkitRequestFullscreen',{value:undefined,configurable:true});});await p.click('#fullscreenButton');await p.waitForTimeout(80);assert.equal(await p.evaluate(()=>document.body.classList.contains('pseudo-fullscreen')),true);
 });
 console.log(JSON.stringify({ok:true,checks:results},null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});