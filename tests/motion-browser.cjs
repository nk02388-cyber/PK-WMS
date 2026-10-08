const fs=require('fs'),path=require('path');
const {chromium,webkit}=require('C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await (process.env.PK_MOTION_BROWSER==='webkit'?webkit.launch({headless:true}):chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}));
 const results=[];
 try {
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
   const page=await browser.newPage({viewport});const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',route=>{
    const u=new URL(route.request().url());if(u.hostname!=='localhost')return route.abort();
    const file=path.join(root,u.pathname==='/'?'index.html':u.pathname);
    if(!fs.existsSync(file))return route.abort();let body=fs.readFileSync(file);
    if(file.endsWith('index.html'))body=body.toString().replace(/const (SUPABASE_URL|STOCK_SUPABASE_URL) = '[^']*';/g,"const $1 = '';").replace(/<script src="account-status.js[^>]*><\/script>/,`<script>document.body.classList.remove('auth-pending','department-choosing');document.body.classList.add('auth-ready');window.getWmsIsAdmin=()=>true;window.getWmsCanAccess=()=>true;window.getWmsActorName=()=> 'QA';supabaseClient={rpc:async()=>({data:[]})};</script>`);
    route.fulfill({body,contentType:file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':file.endsWith('.png')?'image/png':file.endsWith('.webp')?'image/webp':'image/jpeg'});
   });
   await page.goto('http://localhost/');

 await page.waitForTimeout(1700);
 await page.evaluate(()=>{palletDataReady=true;const original=computeTotalCapacity;computeTotalCapacity=()=>({usedPct:69.6,totalUsed:703,totalPallet:1010});renderSpeedMeter();computeTotalCapacity=original;});
 const before=await page.evaluate(()=>({total:document.querySelector('#stockTotalKpiFixed .value').textContent,styles:[...document.querySelectorAll('#pane-stock .bar-fill')].map(e=>e.getAttribute('style'))}));
 await page.evaluate(()=>PKMotion.enterPane(document.getElementById('pane-stock')));await page.evaluate(()=>new Promise(requestAnimationFrame));
 const running=await page.evaluate(()=>document.getAnimations().filter(a=>a.id==='pk-motion'&&a.playState==='running').length);assert.ok(running>0);
 const sweep=await page.evaluate(()=>{const n=document.querySelector('.sm-needle');const a=n.getAnimations()[0];return {pct:Number(n.dataset.percent),frames:a?.effect.getKeyframes().map(f=>f.transform),duration:a?.effect.getTiming().duration,origin:getComputedStyle(n).transformOrigin};});
 assert.ok(sweep.frames,'needle sweep starts');assert.ok(Math.abs(parseFloat(sweep.frames[0].slice(7))+1.8*sweep.pct)<.01);assert.ok(Math.abs(parseFloat(sweep.frames[1].slice(7))-(180-1.8*sweep.pct))<.01);assert.equal(sweep.frames.at(-1),'rotate(0deg)');assert.equal(sweep.duration,1500);assert.equal(sweep.origin,'84px 80px');
 const gaugeBefore=await page.locator('#pkSpeedMeterGauge').innerHTML();await page.evaluate(()=>{const original=computeTotalCapacity;computeTotalCapacity=()=>({usedPct:69.6,totalUsed:703,totalPallet:1010});renderSpeedMeter();computeTotalCapacity=original;});assert.equal(await page.locator('#pkSpeedMeterGauge').innerHTML(),gaugeBefore);
 await page.waitForTimeout(1700);assert.equal(await page.locator('.sm-needle').evaluate(el=>getComputedStyle(el).transform),'none');
 const after=await page.evaluate(()=>({total:document.querySelector('#stockTotalKpiFixed .value').textContent,styles:[...document.querySelectorAll('#pane-stock .bar-fill')].map(e=>e.getAttribute('style'))}));assert.deepEqual(after,before);assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.id==='pk-motion'&&a.playState==='running').length),0);
 await page.evaluate(()=>activateTab(document.getElementById('tab-floorplan')));assert.equal(await page.locator('#pane-floorplan').evaluate(el=>el.getAnimations({subtree:true}).length),0);
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>activateTab(document.getElementById('tab-stock')));await page.evaluate(()=>new Promise(requestAnimationFrame));assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.id==='pk-motion'&&a.playState==='running').length),0);
 await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>activateTab(document.getElementById('tab-product-history')));await page.evaluate(()=>activateTab(document.getElementById('tab-stock')));await page.waitForTimeout(800);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);assert.deepEqual(errors.filter(e=>!e.includes('supabase')),[]);console.log('PASS motion '+viewport.width+' animations='+running);await page.close();} }finally{await browser.close()}})();