const fs=require('fs'),path=require('path');
const {chromium,webkit}=require('C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await (process.env.PK_COPY_BROWSER!=='edge'?webkit.launch({headless:true}):chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}));
 const results=[];
 try {
  for(const viewport of [{width:430,height:932},{width:390,height:844},{width:1440,height:1000}]){
   const page=await browser.newPage({viewport,isMobile:viewport.width<900,hasTouch:viewport.width<900});const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',route=>{
    const u=new URL(route.request().url());if(u.hostname!=='localhost')return route.abort();
    const file=path.join(root,u.pathname==='/'?'index.html':u.pathname);
    if(!fs.existsSync(file))return route.abort();let body=fs.readFileSync(file);
    if(file.endsWith('index.html'))body=body.toString().replace(/const (SUPABASE_URL|STOCK_SUPABASE_URL) = '[^']*';/g,"const $1 = '';").replace(/<script src="account-status.js[^>]*><\/script>/,`<script>document.body.classList.remove('auth-pending','department-choosing');document.body.classList.add('auth-ready');window.getWmsIsAdmin=()=>true;window.getWmsCanAccess=()=>true;window.getWmsActorName=()=> 'QA';supabaseClient={rpc:async()=>({data:[]})};</script>`);
    route.fulfill({body,contentType:file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':file.endsWith('.png')?'image/png':file.endsWith('.webp')?'image/webp':'image/jpeg'});
   });
   await page.goto('http://localhost/');

 await page.evaluate(()=>{window.getWmsUsername=()=> 'QA';palletDataReady=true;SLOT_ITEMS['U'] ||= {};SLOT_ITEMS['U']['U-02']=[{code:'QA-PK',name:'QA packaging',lotNo:'LOT',qty:100,remainingQty:70,unit:'ใบ',receiveDate:'2026-09-01',receiveReference:'RC-1',withdrawals:[{date:'2026-09-02',qty:30,unit:'ใบ',by:'QA'}]}];SLOT_ITEMS['U']['U-03']=[{code:'OLD',name:'เดิม',qty:8,remainingQty:8,unit:'ใบ'}];SLOT_ITEMS['U']['U-04']=[];for(const s of ['U-02','U-03','U-04'])palletVersions.set(JSON.stringify(['U',s]),1);window.copyCalls=[];window.failCopy=true;supabaseClient.rpc=async(name,args)=>{copyCalls.push({name,args});if(failCopy)return {error:{code:'40001'}};return {data:{slots:args.p_slots.map(row=>({...row,version:row.expected_version+1,updated_at:new Date().toISOString()})),dates:[]}};};activateTab(document.getElementById('tab-floorplan'));openZoomModal('U');openSlotEdit('U','U-02');});

 await page.locator('#fseCopyToggle').click();assert.equal(await page.locator('#fseCopyForm').isVisible(),true);assert.equal(await page.locator('#fseCopyZone').inputValue(),'U');assert.equal(await page.locator('#fseCopyDestinations input[value="U-02"]').count(),1);
 for(const zone of ['M-1','T-1','U','A','U']){if(viewport.width<900)await page.locator('#fseCopyZone').tap();await page.locator('#fseCopyZone').selectOption(zone);assert.equal(await page.locator('#fseCopyZone').inputValue(),zone);assert.ok(await page.locator('#fseCopyDestinations input').count()>0);assert.equal(await page.locator('#fseCopyZone').isEnabled(),true);}
 await page.locator('#fseCopyDestinations input[value="U-02"]').check();await page.locator('[data-qty="0"]').fill('25');assert.equal(await page.locator('#fseCopySave').isEnabled(),true);await page.evaluate(()=>failCopy=false);await page.locator('#fseCopySave').click();await page.locator('#fseCopyForm').waitFor({state:'hidden'});
 const final=await page.evaluate(()=>({items:SLOT_ITEMS.U['U-02'],rows:copyCalls.at(-1).args.p_slots,overflow:document.documentElement.scrollWidth>innerWidth}));assert.equal(final.items.length,2);assert.equal(final.items[0].remainingQty,70);assert.equal(final.items[0].withdrawals[0].qty,30);assert.equal(final.items[1].qty,25);assert.equal(final.items[1].withdrawals.length,0);assert.deepEqual(final.items[1].copiedFrom,{zone:'U',slot:'U-02'});assert.equal(final.rows.length,1);assert.equal(final.rows[0].slot_code,'U-02');assert.equal(final.rows[0]._audit.action,'receive');assert.equal(final.overflow,false);await page.locator('#fseCopyToggle').click();await page.locator('#fseCopyDestinations input[value="U-03"]').check();await page.evaluate(()=>palletVersions.set(JSON.stringify(['U','U-02']),999));await page.locator('[data-qty="0"]').fill('10');assert.equal(await page.locator('#fseCopySave').isEnabled(),false);assert.ok((await page.locator('#fseCopyStatus').textContent()).includes('ต้นทางมีข้อมูลใหม่'));
 assert.deepEqual(errors.filter(e=>!e.includes('supabase')),[]);console.log('PASS U-02 self copy and repeated destination zone selection at '+viewport.width);await page.close();} }finally{await browser.close()}})();