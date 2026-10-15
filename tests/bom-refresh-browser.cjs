const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const fixture=`<script>
document.body.classList.remove('auth-pending','department-choosing');document.body.classList.add('auth-ready');
window.qaPrivate={allowed:true,fail:false,calls:[],pendingStock:null,delayStock:false};
window.getWmsIsAdmin=()=>qaPrivate.allowed;window.getWmsCanAccess=()=>qaPrivate.allowed;
const qaItems=[{code:'QA-PK',name:'สินค้า QA',unit:'ชิ้น',qty:20,value:100,wh:'200',cat:'QA'}];const qaStock={...structuredClone(EMPTY_STOCK),...aggregate(qaItems),items:qaItems,warehouses:[],report_date:'API TEST'};
const qaBom={bom_detail:{'QA-FG':{fg_name:'สูตร QA',lines:[{pk_code:'QA-PK',pk_name:'สินค้า QA',unit:'ชิ้น',qty_per_unit:2,component_type:'packaging'}]}},fg_catalog:{'QA-FG':{fg:'QA-FG',fg_name:'สูตร QA'}},metadata:{assumptions:{excluded_warehouses:[]}}};
const qaSaved=[{fg_code:'QA-SAVED',fg_name:'สูตรบันทึก QA',fg_unit:'ชิ้น',base_qty:1,version:1,lines:[{pk_code:'QA-PK',pk_name:'สินค้า QA',qty:4,unit:'ชิ้น'}]}];
stockSupabaseClient=supabaseClient={rpc:async name=>{qaPrivate.calls.push(name);if(qaPrivate.fail)return {error:{message:'offline'}};if(name==='get_latest_stock_inventory'){if(qaPrivate.delayStock)return new Promise(resolve=>qaPrivate.pendingStock=()=>resolve({data:structuredClone(qaStock)}));return {data:structuredClone(qaStock)};}if(name==='get_pk_bom_baseline'){if(qaPrivate.delayBom)return new Promise(resolve=>qaPrivate.pendingBom=()=>resolve({data:structuredClone(qaBom)}));return {data:structuredClone(qaBom)};}if(name==='get_pk_recipes')return {data:structuredClone(qaSaved)};return {data:[]};}};
setTimeout(()=>window.dispatchEvent(new Event('wms:account-changed')),0);
</script>`;

(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{for(const width of [1440,390]){
const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.clock.install({time:new Date('2026-10-15T09:00:00+07:00')});
await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname!=='localhost')return r.abort();const file=path.join(root,u.pathname==='/'?'index.html':u.pathname);if(!fs.existsSync(file))return r.fulfill({status:404,body:''});let body=fs.readFileSync(file);if(file.endsWith('index.html'))body=body.toString().replace(/<script src="account-status.js[^>]*><\/script>/,fixture);return r.fulfill({body,contentType:file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.jpg')?'image/jpeg':file.endsWith('.png')?'image/png':'application/octet-stream'});});
await page.goto('http://localhost/');await page.waitForFunction(()=>document.getElementById('pkRecipesStatus').textContent.includes('โหลด BOM จาก API แล้ว'));
const counts=()=>page.evaluate(()=>({baseline:qaPrivate.calls.filter(x=>x==='get_pk_bom_baseline').length,saved:qaPrivate.calls.filter(x=>x==='get_pk_recipes').length}));
let before=await counts();await page.clock.fastForward(120000);assert.deepEqual(await counts(),before,'hidden BOM panels never poll');
await page.evaluate(()=>activateTab(document.getElementById('tab-bompk')));await page.waitForFunction(n=>qaPrivate.calls.filter(x=>x==='get_pk_recipes').length>n,before.saved);await page.evaluate(()=>Promise.resolve());
assert.equal((await counts()).baseline,before.baseline,'opening before baseline expiry reuses private in-memory data');
before=await counts();await page.clock.fastForward(60000);await page.waitForFunction(n=>qaPrivate.calls.filter(x=>x==='get_pk_recipes').length>n,before.saved);assert.equal((await counts()).baseline,before.baseline,'minute tick does not redownload baseline');
before=await counts();await page.clock.fastForward(15*60000);await page.waitForFunction(n=>qaPrivate.calls.filter(x=>x==='get_pk_bom_baseline').length>n,before.baseline);
await page.evaluate(()=>activateTab(document.getElementById('tab-stock')));before=await counts();await page.clock.fastForward(20*60000);assert.deepEqual(await counts(),before);
await page.evaluate(()=>activateTab(document.getElementById('tab-bom-plan')));await page.waitForFunction(n=>qaPrivate.calls.filter(x=>x==='get_pk_bom_baseline').length>n,before.baseline);
await page.evaluate(()=>Promise.resolve());before=await counts();await page.evaluate(()=>{qaPrivate.delayBom=true;const b=document.getElementById('pkRecipesRefresh');b.click();b.click();b.click()});
assert.equal((await counts()).baseline,before.baseline+1,'manual refresh forces baseline and coalesces duplicates');await page.evaluate(()=>{qaPrivate.delayBom=false;qaPrivate.pendingBom()});await page.evaluate(()=>Promise.resolve());
await page.evaluate(()=>{qaPrivate.delayBom=true;document.getElementById('pkRecipesRefresh').click()});await page.evaluate(()=>{qaPrivate.allowed=false;window.dispatchEvent(new Event('wms:account-changed'));qaPrivate.pendingBom()});await page.evaluate(()=>Promise.resolve());
assert.equal(await page.evaluate(()=>Object.keys(BOMPK.bom_detail).length),0,'late baseline cannot restore logged-out data');
await page.evaluate(()=>{qaPrivate.allowed=true;qaPrivate.delayBom=false;qaPrivate.fail=true;window.dispatchEvent(new Event('wms:account-changed'))});await page.waitForFunction(()=>document.getElementById('pkRecipesStatus').textContent.includes('โหลดสูตรไม่ได้'));
assert.equal(await page.evaluate(()=>Object.keys(BOMPK.bom_detail).length),0);before=await counts();await page.evaluate(()=>{qaPrivate.fail=false;document.getElementById('pkRecipesRefresh').click()});await page.waitForFunction(()=>Object.keys(BOMPK.bom_detail).length===2);assert.equal((await counts()).baseline,before.baseline+1,'failure clears baseline cache');
assert.deepEqual(errors,[]);console.log('PASS BOM refresh visibility/cache/expiry/manual/coalescing/logout/failure '+width);await page.close();
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
