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
   await page.clock.install({time:new Date('2026-10-14T10:00:00+07:00')});await page.goto('http://localhost/');


 await page.evaluate(()=>{activateTab(document.getElementById('tab-product-history'));palletDataReady=true;SLOT_ITEMS['A']={'A-01':[{code:'QA-RANGE',name:'ทดสอบช่วงวันที่',qty:100,remainingQty:85,unit:'ชิ้น',receiveDate:'2026-09-30',withdrawals:[{date:'2026-10-01',qty:10},{date:'2026-10-14',qty:5},{date:'2026-10-15',qty:1}]}]};window.PKProductHistory.open('QA-RANGE')});
 assert.equal(await page.locator('#productHistoryFrom').inputValue(),'2026-10-01');assert.equal(await page.locator('#productHistoryTo').inputValue(),'2026-10-14');
 assert.equal(await page.locator('.product-history-table-wrap tbody tr').count(),2);assert.equal(await page.locator('.product-history-running').first().textContent(),'90');
 await page.locator('#productHistoryFrom').fill('2026-09-30');await page.locator('#productHistoryFrom').dispatchEvent('change');assert.equal(await page.locator('.product-history-table-wrap tbody tr').count(),3);
 await page.locator('#productHistoryTo').fill('2026-09-29');await page.locator('#productHistoryTo').dispatchEvent('change');assert.equal(await page.locator('#productHistoryFrom').evaluate(e=>e.checkValidity()),false);
 await page.locator('#productHistoryTo').fill('2026-10-15');await page.locator('#productHistoryTo').dispatchEvent('change');assert.equal(await page.locator('.product-history-table-wrap tbody tr').count(),4);

 await page.evaluate(()=>{const item=SLOT_ITEMS['A']['A-01'][0];item.scraps=[{date:'2026-10-03',qty:4,unit:'ชิ้น',reason:'ทดสอบ'}];STOCK.items=[{code:'QA-RANGE',name:'ทดสอบช่วงวันที่',qty:80,unit:'ชิ้น',wh:'200'}];STOCK.report_date='15 ต.ค. 69';PKProductHistory.refresh()});
 const scrap=page.locator('.product-history-table-wrap tbody tr').filter({hasText:'Scrap'});assert.equal(await scrap.count(),1);assert.equal(await scrap.locator('td').nth(6).textContent(),'4');assert.ok((await page.locator('.product-history-reconcile').textContent()).includes('ผลต่าง (บันทึก − สต็อก) 0'));
 await page.evaluate(()=>{SLOT_ITEMS['A']['A-01'][0].receiveDate='';PKProductHistory.refresh()});assert.ok((await page.locator('.product-history-reconcile-reason').textContent()).includes('ประวัติไม่มีวันที่หรือวันที่ไม่ถูกต้อง 1 รายการ'));assert.ok((await page.locator('.product-history-reconcile').textContent()).includes('คำนวณไม่ได้'));
 await page.evaluate(()=>{SLOT_ITEMS.A={'A-01':[{code:'QA-RANGE',name:'ยอดยกมา',unit:'ใบ',qty:409,remainingQty:388,receiveDate:'2026-09-01',withdrawals:[{date:'2026-09-15',qty:21}]}]};PKProductHistory.refresh()});
 await page.locator('#productHistoryFrom').fill('2026-10-01');await page.locator('#productHistoryFrom').dispatchEvent('change');await page.locator('#productHistoryTo').fill('2026-10-14');await page.locator('#productHistoryTo').dispatchEvent('change');
 assert.equal(await page.locator('.product-history-table-wrap tbody tr').count(),1);assert.equal(await page.locator('.product-history-running').textContent(),'388');assert.ok((await page.locator('.product-history-table-wrap tbody tr').textContent()).includes('ยอดยกมา'));assert.ok((await page.locator('.product-history-section-head').textContent()).includes('0 รายการ'));
 await page.evaluate(()=>{SLOT_ITEMS.A['A-01'][0].withdrawals[0].qty=null;PKProductHistory.refresh()});assert.equal(await page.locator('.product-history-running').textContent(),'ไม่ทราบยอด');
 await page.evaluate(()=>{const item=SLOT_ITEMS.A['A-01'][0];item.withdrawals=Array.from({length:105},()=>({date:'2026-09-15',qty:1}));item.returns=[{date:'',qty:2}];PKProductHistory.refresh()});
 await page.locator('#productHistoryAll').press('Enter');assert.equal(await page.locator('#productHistoryAll').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('.product-history-table-wrap tbody tr').count(),107);assert.equal(await page.locator('.product-history-more').count(),0);
 assert.ok((await page.locator('#productHistoryDetail').textContent()).includes('รวมรายการที่ไม่ระบุวันที่'));
 await page.locator('#productHistoryAll').press('Enter');assert.equal(await page.locator('.product-history-table-wrap tbody tr').count(),1);assert.equal(await page.locator('#productHistoryAll').getAttribute('aria-pressed'),'false');
 await page.locator('#productHistoryAll').press('Enter');await page.locator('#productHistoryTo').fill('2026-10-16');await page.locator('#productHistoryTo').dispatchEvent('change');assert.equal(await page.locator('#productHistoryAll').getAttribute('aria-pressed'),'false');assert.equal(await page.locator('.product-history-table-wrap tbody tr').count(),1);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.deepEqual(errors,[]);console.log('PASS history range/defaults/boundaries/validation/prior balance '+viewport.width);await page.close();
 } }finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
