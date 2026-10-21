// Synthetic plans only; no production reads or inventory writes.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,webkit}=require('C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const pane=html.slice(html.indexOf('  <div class="tab-pane" id="pane-receipt-plan"'),html.indexOf('  <div class="tab-pane" id="pane-settings"'));
const fixture={rows:[{date:'2026-10-19',code:'QA-01',item:'กล่อง <img src=x onerror=alert(1)>',quantity:1200,unit:'ใบ',company:'QA supplier',po:'PO1'},{date:'2026-10-19',code:'QA-01',item:'กล่อง',quantity:10,unit:'ใบ',company:'QA supplier',po:'PO2'},{date:'2026-10-20',code:'QA-02',item:'ขวด',quantity:0,unit:'ขวด',company:'QA',po:'PO3'}],source_note:'QA source',imported_at:'2026-10-19T06:00:00Z'};
(async()=>{
 const browser=await (process.env.PK_MOTION_BROWSER==='webkit'?webkit.launch({headless:true}):chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}));
 try {for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   const u=new URL(route.request().url());if(u.hostname!=='localhost')return route.abort();
   if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/wms-workbench.css"><link rel="stylesheet" href="/reference-wms.css"><link rel="stylesheet" href="/daily-activity.css"><style>body{margin:12px}button,input{min-height:44px}.daily-controls{display:flex;flex-wrap:wrap;gap:10px}.daily-table-wrap{overflow:auto}.daily-table{min-width:950px}</style><button id="tab-receipt-plan">แผนรับเข้า<span id="tabBadgeReceiptPlan"></span></button>${pane}<script>window.qaAllowed=true;window.getWmsCanAccess=()=>qaAllowed;window.qaData=${JSON.stringify(fixture)};window.qaMode='ok';window.supabaseClient={rpc:()=>qaMode==='pending'?new Promise(resolve=>window.qaResolve=resolve):Promise.resolve(qaMode==='error'?{error:{message:'QA failed'}}:{data:qaMode==='invalid'?{rows:null}:qaData})};</script><script src="/date-display.js"></script><script src="/receipt-plan.js"></script>`});
   const file=path.join(root,u.pathname);if(!fs.existsSync(file))return route.fulfill({status:404,body:''});
   return route.fulfill({body:fs.readFileSync(file),contentType:file.endsWith('.js')?'text/javascript':'text/css'});
  });
  await page.goto('http://localhost/');
  await page.evaluate(()=>document.getElementById('pane-receipt-plan').hidden=false);
  await page.locator('#receiptPlanDate').fill('2026-10-19');await page.locator('#tab-receipt-plan').click();
  await page.locator('#receiptPlanResult tbody tr').first().waitFor();assert.equal(await page.locator('#receiptPlanResult tbody tr').count(),2);assert.match(await page.locator('#receiptPlanStatus').textContent(),/19\/10\/2026 13:00:00/);
  assert.equal(await page.locator('#receiptPlanResult img').count(),0,'source markup must remain text');
  await page.locator('#receiptPlanAll').click();assert.equal(await page.locator('#receiptPlanResult tbody tr').count(),3);
  await page.locator('#receiptPlanQuery').fill('supplier PO2');assert.equal(await page.locator('#receiptPlanResult tbody tr').count(),1);
  await page.locator('#receiptPlanQuery').fill('');await page.locator('#receiptPlanDate').fill('2026-10-21');await page.locator('#receiptPlanDate').dispatchEvent('change');assert.equal(await page.locator('#receiptPlanResult tbody tr').count(),0);
  await page.locator('#receiptPlanAll').click();await page.evaluate(()=>qaMode='error');await page.locator('#receiptPlanRefresh').click();await page.locator('#receiptPlanStatus.error').waitFor();assert.equal(await page.locator('#receiptPlanResult tbody tr').count(),3);
  await page.evaluate(()=>qaMode='invalid');await page.locator('#receiptPlanRefresh').click();assert.equal(await page.locator('#receiptPlanResult tbody tr').count(),3);
  await page.evaluate(()=>qaMode='pending');await page.locator('#receiptPlanRefresh').click();
  await page.evaluate(()=>{qaAllowed=false;window.dispatchEvent(new Event('wms:account-changed'));qaResolve({data:qaData});});
  await page.waitForFunction(()=>document.getElementById('receiptPlanResult').children.length===0);
  assert.equal(await page.locator('#tabBadgeReceiptPlan').textContent(),'—');
  assert.deepEqual(errors,[]);
  fs.mkdirSync(path.join(root,'work/receipt-plan-qa'),{recursive:true});
  await page.evaluate(()=>{qaMode='ok';qaAllowed=true;window.dispatchEvent(new Event('wms:account-changed'));});
  await page.locator('#receiptPlanAll').click();await page.locator('#receiptPlanResult tbody tr').first().waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'table must scroll inside viewport');
  await page.screenshot({path:path.join(root,`work/receipt-plan-qa/${process.env.PK_MOTION_BROWSER||'edge'}-${width}.png`)});
  console.log('PASS receipt plan date/all/search/empty/error/XSS/logout-race/mobile '+width);await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
