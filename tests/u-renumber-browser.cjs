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



 await page.evaluate(()=>activateTab(document.getElementById('tab-floorplan')));

 await page.evaluate(()=>openZoomModal('U'));
 await page.waitForTimeout(400);
 const labels=await page.locator('#floorplanZoomSlots .zoom-slot-label').allTextContents();
 assert.deepEqual(labels.filter(s=>s.startsWith('U-')),Array.from({length:29},(_,i)=>`U-${String(i+1).padStart(2,'0')}`));
 const slots=await page.evaluate(()=>ZONE_SLOTS.U);
 assert.equal(slots.length,29);
 assert.equal(slots.find(s=>s.code==='U-14').leftPct,slots.find(s=>s.code==='U-02').leftPct);
 assert.equal(slots.find(s=>s.code==='U-14').topPct,slots.find(s=>s.code==='U-11').topPct);
 for(const [left,right] of [['U-03','U-04'],['U-21','U-22'],['U-26','U-27'],['U-28','U-29']]){
  const a=slots.find(s=>s.code===left),b=slots.find(s=>s.code===right);assert.ok(a.leftPct<b.leftPct);assert.equal(a.topPct,b.topPct);
 }
 assert.ok(slots.find(s=>s.code==='U-03').topPct<slots.find(s=>s.code==='U-06').topPct);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
 await page.screenshot({path:'work/u-renumber-'+viewport.width+'.png'});

 await page.evaluate(()=>{SLOT_ITEMS.U={'U-12':[{code:'QA',name:'Fixture',qty:1,receiveDate:new Date().toISOString().slice(0,10)}]};PALLET_STATUS.U={'U-12':'occupied'};openZoomModal('M-1');});
 const context=page.locator('#floorplanZoomSlots .zoom-context-slot[data-zone="U"]');
 assert.equal(await context.count(),29,'all 29 U positions render beside M1');
 assert.deepEqual(await context.locator('.zoom-slot-label').allTextContents(),Array.from({length:29},(_,i)=>`U-${String(i+1).padStart(2,'0')}`));
 assert.equal(await page.locator('#floorplanZoomSlots .zoom-slot').count(),24,'M1 edit scope unchanged');
 assert.equal(await context.filter({hasText:'U-12'}).evaluate(el=>el.classList.contains('occupied')&&!['age-green','age-yellow','age-red'].some(c=>el.classList.contains(c))),true,'U context stays neutral inside M1');
 assert.equal(await context.first().evaluate(el=>getComputedStyle(el).pointerEvents),'none');
 await page.screenshot({path:'work/u-context-m1-'+viewport.width+'.png'});
 await page.evaluate(()=>openZoomModal('T-1'));assert.equal(await context.count(),29);assert.equal(await context.filter({hasText:'U-12'}).evaluate(el=>el.classList.contains('age-green')),true);assert.equal(await page.locator('#floorplanZoomSlots .zoom-slot').count(),20);
 await page.evaluate(()=>openZoomModal('U'));assert.equal(await context.count(),0,'no duplicate U overlay in own zone');assert.equal(await page.locator('#floorplanZoomSlots .zoom-slot').count(),29);assert.equal(await page.locator('#floorplanZoomSlots .zoom-slot[data-slot="U-12"]').evaluate(el=>el.classList.contains('age-green')),true);
 assert.deepEqual(errors.filter(e=>!e.includes('supabase')),[]);console.log('PASS U 29 spatially numbered positions, zoom labels, no overflow '+viewport.width);
 await page.close();} }finally{await browser.close()}})();

