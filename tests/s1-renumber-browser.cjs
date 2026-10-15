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




 await page.evaluate(()=>{palletDataReady=true;openZoomModal('S-1')});
 await page.waitForTimeout(150);
 const labels=await page.locator('#floorplanZoomSlots .zoom-slot-label').allTextContents();assert.deepEqual(labels.filter(s=>s.startsWith('S1-')),Array.from({length:17},(_,i)=>'S1-'+String(i+1).padStart(2,'0')));const geometry=await page.evaluate(()=>ZONE_SLOTS['S-1']);assert.deepEqual([...geometry].sort((a,b)=>a.topPct-b.topPct||a.leftPct-b.leftPct).map(s=>s.code),geometry.map(s=>s.code));
 for(const code of ['S1-15','S1-16','S1-17']){const el=page.locator('#floorplanZoomSlots .zoom-slot[data-slot="'+code+'"]').first();assert.equal(await el.count(),1);const box=await el.boundingBox();assert.ok(box.width>0&&box.height>0);}
 const result=await page.evaluate(()=>({total:ZONE_SLOTS['S-1'].length,rows:ZONE_SLOTS['S-1'].reduce((a,s)=>(a[s.topPct]=(a[s.topPct]||0)+1,a),{}),locations:document.querySelector('#incomingLocationSlot')?.innerHTML}));
 assert.equal(result.total,17);assert.deepEqual(Object.values(result.rows).sort((a,b)=>a-b),[3,3,3,8]);
 if(viewport.width===1440)await page.screenshot({path:'work/s1-renumbered-desktop.png'});
 await page.locator('#floorplanZoomSlots .zoom-slot[data-slot="S1-16"]').first().click();
 assert.equal(await page.evaluate(()=>editingSlot.slot),'S1-16');
 assert.deepEqual(errors,[]);console.log('PASS S1 sequential physical rows and position editing '+viewport.width);await page.close();
 } }finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});

