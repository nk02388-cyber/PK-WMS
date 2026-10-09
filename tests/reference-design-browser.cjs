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
   await page.addInitScript(()=>{localStorage.setItem('pk-dashboard-theme-haulix','light');if(!sessionStorage.getItem('qa-sidebar-initialized')){localStorage.setItem('pk-sidebar-collapsed-v2','false');sessionStorage.setItem('qa-sidebar-initialized','1');}});await page.goto('http://localhost/');


 await page.waitForTimeout(1800);
 const nav=page.locator('#tabs');
 if(viewport.width<1024)await page.locator('#sidebarToggle').click();
 assert.equal(await nav.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(249, 250, 251)');
 assert.equal(await page.locator('#tabs .tab-btn').evaluateAll(nodes=>nodes.every(n=>n.querySelectorAll('.tab-icon').length===1)),true);
 if(viewport.width<1024)await page.locator('#sidebarClose').click();
 await page.waitForTimeout(300);
 await page.screenshot({path:'work/reference-dashboard-'+viewport.width+'.png',fullPage:false});
 if(viewport.width>=1024){await page.locator('#sidebarToggle').click();await page.waitForTimeout(300);assert.equal(await nav.evaluate(el=>el.getBoundingClientRect().width),64);await page.screenshot({path:'work/reference-dashboard-icons.png'});await page.locator('#sidebarToggle').click();await page.waitForTimeout(300);}
 await page.evaluate(()=>document.documentElement.dataset.theme='dark');
 assert.equal(await page.locator('.panel').first().evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(30, 48, 56)');
 assert.equal(await nav.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(27, 44, 52)');
 await page.screenshot({path:'work/reference-dashboard-dark-'+viewport.width+'.png'});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
 assert.deepEqual(errors.filter(e=>!e.includes('supabase')),[]);
 console.log('PASS reference design '+viewport.width);await page.close();} }finally{await browser.close()}})();
