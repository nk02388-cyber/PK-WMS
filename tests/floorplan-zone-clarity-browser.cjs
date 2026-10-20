const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,webkit}=require('C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),engine=process.env.PK_COPY_BROWSER||'edge',out=path.join(root,'work/zone-clarity',engine);
(async()=>{
 const browser=await(engine==='webkit'?webkit.launch({headless:true}):chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}));
 fs.mkdirSync(out,{recursive:true});
 try{for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:950},hasTouch:width===390}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   const u=new URL(route.request().url());if(u.hostname!=='localhost')return route.abort();const file=path.join(root,u.pathname==='/'?'index.html':u.pathname);if(!fs.existsSync(file))return route.abort();let body=fs.readFileSync(file);
   if(file.endsWith('index.html'))body=body.toString().replace(/const (SUPABASE_URL|STOCK_SUPABASE_URL) = '[^']*';/g,"const $1 = '';").replace(/<script src="account-status.js[^>]*><\/script>/,`<script>document.body.classList.remove('auth-pending','department-choosing');document.body.classList.add('auth-ready');window.getWmsCanAccess=()=>true;window.getWmsIsAdmin=()=>true;supabaseClient={rpc:async()=>({data:[]})};</script>`);
   return route.fulfill({body,contentType:file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'image/jpeg'});
  });
  await page.goto('http://localhost/');await page.emulateMedia({reducedMotion:'reduce'});
  const zones=await page.evaluate(()=>{palletDataReady=true;activateTab(document.getElementById('tab-floorplan'));slotAgeStatus=(_,code)=>['none','green','yellow','red'][Number(code.split('-').pop())%4];renderOverviewSlotStatus();return Object.keys(ZONE_SLOTS);});
  for(const theme of ['light','dark']){
   const zoomColors=new Map();
   await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
   const overview=await page.evaluate(()=>Object.entries(ZONE_SLOTS).flatMap(([zone,slots])=>slots.map(slot=>{
    const el=document.querySelector(`#floorplanSlotStatus [title="${slot.code}"]`),style=getComputedStyle(el);
    return {zone,code:slot.code,status:slotAgeStatus(zone,slot.code),border:style.borderTopWidth,fill:style.backgroundColor,shadow:style.boxShadow};
   })));
   assert.equal(new Set(overview.map(s=>s.zone)).size,zones.length);
   for(const marker of overview){assert.equal(marker.border,'1px',`${theme} ${marker.code} overview border`);assert.notEqual(marker.shadow,'none',`${marker.code} boundary`);}
   for(const status of ['none','green','yellow','red'])assert.equal(new Set(overview.filter(s=>s.status===status).map(s=>s.fill)).size,1,`${theme} ${status} uniform overview fill`);
   for(const zone of zones){
    await page.evaluate(async zone=>{openZoomModal(zone);await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));},zone);
    const cells=await page.evaluate(()=>[...document.querySelectorAll('#floorplanZoomSlots .zoom-slot')].map(el=>{
     const s=getComputedStyle(el),label=el.querySelector('.zoom-slot-label'),r=el.getBoundingClientRect(),lr=label.getBoundingClientRect();
     return {code:el.dataset.slot,status:slotAgeStatus(currentZoomZone,el.dataset.slot),border:parseFloat(s.borderTopWidth),fill:s.backgroundColor,label:label.textContent,dimensions:[r.width,r.height,lr.width,lr.height],contained:lr.left>=r.left-1&&lr.right<=r.right+1&&lr.top>=r.top-1&&lr.bottom<=r.bottom+1};
    }));
    assert.equal(cells.length,overview.filter(s=>s.zone===zone).length,`${zone} count`);
    for(const cell of cells){assert.ok(cell.border>=1,`${zone}/${cell.code} border`);assert.equal(cell.label,cell.code);assert.ok(cell.contained,`${width} ${zone}/${cell.code} label fits: ${cell.dimensions}`);if(zoomColors.has(cell.status))assert.equal(cell.fill,zoomColors.get(cell.status),`${zone}/${cell.code} uniform zoom fill`);else zoomColors.set(cell.status,cell.fill);}
    if(theme==='light')await page.locator('#floorplanZoomViewport').screenshot({path:path.join(out,`${width}-${zone}.png`)});
    await page.evaluate(()=>closeZoomModal());
   }
  }
  assert.deepEqual(errors.filter(e=>!e.includes('supabase')),[]);
  console.log(`PASS ${engine} ${width}px: ${zones.length} zones, all overview markers and zoom labels/borders, four statuses, light/dark`);
  await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
