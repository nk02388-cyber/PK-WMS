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
  await page.evaluate(()=>openSlotEdit('R-1','R1-01'));
  await page.locator('#fseMoveToggle').click();assert.equal(await page.locator('#fseMoveForm').isVisible(),true);
  await page.locator('#fseCopyToggle').click();assert.equal(await page.locator('#fseCopyForm').isVisible(),true);assert.equal(await page.locator('#fseMoveForm').isVisible(),false);
  await page.locator('#fseMoveToggle').click();assert.equal(await page.locator('#fseMoveForm').isVisible(),true);assert.equal(await page.locator('#fseCopyForm').isVisible(),false);
  await toggle.click();assert.equal(await page.locator('#floorplanSlotEdit').isVisible(),false);assert.equal(await page.locator('#fseCopyForm').isVisible(),false);
  await page.locator('.zoom-slot[data-slot="R1-01"]').press('Space');await page.locator('#palletBulkMove').click();assert.equal(await page.locator('#palletBulkMoveForm').isVisible(),true);
  await page.evaluate(()=>openSlotEdit('R-1','R1-02'));
  assert.equal(await toggle.getAttribute('aria-pressed'),'false');assert.equal(await page.locator('#palletBulkMoveForm').isVisible(),false);assert.equal(await page.locator('.bulk-selected').count(),0);
  assert.equal(await page.locator('#floorplanSlotEdit').isVisible(),true);
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
  await page.evaluate(()=>{
   qaAllowed=true;qaConfirmation='ok';SLOT_ITEMS.U={};PALLET_STATUS.U={};
   for(const slot of ['R1-03','R1-04']){SLOT_ITEMS['R-1'][slot]=[{code:'QA-'+slot,name:'กล่องทดสอบ',lotNo:'LOT',qty:100,remainingQty:70,unit:'ใบ',receiveDate:'2026-10-01',withdrawals:[{date:'2026-10-02',qty:30,unit:'ใบ'}]}];PALLET_STATUS['R-1'][slot]='occupied';}
   for(const slot of ['U-01','U-02'])palletVersions.set(JSON.stringify(['U',slot]),5);
   openZoomModal('R-1');
  });await toggle.click();
  for(const slot of ['R1-03','R1-04'])await page.locator(`.zoom-slot[data-slot="${slot}"]`).press('Space');
  const configureMove=async()=>{
   await page.locator('#palletBulkMove').click();await page.locator('#palletBulkMoveZone').selectOption('U');
   await page.locator('#palletBulkMovePairs select[data-source="R1-03"]').selectOption('U-01');
   await page.locator('#palletBulkMovePairs select[data-source="R1-04"]').selectOption('U-02');
   await page.locator('#palletBulkMoveDate').fill('2026-10-20');await page.locator('#palletBulkMoveReference').fill('MOVE-QA');
  };
  await configureMove();
  const submit=page.locator('#palletBulkMoveSave'),callsBeforeMove=await page.evaluate(()=>qaCalls.length);
  await page.locator('#palletBulkMovePairs select[data-source="R1-04"]').selectOption('U-01');await submit.click();
  await page.locator('#palletBulkStatus').filter({hasText:'ซ้ำ'}).waitFor();assert.equal(await page.evaluate(()=>qaCalls.length),callsBeforeMove);
  await page.locator('#palletBulkMovePairs select[data-source="R1-04"]').selectOption('U-02');
  await page.evaluate(()=>qaConfirmation='cancel');await submit.click();assert.equal(await page.evaluate(()=>qaCalls.length),callsBeforeMove);
  await page.evaluate(()=>{qaConfirmation='ok';qaConflict=true;});await submit.click();
  await page.locator('#palletBulkStatus').filter({hasText:'มีคนแก้ข้อมูลนี้แล้ว'}).waitFor();assert.equal(await page.evaluate(()=>SLOT_ITEMS['R-1']['R1-03'].length),1);assert.equal(await page.evaluate(()=>SLOT_ITEMS.U['U-01']?.length||0),0);
  await page.evaluate(()=>{qaConflict=false;palletVersions.set(JSON.stringify(['U','U-01']),6);});
  const beforeStaleMove=await page.evaluate(()=>qaCalls.length);await submit.click();await page.locator('#palletBulkStatus').filter({hasText:'ต้นทางหรือปลายทางมีข้อมูลใหม่'}).waitFor();assert.equal(await page.evaluate(()=>qaCalls.length),beforeStaleMove);
  await configureMove();
  await page.evaluate(()=>qaConfirmation='pending');await submit.click();
  await page.evaluate(()=>{qaAllowed=false;window.dispatchEvent(new Event('wms:account-changed'));qaApprove({id:'late-move'});});
  await page.waitForFunction(()=>!document.getElementById('floorplanZoomModal').inert);assert.equal(await page.evaluate(()=>qaCalls.length),beforeStaleMove);
  await page.evaluate(()=>{qaAllowed=true;qaConfirmation='ok';openZoomModal('R-1');});await toggle.click();
  for(const slot of ['R1-03','R1-04'])await page.locator(`.zoom-slot[data-slot="${slot}"]`).press('Space');
  await configureMove();
  assert.equal(await page.evaluate(()=>document.getElementById('floorplanZoomModal').scrollWidth>innerWidth),false);
  await page.screenshot({path:path.join(root,`work/bulk-remove/move-${process.env.PK_COPY_BROWSER||'edge'}-${width}.png`)});
  await submit.click();await page.locator('#palletBulkStatus').filter({hasText:'ย้าย 2 พาเลท'}).waitFor();
  const moved=await page.evaluate(()=>({sources:[SLOT_ITEMS['R-1']['R1-03'],SLOT_ITEMS['R-1']['R1-04']],destinations:[SLOT_ITEMS.U['U-01'],SLOT_ITEMS.U['U-02']],call:qaCalls.at(-1)}));
  assert.ok(moved.sources.every(items=>items.length===0));assert.ok(moved.destinations.every(items=>items.length===1&&items[0].remainingQty===70&&items[0].withdrawals[0].qty===30&&items[0].locationMoves.length===1));
  assert.equal(moved.call.args.p_slots.length,4);assert.ok(moved.call.args.p_slots.every(r=>r._audit.action==='transfer'));
  await toggle.click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  fs.mkdirSync(path.join(root,'work/bulk-remove'),{recursive:true});await page.screenshot({path:path.join(root,`work/bulk-remove/${process.env.PK_COPY_BROWSER||'edge'}-${width}.png`)});
  await page.evaluate(()=>openZoomModal('U'));assert.equal(await toggle.getAttribute('aria-pressed'),'false','switch zone clears selection');
  assert.deepEqual(errors.filter(e=>!e.includes('supabase')),[]);console.log('PASS bulk and item mode switching/copy exclusivity; selection/cancel/conflict/stale versions/batch/history/account change '+width);await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
