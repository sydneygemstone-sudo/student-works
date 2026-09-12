const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--disable-gpu']});
 const page=await browser.newPage({viewport:{width:1024,height:768},hasTouch:true});
 const report={};
 try {
  await page.goto('https://YOUR-HOST.YOUR-TAILNET.ts.net:8443/');
  await page.locator('#practice').click();
  await page.keyboard.down('d');await page.keyboard.down(' ');
  report.rendering=await page.evaluate(()=>new Promise(resolve=>{
   const frames=[];let previous=performance.now(),start=previous;
   function sample(now){frames.push(now-previous);previous=now;if(now-start<5000)return requestAnimationFrame(sample);const sorted=frames.slice(2).sort((a,b)=>a-b);resolve({frames:frames.length,seconds:(now-start)/1000,medianFrameMs:sorted[Math.floor(sorted.length*.5)],p95FrameMs:sorted[Math.floor(sorted.length*.95)],reportedFPS:BeastApp.fps,reducedEffects:document.querySelector('#reducedEffects').checked});}
   requestAnimationFrame(sample);
  }));
  await page.keyboard.up('d');await page.keyboard.up(' ');
  assert(report.rendering.medianFrameMs<34,'Desktop median frame time should stay below 34 ms');
  await page.locator('#backLobby').click();await page.locator('[data-tab="quests"]').click();await page.locator('#questBattle').click();
  for(const k of ['j','i','k','u','o'])await page.keyboard.down(k);
  await page.waitForFunction(()=>BeastApp.state.status==='ended',null,{timeout:30000});
  for(const k of ['j','i','k','u','o'])await page.keyboard.up(k);
  report.quest=await page.evaluate(()=>({winner:BeastApp.state.winnerId===BeastApp.myId?'player':'guardian',gems:BeastApp.profile.gems,xp:BeastApp.profile.xp,energy:BeastApp.profile.energy,time:BeastApp.state.time}));
  assert.equal(report.quest.winner,'player');assert.equal(report.quest.gems,12);assert.equal(report.quest.xp,25);assert.equal(report.quest.energy,15);
  await page.screenshot({path:path.join(__dirname,'evolved-quest-complete.png')});
 }catch(e){report.error=e.message;process.exitCode=1;}finally{await browser.close();fs.writeFileSync(path.join(__dirname,'evolved-performance-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
})();
