const fs=require('fs'),path=require('path');
const {chromium}=require('C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const results=[];
 try {
  for(const viewport of [{width:1440,height:1000},{width:390,height:844},{width:768,height:1024}]){
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
   const tabs=await page.locator('.tab-btn').evaluateAll(nodes=>nodes.map(n=>({id:n.id,tab:n.dataset.tab})));
   const checks=[];
   for(const tab of tabs){
    if(tab.tab==='warehouse-operations'||tab.id.includes('warehouse-ops'))continue;
    const result=await page.evaluate(async id=>{
     const button=document.getElementById(id);const s=performance.now();button.click();await new Promise(resolve=>setTimeout(resolve,80));
     return {id,ms:Math.round(performance.now()-s),active:button.classList.contains('active'),overflow:document.documentElement.scrollWidth>innerWidth+2};
    },tab.id);
    checks.push(result);
   }
   await page.evaluate(()=>activateTab(document.getElementById('tab-floorplan')));
   await page.evaluate(()=>openZoomModal('M-1'));
   await page.waitForTimeout(150);
   const zoom=await page.evaluate(()=>({active:document.querySelectorAll('.zoom-slot').length,context:document.querySelectorAll('.zoom-context-slot').length,viewport:document.querySelector('.floorplan-zoom-box').getBoundingClientRect().toJSON()}));
   await page.screenshot({path:`work/qa-${viewport.width}.png`});
   await page.evaluate(()=>{palletDataReady=true;SLOT_ITEMS['M-1'] ||= {};SLOT_ITEMS['M-1']['M1-04']=[{code:'QA-PK',name:'QA packaging',qty:10,unit:'ใบ',receiveDate:'2026-09-01',withdrawals:[{date:'2026-09-02',qty:2,unit:'ใบ',by:'QA'}]}];openSlotEdit('M-1','M1-04');});
   const forms=[];
   for(const [button,form,field] of [['.fse-item-withdraw-btn','.fse-withdraw-form','.fw-qty'],['.fse-item-return-btn','.fse-return-form','.fr-qty'],['.fse-item-edit-btn','.fse-edit-form','.fe-code']]){
    await page.evaluate(()=>openSlotEdit('M-1','M1-04'));
    await page.locator(button).first().click();await page.waitForTimeout(120);
    forms.push(await page.evaluate(({form,field})=>({form,visible:!!document.querySelector(form),focused:document.activeElement?.matches(field),overflow:document.documentElement.scrollWidth>innerWidth+2}),{form,field}));
   }
   await page.screenshot({path:`work/qa-form-${viewport.width}.png`});
   await page.keyboard.press('Escape');
   results.push({width:viewport.width,checks,zoom,forms,errors:errors.filter(e=>!e.includes('supabase'))});
   await page.close();
  }
  for(const r of results){assert.deepEqual(r.errors,[]);assert.equal(r.checks.length,15);assert.ok(r.checks.every(c=>c.active&&!c.overflow));assert.equal(r.zoom.active,22);assert.equal(r.zoom.context,18);assert.ok(r.forms.every(f=>f.visible&&f.focused&&!f.overflow));}
  fs.writeFileSync('work/browser-audit.json',JSON.stringify(results,null,2));
  console.log(JSON.stringify(results,null,2));
 }finally{await browser.close()}
})();
