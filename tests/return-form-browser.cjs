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
   await page.goto('http://localhost/');


 await page.evaluate(()=>{
 const item={qty:100,unit:'ชิ้น',receiveDate:'2026-10-01',returns:Array.from({length:8},(_,i)=>({date:`2026-10-${String(i+1).padStart(2,'0')}`,qty:i+1,by:'QA-'+i,reference:i===7?'<script>bad</script>':'REF-'+i}))};
 const fixture=document.createElement('div');fixture.id='returnFixture';fixture.innerHTML=renderReturnForm(0,item,64);document.body.append(fixture);
 });
 const form=page.locator('#returnFixture');
 const expected=await page.evaluate(()=>{const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const get=t=>p.find(x=>x.type===t).value;return `${get('year')}-${get('month')}-${get('day')}`;});
 assert.equal(await form.locator('.fr-date').inputValue(),expected);
 const values=await form.locator('#fr-recent-0-by option').evaluateAll(nodes=>nodes.map(n=>n.value));assert.deepEqual(values,['QA-7','QA-6','QA-5','QA-4','QA-3']);
 assert.equal(await form.locator('script').count(),0);assert.equal(await form.locator('#fr-recent-0-reference option').first().getAttribute('value'),'<script>bad</script>');
 assert.equal(await form.locator('.fw-recent').count(),0);
 const by=form.locator('.fr-by');await by.fill('QA-7');assert.equal(await by.inputValue(),'QA-7');
 assert.equal(await by.getAttribute('list'),'fr-recent-0-by');
 assert.deepEqual(errors.filter(e=>!e.includes('supabase')),[]);console.log('PASS return today, latest five field suggestions and escaping '+viewport.width);await page.close();
 } }finally{await browser.close()}})();
