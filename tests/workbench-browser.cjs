const fs=require('fs'),path=require('path');
const {chromium,webkit}=require('C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await (process.env.PK_AUDIT_BROWSER==='webkit'?webkit.launch({headless:true}):chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}));
 const results=[];
 try {
  for(const viewport of [{width:1440,height:1000},{width:768,height:1024},{width:414,height:896},{width:375,height:812},{width:320,height:740}]){
   const page=await browser.newPage({viewport});const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',route=>{
    const u=new URL(route.request().url());if(u.hostname!=='localhost')return route.abort();
    const file=path.join(root,u.pathname==='/'?'index.html':u.pathname);
    if(!fs.existsSync(file))return route.abort();let body=fs.readFileSync(file);
    if(file.endsWith('index.html'))body=body.toString().replace(/const (SUPABASE_URL|STOCK_SUPABASE_URL) = '[^']*';/g,"const $1 = '';").replace(/<script src="account-status.js[^>]*><\/script>/,`<script>document.body.classList.remove('auth-pending','department-choosing');document.body.classList.add('auth-ready');document.querySelectorAll('[data-admin-only]').forEach(el=>el.hidden=false);window.getWmsIsAdmin=()=>true;window.getWmsCanAccess=()=>true;window.getWmsActorName=()=> 'QA';supabaseClient={rpc:async()=>({data:[]})};</script>`);
    route.fulfill({body,contentType:file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':file.endsWith('.png')?'image/png':file.endsWith('.webp')?'image/webp':'image/jpeg'});
   });
   await page.goto('http://localhost/');


 await page.evaluate(()=>{
 const item={qty:100,unit:'ชิ้น',receiveDate:'2026-10-01',returns:Array.from({length:8},(_,i)=>({date:`2026-10-${String(i+1).padStart(2,'0')}`,qty:i+1,by:'QA-'+i,reference:i===7?'<script>bad</script>':'REF-'+i}))};
 Object.keys(SLOT_ITEMS).forEach(k=>delete SLOT_ITEMS[k]);
 SLOT_ITEMS.A={'A-01':[item]};
 SLOT_ITEMS.U={'U-01':[{returns:[{date:'2026-10-09',recordedAt:'2026-10-09T05:00:00Z',qty:99,by:'LATEST-U',reference:'LATEST-REF'},{date:'2026-10-08',qty:2,by:'QA-7',reference:'REF-6'}],withdrawals:[{date:'2026-10-10',qty:101,by:'OTHER-TYPE',reference:'OTHER-REF'}]}]};
 const fixture=document.createElement('div');fixture.id='returnFixture';fixture.innerHTML=renderReturnForm(0,item,64);document.body.append(fixture);
 });
 const form=page.locator('#returnFixture');await page.evaluate(()=>{document.body.style.setProperty('--wms-audit-fixture','1');document.getElementById('returnFixture').style.cssText='position:relative;z-index:300;max-width:100%;background:var(--surface-1)';});
 const expected=await page.evaluate(()=>{const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const get=t=>p.find(x=>x.type===t).value;return `${get('year')}-${get('month')}-${get('day')}`;});
 assert.equal(await form.locator('.fr-date').inputValue(),expected);
 const values=await form.locator('#fr-recent-0-by option').evaluateAll(nodes=>nodes.map(n=>n.value));assert.deepEqual(values,['LATEST-U','QA-7','QA-6','QA-5','QA-4']);
 assert.equal(await form.locator('script').count(),0);assert.ok((await form.locator('#fr-recent-0-reference option').evaluateAll(nodes=>nodes.map(n=>n.value))).includes('<script>bad</script>'));
 assert.equal(await form.locator('.fw-recent').count(),0);assert.equal(await form.locator('option[value="OTHER-TYPE"]').count(),0);
 assert.equal(await form.locator('datalist').first().locator('option').first().getAttribute('value'),'99');
 const by=form.locator('.fr-by');await by.fill('QA-7');assert.equal(await by.inputValue(),'QA-7');
 assert.equal(await by.getAttribute('list'),'fr-recent-0-by');
  for(const theme of ['light','dark']){
  await page.evaluate(t=>{document.documentElement.dataset.theme=t;document.getElementById('notificationToastStack').replaceChildren();},theme);await page.waitForTimeout(350);
  const inputBoxes=await form.locator('.fw-entry-row input').evaluateAll(nodes=>nodes.map(e=>({label:e.getAttribute('aria-label'),...e.getBoundingClientRect().toJSON()})));
  for(const box of inputBoxes){assert.ok(box.label);assert.ok(box.height>=44);assert.ok(box.x>=0&&box.right<=viewport.width,'input fits viewport');}
  if(viewport.width<=600)for(let i=1;i<inputBoxes.length;i++)assert.ok(inputBoxes[i].top>=inputBoxes[i-1].bottom,'fields stack in reading order');
  await form.screenshot({path:'work/workbench-return-'+theme+'-'+viewport.width+'.png'});
 }
 await page.evaluate(()=>{document.getElementById('returnFixture').remove();stockSnapshotState='error';PKNotifications.refreshStock();});
 assert.equal(await page.locator('.dashboard-actions').count(),0);
 await page.locator('#notificationToggle').click();
 assert.ok(await page.locator('#notificationItems [data-action="stock"]').count());
 await page.locator('#notificationItems [data-action="stock"]').click();
 assert.equal(await page.locator('#pane-stock').isVisible(),true);
 await page.evaluate(()=>{stockSnapshotState='latest';STOCK.items=[{code:'QA-NEGATIVE',qty:-1,unit:'ชิ้น'}];window.PKProductHistory={open:code=>window.qaOpenedCode=code};PKNotifications.refreshStock();});
 await page.locator('#notificationToggle').click();
 assert.equal(await page.locator('#notificationItems [data-action="negative"]').getAttribute('data-tone'),'critical');
 await page.locator('#notificationItems [data-action="negative"]').click();assert.equal(await page.evaluate(()=>window.qaOpenedCode),'QA-NEGATIVE');
 await page.evaluate(()=>activateTab(document.getElementById('tab-stock')));
 await page.locator('#notificationToggle').click();assert.equal(await page.locator('#notificationPanel').isVisible(),true);await page.keyboard.press('Escape');
 await page.evaluate(()=>activateTab(document.getElementById('tab-incoming')));await page.waitForTimeout(450);
 assert.equal(await page.locator('#incomingReceiveForm').isVisible(),true);
 for(const theme of ['light','dark']){await page.evaluate(t=>{document.documentElement.dataset.theme=t;document.getElementById('notificationToastStack').replaceChildren();},theme);await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);await page.screenshot({path:'work/workbench-incoming-'+theme+'-'+viewport.width+'.png'});}
 assert.deepEqual(errors.filter(e=>!e.includes('supabase')),[]);console.log('PASS workbench forms/actions/incoming light-dark '+viewport.width);await page.close();
 } }finally{await browser.close()}})();
