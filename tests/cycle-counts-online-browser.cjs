const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,webkit}=require('C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),engine=process.env.PK_COPY_BROWSER||'edge',out=path.join(root,'work/cycle-online',engine);
(async()=>{
 const browser=await(engine==='webkit'?webkit.launch({headless:true}):chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}));
 fs.mkdirSync(out,{recursive:true});
 let server={data:{frequency:{},history:[],draft:null},version:0},offline=false,delay=0;
 try{
 async function open(width){
  const context=await browser.newContext({viewport:{width,height:950}}),page=await context.newPage();
  await context.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.pathname==='/fixture-rpc'){
    const {name,args}=JSON.parse(route.request().postData());
    if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
    if(offline)return route.fulfill({json:{error:{message:'offline'}}});
    if(name==='get_pk_cycle_counts')return route.fulfill({json:{data:server}});
    if(name==='save_pk_cycle_counts'){
     if(args.p_expected_version!==server.version)return route.fulfill({json:{error:{code:'40001',message:'ข้อมูลเปลี่ยนจากเครื่องอื่น'}}});
     server={data:args.p_state,version:server.version+1,updated_username:'Fixture'};
     return route.fulfill({json:{data:server}});
    }
    return route.fulfill({json:{data:[]}});
   }
if(u.hostname!=='localhost')return route.abort();const file=path.join(root,u.pathname==='/'?'index.html':u.pathname);if(!fs.existsSync(file))return route.abort();let body=fs.readFileSync(file);
   if(file.endsWith('index.html'))body=body.toString().replace(/const (SUPABASE_URL|STOCK_SUPABASE_URL) = '[^']*';/g,"const $1 = '';").replace(/<script src="account-status.js[^>]*><\/script>/,`<script>document.body.classList.remove('auth-pending','department-choosing');document.body.classList.add('auth-ready');window.getWmsCanAccess=()=>true;window.getWmsIsAdmin=()=>true;supabaseClient={rpc:async(name,args)=>{const r=await fetch('/fixture-rpc',{method:'POST',body:JSON.stringify({name,args})});return r.json();}};</script>`);
   return route.fulfill({body,contentType:file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'image/jpeg'});
  });

  await page.goto('http://localhost/');await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>{activateTab(document.getElementById('tab-cycle-counts'));palletDataReady=true;document.getElementById('syncStatusBar').classList.add('sync-connected');SLOT_ITEMS['O-1']={'O1-01':[{code:'BOTTLE',name:'ขวด',lotNo:'L1',unit:'ขวด',qty:320}]};});
  await page.waitForFunction(()=>document.getElementById('cycleCountOnlineStatus').textContent.includes('ออนไลน์ ·'));
  assert.ok(await page.evaluate(()=>parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)<innerHeight),'mobile drawer must not inflate sticky scroll padding');
  return {page,context};
 }
 const a=await open(1440),b=await open(390);
 await a.page.locator('#cycleCountZone').selectOption('O-1');await a.page.locator('#cycleCountFrequency').fill('30');await a.page.locator('#cycleCountSaveFrequency').click();
 await a.page.waitForFunction(()=>document.getElementById('cycleCountOnlineStatus').textContent.includes('เวอร์ชัน 1'));
 await b.page.locator('#cycleCountReload').click();await b.page.waitForFunction(()=>document.getElementById('cycleCountOnlineStatus').textContent.includes('เวอร์ชัน 1'));
 await b.page.locator('#cycleCountZone').selectOption('O-1');assert.equal(await b.page.locator('#cycleCountFrequency').inputValue(),'30');
 await a.page.locator('#cycleCountStart').click();await a.page.waitForSelector('#cycleCountBy');
 await a.page.locator('#cycleCountBy').fill('ผู้ตรวจนับ A');await a.page.locator('[data-row="0"]').fill('315');await a.page.locator('#cycleCountSaveDraft').click();
 await a.page.waitForFunction(()=>document.getElementById('cycleCountOnlineStatus').textContent.includes('เวอร์ชัน 3'));
 await b.page.locator('#cycleCountFrequency').fill('7');await b.page.locator('#cycleCountSaveFrequency').click();
 await b.page.waitForFunction(()=>document.getElementById('cycleCountStatus').textContent.includes('เครื่องอื่น'));
 assert.equal(server.data.frequency['O-1'],30,'stale device cannot overwrite');
 await b.page.locator('#cycleCountReload').click();await b.page.waitForSelector('#cycleCountBy');
 assert.equal(await b.page.locator('#cycleCountBy').inputValue(),'ผู้ตรวจนับ A');assert.equal(await b.page.locator('[data-row="0"]').inputValue(),'315');
 offline=true;await b.page.locator('[data-row="0"]').fill('314');await b.page.locator('#cycleCountSaveDraft').click();
 await b.page.waitForFunction(()=>document.getElementById('cycleCountStatus').textContent.includes('offline'));
 assert.equal(await b.page.locator('[data-row="0"]').inputValue(),'314');assert.equal(server.data.draft.rows[0].counted,'315');
 offline=false;await b.page.locator('#cycleCountComplete').click();await b.page.waitForFunction(()=>document.getElementById('cycleCountStatus').textContent.includes('บันทึกผลตรวจนับโซน'));
 assert.equal(server.data.draft,null);assert.equal(server.data.history[0].rows[0].counted,314);assert.equal(server.data.history[0].rows[0].expected,320);
 await a.page.locator('#cycleCountReload').click();await a.page.waitForFunction(()=>document.getElementById('cycleCountHistory').textContent.includes('314'));
 const legacy={frequency:{'O-1':90,U:14},draft:null,history:server.data.history};
 await a.page.evaluate(x=>localStorage.setItem('bcl-cycle-counts-v1',JSON.stringify(x)),legacy);
 await a.page.locator('#cycleCountImportLocal').click();await a.page.waitForFunction(()=>document.getElementById('cycleCountStatus').textContent.includes('นำข้อมูลในเครื่องขึ้นออนไลน์แล้ว'));
 assert.equal(server.data.history.length,1);assert.equal(server.data.frequency['O-1'],30);assert.equal(server.data.frequency.U,14);
 assert.deepEqual(await a.page.evaluate(()=>JSON.parse(localStorage.getItem('bcl-cycle-counts-v1'))),legacy);
 for(const view of [a,b]){await view.page.screenshot({path:path.join(out,`${view===a?1440:390}.png`),fullPage:true});assert.equal(await view.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 delay=250;const before=server.version;
 await a.page.locator('#cycleCountFrequency').fill('40');await a.page.locator('#cycleCountSaveFrequency').click();
 await a.page.evaluate(()=>{window.getWmsCanAccess=()=>false;window.dispatchEvent(new Event('wms:account-changed'));});
 await a.page.waitForTimeout(400);
 assert.equal(await a.page.locator('#cycleCountHistory details').count(),0,'account change must discard private results and ignore late replies');
 assert.ok(await a.page.locator('#cycleCountStart').isDisabled());
 console.log(`PASS ${engine}: two devices share schedules/draft/results, conflict protection, failed-save draft retention, idempotent legacy import, mobile overflow and late account reply discarded`);
 await a.context.close();await b.context.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

