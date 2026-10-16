const fs=require('fs'),path=require('path');
const {chromium,webkit}=require('C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await(process.env.PK_AUDIT_BROWSER==='webkit'?webkit.launch({headless:true}):chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}));
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



 await page.evaluate(()=>{palletDataReady=true;activateTab(document.getElementById('tab-floorplan'));});
 for(const rotation of [0,90,180,270]){
  await page.evaluate(angle=>{mapRotation=angle;openZoomModal('U')},rotation);
  await page.waitForTimeout(100);
  const before=await page.evaluate(()=>zoomScale);
  await page.locator('#floorplanZoomSlots .zoom-slot[data-slot="U-27"]').click();
  await page.waitForFunction(()=>{const v=zoomViewport.getBoundingClientRect(),s=zoomSlotsLayer.querySelector('.editing-slot')?.getBoundingClientRect(),p=slotEditPanel.getBoundingClientRect();return s&&s.left>=v.left+10&&s.right<=v.right-10&&s.top>=v.top+10&&s.bottom<=Math.min(v.bottom,p.top)-10});
  assert.equal(await page.evaluate(()=>editingSlot.slot),'U-27');assert.equal(await page.evaluate(()=>zoomScale),before,'selection pans without changing zoom');
  if(viewport.width===1440&&rotation===0)await page.screenshot({path:'work/u27-visible-with-details.png'});
  await page.evaluate(()=>closeSlotEdit());
 }
 assert.deepEqual(errors,[]);console.log('PASS selected U27 visible above details in four rotations, same zoom '+viewport.width);await page.close();
 } }finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
