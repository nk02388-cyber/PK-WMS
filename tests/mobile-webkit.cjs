const fs=require('fs'),path=require('path');
const {webkit}=require('C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await webkit.launch({headless:true});
 try {
  for(const viewport of [{width:430,height:932}]){
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


 await page.evaluate(()=>{activateTab(document.getElementById('tab-floorplan'));openZoomModal('G-1');});
 await page.waitForFunction(()=>document.querySelector('.mobile-map-surface')?.width===2048);
 const stats=await page.evaluate(()=>{const start=performance.now();const initial=zoomScale;for(let i=1;i<=100;i++){zoomScale=Math.min(ZOOM_MAX,initial*(1+i/10));zoomPanX=i;zoomPanY=-i/2;updateZoomView();}const e=new Event('gesturestart',{bubbles:true,cancelable:true});zoomViewport.dispatchEvent(e);return {updatesMs:performance.now()-start,canvasWidth:mobileMapSurface.width,canvasHeight:mobileMapSurface.height,canvasAlpha:mobileMapSurface.getContext('2d').getImageData(0,0,1,1).data[3],backgroundImage:zoomStage.style.backgroundImage,pageScale:visualViewport.scale,nativeGesturePrevented:e.defaultPrevented,touchAction:getComputedStyle(zoomViewport).touchAction,slots:document.querySelectorAll('.zoom-slot').length};});
 assert.equal(stats.canvasWidth,2048);assert.equal(stats.canvasAlpha,255);assert.equal(stats.backgroundImage,'none');assert.equal(stats.pageScale,1);assert.equal(stats.nativeGesturePrevented,true);assert.equal(stats.touchAction,'none');assert.equal(stats.slots,35);
 await page.getByRole('button',{name:'ซูมเข้าผังโซน'}).click();await page.getByRole('button',{name:'รีเซ็ต',exact:true}).last().click();
 await page.screenshot({path:'work/safari-g1-result.png'});
 for(const zone of ['T-1','M-1','G-1']){await page.getByRole('button',{name:'ปิดหน้าต่างผังโซน'}).click();assert.equal(await page.locator('#floorplanZoomModal').isVisible(),false);await page.evaluate(zone=>openZoomModal(zone),zone);for(let i=0;i<4;i++)await page.getByRole('button',{name:'หมุนผังพาเลต 90 องศา'}).click();}
 assert.deepEqual(errors.filter(e=>!e.includes('supabase')),[]);console.log(JSON.stringify(stats));fs.writeFileSync('work/safari-webkit-result.json',JSON.stringify(stats,null,2));await page.close();} }finally{await browser.close()}})();