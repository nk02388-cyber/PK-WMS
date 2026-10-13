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
 assert.deepEqual(labels.filter(s=>s.startsWith('U-')),Array.from({length:25},(_,i)=>`U-${String(i+1).padStart(2,'0')}`));
 const slots=await page.evaluate(()=>ZONE_SLOTS.U);
 assert.equal(slots.length,25);
 assert.equal(slots.find(s=>s.code==='U-12').leftPct,slots.find(s=>s.code==='U-02').leftPct);
 assert.equal(slots.find(s=>s.code==='U-12').topPct,slots.find(s=>s.code==='U-09').topPct);
 assert.ok(slots.find(s=>s.code==='U-22').leftPct<slots.find(s=>s.code==='U-23').leftPct);
 assert.equal(slots.find(s=>s.code==='U-22').topPct,slots.find(s=>s.code==='U-23').topPct);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
 await page.screenshot({path:'work/u-renumber-'+viewport.width+'.png'});
 assert.deepEqual(errors.filter(e=>!e.includes('supabase')),[]);console.log('PASS U 25 spatially numbered positions, zoom labels, no overflow '+viewport.width);
 await page.close();} }finally{await browser.close()}})();

