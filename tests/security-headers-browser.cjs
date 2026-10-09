const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {webkit}=require('C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const headers=Object.fromEntries(JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8')).headers[0].headers.map(h=>[h.key,h.value]));
 // Production uses HTTPS. Omit only transport upgrading for this HTTP-only local fixture.
 headers['Content-Security-Policy']=headers['Content-Security-Policy'].replace('; upgrade-insecure-requests','');
 const server=http.createServer((req,res)=>{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);res.end();return;}
  const type=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':file.endsWith('.woff2')?'font/woff2':file.endsWith('.png')?'image/png':file.endsWith('.webp')?'image/webp':'application/octet-stream';
  res.writeHead(200,{...headers,'Content-Type':type});res.end(fs.readFileSync(file));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await webkit.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],violations=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>document.addEventListener('securitypolicyviolation',e=>{(window.auditCspViolations??=[]).push({directive:e.violatedDirective,blocked:e.blockedURI});}));
  await page.route('https://**/*',r=>r.abort());
  await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'networkidle'});
  await page.locator('.department-pk').click();await page.locator('#authUsername').waitFor({state:'visible'});
  const result=await page.evaluate(()=>{
   const wb=XLSX.utils.book_new(),data=[['สินค้า','จำนวน'],['PK ทดสอบ',123.5]];
   XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(data),'Stock');
   const encoded=XLSX.write(wb,{type:'array',bookType:'xlsx'}),decoded=XLSX.read(encoded,{type:'array'});
   return {version:XLSX.version,data:XLSX.utils.sheet_to_json(decoded.Sheets.Stock,{header:1}),client:typeof window.supabase.createClient,violations:window.auditCspViolations||[]};
  });
  assert.equal(result.version,'0.20.3');assert.deepEqual(result.data,[['สินค้า','จำนวน'],['PK ทดสอบ',123.5]]);assert.equal(result.client,'function');assert.deepEqual(result.violations,[]);assert.deepEqual(errors,[]);
  fs.writeFileSync('work/security-headers-browser.json',JSON.stringify(result,null,2));console.log('PASS enforced CSP, offline local dependencies, mobile login, Thai Excel read/write');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
