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

 await page.evaluate(()=>{palletDataReady=true;Object.keys(ITEM_TO_SLOTS).forEach(k=>delete ITEM_TO_SLOTS[k]);ITEM_TO_SLOTS['QA-123']=[{name:'ปั๊ม สีขาว 500 มล',zone:'A',slot:'A-01',lotNo:'LOT-789'}];activateTab(document.getElementById('tab-floorplan'));});
 await page.locator('#floorplanSearchInput').fill('500 ปั๊ม');await page.locator('#floorplanSearchSuggestions .floorplan-search-suggestion').first().waitFor({state:'visible'});assert.ok((await page.locator('#floorplanSearchSuggestions').textContent()).includes('QA-123'));
 await page.locator('#floorplanSearchInput').fill('A-01 LOT-789');await page.locator('#floorplanSearchSuggestions .floorplan-search-suggestion').first().waitFor({state:'visible'});
 await page.locator('#floorplanSearchInput').fill('missing 500');assert.equal(await page.locator('#floorplanSearchSuggestions .floorplan-search-suggestion').count(),0);
 const result=await page.evaluate(()=>PKIncoming.searchProducts('500 QA-123',[{code:'QA-123',name:'ปั๊ม สีขาว 500 มล'}]).length);assert.equal(result,1);
 assert.deepEqual(errors.filter(e=>!e.includes('supabase')),[]);console.log('PASS keyword search UI '+viewport.width);await page.close();
 } }finally{await browser.close()}})();
