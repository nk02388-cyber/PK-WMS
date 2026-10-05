const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const original=JSON.parse(html.match(/const ZONE_SLOTS = (.*);/)[1]);
const snippet=html.slice(html.indexOf('const COMPACT_PALLET_ZONES ='),html.indexOf('const pinnedZones ='));
test('compact rows preserve every pallet code, count, row height and other zones',()=>{
 const changed=structuredClone(original),pins={};
 vm.runInNewContext(snippet,{ZONE_SLOTS:changed,ZONE_PINS:pins});
 const targets=new Set(['A-1','B-1','C-1','D-1','E-1','F-1','G-1','H-1']);
 for(const [zone,slots] of Object.entries(original)){
  assert.deepEqual(changed[zone].map(s=>s.code),slots.map(s=>s.code));
  assert.deepEqual(changed[zone].map(s=>s.topPct),slots.map(s=>s.topPct));
  if(!targets.has(zone)){assert.deepEqual(changed[zone],slots);continue}
  const left=Math.min(...slots.map(s=>s.leftPct)),right=Math.max(...slots.map(s=>s.leftPct));
  assert.equal(Math.min(...changed[zone].map(s=>s.leftPct)),left);
  assert.ok(Math.abs(Math.max(...changed[zone].map(s=>s.leftPct))-(left+(right-left)*.9))<1e-10);
  const xs=[...new Set(changed[zone].map(s=>s.leftPct))].sort((a,b)=>a-b);
  for(let i=1;i<xs.length;i++)assert.ok(xs[i]-xs[i-1]>=.70*.9-1e-9,'cells must not overlap');
 }
 assert.equal(changed['T-1'].length,18);
 assert.deepEqual(Array.from(changed['T-1'],s=>s.code),Array.from({length:18},(_,i)=>`T1-${String(i+1).padStart(2,'0')}`));
 assert.equal(new Set(changed['T-1'].map(s=>s.leftPct)).size,2);
 assert.equal(new Set(changed['T-1'].map(s=>s.topPct)).size,9);
 assert.ok(changed['T-1'][0].leftPct<changed['T-1'][1].leftPct);
 assert.equal(changed['T-1'][0].topPct,changed['T-1'][1].topPct);
 assert.ok(changed['T-1'][2].topPct>changed['T-1'][0].topPct);
 const mRows=changed['M-1'];
 assert.equal(changed['T-1'][0].topPct,Math.min(...mRows.map(s=>s.topPct)));
 assert.equal(changed['T-1'][17].topPct,Math.max(...mRows.map(s=>s.topPct)));
 assert.ok(Math.abs((changed['T-1'][1].leftPct-changed['T-1'][0].leftPct)-(mRows[1].leftPct-mRows[0].leftPct))<1e-10);
});
