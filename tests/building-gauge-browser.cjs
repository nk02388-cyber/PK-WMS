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

 await page.evaluate(()=>{palletDataReady=true;const original=computeAreaBuildingUsage;computeAreaBuildingUsage=b=>{const old=AREA_BUILDINGS.indexOf(b)===0,palletNo=old?521:489,used=old?334:377;return {palletNo,used,remaining:palletNo-used};};renderBuildingUsage();computeAreaBuildingUsage=original;});
 const list=page.locator('#buildingUsageList');await page.evaluate(()=>{const el=document.getElementById('buildingUsageList');window.scrollTo({top:scrollY+el.getBoundingClientRect().top-220,behavior:'instant'});PKMotion.buildingGauges(true);});
 assert.equal(await list.locator('svg.building-gauge').count(),2);assert.deepEqual(await list.locator('.building-gauge-band').evaluateAll(paths=>paths.map(p=>p.getAttribute('stroke'))),['#5aa77d','#d9b44a','#df727a','#5aa77d','#d9b44a','#df727a']);assert.deepEqual(await list.locator('.building-usage-percent').allTextContents(),['64.1%','77.1%']);
 await page.waitForFunction(()=>[...document.querySelectorAll('.building-gauge-needle')].some(el=>el.getAnimations().some(a=>a.currentTime>0&&a.currentTime<900)));
 await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('.building-gauge-needle,.building-gauge-progress')].flatMap(el=>el.getAnimations().map(a=>a.finished)));});
 assert.equal(await list.locator('.building-gauge-needle').first().evaluate(el=>getComputedStyle(el).transform),'none');
 for(const theme of ['light','dark']){await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);await list.screenshot({path:'work/building-gauges-'+theme+'-'+viewport.width+'.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);}
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>matchMedia('(prefers-reduced-motion: reduce)').matches&&!document.querySelector('#buildingUsageList').getAnimations({subtree:true}).some(a=>a.id==='pk-motion'));await page.evaluate(()=>PKMotion.buildingGauges(true));assert.equal(await list.evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.id==='pk-motion').length),0);assert.deepEqual(errors.filter(e=>!e.includes('supabase')),[]);console.log('PASS building gauges '+viewport.width+' values/reveal/needle/reduced-motion');await page.close();
 } }finally{await browser.close()}})();
