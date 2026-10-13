const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function fixture(){
 const scripts=[],timers=[],window={};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dependency-loader.js'),'utf8'),{window,Map,Promise,Error,setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout:()=>{},document:{createElement:()=>({remove(){this.removed=true;}}),head:{append:s=>scripts.push(s)}}});
 return {api:window.PKDependencies,window,scripts,timers};
}
test('concurrent optional-library requests share one download and reuse the result',async()=>{
 const f=fixture(),a=f.api.excel(),b=f.api.excel();assert.equal(a,b);assert.equal(f.scripts.length,1);f.window.XLSX={read(){}};f.scripts[0].onload();assert.equal(await a,f.window.XLSX);assert.equal(await f.api.excel(),f.window.XLSX);assert.equal(f.scripts.length,1);
});
test('network failure can be retried without poisoning the shared loader',async()=>{
 const f=fixture(),a=f.api.scanner();f.scripts[0].onerror();await assert.rejects(a,/ลองอีกครั้ง/);assert.equal(f.scripts[0].removed,true);const b=f.api.scanner();assert.equal(f.scripts.length,2);f.window.Html5Qrcode=function(){};f.scripts[1].onload();assert.equal(await b,f.window.Html5Qrcode);
});
test('missing exports and stalled downloads report errors and permit retry',async()=>{
 const f=fixture(),a=f.api.excel();f.scripts[0].onload();await assert.rejects(a,/ไม่สำเร็จ/);const b=f.api.excel();f.timers[1]();await assert.rejects(b,/นานเกินไป/);assert.equal(f.scripts[1].removed,true);const c=f.api.excel();f.window.XLSX={};f.scripts[2].onload();await c;
});
