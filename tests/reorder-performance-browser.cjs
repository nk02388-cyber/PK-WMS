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



 await page.waitForTimeout(300);
 assert.equal(await page.locator('#reorderRows tr').count(),0,'hidden page should defer table creation');
 await page.evaluate(()=>{stockSnapshotState='latest';STOCK={...STOCK,items:PK_ROP_DATA.slice(0,30).map(p=>({code:p.code,unit:p.unit,wh:'201',qty:0}))};PKReorder.refresh();});
 assert.equal(await page.evaluate(()=>PKReorder.getRows()===PKReorder.getRows()),true);
 const point=await page.evaluate(()=>({code:PK_ROP_DATA[0].code,unit:PK_ROP_DATA[0].unit,rop:PK_ROP_DATA[0].rop}));
 await page.evaluate(()=>document.getElementById('tab-reorder').click());
 await page.waitForFunction(()=>document.querySelectorAll('#reorderRows tr').length>1);
 const first=await page.locator('#reorderRows tr').first().elementHandle();
 await page.evaluate(()=>PKReorder.refresh());assert.equal(await first.evaluate(el=>el.isConnected),true,'unchanged rows should reuse DOM');
 await page.locator('#reorderSearch').fill(point.code);await page.waitForTimeout(160);
 assert.ok((await page.locator('#reorderRows').textContent()).includes(point.code));
 assert.ok(await page.locator('#reorderRows tr').count()<=200);
 await page.evaluate(point=>{STOCK.items[0].qty=Number(point.rop)+999;PKReorder.refresh();},point);
 assert.equal(await page.evaluate(code=>PKReorder.getRows().find(r=>r.code===code).status,point.code),'normal','explicit stock refresh invalidates cached calculations');
 await page.locator('#reorderFilter').selectOption('normal');assert.ok((await page.locator('#reorderRows').textContent()).includes(point.code));
 await page.evaluate(()=>{stockSnapshotState='error';PKReorder.refresh();});
 assert.equal(await page.evaluate(()=>PKReorder.getRows().some(r=>r.status==='alert')),false,'stale stock must not create alerts');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
 assert.deepEqual(errors.filter(e=>!e.includes('supabase')),[]);
 console.log('PASS reorder cache, deferred rows, search, stock invalidation, stale stock '+viewport.width);await page.close();
 } }finally{await browser.close()}})();
