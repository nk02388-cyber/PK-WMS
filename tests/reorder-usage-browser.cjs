const fs = require('node:fs'),path = require('node:path'),assert = require('node:assert/strict');
const {chromium,webkit} = require('C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname,'..');
(async()=>{
 const browser = await(process.env.PK_AUDIT_BROWSER==='webkit' ? webkit.launch({headless:true}) : chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}));
 try {
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]) {
   const page = await browser.newPage({viewport}), errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',route=>{
    const url = new URL(route.request().url());if(url.hostname!=='localhost')return route.abort();
    const file = path.join(root,url.pathname==='/'?'index.html':url.pathname);
    if(!fs.existsSync(file))return route.abort();let body=fs.readFileSync(file);
    if(file.endsWith('index.html'))body=body.toString().replace(/const (SUPABASE_URL|STOCK_SUPABASE_URL) = '[^']*';/g,"const $1 = '';").replace(/<script src="account-status.js[^>]*><\/script>/,`<script>document.body.classList.remove('auth-pending','department-choosing');document.body.classList.add('auth-ready');window.getWmsIsAdmin=()=>true;window.getWmsCanAccess=()=>true;window.getWmsActorName=()=> 'QA';</script>`);
    if(file.endsWith('reorder-points-data.js'))body='const PK_ROP_DATA=[{code:"QA-ROP",name:"สินค้าทดสอบ",unit:"ขวด",rop:50,pattern:"สม่ำเสมอ",historyWeeks:38}];';
    return route.fulfill({body,contentType:file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'image/png'});
   });
   await page.clock.setFixedTime(new Date('2026-10-15T10:00:00+07:00'));
   await page.goto('http://localhost/');
   await page.evaluate(()=>{
    palletDataReady=true;stockSnapshotState='latest';STOCK.items=[{code:'QA-ROP',unit:'ขวด',wh:'201',qty:80}];
    SLOT_ITEMS.A={'A-01':[{code:'QA-ROP',unit:'ขวด',qty:150,receiveDate:'2026-08-01',withdrawals:[{date:'2026-10-01',qty:100}],returns:[{date:'2026-10-04',qty:20}]}]};
    activateTab(document.getElementById('tab-reorder'));PKReorder.refresh();
   });
   await page.evaluate(()=>window.scrollTo({top:document.body.scrollHeight,behavior:'instant'}));
   await page.locator('[data-usage-code="QA-ROP"]').click({timeout:5000});
   assert.equal(await page.locator('#reorderUsage').isVisible(),true);
   assert.equal(await page.locator('#reorderUsageFrom').inputValue(),'2026-08-21');
   await page.locator('#reorderUsageFrom').fill('2026-10-01');await page.locator('#reorderUsageTo').fill('2026-10-10');
   await page.locator('#reorderLeadDays').fill('3');await page.locator('#reorderSafetyQty').fill('5');
   assert.match(await page.locator('#reorderUsageOutput').innerText(),/ROP ทดลอง: 35/);
   assert.deepEqual(await page.locator('.reorder-usage-metrics strong').allTextContents(),['100','20','80','10']);
   assert.equal(await page.locator('#reorderRows td').nth(2).textContent(),'80');
   assert.equal(await page.locator('#reorderRows td').nth(3).textContent(),'50');
   await page.evaluate(()=>{SLOT_ITEMS.A['A-01'][0].withdrawals.push({date:'',qty:7});refreshAfterRemoteChange('A','A-01')});
   assert.match(await page.locator('#reorderUsageOutput').innerText(),/ROP ทดลอง: ยังคำนวณไม่ได้/);
   assert.match(await page.locator('#reorderUsageOutput').innerText(),/วันที่ขาดหรือไม่ถูกต้อง 1/);
   await page.locator('#reorderUsageTo').fill('2026-09-30');
   assert.match(await page.locator('#reorderUsageOutput').innerText(),/เลือกช่วงวันที่/);
   await page.locator('#reorderUsageTo').fill('2026-10-10');
   await page.evaluate(()=>{document.getElementById('syncStatusBar').classList.add('sync-error');PKReorderUsage.refresh()});
   assert.match(await page.locator('#reorderUsageOutput').innerText(),/ซิงค์ไม่สำเร็จ/);
   await page.locator('#reorderUsageClose').click();assert.equal(await page.locator('#reorderUsage').isVisible(),false);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   assert.deepEqual(errors,[]);console.log('PASS ROP usage/scenario/no-double-deduction/invalid-data/live-refresh/mobile '+viewport.width);
   await page.close();
  }
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
