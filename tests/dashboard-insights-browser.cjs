const fs=require('fs'),path=require('path');
const {chromium,webkit}=require('C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await (process.env.PK_MOTION_BROWSER==='webkit'?webkit.launch({headless:true}):chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}));
 const results=[];
 try {
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
   const page=await browser.newPage({viewport});const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',route=>{
    const u=new URL(route.request().url());if(u.hostname!=='localhost')return route.abort();
    const file=path.join(root,u.pathname==='/'?'index.html':u.pathname);
    if(!fs.existsSync(file))return route.abort();let body=fs.readFileSync(file);
    if(file.endsWith('index.html'))body=body.toString().replace(/const (SUPABASE_URL|STOCK_SUPABASE_URL) = '[^']*';/g,"const $1 = '';").replace(/<script src="account-status.js[^>]*><\/script>/,`<script>document.body.classList.remove('auth-pending','department-choosing');document.body.classList.add('auth-ready');window.getWmsIsAdmin=()=>true;window.getWmsCanAccess=()=>true;window.getWmsActorName=()=> 'QA';supabaseClient={rpc:async()=>({data:[]})};</script>`);
    route.fulfill({body,contentType:file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':file.endsWith('.png')?'image/png':file.endsWith('.webp')?'image/webp':'image/jpeg'});
   });
   await page.addInitScript(()=>localStorage.setItem('pk-dashboard-theme-haulix','light'));await page.goto('http://localhost/');


 await page.waitForTimeout(1800);

 const defaultTo=await page.locator('#diToDate').inputValue();
 const bangkokToday=await page.evaluate(()=>{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const get=t=>parts.find(p=>p.type===t).value;return `${get('year')}-${get('month')}-${get('day')}`;});
 assert.equal(defaultTo,bangkokToday);
 assert.equal(await page.locator('#diFromDate').inputValue(),defaultTo.slice(0,7)+'-01');
 await page.evaluate(()=>{palletDataReady=true;Object.keys(SLOT_ITEMS).forEach(k=>delete SLOT_ITEMS[k]);Object.assign(SLOT_ITEMS,{A:{'A-1':[{qty:10,receiveDate:'2026-10-02',withdrawals:[{date:'2026-10-08',qty:3}],returns:[{date:'2026-10-07',qty:1}]}]}});PKDashboardInsights.refresh();});
 const host=page.locator('#dashboardInsights');await host.locator('#diToDate').fill('2026-10-08');await host.locator('#diToDate').dispatchEvent('change');
 assert.equal(await host.locator('.di-stats strong').first().textContent(),'1 รายการ');assert.equal(await host.locator('svg').count(),1);
 await host.locator('#diFromDate').fill('2026-10-02');await host.locator('#diFromDate').dispatchEvent('change');assert.equal(await host.locator('tbody tr').count(),7);assert.ok((await page.locator('#dashboardActivityScope').textContent()).includes('02/10/2026 – 08/10/2026'));assert.equal(await page.locator('#dashboardActivity .di-mix svg').count(),1);
 await host.locator('#diFromDate').fill('2026-10-08');await host.locator('#diFromDate').dispatchEvent('change');assert.equal(await host.locator('tbody tr').count(),1);
 assert.equal(await host.locator('.di-trend').evaluate(el=>/NaN|Infinity/.test(el.innerHTML)),false);
 const good=await host.locator('.di-stats').textContent();await host.locator('#diFromDate').fill('2026-10-09');await host.locator('#diFromDate').dispatchEvent('change');assert.equal(await host.locator('#diFromDate').evaluate(el=>el.validity.valid),false);assert.equal(await host.locator('.di-stats').textContent(),good);
 await host.locator('#diFromDate').fill('');await host.locator('#diFromDate').dispatchEvent('change');assert.equal(await host.locator('#diFromDate').evaluate(el=>el.validity.valid),false);
 await host.locator('#diFromDate').fill('2026-10-02');await host.locator('#diFromDate').dispatchEvent('change');assert.equal(await host.locator('#diFromDate').evaluate(el=>el.validity.valid),true);
 assert.equal(await host.locator('select').count(),0);
 for(const theme of ['light','dark']){await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);await host.scrollIntoViewIfNeeded();await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);await host.screenshot({path:'work/dashboard-insights-'+theme+'-'+viewport.width+'.png'});}
 await page.evaluate(()=>{Object.keys(SLOT_ITEMS).forEach(k=>delete SLOT_ITEMS[k]);PKDashboardInsights.refresh();});assert.equal(await host.locator('.di-empty').count(),1);
 assert.deepEqual(errors.filter(e=>!e.includes('supabase')),[]);console.log('PASS insights charts '+viewport.width);await page.close();
 } }finally{await browser.close()}})();
