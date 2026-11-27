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
   if(file.endsWith('index.html'))body=body.toString().replace(/const (SUPABASE_URL|STOCK_SUPABASE_URL) = '[^']*';/g,"const $1 = '';").replace(/<script src="barcode-ui.js([^"]*)"><\/script>/,`<script>window.getWmsCanAccess=()=>true;window.getWmsIsAdmin=()=>true;const mockQuery=()=>{const q={select(){return q},eq(){return q},in(){return q},order(){return q},limit(){return q},range(){return q},single:async()=>({data:null,error:null}),then(resolve,reject){return Promise.resolve({data:[],error:null}).then(resolve,reject)}};return q};supabaseClient={auth:{getSession:async()=>({data:{session:{user:{id:'qa-user'}}},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:()=>mockQuery(),rpc:async()=>{throw new Error('Customer data must not call Supabase RPC')}};</script><script src="barcode-ui.js$1"></script>`).replace(/<script src="account-status.js[^>]*><\/script>/,`<script>document.body.classList.remove('auth-pending','department-choosing');document.body.classList.add('auth-ready');</script>`);
   return route.fulfill({body,contentType:file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'image/jpeg'});
  });
  await page.goto('http://localhost/');await page.emulateMedia({reducedMotion:'reduce'});
  const customerWorkbook=await page.evaluate(async()=>{await PKDependencies.excel();const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['ชื่อลูกค้า','ชื่อ Sheet','จำนวนรหัสสินค้า'],['กลุ่ม A','sheet-a',3],['กลุ่ม B','sheet-b',1]]),'รายชื่อลูกค้า');XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['รหัสสินค้า','ชื่อสินค้า','หน่วยนับ'],['SKU-1','สินค้า A หนึ่ง','ขวด'],['SKU-3','สินค้า A สาม','ใบ'],['SKU-MISSING','สินค้านอกโลเคชั่น','กล่อง']]),'sheet-a');XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['รหัสสินค้า','ชื่อสินค้า','หน่วยนับ'],['SKU-2','สินค้า B สอง','ชิ้น']]),'sheet-b');return XLSX.write(wb,{type:'base64',bookType:'xlsx'});});
  await page.locator('#cycleCustomerFile').setInputFiles({name:'customer-groups.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(customerWorkbook,'base64')});
  await page.waitForFunction(()=>document.getElementById('cycleLabelCustomerStatus').textContent.startsWith('โหลด 2 กลุ่ม · 4 รายการ'));
  await page.evaluate(()=>{
   activateTab(document.getElementById('tab-cycle-counts'));document.getElementById('cycleCountZone').value='O-1';
   SLOT_ITEMS['O-1']={'O1-01':[{code:'SKU-1',name:'สินค้า <script>danger</script>',lotNo:'LOT-A',unit:'แกลลอน',qty:320},{code:'SKU-2',name:'สินค้าอีกชนิด',lotNo:'LOT-B',unit:'ใบ',qty:40},{code:'ZERO',qty:0}], 'O1-03':[{code:'SKU-3',name:'ขวด',qty:5,unit:'ขวด'}]};
   SLOT_ITEMS.A={'A-01':[{code:'SKU-3',name:'ขวดทุกโซน',lotNo:'LOT-C',unit:'ขวด',qty:8}]};
  });
  await page.locator('#cycleCountPrintLabels').click();
  assert.equal(await page.locator('#cycleLabelZone').inputValue(),'O-1');
  assert.equal(await page.locator('#cycleLabelSlots input').count(),30);
  for(const theme of ['light','dark']){
   await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width} overflow`);
  }
  await page.locator('#cycleLabelClear').click();assert.ok(await page.locator('#cycleLabelPrint').isDisabled());assert.ok(await page.locator('#cyclePalletLabelPrint').isDisabled());
  for(const slot of ['O1-01','O1-02','O1-03'])await page.locator(`#cycleLabelSlots input[value="${slot}"]`).check();
  await page.locator('#cycleLabelPrint').click();assert.match(await page.locator('#barcodePrintStatus').textContent(),/ยังไม่เชื่อมต่อ/);
  await page.evaluate(()=>{palletDataReady=true;document.getElementById('syncStatusBar').classList.add('sync-connected');window.qrPayloads=[];const original=qrcode;window.qrcode=(...args)=>{const qr=original(...args),add=qr.addData;qr.addData=value=>{qrPayloads.push(value);add.call(qr,value);};return qr;};});
  const popupPromise=context.waitForEvent('page');await page.locator('#cycleLabelPrint').click();const popup=await popupPromise;await popup.waitForLoadState();
  assert.equal(await popup.locator('.count-sheet').count(),1);assert.equal(await popup.locator('tbody tr').count(),4);assert.equal(await popup.locator('tbody svg').count(),4);
  const first=await popup.locator('tbody tr').first().innerText();assert.match(first,/SKU-1/);assert.match(first,/LOT-A/);assert.match(first,/<script>danger<\/script>/);assert.doesNotMatch(first,/320|ZERO/);
  assert.match(await popup.locator('tbody tr').nth(1).innerText(),/SKU-2/);
  assert.equal(await popup.locator('script').count(),0);assert.match(await popup.locator('tbody tr').nth(2).innerText(),/ไม่มีรายการสินค้า/);
  assert.match(await popup.locator('h1').innerText(),/COUNT SHEET/);
  assert.match(await popup.locator('thead').innerText(),/จำนวนที่นับจริง/);
  assert.ok((await popup.locator('tbody tr td:nth-child(6)').allTextContents()).every(value=>value===''),'count column must be blank');
  const scans=await page.evaluate(()=>qrPayloads.map(payload=>PKBarcode.resolveScan(payload,Object.entries(ZONE_SLOTS).flatMap(([zone,slots])=>slots.map(s=>({zone,slot:s.code}))),[])));
  assert.deepEqual(scans.map(s=>s.slot),['O1-01','O1-01','O1-02','O1-03']);assert.ok(scans.every(s=>s.kind==='location'));
  await popup.emulateMedia({media:'print'});
  assert.ok(await popup.locator('body>h2').isHidden());
  await popup.setViewportSize({width:1047,height:718});
  const sequenceHeader=await popup.locator('thead tr:last-child th:first-child').evaluate(el=>{
   const range=document.createRange();range.selectNodeContents(el);const rects=[...range.getClientRects()];
   return {text:el.textContent,lines:new Set(rects.map(rect=>Math.round(rect.top))).size,textWidth:range.getBoundingClientRect().width,available:el.clientWidth-parseFloat(getComputedStyle(el).paddingLeft)-parseFloat(getComputedStyle(el).paddingRight)};
  });
  assert.equal(sequenceHeader.text,'ลำดับ');assert.equal(sequenceHeader.lines,1,'sequence heading must not wrap at printable A4 landscape width');
  assert.ok(sequenceHeader.textWidth<=sequenceHeader.available,'sequence heading must fit without overlapping the next column');
  if(engine==='edge'){
   const pdf=await popup.pdf({path:path.join(out,`${width}-count-sheet.pdf`),preferCSSPageSize:true});
   assert.equal((pdf.toString('latin1').match(/\/Type \/Page\b/g)||[]).length,1,'four count rows must fit on one A4 landscape page');
  }
  await popup.screenshot({path:path.join(out,`${width}-print.png`),fullPage:true});await popup.close();
  const beforeLabels=await page.evaluate(()=>JSON.stringify(SLOT_ITEMS));
  const labelPromise=context.waitForEvent('page');await page.locator('#cyclePalletLabelPrint').click();const labels=await labelPromise;await labels.waitForLoadState();
  assert.equal(await labels.locator('.label').count(),3,'additional Cycle Count mode prints one label per selected location');
  assert.equal(await labels.locator('.label svg').count(),3);
  assert.ok((await labels.locator('.label').first().locator('thead th:not(:first-child)').evaluateAll(cells=>cells.map(cell=>getComputedStyle(cell).whiteSpace))).every(value=>value==='nowrap'),'Lot, unit and count headings must stay on one line');
  assert.deepEqual(await labels.locator('.label').first().locator('col').evaluateAll(cols=>cols.map(col=>col.style.width)),['52%','16%','16%','16%'],'pallet-label columns keep enough room for each heading');
  assert.ok((await labels.locator('.label').first().locator('tbody td:nth-child(n+2)').evaluateAll(cells=>cells.map(cell=>getComputedStyle(cell).whiteSpace))).every(value=>value==='nowrap'),'Lot and unit values must not split across lines');
  const pallet=await labels.locator('.label').first().innerText();assert.match(pallet,/O1-01/);assert.match(pallet,/SKU-1/);assert.match(pallet,/SKU-2/);assert.match(pallet,/Product Name:/);assert.match(pallet,/<script>danger<\/script>/);assert.doesNotMatch(pallet,/320|ZERO/);
  assert.match(await labels.locator('.label').nth(1).innerText(),/ไม่มีรายการสินค้า/);
  assert.equal(await labels.locator('script').count(),0);
  assert.ok((await labels.locator('tbody tr td:last-child').allTextContents()).every(value=>value===''),'actual-count fields stay blank');
  if(engine==='edge'){
   const pdf=await labels.pdf({path:path.join(out,`${width}-cycle-pallet-labels.pdf`),preferCSSPageSize:true});
   assert.equal((pdf.toString('latin1').match(/\/Type \/Page\b/g)||[]).length,2,'three pallet labels print on two A4 portrait pages');
  }
  await labels.screenshot({path:path.join(out,`${width}-cycle-pallet-labels.png`),fullPage:true});await labels.close();
  assert.equal(await page.evaluate(()=>JSON.stringify(SLOT_ITEMS)),beforeLabels);
  assert.match(await page.locator('#cycleLabelCustomerStatus').innerText(),/^โหลด 2 กลุ่ม · 4 รายการ/);
  assert.equal(await page.locator('#cycleLabelZone').inputValue(),'O-1','customer selection is independent of the selected zone');
  assert.equal(await page.locator('#cycleLabelCustomerGroups label').count(),2,`customer groups load from the selected Excel workbook: ${await page.locator('#cycleLabelCustomerStatus').innerText()}`);
  await page.locator('#cycleLabelCustomerGroups label').filter({hasText:'กลุ่ม A'}).locator('input').check();
  assert.match(await page.locator('#cycleLabelCustomerStatus').innerText(),/เลือก 1 กลุ่ม · 3 รหัสสินค้า/);
  const filteredSheetPromise=context.waitForEvent('page');await page.locator('#cycleLabelPrint').click();const filteredSheet=await filteredSheetPromise;await filteredSheet.waitForLoadState();
  assert.equal(await filteredSheet.locator('tbody tr').count(),2,'customer filter keeps only matching SKUs and matching locations');
  assert.match(await filteredSheet.locator('tbody tr').nth(0).innerText(),/SKU-1/);assert.doesNotMatch(await filteredSheet.locator('tbody tr').nth(0).innerText(),/SKU-2/);
  assert.match(await filteredSheet.locator('tbody tr').nth(1).innerText(),/SKU-3/);assert.match(await filteredSheet.locator('.sheet-meta').first().innerText(),/กลุ่มลูกค้า กลุ่ม A/);await filteredSheet.close();
  const filteredLabelsPromise=context.waitForEvent('page');await page.locator('#cyclePalletLabelPrint').click();const filteredLabels=await filteredLabelsPromise;await filteredLabels.waitForLoadState();
  assert.equal(await filteredLabels.locator('.label').count(),2,'pallet labels omit positions without an SKU for the selected customer');
  assert.match(await filteredLabels.locator('.label').first().innerText(),/SKU-1/);assert.doesNotMatch(await filteredLabels.locator('.label').first().innerText(),/SKU-2/);
  assert.match(await filteredLabels.locator('.label').nth(1).innerText(),/SKU-3/);assert.equal(await filteredLabels.locator('.label svg').count(),2);await filteredLabels.close();
  await page.locator('#cycleLabelZone').selectOption('U');
  const allCustomerSheetPromise=context.waitForEvent('page');await page.locator('#cycleCustomerPrintSheet').click();const allCustomerSheet=await allCustomerSheetPromise;await allCustomerSheet.waitForLoadState();
  assert.equal(await allCustomerSheet.locator('tbody tr').count(),4,'customer Count Sheet covers matching SKUs across zones and includes unlocated SKUs');
  assert.match(await allCustomerSheet.locator('.sheet-meta').first().innerText(),/ทุกโซน/);assert.match(await allCustomerSheet.locator('tbody').innerText(),/A-01/);assert.match(await allCustomerSheet.locator('tbody').innerText(),/O1-01/);assert.doesNotMatch(await allCustomerSheet.locator('tbody').innerText(),/SKU-2/);
  const noLocationRow=allCustomerSheet.locator('tbody tr').filter({hasText:'SKU-MISSING'});assert.equal(await noLocationRow.count(),1);assert.match(await noLocationRow.innerText(),/สินค้านอกโลเคชั่น/);assert.match(await noLocationRow.innerText(),/กล่อง/);assert.equal((await noLocationRow.locator('.sheet-position').innerText()).trim(),'','unlocated SKU location cell stays blank for handwriting');await allCustomerSheet.close();
  const allCustomerLabelsPromise=context.waitForEvent('page');await page.locator('#cycleCustomerPrintLabels').click();const allCustomerLabels=await allCustomerLabelsPromise;await allCustomerLabels.waitForLoadState();
  assert.equal(await allCustomerLabels.locator('.label').count(),4,'customer labels include matching pallets and one label per unlocated SKU');assert.match(await allCustomerLabels.locator('.label').first().innerText(),/A-01|O1-01/);assert.doesNotMatch(await allCustomerLabels.locator('.label').allTextContents().then(x=>x.join('\n')),/SKU-2/);
  const unlocatedLabel=allCustomerLabels.locator('.label').filter({hasText:'SKU-MISSING'});assert.equal(await unlocatedLabel.count(),1);assert.match(await unlocatedLabel.innerText(),/สินค้านอกโลเคชั่น|SKU-MISSING/);assert.match(await unlocatedLabel.innerText(),/โลเคชั่น: _+/);assert.equal(await unlocatedLabel.locator('svg').count(),0,'no QR is generated for an unassigned location');await allCustomerLabels.close();
  await page.locator('#cycleCustomerClear').click();assert.equal(await page.locator('#cycleLabelZone').inputValue(),'U','clearing customer selection does not change the zone selector');assert.equal(await page.locator('#cycleLabelCustomerGroups input:checked').count(),0);await page.locator('#cycleLabelZone').selectOption('O-1');
  await page.locator('#cycleLabelSelectAll').click();
  await page.evaluate(()=>{SLOT_ITEMS['O-1']['O1-01'][0].name='ขวดตัวอย่าง';window.qrPayloads=[];});
  const fullPromise=context.waitForEvent('page');await page.locator('#cycleLabelPrint').click();const full=await fullPromise;await full.waitForLoadState();
  assert.equal(await full.locator('tbody tr').count(),31,'all thirty locations plus the second SKU must appear');
  assert.match(await full.locator('tbody tr').last().innerText(),/O1-30/);
  if(engine==='edge'){
   const pdf=await full.pdf({path:path.join(out,`${width}-full-zone-count-sheet.pdf`),preferCSSPageSize:true});
   assert.ok((pdf.toString('latin1').match(/\/Type \/Page\b/g)||[]).length>1,'whole zone must paginate');
  }
  await full.screenshot({path:path.join(out,`${width}-full-sheet.png`),fullPage:true});await full.close();
  await page.screenshot({path:path.join(out,`${width}-menu.png`),fullPage:true});
  await page.locator('#cycleLabelZone').selectOption('U');assert.equal(await page.locator('#cycleLabelSlots input:checked').count(),30);
  await page.locator('#cycleLabelClear').click();await page.locator('#cycleLabelSlots input[value="U-30"]').check();
  const legacyPromise=context.waitForEvent('page');await page.locator('#barcodePrintZone').selectOption('U');await page.locator('#barcodePrintLocations').click();const legacy=await legacyPromise;await legacy.waitForLoadState();
  assert.equal(await legacy.locator('.label').count(),30,'standard QR location labels must remain available');assert.equal(await legacy.locator('.count-sheet').count(),0);await legacy.close();
  await page.evaluate(()=>window.open=()=>null);await page.locator('#cycleLabelPrint').click();assert.match(await page.locator('#barcodePrintStatus').textContent(),/ปิดกั้น/);
  assert.deepEqual(errors,[]);console.log(`PASS ${engine} ${width}px: zone shortcut, selection, current geometry, offline/popup guards, escaped multi-SKU blind count sheet, empty slots, QR roundtrip and print layout`);await context.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
