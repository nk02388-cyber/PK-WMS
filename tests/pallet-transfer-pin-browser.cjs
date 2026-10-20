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
 await page.evaluate(()=>{SLOT_ITEMS['O-1']={};PALLET_STATUS['O-1']={};window.imported=null;pushFullGeometryToRemote=async(slots,dates)=>{importWrites++;imported={slots,dates};};});
 const addition={zone:'O-1',slot_code:'O1-01',expected_version:7,items:[{code:'QA',qty:320,unit:'แกลลอน'}]};
 const upload=async payload=>{await page.locator('#floorplanZoomImportInput').setInputFiles({name:'addition.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload))});await page.waitForFunction(()=>!palletWriteBusy);};
 await upload({add_to_empty_slots:[addition],receive_dates:{QA:'2026-10-20'}});
 assert.deepEqual(await page.evaluate(()=>imported),{slots:[{zone:'O-1',slot_code:'O1-01',occupied:true,items:addition.items,expected_version:7}],dates:[]},'Scoped additions preserve their file version and cannot change unrelated slots/dates');
 const writes=await page.evaluate(()=>importWrites);
 for(const invalid of [[],[{...addition,slot_code:'unknown'}],[{...addition,expected_version:-1}],[{...addition,items:[]}]] )await upload({add_to_empty_slots:invalid});
 assert.equal(await page.evaluate(()=>importWrites),writes,'Invalid additions never write');
 await page.evaluate(()=>{SLOT_ITEMS['O-1']['O1-01']=[{code:'KEEP',qty:10}];PALLET_STATUS['O-1']['O1-01']='occupied';});
 await upload({add_to_empty_slots:[addition]});assert.equal(await page.evaluate(()=>importWrites),writes,'Occupied target never overwritten');
 assert.equal(await page.evaluate(()=>SLOT_ITEMS['O-1']['O1-01'][0].code),'KEEP');
 assert.deepEqual(errors.filter(e=>!e.includes('supabase')),[]);console.log('PASS Import/Export PIN cancel, invalid, valid '+viewport.width);await page.close();
 } }finally{await browser.close()}})();
