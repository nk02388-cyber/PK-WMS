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

 await page.evaluate(()=>{palletDataReady=true;Object.keys(SLOT_ITEMS).forEach(k=>delete SLOT_ITEMS[k]);Object.assign(SLOT_ITEMS,{A:{'A-1':[{qty:10,receiveDate:'2026-10-02',withdrawals:[{date:'2026-10-08',qty:3}],returns:[{date:'2026-10-07',qty:1}]}]}});PKDashboardInsights.refresh();});
 const host=page.locator('#dashboardInsights');await host.locator('input').fill('2026-10-08');await host.locator('input').dispatchEvent('change');
 assert.equal(await host.locator('.di-stats strong').first().textContent(),'1 รายการ');assert.equal(await host.locator('svg').count(),1);
 await host.locator('select').selectOption('7');assert.equal(await host.locator('tbody tr').count(),7);

 const before=await host.locator('.di-stats').textContent();
 await page.evaluate(()=>{const chart=document.querySelector('.di-trend');window.scrollTo({top:scrollY+chart.getBoundingClientRect().top-300,behavior:'instant'});PKDashboardInsights.animate();});
 await page.waitForFunction(()=>[...document.querySelectorAll('.di-trend-series')].some(g=>g.getAnimations().some(a=>a.id==='pk-trend'&&a.currentTime>0&&a.currentTime<900)));
 assert.equal(await page.evaluate(()=>document.querySelectorAll('.di-trend-series').length),3);
 const mid=await page.locator('.di-trend-series').first().evaluate(el=>getComputedStyle(el).clipPath);assert.ok(mid.includes('inset('));assert.notEqual(mid,'inset(0px 0%)');
 await page.screenshot({path:'work/trend-motion-mid-'+viewport.width+'.png'});
 await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('.di-trend-series')].flatMap(g=>g.getAnimations().map(a=>a.finished)));});
 assert.equal(await page.locator('.di-trend-series').first().evaluate(el=>getComputedStyle(el).clipPath),'none');assert.equal(await host.locator('.di-stats').textContent(),before);
 await page.evaluate(()=>PKDashboardInsights.refresh());assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.id==='pk-trend').length),0);
 await host.locator('select').selectOption('30');await page.waitForFunction(()=>document.getAnimations().some(a=>a.id==='pk-trend'));
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.di-trend-series').first().evaluate(el=>getComputedStyle(el).clipPath),'none');await page.evaluate(()=>PKDashboardInsights.animate());assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.id==='pk-trend').length),0);
 await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>PKDashboardInsights.animate());await page.evaluate(()=>activateTab(document.getElementById('tab-floorplan')));assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.id==='pk-trend').length),0);
 assert.deepEqual(errors.filter(e=>!e.includes('supabase')),[]);console.log('PASS trend animation '+viewport.width+' reveal/filter/stable data/reduced motion/cancel');await page.close();
 } }finally{await browser.close()}})();
