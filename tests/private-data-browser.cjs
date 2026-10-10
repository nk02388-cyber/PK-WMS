const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {webkit}=require('C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const fixture=`<script>
document.body.classList.remove('auth-pending','department-choosing');document.body.classList.add('auth-ready');
window.qaPrivate={allowed:true,fail:false,calls:[],pendingStock:null,delayStock:false};
window.getWmsIsAdmin=()=>qaPrivate.allowed;window.getWmsCanAccess=()=>qaPrivate.allowed;
const qaItems=[{code:'QA-PK',name:'สินค้า QA',unit:'ชิ้น',qty:20,value:100,wh:'200',cat:'QA'}];const qaStock={...structuredClone(EMPTY_STOCK),...aggregate(qaItems),items:qaItems,warehouses:[],report_date:'API TEST'};
const qaBom={bom_detail:{'QA-FG':{fg_name:'สูตร QA',lines:[{pk_code:'QA-PK',pk_name:'สินค้า QA',unit:'ชิ้น',qty_per_unit:2,component_type:'packaging'}]}},fg_catalog:{'QA-FG':{fg:'QA-FG',fg_name:'สูตร QA'}},metadata:{assumptions:{excluded_warehouses:[]}}};
const qaSaved=[{fg_code:'QA-SAVED',fg_name:'สูตรบันทึก QA',fg_unit:'ชิ้น',base_qty:1,version:1,lines:[{pk_code:'QA-PK',pk_name:'สินค้า QA',qty:4,unit:'ชิ้น'}]}];
stockSupabaseClient=supabaseClient={rpc:async name=>{qaPrivate.calls.push(name);if(qaPrivate.fail)return {error:{message:'offline'}};if(name==='get_latest_stock_inventory'){if(qaPrivate.delayStock)return new Promise(resolve=>qaPrivate.pendingStock=()=>resolve({data:structuredClone(qaStock)}));return {data:structuredClone(qaStock)};}if(name==='get_pk_bom_baseline')return {data:structuredClone(qaBom)};if(name==='get_pk_recipes')return {data:structuredClone(qaSaved)};return {data:[]};}};
setTimeout(()=>window.dispatchEvent(new Event('wms:account-changed')),0);
</script>`;
(async()=>{
 const browser=await webkit.launch({headless:true});try{
  for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname!=='localhost')return r.abort();const file=path.join(root,u.pathname==='/'?'index.html':u.pathname);if(!fs.existsSync(file))return r.fulfill({status:404,body:''});let body=fs.readFileSync(file);if(file.endsWith('index.html'))body=body.toString().replace(/<script src="account-status.js[^>]*><\/script>/,fixture);return r.fulfill({body,contentType:file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.webp')?'image/webp':file.endsWith('.png')?'image/png':'application/octet-stream'});});
   await page.goto('http://localhost/');
   await page.waitForFunction(()=>STOCK.report_date==='API TEST'&&document.getElementById('pkRecipesStatus').textContent.includes('โหลด BOM จาก API แล้ว'));
   const loaded=await page.evaluate(()=>({stock:STOCK.items.length,original:BOMPK.bom_detail['QA-FG'].producible,saved:BOMPK.bom_detail['QA-SAVED'].producible,calls:qaPrivate.calls}));
   assert.equal(loaded.stock,1);assert.equal(loaded.original,10);assert.equal(loaded.saved,5);assert.ok(loaded.calls.includes('get_pk_bom_baseline'));assert.ok(loaded.calls.includes('get_pk_recipes'));
   // A result from an old account must never repopulate stock after logout/permission loss.
   await page.evaluate(()=>{qaPrivate.delayStock=true;window.dispatchEvent(new Event('wms:account-changed'));});
   await page.waitForFunction(()=>typeof qaPrivate.pendingStock==='function');
   await page.evaluate(()=>{qaPrivate.allowed=false;window.dispatchEvent(new Event('wms:account-changed'));qaPrivate.pendingStock();});
   await page.waitForFunction(()=>STOCK.items.length===0&&Object.keys(BOMPK.bom_detail).length===0);
   await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>STOCK.items.length),0);
   await page.evaluate(()=>{qaPrivate.allowed=true;qaPrivate.delayStock=false;qaPrivate.fail=true;window.dispatchEvent(new Event('wms:account-changed'));});
   await page.waitForFunction(()=>document.getElementById('pkRecipesStatus').textContent.includes('โหลดสูตรไม่ได้'));
   await page.waitForFunction(()=>document.getElementById('notificationItems').textContent.includes('โหลดสต็อกล่าสุดไม่ได้'));
   assert.deepEqual(await page.evaluate(()=>({stock:STOCK.items.length,bom:Object.keys(BOMPK.bom_detail).length})),{stock:0,bom:0});
   await page.evaluate(()=>{qaPrivate.fail=false;window.dispatchEvent(new Event('wms:account-changed'));});
   await page.waitForFunction(()=>STOCK.items.length===1&&Object.keys(BOMPK.bom_detail).length===2);
   await page.waitForFunction(()=>!document.getElementById('notificationItems').textContent.includes('โหลดสต็อกล่าสุดไม่ได้'));
   assert.deepEqual(errors,[]);console.log('PASS private API stock/BOM, saved overlay, logout, late response, failure/retry '+width);await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
