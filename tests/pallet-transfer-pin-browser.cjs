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




 await page.evaluate(()=>{palletDataReady=true;window.pinCalls=[];window.qaValidPin=false;supabaseClient.rpc=async(name,args)=>{pinCalls.push({name,args});return qaValidPin?{data:true}:{error:{message:'รหัสยืนยันไม่ถูกต้อง'}};};});
 let downloads=0;page.on('download',()=>downloads++);
 page.on('dialog',async d=>{if(d.type()==='prompt')await d.dismiss();else await d.accept();});
 await page.evaluate(()=>exportPalletStatus());assert.equal(await page.evaluate(()=>pinCalls.length),0);assert.equal(downloads,0);
 page.removeAllListeners('dialog');page.on('dialog',async d=>{if(d.type()==='prompt')await d.accept('fixture');else await d.accept();});
 await page.evaluate(()=>exportPalletStatus());assert.equal(downloads,0);assert.equal(await page.evaluate(()=>pinCalls[0].name),'verify_pallet_transfer_pin');
 await page.evaluate(()=>qaValidPin=true);const download=page.waitForEvent('download');await page.evaluate(()=>exportPalletStatus());await download;assert.equal(downloads,1);
 const file={name:'fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({pallet_status:{},slot_items:{}}))};
 await page.evaluate(()=>{qaValidPin=false;window.importWrites=0;pushFullGeometryToRemote=async()=>{importWrites++;};});
 await page.locator('#floorplanZoomImportInput').setInputFiles(file);await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>importWrites),0);
 await page.evaluate(()=>qaValidPin=true);await page.locator('#floorplanZoomImportInput').setInputFiles(file);await page.waitForFunction(()=>importWrites===1);
 assert.deepEqual(errors.filter(e=>!e.includes('supabase')),[]);console.log('PASS Import/Export PIN cancel, invalid, valid '+viewport.width);await page.close();
 } }finally{await browser.close()}})();
