import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const base=process.env.TEST_URL||'http://127.0.0.1:18940';
const browser=await chromium.launch({...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{}),headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[],errors=[];
const controls=['interact','ability','jump','power','skin','home','joystick'];
async function mockViewport(page){
  await page.addInitScript(()=>{
    const viewport=new EventTarget();
    Object.assign(viewport,{width:1024,height:560,offsetTop:0,offsetLeft:0,scale:1});
    Object.defineProperty(window,'visualViewport',{configurable:true,value:viewport});
    window.setTestViewport=(width,height,offsetTop=0,offsetLeft=0)=>{Object.assign(viewport,{width,height,offsetTop,offsetLeft});viewport.dispatchEvent(new Event('resize'));};
  });
}
async function enter(page,suffix){
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/?room=HUD'+Date.now().toString().slice(-8)+suffix);
  await page.locator('#nickname').fill('HUD QA');await page.locator('#start').click();
  await page.waitForFunction(()=>window.__skyvale?.state.online);
}
async function bounds(page,name){
  const state=await page.evaluate(ids=>{
    const v=visualViewport,left=v.offsetLeft,top=v.offsetTop;
    return {viewport:{left,top,width:v.width,height:v.height},controls:ids.map(id=>{const el=document.getElementById(id),r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{id,x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,visible:getComputedStyle(el).display!=='none',hit:hit===el||el.contains(hit)};})};
  },controls);
  for(const c of state.controls){assert(c.visible,`${name}: ${c.id} hidden`);assert(c.x>=state.viewport.left&&c.y>=state.viewport.top,`${name}: ${c.id} above/left`);assert(c.right<=state.viewport.left+state.viewport.width+.5,`${name}: ${c.id} off right`);assert(c.bottom<=state.viewport.top+state.viewport.height-15,`${name}: ${c.id} clipped at bottom`);assert(c.width>=44&&c.height>=44,`${name}: ${c.id} tap target too small`);assert(c.hit,`${name}: ${c.id} obscured`);}
  results.push({name,...state});
}
try{
  // Reproduce the old defect with browser chrome reducing only the visible viewport.
  const oldContext=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true,isMobile:true});
  const old=await oldContext.newPage();await mockViewport(old);
  const backup='development/ipad-hud-before/';
  for(const [url,file,type]of [['/','index.html','text/html'],['/game.js','game.js','text/javascript'],['/style.css','style.css','text/css']]){
    await old.route(u=>u.pathname===url,route=>route.fulfill({body:fs.readFileSync(backup+file),contentType:type}));
  }
  await enter(old,'OLD');const oldBottom=await old.locator('#actions').evaluate(el=>el.getBoundingClientRect().bottom);assert(oldBottom>560,'Old clipping not reproduced');results.push({name:'old bug reproduced',visibleHeight:560,oldActionsBottom:oldBottom});await oldContext.close();

  const context=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true,isMobile:true});
  const page=await context.newPage();await mockViewport(page);await enter(page,'NEW');
  for(const [width,height,top,left,label]of [[1024,560,0,0,'landscape-with-toolbar'],[1024,500,44,0,'toolbar-and-top-offset'],[1024,420,0,0,'short-visible-height'],[768,850,0,0,'portrait'],[1194,700,0,0,'ipad-pro-landscape'],[507,680,0,0,'split-view']]){
    await page.setViewportSize({width:Math.max(1024,width),height:Math.max(1024,height+top)});
    await page.evaluate(v=>window.setTestViewport(...v),[width,height,top,left]);
    await page.waitForTimeout(180);await bounds(page,label);
    if(label==='landscape-with-toolbar'||label==='portrait')await page.screenshot({path:`qa/ipad-${label}.png`});
  }
  await page.setViewportSize({width:1024,height:768});await page.evaluate(()=>window.setTestViewport(1024,560));
  // Real touch events: drag beyond the pad, cancel, then verify the next frame stopped.
  const session=await context.newCDPSession(page);const pad=await page.locator('#joystick').boundingBox();
  const point={x:pad.x+pad.width/2,y:pad.y+pad.height/2};
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
  await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x+180,y:point.y}]});
  await page.waitForFunction(()=>window.__skyvale.state.input.x>.5);
  await session.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  await page.waitForFunction(()=>window.__skyvale.state.input.x===0&&window.__skyvale.state.input.z===0);
  results.push({name:'active touch drag beyond joystick followed by cancellation stops input'});
  for(const id of ['power','skin','home','jump','ability','interact']){await page.locator('#'+id).tap();await page.waitForTimeout(450);}
  results.push({name:'all six action buttons accept touch taps'});
  assert.equal(errors.length,0,errors.join('\n'));await context.close();
  const result={base,results,errors,physicalIPadTested:false,cleanup:'All task-owned contexts and browser closed in finally; classroom server unchanged'};
  fs.writeFileSync('qa/ipad-hud-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify({checks:results.map(r=>r.name),errors}));
}finally{await browser.close();}
