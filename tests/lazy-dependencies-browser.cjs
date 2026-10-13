const fs=require('fs'),path=require('path');
const {chromium,webkit}=require('C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await (process.env.PK_MOTION_BROWSER==='webkit'?webkit.launch({headless:true}):chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}));
 const results=[];
 try {
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
   const page=await browser.newPage({viewport});const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',route=>{
    const u=new URL(route.request().url());if(u.hostname!=='localhost')return route.abort();
    const file=path.join(root,u.pathname==='/'?'index.html':u.pathname);
    if(!fs.existsSync(file))return route.abort();let body=fs.readFileSync(file);
    if(file.endsWith('index.html'))body=body.toString().replace(/const (SUPABASE_URL|STOCK_SUPABASE_URL) = '[^']*';/g,"const $1 = '';").replace(/<script src="account-status.js[^>]*><\/script>/,`<script>document.body.classList.remove('auth-pending','department-choosing');document.body.classList.add('auth-ready');window.getWmsIsAdmin=()=>true;window.getWmsCanAccess=()=>true;window.getWmsActorName=()=> 'QA';supabaseClient={rpc:async()=>({data:[]})};</script>`);
    route.fulfill({body,contentType:file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':file.endsWith('.png')?'image/png':file.endsWith('.webp')?'image/webp':'image/jpeg'});
   });
   await page.addInitScript(()=>localStorage.setItem('pk-dashboard-theme-haulix','light'));const requests=[];page.on('request',r=>requests.push(r.url()));await page.goto('http://localhost/');



 await page.waitForTimeout(300);
 assert.equal(requests.filter(u=>u.includes('xlsx-')||u.includes('html5-qrcode')).length,0,'optional vendors must not load on startup');
 assert.equal(await page.evaluate(()=>typeof XLSX),'undefined');assert.equal(await page.evaluate(()=>typeof Html5Qrcode),'undefined');
 await page.evaluate(()=>Promise.all([PKDependencies.excel(),PKDependencies.excel()]));
 assert.equal(requests.filter(u=>u.includes('xlsx-')).length,1);
 const parsed=await page.evaluate(()=>{const b=XLSX.utils.book_new();XLSX.utils.book_append_sheet(b,XLSX.utils.aoa_to_sheet([['code','qty'],['QA',12]]),'QA');return XLSX.utils.sheet_to_json(XLSX.read(XLSX.write(b,{type:'array',bookType:'xlsx'}),{type:'array'}).Sheets.QA)[0];});assert.equal(parsed.qty,12);
 await page.evaluate(()=>Promise.all([PKDependencies.scanner(),PKDependencies.scanner()]));
 assert.equal(requests.filter(u=>u.includes('html5-qrcode')).length,1);
 assert.equal(await page.evaluate(()=>typeof Html5Qrcode),'function');
 await page.evaluate(()=>Promise.all([PKDependencies.excel(),PKDependencies.scanner()]));
 assert.equal(requests.filter(u=>u.includes('xlsx-')||u.includes('html5-qrcode')).length,2,'reuse loaded libraries');

 await page.evaluate(()=>{window.cameraStarts=0;window.Html5Qrcode=class{async start(){window.cameraStarts++;}async stop(){}clear(){}};document.getElementById('barcodeCameraStart').click();});
 await page.waitForFunction(()=>!document.getElementById('barcodeCameraStop').hidden);
 await page.evaluate(()=>document.getElementById('barcodeCameraStop').click());
 await page.evaluate(()=>{document.getElementById('tab-incoming').click();document.getElementById('incomingProductCamera').click();});
 await page.waitForFunction(()=>!document.getElementById('incomingCameraStop').hidden);
 assert.equal(await page.evaluate(()=>window.cameraStarts),2);
 await page.evaluate(()=>document.getElementById('incomingCameraStop').click());
 assert.deepEqual(errors.filter(e=>!e.includes('supabase')),[]);
 console.log('PASS lazy startup, concurrent requests, Excel roundtrip, real scanner loading '+viewport.width);await page.close();
 } }finally{await browser.close()}})();
