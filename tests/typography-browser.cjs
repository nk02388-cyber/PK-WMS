const fs=require('fs'),path=require('path');
const {chromium,webkit}=require('C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await (process.env.PK_FONT_BROWSER==='webkit'?webkit.launch({headless:true}):chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}));
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
    route.fulfill({body,contentType:file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':file.endsWith('.woff2')?'font/woff2':file.endsWith('.png')?'image/png':file.endsWith('.webp')?'image/webp':'image/jpeg'});
   });
   await page.goto('http://localhost/');

 await page.evaluate(async()=>{await document.fonts.load('400 14px "Noto Sans Thai"','คลังสินค้า 0123456789');await document.fonts.load('600 14px "Noto Sans Thai"','คลังสินค้า');await document.fonts.ready;});
 const typography=await page.evaluate(()=>{const style=el=>({family:getComputedStyle(el).fontFamily,size:getComputedStyle(el).fontSize,weight:getComputedStyle(el).fontWeight});const a=document.createElement('span');a.style.cssText='position:absolute;white-space:pre;font-size:14px;font-variant-numeric:tabular-nums';document.body.append(a);a.textContent='11111';const first=a.getBoundingClientRect().width;a.textContent='88888';const second=a.getBoundingClientRect().width;a.remove();return {loaded:document.fonts.check('400 14px "Noto Sans Thai"','คลังสินค้า'),body:style(document.body),menu:style(document.getElementById('tab-stock')),table:style(document.querySelector('#pane-stock table td')),digitWidths:[first,second]};});
 assert.ok(typography.loaded);assert.equal(typography.body.family.split(',')[0].replace(/['"]/g,'').trim(),'Noto Sans Thai');assert.equal(typography.body.size,'14px');assert.equal(typography.menu.size,'14px');assert.equal(typography.menu.weight,'600');assert.equal(typography.table.size,'14px');assert.ok(Math.abs(typography.digitWidths[0]-typography.digitWidths[1])<.2);
 for(const theme of ['light','dark']){await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;activateTab(document.getElementById('tab-bompk'));document.getElementById('fgBomSearch').value='21-0021-01';renderFgBom('21-0021-01');},theme);assert.equal(await page.locator('.fg-bom-table td').first().evaluate(el=>getComputedStyle(el).fontSize),'14px');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);await page.locator('#fgBomResult').screenshot({path:'work/noto-bom-'+theme+'-'+viewport.width+'.png'});}
 console.log(JSON.stringify({width:viewport.width,...typography}));await page.goto('http://localhost/operations/index.html');await page.evaluate(async()=>{await document.fonts.load('400 14px "Noto Sans Thai"','คลังสินค้า 0123456789');await document.fonts.ready;});assert.ok(await page.evaluate(()=>document.fonts.check('400 14px "Noto Sans Thai"','คลังสินค้า')));assert.equal(await page.locator('body').evaluate(el=>getComputedStyle(el).fontFamily.split(',')[0].replace(/['"]/g,'').trim()),'Noto Sans Thai');console.log('PASS warehouse-operations font '+viewport.width);await page.close();} }finally{await browser.close()}})();