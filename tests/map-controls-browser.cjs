const fs=require('fs'),path=require('path');
const {webkit}=require('C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await webkit.launch({headless:true});
 try {
  for(const viewport of [{width:430,height:932},{width:390,height:844},{width:932,height:430},{width:320,height:640}]){
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
 async function check(fullscreen){
 const bounds=await page.evaluate(()=>{const controls=document.querySelector('.floorplan-ov-controls'),map=document.getElementById('floorplanWrap')||document.querySelector('.floorplan-image-wrap');return {controls:controls.getBoundingClientRect().toJSON(),map:map.getBoundingClientRect().toJSON(),height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth+2};});
 assert.ok(bounds.controls.bottom<=bounds.map.top+1,JSON.stringify(bounds));assert.ok(bounds.controls.height<=62,JSON.stringify(bounds));assert.equal(bounds.overflow,false);
 if(fullscreen){assert.ok(bounds.map.bottom<=bounds.height+1,JSON.stringify(bounds));assert.ok(bounds.map.height>viewport.height*.6);}
 }
 await check(false);await page.locator('#floorplanOverviewFullscreen').click();await page.waitForTimeout(250);await check(true);
 await page.locator('#floorplanOverviewZoomIn').click();await page.locator('#floorplanOverviewRotate').click();await check(true);
 await page.screenshot({path:'work/map-controls-'+viewport.width+'.png'});
 await page.locator('#floorplanOverviewFullscreen').click();await check(false);
 assert.equal(await page.locator('#floorplanOverviewFullscreen').getAttribute('aria-pressed'),'false');
 assert.deepEqual(errors.filter(e=>!e.includes('supabase')),[]);console.log('PASS map toolbar '+viewport.width+'x'+viewport.height);await page.close();} }finally{await browser.close()}})();
