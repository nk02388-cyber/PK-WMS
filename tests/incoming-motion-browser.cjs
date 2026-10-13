const fs=require('fs'),path=require('path');
const {chromium}=require('C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try {
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
   const page=await browser.newPage({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:3});const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',route=>{
    const u=new URL(route.request().url());if(u.hostname!=='localhost')return route.abort();
    const file=path.join(root,u.pathname==='/'?'index.html':u.pathname);
    if(!fs.existsSync(file))return route.abort();let body=fs.readFileSync(file);
    if(file.endsWith('index.html'))body=body.toString().replace(/const (SUPABASE_URL|STOCK_SUPABASE_URL) = '[^']*';/g,"const $1 = '';").replace(/<script src="account-status.js[^>]*><\/script>/,`<script>document.body.classList.remove('auth-pending','department-choosing');document.body.classList.add('auth-ready');window.getWmsIsAdmin=()=>true;window.getWmsCanAccess=()=>true;window.getWmsActorName=()=> 'QA';supabaseClient={rpc:async()=>({data:[]})};</script>`);
    route.fulfill({body,contentType:file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':file.endsWith('.png')?'image/png':file.endsWith('.webp')?'image/webp':'image/jpeg'});
   });
   await page.goto('http://localhost/');




 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>activateTab(document.getElementById('tab-incoming')));
 await page.waitForFunction(()=>document.querySelector('#pane-incoming .incoming-panel').getAnimations().some(a=>a.currentTime>0&&a.currentTime<300));
 const panel=page.locator('#pane-incoming .incoming-panel');
 const motion=await panel.evaluate(el=>{const a=el.getAnimations().find(a=>a.effect.getKeyframes()[0].transform!==undefined);return {duration:a.effect.getTiming().duration,frames:a.effect.getKeyframes(),transform:getComputedStyle(el).transform};});
 assert.equal(motion.duration,380);assert.equal(motion.frames[0].transform,'translateX(40px)');assert.notEqual(motion.transform,'none');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
 await page.evaluate(async()=>{await Promise.all(document.querySelector('#pane-incoming .incoming-panel').getAnimations().map(a=>a.finished));});
 assert.equal(await panel.evaluate(el=>getComputedStyle(el).transform),'none');
 await page.evaluate(()=>{activateTab(document.getElementById('tab-incoming'));activateTab(document.getElementById('tab-stock'));});await page.waitForTimeout(50);assert.equal(await panel.evaluate(el=>el.getAnimations().length),0);
 assert.equal(await page.evaluate(()=>typeof Motion.animateMini),'function','real Motion runtime is installed');
 await page.evaluate(()=>activateTab(document.getElementById('tab-incoming')));await page.waitForTimeout(420);
 await page.locator('[data-incoming-view="putaway"]').click();
 await page.waitForFunction(()=>document.querySelector('#incomingPutawayTitle').closest('.incoming-step').getAnimations().length>0);
 await page.locator('[data-incoming-view="history"]').click();
 assert.equal(await page.locator('#incomingPutawayTitle').evaluate(el=>el.closest('.incoming-step').getAnimations().length),0);
 await page.waitForTimeout(400);assert.equal(await page.locator('#incomingHistoryPanel').evaluate(el=>getComputedStyle(el).transform),'none');
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>activateTab(document.getElementById('tab-incoming')));await page.waitForTimeout(50);assert.equal(await panel.evaluate(el=>el.getAnimations().length),0);
 assert.deepEqual(errors.filter(e=>!e.includes('supabase')),[]);console.log('PASS incoming slide from right, settle, cancel, reduced-motion/no overflow '+viewport.width);await page.close();
 } }finally{await browser.close()}})();
