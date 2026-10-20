const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,webkit}=require('C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await(process.env.PK_COPY_BROWSER==='webkit'?webkit.launch({headless:true}):chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}));
 try{for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:950},hasTouch:width===390}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   const u=new URL(route.request().url());if(u.hostname!=='localhost')return route.abort();const file=path.join(root,u.pathname==='/'?'index.html':u.pathname);if(!fs.existsSync(file))return route.abort();let body=fs.readFileSync(file);
   if(file.endsWith('index.html'))body=body.toString().replace(/const (SUPABASE_URL|STOCK_SUPABASE_URL) = '[^']*';/g,"const $1 = '';").replace(/<script src="account-status.js[^>]*><\/script>/,`<script>document.body.classList.remove('auth-pending','department-choosing');document.body.classList.add('auth-ready');window.getWmsCanAccess=()=>true;window.getWmsIsAdmin=()=>true;supabaseClient={rpc:async()=>({data:[]})};</script>`);
   return route.fulfill({body,contentType:file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'image/jpeg'});
  });
  await page.goto('http://localhost/');await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>{palletDataReady=true;activateTab(document.getElementById('tab-floorplan'));openZoomModal('O-1');zoomCenterPct={leftPct:45,topPct:28.6};zoomScale=innerWidth<900?1:2;updateZoomView();});
  if(width===390)await page.waitForFunction(()=>document.querySelector('.mobile-map-surface')?.width===2048);
  const result=await page.evaluate(()=>({counts:['O-1','P-1'].map(z=>ZONE_SLOTS[z].length),bottoms:PALLET_ROW_RACKS.filter(r=>r.scaleY).map(r=>r.top+(r.bottom-r.top)*r.scaleY),scales:[...document.querySelectorAll('.ov-compact-rack')].slice(-2).map(e=>e.style.transform),slots:document.querySelectorAll('#floorplanZoomSlots .zoom-slot').length,canvas:!mobileMapView||mobileMapSurface.width===2048}));
  assert.deepEqual(result.counts,[30,24]);assert.equal(result.slots,30);assert.ok(result.canvas);assert.ok(result.bottoms.every(b=>Math.abs(b-31.49377)<.001));assert.ok(result.scales.every(s=>s.includes('0.87')));
  fs.mkdirSync(path.join(root,'work/column-layout'),{recursive:true});await page.screenshot({path:path.join(root,`work/column-layout/${process.env.PK_COPY_BROWSER||'edge'}-${width}.png`)});
  assert.deepEqual(errors.filter(e=>!e.includes('supabase')),[]);console.log('PASS O1 30 slots/P1 24, matched baselines, artwork and '+(width===390?'mobile canvas':'desktop overlays'));await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
