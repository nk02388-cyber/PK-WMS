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

 const nav=page.locator('#tabs'),toggle=page.locator('#sidebarToggle');
 if(viewport.width>=1024){
  await page.mouse.move(800,300);await page.waitForFunction(()=>Math.abs(document.getElementById('tabs').getBoundingClientRect().width-64)<.1);
  assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert.equal(await nav.locator('.dashboard-nav-brand img').isVisible(),true);
  const contentBefore=await page.locator('#dashboardContent').boundingBox();await nav.hover();await page.waitForFunction(()=>document.getElementById('tabs').getBoundingClientRect().width>279);assert.equal(await nav.locator('#tab-stock > span').first().isVisible(),true);const contentAfter=await page.locator('#dashboardContent').boundingBox();assert.equal(contentAfter.x,contentBefore.x);assert.equal(contentAfter.width,contentBefore.width);await page.screenshot({path:'work/sidebar-hover-open.png'});
  await page.mouse.move(800,300);await page.waitForFunction(()=>Math.abs(document.getElementById('tabs').getBoundingClientRect().width-64)<.1);assert.equal(await nav.locator('#tab-stock > span').first().isVisible(),false);
  await page.keyboard.press('Tab');await page.locator('#tab-stock').focus();await page.waitForFunction(()=>document.getElementById('tabs').getBoundingClientRect().width>279);await page.keyboard.press('Escape');await page.waitForFunction(()=>Math.abs(document.getElementById('tabs').getBoundingClientRect().width-64)<.1);
  await page.emulateMedia({reducedMotion:'reduce'});await nav.hover();assert.ok(await nav.evaluate(el=>parseFloat(getComputedStyle(el).transitionDuration)<.001));await page.mouse.move(800,300);await toggle.click();assert.equal(await page.evaluate(()=>document.body.classList.contains('sidebar-collapsed')),false);await page.reload();await page.waitForFunction(()=>!document.body.classList.contains('sidebar-collapsed'));assert.equal(await toggle.getAttribute('aria-expanded'),'true');
 }else{assert.equal(await nav.evaluate(el=>el.inert),true);await toggle.click();await page.locator('#tab-product-history').click();assert.equal(await page.locator('#pane-product-history').isVisible(),true);assert.equal(await toggle.getAttribute('aria-expanded'),'false');}
 assert.deepEqual(errors.filter(e=>!e.includes('supabase')),[]);console.log('PASS sidebar hover/default/focus/pin '+viewport.width);await page.close();
 } }finally{await browser.close()}})();
