// All deletes are synthetic RPCs; production inventory is never touched.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,webkit}=require('C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await(process.env.PK_COPY_BROWSER==='webkit'?webkit.launch({headless:true}):chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}));
 try{for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:1000},hasTouch:width===390}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   const u=new URL(route.request().url());if(u.hostname!=='localhost')return route.abort();
   const file=path.join(root,u.pathname==='/'?'index.html':u.pathname);if(!fs.existsSync(file))return route.abort();let body=fs.readFileSync(file);
   if(file.endsWith('index.html'))body=body.toString().replace(/const (SUPABASE_URL|STOCK_SUPABASE_URL) = '[^']*';/g,"const $1 = '';").replace(/<script src="account-status.js[^>]*><\/script>/,`<script>document.body.classList.remove('auth-pending','department-choosing');document.body.classList.add('auth-ready');window.qaAllowed=true;window.getWmsCanAccess=()=>qaAllowed;window.getWmsIsAdmin=()=>true;window.getWmsUsername=()=> 'QA';supabaseClient={rpc:async()=>({data:[]})};</script>`);
   return route.fulfill({body,contentType:file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'image/jpeg'});
  });
  await page.goto('http://localhost/');
  await page.evaluate(()=>{
   palletDataReady=true;SLOT_ITEMS['R-1']={};PALLET_STATUS['R-1']={};
   for(const slot of ['R1-01','R1-02','R1-03']){SLOT_ITEMS['R-1'][slot]=[{code:'QA-'+slot,name:'ทดสอบ',qty:10,remainingQty:10,unit:'ใบ'}];PALLET_STATUS['R-1'][slot]='occupied';palletVersions.set(JSON.stringify(['R-1',slot]),1);}
   window.qaCalls=[];window.qaConfirmation='cancel';window.qaConflict=false;
   window.PKActionConfirmation.request=async(label,target)=>{window.qaTarget=target;if(qaConfirmation==='pending')return new Promise(resolve=>window.qaApprove=resolve);return qaConfirmation==='cancel'?null:{id:'QA-confirmation',reason:'ทดสอบ',username:'QA'};};
   supabaseClient.rpc=async(name,args)=>{qaCalls.push({name,args});if(qaConflict)return {error:{code:'40001'}};return {data:{slots:args.p_slots.map(r=>({...r,version:r.expected_version+1})),dates:[]}};};
   activateTab(document.getElementById('tab-floorplan'));openZoomModal('R-1');
  });
  const toggle=page.locator('#palletBulkToggle'),remove=page.locator('#palletBulkRemove');
  await toggle.click();assert.equal(await remove.isEnabled(),false);
  const first=page.locator('.zoom-slot[data-slot="R1-01"]');
  if(width===390)await first.tap();else await first.click();
  await page.locator('.zoom-slot[data-slot="R1-02"]').press('Space');
  assert.equal(await page.locator('.zoom-slot.bulk-selected').count(),2);
  await page.evaluate(()=>renderZoomSlots(currentZoomZone));assert.equal(await page.locator('.zoom-slot.bulk-selected').count(),2,'realtime rerender keeps selection');
  await remove.click();assert.equal(await page.evaluate(()=>qaCalls.length),0,'cancel never writes');
  await page.evaluate(()=>{qaConfirmation='ok';qaConflict=true;});await remove.click();
  await page.locator('#palletBulkStatus').filter({hasText:'มีคนแก้ข้อมูลนี้แล้ว'}).waitFor();assert.equal(await page.evaluate(()=>SLOT_ITEMS['R-1']['R1-01'].length),1);
  await page.evaluate(()=>qaConflict=false);await remove.click();
  await page.locator('#palletBulkStatus').filter({hasText:'ลบข้อมูล 2 พาเลทแล้ว'}).waitFor();
  const result=await page.evaluate(()=>({calls:qaCalls,one:SLOT_ITEMS['R-1']['R1-01'],two:SLOT_ITEMS['R-1']['R1-02'],three:SLOT_ITEMS['R-1']['R1-03'],slots:ZONE_SLOTS['R-1'].length}));
  assert.deepEqual(result.one,[]);assert.deepEqual(result.two,[]);assert.equal(result.three.length,1);assert.ok(result.slots>3);
  const rows=result.calls.at(-1).args.p_slots;assert.equal(rows.length,2);assert.ok(rows.every(r=>!r.occupied&&r.items.length===0&&r.expected_version===1&&r._audit.action==='remove'&&r._audit.document_no.includes('QA-confirmation')));
  await toggle.click();await page.locator('#palletBulkAll').click();assert.equal(await page.locator('.bulk-selected').count(),1);
  // A stale local version must fail before sending any transaction.
  const before=await page.evaluate(()=>qaCalls.length);await page.evaluate(()=>palletVersions.set(JSON.stringify(['R-1','R1-03']),2));await remove.click();
  await page.locator('#palletBulkStatus').filter({hasText:'พาเลทที่เลือกมีข้อมูลใหม่'}).waitFor();assert.equal(await page.evaluate(()=>qaCalls.length),before);
  await page.locator('#palletBulkCancel').click();await toggle.click();await page.locator('#palletBulkAll').click();
  await page.evaluate(()=>qaConfirmation='pending');await remove.click();
  await page.evaluate(()=>{qaAllowed=false;window.dispatchEvent(new Event('wms:account-changed'));qaApprove({id:'late'});});
  await page.waitForFunction(()=>!document.getElementById('floorplanZoomModal').inert);
  assert.equal(await page.evaluate(()=>qaCalls.length),before,'account switch during confirmation never writes');
  await page.evaluate(()=>{qaAllowed=true;openZoomModal('R-1');});await toggle.click();await page.locator('#palletBulkAll').click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  fs.mkdirSync(path.join(root,'work/bulk-remove'),{recursive:true});await page.screenshot({path:path.join(root,`work/bulk-remove/${process.env.PK_COPY_BROWSER||'edge'}-${width}.png`)});
  await page.evaluate(()=>openZoomModal('U'));assert.equal(await toggle.getAttribute('aria-pressed'),'false','switch zone clears selection');
  assert.deepEqual(errors.filter(e=>!e.includes('supabase')),[]);console.log('PASS bulk remove selection/cancel/conflict/atomic batch/untouched slots/account change '+width);await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
