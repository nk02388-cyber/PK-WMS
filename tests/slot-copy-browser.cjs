const fs=require('fs'),path=require('path');
const {chromium,webkit}=require('C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await (process.env.PK_COPY_BROWSER==='webkit'?webkit.launch({headless:true}):chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}));
 const results=[];
 try {
  for(const viewport of [{width:390,height:844},{width:1440,height:1000}]){
   const page=await browser.newPage({viewport});const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',route=>{
    const u=new URL(route.request().url());if(u.hostname!=='localhost')return route.abort();
    const file=path.join(root,u.pathname==='/'?'index.html':u.pathname);
    if(!fs.existsSync(file))return route.abort();let body=fs.readFileSync(file);
    if(file.endsWith('index.html'))body=body.toString().replace(/const (SUPABASE_URL|STOCK_SUPABASE_URL) = '[^']*';/g,"const $1 = '';").replace(/<script src="account-status.js[^>]*><\/script>/,`<script>document.body.classList.remove('auth-pending','department-choosing');document.body.classList.add('auth-ready');window.getWmsIsAdmin=()=>true;window.getWmsCanAccess=()=>true;window.getWmsActorName=()=> 'QA';supabaseClient={rpc:async()=>({data:[]})};</script>`);
    route.fulfill({body,contentType:file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':file.endsWith('.png')?'image/png':file.endsWith('.webp')?'image/webp':'image/jpeg'});
   });
   await page.goto('http://localhost/');

 await page.evaluate(()=>{window.getWmsUsername=()=> 'QA';palletDataReady=true;SLOT_ITEMS['M-1'] ||= {};SLOT_ITEMS['M-1']['M1-04']=[{code:'QA-PK',name:'QA packaging',lotNo:'LOT',qty:100,remainingQty:70,unit:'ใบ',receiveDate:'2026-09-01',receiveReference:'RC-1',withdrawals:[{date:'2026-09-02',qty:30,unit:'ใบ',by:'QA'}]}];SLOT_ITEMS['M-1']['M1-05']=[{code:'OLD',name:'เดิม',qty:8,remainingQty:8,unit:'ใบ'}];SLOT_ITEMS['M-1']['M1-06']=[];for(const s of ['M1-04','M1-05','M1-06'])palletVersions.set(JSON.stringify(['M-1',s]),1);window.copyCalls=[];window.failCopy=true;supabaseClient.rpc=async(name,args)=>{copyCalls.push({name,args});if(failCopy)return {error:{code:'40001'}};return {data:{slots:args.p_slots.map(row=>({...row,version:row.expected_version+1,updated_at:new Date().toISOString()})),dates:[]}};};activateTab(document.getElementById('tab-floorplan'));openZoomModal('M-1');openSlotEdit('M-1','M1-04');});
 await page.locator('#fseCopyToggle').click();assert.equal(await page.locator('#fseCopyForm').isVisible(),true);assert.equal(await page.locator('#fseCopyDestinations input[value="M1-04"]').count(),1);
 await page.locator('#fseCopyDestinations input[value="M1-05"]').check();await page.locator('#fseCopyDestinations input[value="M1-06"]').check();await page.locator('[data-qty="0"]').fill('0');assert.equal(await page.locator('#fseCopySave').isEnabled(),false);await page.locator('[data-qty="0"]').fill('60');assert.equal(await page.locator('#fseCopySave').isEnabled(),true);
 await page.locator('#fseCopyForm').screenshot({path:'work/copy-pallet-'+viewport.width+'.png'});await page.locator('#fseCopySave').click();await page.locator('#fseCopyStatus').filter({hasText:'มีคนแก้ข้อมูลนี้แล้ว'}).waitFor();assert.equal(await page.locator('#fseCopyForm').isVisible(),true);assert.equal(await page.evaluate(()=>SLOT_ITEMS['M-1']['M1-06'].length),0);
 await page.evaluate(()=>failCopy=false);await page.locator('#fseCopySave').click();await page.locator('#fseCopyForm').waitFor({state:'hidden'});
 const final=await page.evaluate(()=>({source:SLOT_ITEMS['M-1']['M1-04'][0].remainingQty,existing:SLOT_ITEMS['M-1']['M1-05'][0].code,copies:[SLOT_ITEMS['M-1']['M1-05'].at(-1),SLOT_ITEMS['M-1']['M1-06'].at(-1)],calls:copyCalls,overflow:document.documentElement.scrollWidth>innerWidth}));assert.equal(final.source,70);assert.equal(final.existing,'OLD');assert.ok(final.copies.every(i=>i.qty===60&&i.withdrawals.length===0&&i.receivedBy==='QA'));assert.equal(final.calls.at(-1).args.p_slots.length,2);assert.ok(final.calls.at(-1).args.p_slots.every(r=>r._audit.action==='receive'&&r._audit.actor==='QA'));assert.equal(final.overflow,false);assert.deepEqual(errors.filter(e=>!e.includes('supabase')),[]);console.log('PASS copy workflow at '+viewport.width);await page.close();} }finally{await browser.close()}})();