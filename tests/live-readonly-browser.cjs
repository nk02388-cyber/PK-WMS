const fs=require('node:fs'),assert=require('node:assert/strict');
const {webkit}=require('C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await webkit.launch({headless:true});const report=[];
 try {
  for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:900}}),errors=[],failed=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{if(r.status()>=400&&new URL(r.url()).hostname==='bcl-wms.vercel.app')failed.push({url:r.url(),status:r.status()});});
   await page.goto('https://bcl-wms.vercel.app/?qa=readonly-20261008',{waitUntil:'networkidle'});
   await page.locator('.department-pk').click();
   await page.locator('#authUsername').waitFor({state:'visible'});
   assert.equal(await page.locator('#authUsername').evaluate(el=>el===document.activeElement),true);
   await page.locator('#authPassword').fill('local-ui-draft');
   await page.locator('#authTogglePassword').click();assert.equal(await page.locator('#authPassword').getAttribute('type'),'text');
   await page.locator('#authChangeDepartment').click();
   assert.equal(await page.locator('#authPassword').inputValue(),'');
   for(const theme of ['light','dark']){
    await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
    await page.screenshot({path:'work/live-entry-'+width+'-'+theme+'.png'});
   }
   assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
   report.push({width,pageErrors:errors,failedAssets:failed,departmentAndLogin:true});await page.close();
  }
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('https://bcl-wms.vercel.app/operations/',{waitUntil:'networkidle'});
  const denied=await page.locator('body').innerText();assert.match(denied,/Admin/);assert.match(denied,/กลับ PK WMS/);
  report.push({operationsAnonymousMessage:denied,pageErrors:errors});assert.deepEqual(errors,[]);
  const assets=new Set();for(const pathname of ['/','/operations/']){
   const response=await fetch('https://bcl-wms.vercel.app'+pathname);assert.equal(response.status,200);const html=await response.text();
   for(const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)){
    const url=new URL(match[1],'https://bcl-wms.vercel.app'+pathname);
    if(url.hostname==='bcl-wms.vercel.app'&&/\.(css|js|mjs|png|jpg|webp|woff2)(\?|$)/.test(url.href))assets.add(url.href);
   }
  }
  const bad=[];let urls=[...assets];for(let i=0;i<urls.length;i+=6)await Promise.all(urls.slice(i,i+6).map(async url=>{const r=await fetch(url);if(r.status!==200)bad.push({url,status:r.status});}));
  assert.deepEqual(bad,[]);report.push({assetsChecked:assets.size,failed:bad});
  fs.writeFileSync('work/live-readonly-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 } finally {await browser.close();}
})();
