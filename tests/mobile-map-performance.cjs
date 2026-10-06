const fs=require('fs'),path=require('path');
const {chromium}=require('C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try {
  for(const viewport of [{width:390,height:844}]){
   const page=await browser.newPage({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:2});const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',route=>{
    const u=new URL(route.request().url());if(u.hostname!=='localhost')return route.abort();
    const file=path.join(root,u.pathname==='/'?'index.html':u.pathname);
    if(!fs.existsSync(file))return route.abort();let body=fs.readFileSync(file);
    if(file.endsWith('index.html'))body=body.toString().replace(/const (SUPABASE_URL|STOCK_SUPABASE_URL) = '[^']*';/g,"const $1 = '';").replace(/<script src="account-status.js[^>]*><\/script>/,`<script>document.body.classList.remove('auth-pending','department-choosing');document.body.classList.add('auth-ready');window.getWmsIsAdmin=()=>true;window.getWmsCanAccess=()=>true;window.getWmsActorName=()=> 'QA';supabaseClient={rpc:async()=>({data:[]})};</script>`);
    route.fulfill({body,contentType:file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':file.endsWith('.png')?'image/png':file.endsWith('.webp')?'image/webp':'image/jpeg'});
   });
   await page.goto('http://localhost/');

 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:6});
 await page.evaluate(()=>{activateTab(document.getElementById('tab-floorplan'));openZoomModal('M-1');});await page.waitForTimeout(200);
 const profile=await page.evaluate(()=>{zoomPanX=0;zoomPanY=0;updateZoomView();const el=document.querySelector('.zoom-slot');const style=el.getAttribute('style');const start=el.getBoundingClientRect();const t=performance.now();for(let i=1;i<=120;i++){zoomPanX=i;zoomPanY=i/2;updateZoomView();el.getBoundingClientRect();}const ms=performance.now()-t;const finish=el.getBoundingClientRect();return {ms,slotStylesUnchanged:style===el.getAttribute('style'),dx:finish.x-start.x,dy:finish.y-start.y};});
 if(!process.argv.includes('--baseline')){assert.equal(profile.slotStylesUnchanged,true);assert.ok(Math.abs(profile.dx-120)<.5);assert.ok(Math.abs(profile.dy-60)<.5);}
 if(!process.argv.includes('--baseline')){
   const beforeScale=await page.locator('.zoom-slot').first().getAttribute('style');
   const pinch=await page.evaluate(()=>{const start=performance.now();for(let i=0;i<60;i++){zoomScale=1+i/100;updateZoomView();}return {ms:performance.now()-start,labels:zoomCadSlotLabels.children.length};});
   assert.equal(await page.locator('.zoom-slot').first().getAttribute('style'),beforeScale,'Mobile pinch reuses prepared slots');assert.equal(pinch.labels,0,'Mobile does not build other-zone CAD labels');profile.pinch=pinch;
   const rotations=await page.evaluate(()=>[0,90,180,270].map(rotation=>{mapRotation=rotation;zoomPanX=0;zoomPanY=0;updateZoomView();const el=document.querySelector('.zoom-slot');const start=el.getBoundingClientRect();zoomPanX=35;zoomPanY=-22;updateZoomView();const end=el.getBoundingClientRect();const width=end.width;zoomScale*=1.2;updateZoomView();return {rotation,dx:end.x-start.x,dy:end.y-start.y,ratio:el.getBoundingClientRect().width/width};}));
   for(const r of rotations){assert.ok(Math.abs(r.dx-35)<.5);assert.ok(Math.abs(r.dy+22)<.5);assert.ok(Math.abs(r.ratio-1.2)<.01);}
   await page.getByRole('button',{name:'ปิดหน้าต่างผังโซน'}).click();assert.equal(await page.locator('#floorplanZoomModal').isVisible(),false);
   await page.evaluate(()=>openZoomModal('T-1'));assert.equal(await page.locator('.zoom-slot').count(),18);await page.getByRole('button',{name:'ปิดหน้าต่างผังโซน'}).click();
 }
 assert.deepEqual(errors.filter(e=>!e.includes('supabase')),[]);
 console.log(JSON.stringify(profile));fs.writeFileSync('work/mobile-map-'+(process.argv.includes('--baseline')?'before':'after')+'.json',JSON.stringify(profile,null,2));await page.close();} }finally{await browser.close()}})();
