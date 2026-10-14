const fs=require('fs'),path=require('path');
const {chromium}=require('C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try {
  for(const viewport of [{width:1920,height:960},{width:390,height:600}]){
   const page=await browser.newPage({viewport,isMobile:viewport.width<500,hasTouch:true,deviceScaleFactor:2});const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',route=>{
    const u=new URL(route.request().url());if(u.hostname!=='localhost')return route.abort();
    const file=path.join(root,u.pathname==='/'?'index.html':u.pathname);
    if(!fs.existsSync(file))return route.abort();let body=fs.readFileSync(file);
    if(file.endsWith('index.html'))body=body.toString().replace(/const (SUPABASE_URL|STOCK_SUPABASE_URL) = '[^']*';/g,"const $1 = '';").replace(/<script src="account-status.js[^>]*><\/script>/,`<script>document.body.classList.remove('auth-pending','department-choosing');document.body.classList.add('auth-ready');window.getWmsIsAdmin=()=>true;window.getWmsCanAccess=()=>true;window.getWmsActorName=()=> 'QA';supabaseClient={rpc:async()=>({data:[]})};</script>`);
    route.fulfill({body,contentType:file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':file.endsWith('.png')?'image/png':file.endsWith('.webp')?'image/webp':'image/jpeg'});
   });
   await page.goto('http://localhost/');


 await page.evaluate(()=>{activateTab(document.getElementById('tab-floorplan'));setOverviewFullscreen(true);});
 await page.waitForTimeout(100);
 const cdp=await page.context().newCDPSession(page);
 for(const rotation of [90,270]){
  await page.evaluate(r=>{mapRotation=r;ovReset()},rotation);
  const rect=await page.locator('#floorplanImageWrap').boundingBox();const x=rect.x+rect.width*.15,y=rect.y+rect.height*.7;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y-100,{steps:8});await page.mouse.up();
  const mouse=await page.evaluate(()=>ovPanY);assert.ok(mouse < -90,`mouse pans rotated ${rotation}: ${mouse}`);
  await page.evaluate(()=>ovReset());
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-100,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const touch=await page.evaluate(()=>ovPanY);assert.ok(touch < -90,`touch pans rotated ${rotation}: ${touch}`);
  assert.equal(await page.locator('#floorplanZoomModal').isVisible(),false,'drag does not select a zone');
  await page.evaluate(()=>{ovPanY=-100000;ovApply()});
  const bounds=await page.evaluate(()=>{const img=floorplanStage.querySelector('.floorplan-image');const l=overviewPortraitLayout(floorplanWrap.clientWidth,img.naturalHeight/img.naturalWidth,mapRotation);return {pan:ovPanY,min:floorplanWrap.clientHeight-floorplanWrap.clientWidth/l.aspectRatio}});
  assert.ok(Math.abs(bounds.pan-bounds.min)<1,'drawing bottom reachable without blank overscroll');
 }

 await page.evaluate(()=>ovReset());
 await page.locator('#floorplanOverviewZoomOut').click();
 assert.ok(await page.evaluate(()=>ovScale<1),'minus button zooms below 100%');
 await page.evaluate(()=>{for(let i=0;i<30;i++)ovZoomAt(innerWidth/2,innerHeight/2,1/1.4)});
 assert.equal(await page.evaluate(()=>ovScale),0.1);
 assert.equal(await page.locator('#floorplanZoomLevel').textContent(),'10%');
 const centered=await page.evaluate(()=>({x:ovPanX,w:floorplanWrap.clientWidth}));
 assert.ok(Math.abs(centered.x-centered.w*.45)<1,'small drawing remains centered');
 await page.locator('#floorplanOverviewZoomIn').click();assert.ok(await page.evaluate(()=>ovScale>0.1));
 await page.locator('#floorplanOverviewZoomReset').click();assert.equal(await page.evaluate(()=>ovScale),1);
 await page.evaluate(()=>setOverviewFullscreen(false));await page.waitForTimeout(100);await page.evaluate(()=>ovReset());
 assert.ok(Math.abs(await page.evaluate(()=>ovPanY))<1,'normal fitted map remains clamped');
 assert.deepEqual(errors.filter(e=>!e.includes('supabase')),[]);console.log('PASS rotated fullscreen mouse/touch and normal bounds '+viewport.width);await page.close();
 } }finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
