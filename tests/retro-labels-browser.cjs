const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,webkit}=require('C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),engine=process.env.PK_COPY_BROWSER||'edge',out=path.join(root,'work/retro-labels',engine);
(async()=>{
 const browser=await(engine==='webkit'?webkit.launch({headless:true}):chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}));
 fs.mkdirSync(out,{recursive:true});
 try{for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:950}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.addInitScript(()=>{window.print=()=>{};});
  await context.route('**/*',route=>{
   const u=new URL(route.request().url());if(u.hostname!=='localhost')return route.abort();const file=path.join(root,u.pathname==='/'?'index.html':u.pathname);if(!fs.existsSync(file))return route.abort();let body=fs.readFileSync(file);
   if(file.endsWith('index.html'))body=body.toString().replace(/const (SUPABASE_URL|STOCK_SUPABASE_URL) = '[^']*';/g,"const $1 = '';").replace(/<script src="account-status.js[^>]*><\/script>/,`<script>document.body.classList.remove('auth-pending','department-choosing');document.body.classList.add('auth-ready');window.getWmsCanAccess=()=>true;window.getWmsIsAdmin=()=>true;supabaseClient={rpc:async()=>({data:[]})};</script>`);
   return route.fulfill({body,contentType:file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'image/jpeg'});
  });
  await page.goto('http://localhost/');await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>{
   activateTab(document.getElementById('tab-print-labels'));
   SLOT_ITEMS['O-1']={'O1-01':[{code:'SKU-1',name:'ขวด <script>danger</script>',lotNo:'L1',unit:'แกลลอน',qty:320,remainingQty:37,receiveDate:'2025-05-05',receiveReference:'RCV-1'}, {code:'SKU-2',name:'ฝา',lotNo:'L2',unit:'ฝา',qty:5}], 'O1-02':[{code:'ZERO',qty:100,remainingQty:0},{code:'UNKNOWN'},{code:'NEGATIVE',qty:-1}]};
   window.beforeLabel=JSON.stringify(SLOT_ITEMS);
  });
  await page.locator('#retroLabelZone').selectOption('O-1');
  assert.equal(await page.locator('#retroLabelItems input').count(),2,'only known positive remaining quantity is printable');
  assert.match(await page.locator('#retroLabelItems').innerText(),/37/);assert.doesNotMatch(await page.locator('#retroLabelItems').innerText(),/ZERO|UNKNOWN|NEGATIVE|320/);
  assert.ok(await page.locator('#retroLabelPrint').isDisabled());await page.locator('#retroLabelSelectAll').click();
  await page.locator('#retroLabelPrint').click();assert.match(await page.locator('#barcodePrintStatus').innerText(),/รอเชื่อมต่อ/);
  await page.evaluate(()=>{palletDataReady=true;document.getElementById('syncStatusBar').classList.add('sync-connected');SLOT_ITEMS['O-1']['O1-01'][0].remainingQty=36;});
  await page.locator('#retroLabelPrint').click();assert.match(await page.locator('#barcodePrintStatus').innerText(),/เปลี่ยนแล้ว/);assert.ok(await page.locator('#retroLabelPrint').isDisabled());
  await page.locator('#retroLabelSelectAll').click();await page.evaluate(()=>{window.beforeLabel=JSON.stringify(SLOT_ITEMS);window.qrPayloads=[];const original=qrcode;window.qrcode=(...args)=>{const qr=original(...args),add=qr.addData;qr.addData=value=>{qrPayloads.push(value);add.call(qr,value);};return qr;};supabaseClient.rpc=()=>{throw new Error('printing must not call a write RPC');};});
  const popupPromise=context.waitForEvent('page');await page.locator('#retroLabelPrint').click();const popup=await popupPromise;await popup.waitForLoadState();
  assert.equal(await popup.locator('.sheet').count(),2);assert.equal(await popup.locator('.tag').count(),8,'four copies for each selected existing item');
  const tag=await popup.locator('.tag').first().innerText();assert.match(tag,/FM-ST-019/);assert.match(tag,/SKU-1/);assert.match(tag,/36 แกลลอน/);assert.match(tag,/2025-05-05/);assert.match(tag,/RCV-1/);assert.match(tag,/<script>danger<\/script>/);assert.doesNotMatch(tag,/320|PKTAG/);
  assert.match(tag,/PKLOC\|O-1\|O1-01/);assert.equal(await popup.locator('script').count(),0);
  const emptyFields=await popup.locator('.sheet').nth(1).innerText();assert.match(emptyFields,/Receiving No.: —/);assert.match(emptyFields,/Supplier: —/);assert.match(emptyFields,/วันที่รับ: —/);
  assert.equal(await page.evaluate(()=>JSON.stringify(SLOT_ITEMS)===beforeLabel),true,'print must leave quantities/history/items exactly unchanged');
  await popup.emulateMedia({media:'print'});
  assert.ok(await popup.locator('.tag').evaluateAll(tags=>tags.every(tag=>tag.scrollHeight<=tag.clientHeight+1)),'all label details must fit inside each tag');
  if(engine==='edge'){
   const pdf=await popup.pdf({path:path.join(out,`${width}-retro-labels.pdf`),preferCSSPageSize:true});
   assert.equal((pdf.toString('latin1').match(/\/Type \/Page\b/g)||[]).length,2);
  }
  await popup.screenshot({path:path.join(out,`${width}-print.png`),fullPage:true});await popup.close();
  const originalPromise=context.waitForEvent('page');await page.evaluate(()=>PKIncomingPrint([{id:'550e8400-e29b-41d4-a716-446655440000',receiving_no:'ORIGINAL-RECEIPT',supplier_name:'Supplier',product_code:'ORIGINAL-SKU',product_name:'ขวดรับเข้า',lot_no:'ORIGINAL-LOT',quantity:320,unit:'ขวด',received_on:'2026-10-21',batch_index:1,batch_total:2,batch_total_quantity:640}],window.open('','_blank')));const original=await originalPromise;await original.waitForLoadState();
  assert.equal(await original.locator('.tag').count(),4);const normal=await original.locator('.tag').first().innerText();assert.match(normal,/PKTAG\|550e8400/);assert.match(normal,/จำนวนรวม: 640/);assert.match(normal,/จำนวนในพาเลต: 320/);assert.doesNotMatch(normal,/ป้ายจากยอดคงเหลือ/);await original.close();
  for(const theme of ['light','dark']){await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
  await page.screenshot({path:path.join(out,`${width}-menu.png`),fullPage:true});
  await page.locator('#retroLabelClear').click();assert.ok(await page.locator('#retroLabelPrint').isDisabled());
  await page.locator('#retroLabelZone').selectOption('U');assert.equal(await page.locator('#retroLabelItems input').count(),0);
  await page.locator('#retroLabelZone').selectOption('O-1');await page.locator('#retroLabelSelectAll').click();await page.evaluate(()=>window.open=()=>null);await page.locator('#retroLabelPrint').click();assert.match(await page.locator('#barcodePrintStatus').innerText(),/ปิดกั้น/);
  assert.deepEqual(errors,[]);console.log(`PASS ${engine} ${width}px: existing positive balances only, current remaining quantity, separate SKU/Lot copies, missing metadata, stale/offline/popup guards, escaping, no writes and two-page FM-ST-019 print`);await context.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
