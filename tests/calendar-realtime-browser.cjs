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
    if(file.endsWith('index.html'))body=body.toString().replace(/const (SUPABASE_URL|STOCK_SUPABASE_URL) = '[^']*';/g,"const $1 = '';").replace(/<script src="account-status.js[^>]*><\/script>/,`<script>document.body.classList.remove('auth-pending','department-choosing');document.body.classList.add('auth-ready');window.getWmsIsAdmin=()=>true;window.getWmsCanAccess=()=>true;window.getWmsActorName=()=> 'QA';window.calendarReads=0;window.calendarRows=[];const channel={on:(kind,opts,callback)=>{if(opts.table==='event_calendar')window.calendarEvent=callback;return channel;},subscribe:callback=>{if(callback)window.calendarSubscription=callback;return channel;}};supabaseClient={rpc:async()=>({data:[]}),from:table=>({select:()=>({order(){return this;},range:async()=>{if(table==='event_calendar'){window.calendarReads++;if(window.calendarHold)await new Promise(resolve=>window.calendarRelease=resolve);return {data:window.calendarRows};}return {data:[]};}})}),channel:()=>channel};</script>`);
    if(file.endsWith('index.html')){const boot=body.match(/<script>document.body.classList.remove[\s\S]*?<\/script>/)[0];body=body.replace(boot,'').replace('<script src="event-calendar.js',boot+'<script src="event-calendar.js');}
    route.fulfill({body,contentType:file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':file.endsWith('.png')?'image/png':file.endsWith('.webp')?'image/webp':'image/jpeg'});
   });
   await page.addInitScript(()=>{localStorage.setItem('pk-dashboard-theme-haulix','light');localStorage.setItem('pk-event-calendar-migrated-v1','1');});await page.clock.install();await page.goto('http://localhost/');



 await page.waitForFunction(()=>document.getElementById('eventCalendarSync').dataset.state==='ready');
 await page.evaluate(()=>window.calendarSubscription('SUBSCRIBED'));await page.waitForTimeout(50);
 const baseline=await page.evaluate(()=>window.calendarReads);
 await page.clock.fastForward(14*60*1000);assert.equal(await page.evaluate(()=>window.calendarReads),baseline,'healthy Realtime must not poll every 30 seconds');
 await page.clock.fastForward(60*1000);assert.equal(await page.evaluate(()=>window.calendarReads),baseline+1,'15-minute safety sync');
 await page.evaluate(()=>{window.calendarRows=[{id:'qa',name:'QA calendar',event_date:'2026-10-13',event_time:'09:00',lead_minutes:1440,details:'',version:1}];for(let i=0;i<10;i++)window.calendarEvent();});
 await page.clock.runFor(250);assert.equal(await page.evaluate(()=>window.calendarReads),baseline+2,'coalesce event burst');
 await page.evaluate(()=>window.calendarSubscription('CHANNEL_ERROR'));
 await page.clock.fastForward(60*1000);assert.equal(await page.evaluate(()=>window.calendarReads),baseline+2);
 await page.clock.fastForward(60*1000);assert.equal(await page.evaluate(()=>window.calendarReads),baseline+3,'disconnected 2-minute fallback');
 await page.evaluate(()=>window.calendarSubscription('SUBSCRIBED'));await page.waitForTimeout(50);assert.equal(await page.evaluate(()=>window.calendarReads),baseline+4,'reconnect fetches current state');
 const beforeBurst=await page.evaluate(()=>window.calendarReads);
 await page.evaluate(()=>{window.calendarHold=true;window.calendarEvent();});await page.clock.runFor(250);
 await page.evaluate(()=>{for(let i=0;i<10;i++)window.calendarEvent();});await page.clock.runFor(250);
 assert.equal(await page.evaluate(()=>window.calendarReads),beforeBurst+1,'only one in-flight query');
 await page.evaluate(()=>{window.calendarHold=false;window.calendarRelease();});await page.waitForTimeout(50);
 assert.equal(await page.evaluate(()=>window.calendarReads),beforeBurst+2,'one follow-up fetch for changes during an in-flight query');
 const beforeHidden=await page.evaluate(()=>window.calendarReads);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));window.calendarEvent();});
 await page.clock.fastForward(5*60*1000);assert.equal(await page.evaluate(()=>window.calendarReads),beforeHidden,'hidden page does not fetch');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(50);assert.equal(await page.evaluate(()=>window.calendarReads),beforeHidden+1,'resume fetches missed changes');
 assert.deepEqual(errors.filter(e=>!e.includes('supabase')),[]);console.log('PASS calendar realtime, coalescing, fallback, reconnect and visibility '+viewport.width);await page.close();
 } }finally{await browser.close()}})();
