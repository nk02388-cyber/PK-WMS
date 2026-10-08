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

 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{palletDataReady=true;const original=computeTotalCapacity;computeTotalCapacity=()=>({usedPct:70.2,totalUsed:709,totalPallet:1010});renderSpeedMeter();computeTotalCapacity=original;});
 const card=page.locator('#pkSpeedMeterCard');assert.ok((await card.locator('.sm-title').textContent()).includes('Storage capacity'));assert.ok((await card.locator('.sm-title').textContent()).includes('ความจุในการจัดเก็บ'));assert.equal(await card.locator('.sm-value').textContent(),'70.2%');assert.equal(await card.locator('path').count(),3);assert.equal(await card.locator('.sm-needle').getAttribute('stroke-width'),'1.8');assert.deepEqual(await card.locator('.sm-band').evaluateAll(paths=>paths.map(p=>p.getAttribute('stroke'))),['#5aa77d','#d9b44a','#df727a']);assert.equal(await card.evaluate(el=>el.querySelector('.sm-sub').getBoundingClientRect().bottom<=el.getBoundingClientRect().bottom-6),true,'capacity count must fit inside card');
 for(const theme of ['light','dark']){await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);await card.screenshot({path:'work/minimal-gauge-'+theme+'-'+viewport.width+'.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);}
 assert.deepEqual(errors.filter(e=>!e.includes('supabase')),[]);console.log('PASS minimal capacity gauge '+viewport.width);await page.close();
 } }finally{await browser.close()}})();
