const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--disable-gpu']});
  const context = await browser.newContext({viewport:{width:1180,height:820},hasTouch:true,deviceScaleFactor:1});
  const page = await context.newPage();
  const errors=[];
  page.on('pageerror', e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8765');
  await page.screenshot({path:path.join(__dirname,'ipad-lobby.png')});
  const ui = await page.locator('body').innerText();
  const controls = await page.locator('button,input,select,canvas').evaluateAll(nodes=>nodes.map(e=>({tag:e.tagName,id:e.id,text:e.textContent,aria:e.getAttribute('aria-label'),box:{x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}})));
  const result={ui,controls,errors};
  fs.writeFileSync(path.join(__dirname,'ui-inspection.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
