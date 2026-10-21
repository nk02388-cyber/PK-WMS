const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,webkit}=require('C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),engine=process.env.PK_COPY_BROWSER||'edge',out=path.join(root,'work/cycle-labels',engine);
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
   activateTab(document.getElementById('tab-cycle-counts'));document.getElementById('cycleCountZone').value='O-1';
   SLOT_ITEMS['O-1']={'O1-01':[{code:'SKU-1',name:'สินค้า <script>danger</script>',lotNo:'LOT-A',unit:'แกลลอน',qty:320},{code:'SKU-2',name:'สินค้าอีกชนิด',lotNo:'LOT-B',unit:'ใบ',qty:40},{code:'ZERO',qty:0}], 'O1-03':[{code:'SKU-3',name:'ขวด',qty:5,unit:'ขวด'}]};
  });
  await page.locator('#cycleCountPrintLabels').click();
  assert.equal(await page.locator('#cycleLabelZone').inputValue(),'O-1');
  assert.equal(await page.locator('#cycleLabelSlots input').count(),30);
  for(const theme of ['light','dark']){
   await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width} overflow`);
  }
  await page.locator('#cycleLabelClear').click();assert.ok(await page.locator('#cycleLabelPrint').isDisabled());
  for(const slot of ['O1-01','O1-02','O1-03'])await page.locator(`#cycleLabelSlots input[value="${slot}"]`).check();
  await page.locator('#cycleLabelPrint').click();assert.match(await page.locator('#barcodePrintStatus').textContent(),/ยังไม่เชื่อมต่อ/);
  await page.evaluate(()=>{palletDataReady=true;document.getElementById('syncStatusBar').classList.add('sync-connected');window.qrPayloads=[];const original=qrcode;window.qrcode=(...args)=>{const qr=original(...args),add=qr.addData;qr.addData=value=>{qrPayloads.push(value);add.call(qr,value);};return qr;};});
  const popupPromise=context.waitForEvent('page');await page.locator('#cycleLabelPrint').click();const popup=await popupPromise;await popup.waitForLoadState();
  assert.equal(await popup.locator('.label').count(),3);assert.equal(await popup.locator('.label svg').count(),3);
  const first=await popup.locator('.label').first().innerText();assert.match(first,/SKU-1/);assert.match(first,/SKU-2/);assert.match(first,/LOT-A/);assert.match(first,/<script>danger<\/script>/);assert.doesNotMatch(first,/320|ZERO/);
  assert.equal(await popup.locator('script').count(),0);assert.match(await popup.locator('.label').nth(1).innerText(),/ไม่มีรายการสินค้า/);
  const scans=await page.evaluate(()=>qrPayloads.map(payload=>PKBarcode.resolveScan(payload,Object.entries(ZONE_SLOTS).flatMap(([zone,slots])=>slots.map(s=>({zone,slot:s.code}))),[])));
  assert.deepEqual(scans.map(s=>s.slot),['O1-01','O1-02','O1-03']);assert.ok(scans.every(s=>s.kind==='location'));
  await popup.emulateMedia({media:'print'});
  assert.ok(await popup.locator('body>h2').isHidden());
  if(engine==='edge'){
   const pdf=await popup.pdf({path:path.join(out,`${width}-labels.pdf`),preferCSSPageSize:true});
   assert.equal((pdf.toString('latin1').match(/\/Type \/Page\b/g)||[]).length,2,'3 labels must use two A4 pages');
  }
  await popup.screenshot({path:path.join(out,`${width}-print.png`),fullPage:true});await popup.close();
  await page.screenshot({path:path.join(out,`${width}-menu.png`),fullPage:true});
  await page.locator('#cycleLabelZone').selectOption('U');assert.equal(await page.locator('#cycleLabelSlots input:checked').count(),30);
  await page.locator('#cycleLabelClear').click();await page.locator('#cycleLabelSlots input[value="U-30"]').check();
  await page.evaluate(()=>window.open=()=>null);await page.locator('#cycleLabelPrint').click();assert.match(await page.locator('#barcodePrintStatus').textContent(),/ปิดกั้น/);
  assert.deepEqual(errors,[]);console.log(`PASS ${engine} ${width}px: zone shortcut, selection, current geometry, offline/popup guards, escaped multi-SKU blind labels, empty slots, QR roundtrip and print layout`);await context.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
