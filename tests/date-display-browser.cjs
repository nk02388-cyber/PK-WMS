const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,webkit}=require('C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),engine=process.env.PK_COPY_BROWSER||'edge',out=path.join(root,'work/date-display',engine);
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
   STOCK.report_date='ณ วันที่: 21 ต.ค. 69';stockSnapshotState='latest';rebuildStockControls();renderStockSnapshotNotice();
   palletDataReady=true;document.getElementById('syncStatusBar').classList.add('sync-connected');
   SLOT_ITEMS['O-1']={'O1-01':[{code:'DATE-SKU',name:'ขวดตรวจวันที่',qty:10,unit:'ขวด',receiveDate:'2026-07-30',receivedAt:'2026-10-20T18:30:59Z',receiveReference:'REF-1',withdrawals:[],returns:[]}]};
   window.dateSourceBefore=JSON.stringify(SLOT_ITEMS);
  });
  assert.equal(await page.locator('#reportDate').innerText(),'ข้อมูล ณ วันที่ 21/10/2026');
  const notes=await page.locator('.stock-snapshot-notice').allTextContents();assert.ok(notes.every(text=>text.includes('21/10/2026')));
  await page.evaluate(()=>{activateTab(document.getElementById('tab-floorplan'));openZoomModal('O-1');openSlotEdit('O-1','O1-01');});
  const card=await page.locator('#fseItemsList').innerText();assert.match(card,/30\/07\/2026/);assert.match(card,/21\/10\/2026 01:30:59/);assert.doesNotMatch(card,/2569|2026-07-30/);
  await page.evaluate(()=>closeZoomModal());
  await page.evaluate(()=>{activateTab(document.getElementById('tab-daily-receive'));document.querySelector('#pane-daily-receive .daily-date').value='2026-07-30';PKDaily.refresh();});
  assert.match(await page.locator('#pane-daily-receive').innerText(),/30\/07\/2026/);assert.match(await page.locator('#pane-daily-receive').innerText(),/21\/10\/2026 01:30:59/);
  assert.equal(await page.locator('#pane-daily-receive .daily-date').inputValue(),'2026-07-30','date input/API value stays ISO');
  await page.evaluate(()=>{activateTab(document.getElementById('tab-stock'));PKDashboardInsights.refresh();});
  const daily=await page.locator('#dashboardInsights tbody').textContent();assert.match(daily,/\d{2}\/\d{2}\/\d{4}/);
  await page.locator('#eventCalendarToggle').click();assert.match(await page.locator('#eventCalendarSelectedHeading').innerText(),/\d{2}\/\d{2}\/\d{4}/);
  await page.locator('#eventCalendarClose').click();
  assert.equal(await page.evaluate(()=>JSON.stringify(SLOT_ITEMS)===dateSourceBefore),true,'formatting must not change stock dates or history');
  await page.screenshot({path:path.join(out,`${width}-dashboard.png`),fullPage:false});
  assert.deepEqual(errors,[]);console.log(`PASS ${engine} ${width}px: Gregorian stock metadata, stock card/daily Bangkok timestamp, dashboard table, calendar date and unchanged ISO inputs/source`);await context.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
