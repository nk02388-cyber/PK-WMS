const fs=require('fs'),path=require('path');
const {chromium,webkit}=require('C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await (process.env.PK_SIDEBAR_BROWSER==='webkit'?webkit.launch({headless:true}):chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}));
 const results=[];
 try {
  for(const viewport of [{width:1440,height:1000},{width:390,height:844},{width:950,height:1024}]){
   const page=await browser.newPage({viewport});const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',route=>{
    const u=new URL(route.request().url());if(u.hostname!=='localhost')return route.abort();
    const file=path.join(root,u.pathname==='/'?'index.html':u.pathname);
    if(!fs.existsSync(file))return route.abort();let body=fs.readFileSync(file);
    if(file.endsWith('index.html'))body=body.toString().replace(/const (SUPABASE_URL|STOCK_SUPABASE_URL) = '[^']*';/g,"const $1 = '';").replace(/<script src="account-status.js[^>]*><\/script>/,`<script>document.body.classList.remove('auth-pending','department-choosing');document.body.classList.add('auth-ready');window.getWmsIsAdmin=()=>true;window.getWmsCanAccess=()=>true;window.getWmsActorName=()=> 'QA';supabaseClient={rpc:async()=>({data:[]})};</script>`);
    route.fulfill({body,contentType:file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':file.endsWith('.png')?'image/png':file.endsWith('.webp')?'image/webp':'image/jpeg'});
   });
   await page.goto('http://localhost/');

 const toggle=page.locator('#sidebarToggle'),nav=page.locator('#tabs');
 if(viewport.width>=1024){const before=await page.locator('#dashboardContent').evaluate(el=>el.getBoundingClientRect().width);await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert.equal(await nav.isVisible(),false);const after=await page.locator('#dashboardContent').evaluate(el=>el.getBoundingClientRect().width);assert.ok(after-before>=250);await page.screenshot({path:'work/sidebar-desktop-collapsed.png'});await page.reload();await toggle.waitFor();assert.equal(await toggle.getAttribute('aria-expanded'),'false');await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');assert.equal(await nav.isVisible(),true);}
 else{assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert.equal(await nav.evaluate(el=>el.inert),true);await toggle.click();await page.locator('#tab-floorplan').click();assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert.equal(await page.locator('#pane-floorplan').isVisible(),true);assert.equal(await page.locator('#dashboardContent').evaluate(el=>el.inert),false);await toggle.click();assert.equal(await nav.evaluate(el=>el.inert),false);await page.waitForFunction(()=>document.getElementById('tabs').getBoundingClientRect().left>=-.5);await page.screenshot({path:'work/sidebar-mobile-'+viewport.width+'.png'});await page.keyboard.press('Escape');assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert.equal(await toggle.evaluate(el=>document.activeElement===el),true);await toggle.click();await page.locator('#sidebarClose').click();assert.equal(await toggle.getAttribute('aria-expanded'),'false');await toggle.click();await page.locator('.sidebar-backdrop').click({position:{x:viewport.width-10,y:100}});assert.equal(await toggle.getAttribute('aria-expanded'),'false');}
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);assert.deepEqual(errors.filter(e=>!e.includes('supabase')),[]);console.log('PASS sidebar '+viewport.width);await page.close();} }finally{await browser.close()}})();