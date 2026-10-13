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




 await page.evaluate(()=>{activateTab(document.getElementById('tab-floorplan'));document.getElementById('barcodeCameraStart').closest('section').hidden=false;});
 // Check all scanner buttons even when their containing view is inactive.
 for(const theme of ['light','dark']){
 await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);await page.waitForTimeout(400);
 for(const id of ['barcodeCameraStart','incomingProductCamera','incomingTagCamera','incomingLocationCamera']){
 const state=await page.locator('#'+id).evaluate(el=>{const icon=el.querySelector('.qr-scan-icon'),s=getComputedStyle(el),i=getComputedStyle(icon);return {bg:s.backgroundColor,color:s.color,height:s.minHeight,mask:i.maskImage,width:i.width};});
 assert.ok(state.mask.includes('qr-code-scan.png'));assert.equal(state.width,'28px');assert.equal(state.height,'46px');assert.equal(state.bg,theme==='light'?'rgb(38, 116, 87)':'rgb(158, 213, 186)');
 }
 await page.locator('#barcodeCameraStart').screenshot({path:'work/qr-scan-'+theme+'-'+viewport.width+'.png'});
 }
 assert.deepEqual(errors.filter(e=>!e.includes('supabase')),[]);console.log('PASS new QR icon/control styles '+viewport.width);await page.close();
 } }finally{await browser.close()}})();
