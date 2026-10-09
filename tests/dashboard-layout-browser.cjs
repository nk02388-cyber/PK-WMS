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
   await page.addInitScript(()=>localStorage.setItem('pk-dashboard-theme-haulix','light'));await page.goto('http://localhost/');


 await page.waitForTimeout(1800);

 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{palletDataReady=true;SLOT_ITEMS.A={};const end=new Date('2026-10-09T00:00:00Z');for(let i=0;i<30;i++){const d=new Date(end-i*86400000).toISOString().slice(0,10);SLOT_ITEMS.A['QA-'+i]=[{code:'QA-'+i,name:'สินค้าทดสอบ',qty:100,unit:'ชิ้น',receiveDate:d,withdrawals:Array.from({length:i%4+1},()=>({date:d,qty:2})),returns:i%3===0?[{date:d,qty:1}]:[]}];}const original=computeTotalCapacity;computeTotalCapacity=()=>({usedPct:70.4,totalUsed:711,totalPallet:1010});renderSpeedMeter();computeTotalCapacity=original;PKDashboardInsights.refresh();document.querySelectorAll('.notification-toast').forEach(el=>el.remove());});
 assert.equal(await page.locator('.top-summary-row').count(),0);assert.equal(await page.locator('.dashboard-overview > *').count(),3);
 const boxes=await page.locator('.dashboard-overview > *').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().toJSON()));if(viewport.width>1250)assert.ok(boxes.every(r=>Math.abs(r.top-boxes[0].top)<1));else{assert.ok(Math.abs(boxes[0].top-boxes[1].top)<1);assert.ok(boxes[2].top>=boxes[0].bottom);}
 for(const theme of ['light','dark']){await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);if(theme==='dark')await page.waitForFunction(()=>getComputedStyle(document.getElementById('diTitle')).color==='rgb(237, 244, 247)');if(theme==='dark')assert.equal(await page.locator('#diTitle').evaluate(el=>getComputedStyle(el).color),'rgb(237, 244, 247)');await page.screenshot({path:'work/dashboard-layout-'+theme+'-'+viewport.width+'.png'});}
 assert.deepEqual(errors.filter(e=>!e.includes('supabase')),[]);console.log('PASS dashboard layout '+viewport.width);await page.close();
 } }finally{await browser.close()}})();
