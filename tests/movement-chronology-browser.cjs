const fs=require('fs'),path=require('path');
const {chromium,webkit}=require('C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await (process.env.PK_AUDIT_BROWSER==='webkit'?webkit.launch({headless:true}):chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}));
 const results=[];
 try {
  for(const viewport of [{width:1440,height:1000},{width:390,height:844},{width:768,height:1024}]){
   const page=await browser.newPage({viewport});const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',route=>{
    const u=new URL(route.request().url());if(u.hostname!=='localhost')return route.abort();
    const file=path.join(root,u.pathname==='/'?'index.html':u.pathname);
    if(!fs.existsSync(file))return route.abort();let body=fs.readFileSync(file);
    if(file.endsWith('index.html'))body=body.toString().replace(/const (SUPABASE_URL|STOCK_SUPABASE_URL) = '[^']*';/g,"const $1 = '';").replace(/<script src="account-status.js[^>]*><\/script>/,`<script>document.body.classList.remove('auth-pending','department-choosing');document.body.classList.add('auth-ready');document.querySelectorAll('[data-admin-only]').forEach(el=>el.hidden=false);window.getWmsIsAdmin=()=>true;window.getWmsCanAccess=()=>true;window.getWmsActorName=()=> 'QA';supabaseClient={rpc:async()=>({data:[]})};</script>`);
    route.fulfill({body,contentType:file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':file.endsWith('.png')?'image/png':file.endsWith('.webp')?'image/webp':'image/jpeg'});
   });
   await page.goto('http://localhost/');

   await page.evaluate(()=>{document.documentElement.dataset.theme='dark';activateTab(document.getElementById('tab-floorplan'));openZoomModal('M-1');palletDataReady=true;palletCanEdit=true;SLOT_ITEMS['M-1'] ||= {};SLOT_ITEMS['M-1']['M1-04']=[{code:'QA-PK',name:'ทดสอบลำดับ STOCK CARD',qty:2028,remainingQty:0,unit:'ชิ้น',receiveDate:'2026-09-25',receivedAt:'2026-10-06T07:58:02Z',withdrawals:[{date:'2026-10-08',qty:1536,recordedAt:'2026-10-08T08:30:52Z'},{date:'2026-10-08',qty:2028,recordedAt:'2026-10-08T08:35:17Z'}],returns:[{date:'2026-10-08',qty:1536,recordedAt:'2026-10-08T08:34:09Z'}]}];openSlotEdit('M-1','M1-04');});
   const row=page.locator('.fse-item-row').first();
   const rows=await row.locator('.stock-movement tbody tr').evaluateAll(rows=>rows.map(row=>row.textContent));
   assert.equal(rows.length,4);assert.ok(rows[2].includes('รับคืน'));assert.ok(rows[3].includes('เบิก'));
   assert.deepEqual(await row.locator('.sm-balance').evaluateAll(nodes=>nodes.filter(n=>n.tagName==='TD').map(n=>n.textContent.trim())),['2,028','492','2,028','0']);
   assert.ok(rows[3].includes('15:35:17'));console.log('PASS chronological rendered STOCK CARD '+viewport.width);
   assert.deepEqual(errors.filter(e=>!e.includes('supabase')),[]);console.log('PASS dark STOCK CARD '+viewport.width);await page.close();
  }
 }finally{await browser.close()}
})();
