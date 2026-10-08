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

 for(const theme of ['light','dark']){
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  await page.evaluate(()=>{window.getWmsIsAdmin=()=>true;window.requestWarehouseOperationsPin();});
  const dialog=page.locator('.warehouse-pin-dialog');
  await dialog.waitFor({state:'visible'});
  const expected=theme==='light'?'rgb(38, 116, 87)':'rgb(158, 213, 186)';
  assert.equal(await dialog.locator('button[type=submit]').evaluate(el=>getComputedStyle(el).backgroundColor),expected);
  assert.equal(await dialog.evaluate(el=>getComputedStyle(el).backgroundColor),theme==='light'?'rgb(255, 255, 255)':'rgb(30, 48, 56)');
  assert.equal(await dialog.locator('input').evaluate(el=>getComputedStyle(el).outlineColor),theme==='light'?'rgb(75, 158, 128)':'rgb(158, 213, 186)');
  assert.equal(await dialog.evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight}),true);
  await dialog.evaluate(async el=>{await Promise.all(el.getAnimations().map(animation=>animation.finished));});
  await page.screenshot({path:'work/pin-design-'+theme+'-'+viewport.width+'.png'});
  await dialog.locator('button[type=button]').click();
  await page.evaluate(()=>document.querySelector('#actionConfirmationDialog').showModal());
  const confirmation=page.locator('#actionConfirmationDialog');
  assert.equal(await confirmation.locator('button[type=submit]').evaluate(el=>getComputedStyle(el).backgroundColor),expected);
  assert.equal(await confirmation.evaluate(el=>getComputedStyle(el).backgroundColor),theme==='light'?'rgb(255, 255, 255)':'rgb(30, 48, 56)');
  await confirmation.evaluate(el=>el.close());
 }
 console.log('PASS modal theme '+viewport.width);await page.close();} }finally{await browser.close()}})();
