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

   await page.evaluate(()=>{document.documentElement.dataset.theme='dark';activateTab(document.getElementById('tab-floorplan'));openZoomModal('M-1');palletDataReady=true;palletCanEdit=true;SLOT_ITEMS['M-1'] ||= {};SLOT_ITEMS['M-1']['M1-04']=[{code:'QA-PK',name:'ถุงมือทดสอบโหมดมืด',qty:5000,unit:'คู่',receiveDate:'2026-09-11',withdrawals:[{date:'2026-10-08',qty:2000,unit:'คู่',by:'QA'}]}];openSlotEdit('M-1','M1-04');});
   const row=page.locator('.fse-item-row').first();
   function luminance(rgb){const c=rgb.match(/[\d.]+/g).slice(0,3).map(n=>Number(n)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;}
   const contrast=(a,b)=>{const l=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (l[0]+.05)/(l[1]+.05);};
   for(const state of ['withdrawing','returning','removing']){
    await row.evaluate((el,state)=>{el.classList.remove('withdrawing','returning','removing');el.classList.add(state);},state);
    await page.waitForTimeout(180);
    const colors=await row.evaluate(el=>{const styles=getComputedStyle(el);return {bg:styles.backgroundColor,text:[...el.querySelectorAll('.fse-item-code,.fse-item-name,.fse-item-lotno,.fse-item-remaining-cell,.fse-item-unit-cell')].map(n=>getComputedStyle(n).color)};});
    for(const color of colors.text)assert.ok(contrast(color,colors.bg)>=4.5,state+' contrast '+color+' on '+colors.bg);
   }
   await row.evaluate(el=>el.classList.remove('removing'));
   await row.locator('.fse-item-withdraw-btn').click();await page.waitForTimeout(200);
   assert.equal(await row.locator('.fse-item-code').evaluate(el=>getComputedStyle(el).color),'rgb(237, 244, 247)');
   const history=await row.locator('.stock-movement').evaluate(el=>[...el.querySelectorAll('td')].filter(n=>n.textContent.trim()).map(n=>({color:getComputedStyle(n).color,bg:getComputedStyle(n).backgroundColor})));
   for(const cell of history)assert.ok(contrast(cell.color,cell.bg==='rgba(0, 0, 0, 0)'?'rgb(30, 48, 56)':cell.bg)>=4.5,'history contrast');
   await page.screenshot({path:'work/stock-card-dark-'+viewport.width+'.png'});
   assert.deepEqual(errors.filter(e=>!e.includes('supabase')),[]);console.log('PASS dark STOCK CARD '+viewport.width);await page.close();
  }
 }finally{await browser.close()}
})();
