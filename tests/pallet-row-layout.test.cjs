const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const original=JSON.parse(html.match(/const ZONE_SLOTS = (.*);/)[1]);
const snippet=html.slice(html.indexOf('const COMPACT_PALLET_ZONES ='),html.indexOf('const pinnedZones ='));
test('compact layouts preserve pallet identities and only resize the intended zones',()=>{
 const changed=structuredClone(original),pins={};
 vm.runInNewContext(snippet,{ZONE_SLOTS:changed,ZONE_PINS:pins});
 const height=vm.runInNewContext('('+html.match(/function palletSlotHeight\([^]*?\n\}/)[0]+')',{ZONE_SLOTS:changed,COMPACT_PALLET_COLUMNS:new Set(['O-1','P-1']),PALLET_COLUMN_SCALE_Y:.87});
 for(const slot of changed.U)assert.equal(height('U',slot.code)<.95,['U-26','U-27','U-28','U-29'].includes(slot.code));
 assert.ok(height('U','U-26')<changed.U.find(s=>s.code==='U-28').topPct-changed.U.find(s=>s.code==='U-26').topPct);
 for(const slot of changed['S-1'])assert.equal(height('S-1',slot.code),.95,'S1 dimensions must stay unchanged');
 const targets=new Set(['A-1','B-1','C-1','D-1','E-1','F-1','G-1','H-1']);
 for(const [zone,slots] of Object.entries(original)){
  if(['O-1','P-1'].includes(zone)){
   assert.equal(changed[zone].length,24);
   for(const [i,slot] of slots.entries()){
    const actual=changed[zone][i];assert.equal(actual.code,slot.code);assert.equal(actual.leftPct,slot.leftPct);
    assert.ok(Math.abs(actual.topPct-(25.603+(slot.topPct-25.603)*.87))<1e-9);
    assert.equal(height(zone,slot.code),.95*.87);
   }
   const tops=[...new Set(changed[zone].map(s=>s.topPct))].sort((a,b)=>a-b);
   for(let i=1;i<tops.length;i++)assert.ok(tops[i]-tops[i-1]>.95*.87);
   assert.ok(Math.max(...changed[zone].map(s=>s.topPct))+.95*.87/2<31.494);
   continue;
  }
  if(zone==='U'){
   const order=[1,2,3,4,5,6,7,8,9,10,11,25,12,13,14,15,16,17,18,20,26,21,23,22,24];
   assert.equal(changed.U.length,29);
   assert.deepEqual(Array.from(changed.U,s=>s.code),Array.from({length:29},(_,i)=>`U-${String(i+1).padStart(2,'0')}`));
   const right=['U-02','U-06','U-25','U-17','U-19','U-26'];
   const left=['U-01','U-03','U-09','U-14','U-18','U-20'];
   order.forEach((old,i)=>{
    const finalOrder=[1, 2, 26, 27, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 28, 29, 19, 20, 21, 22, 23, 24, 25];
    const code=`U-${String(old).padStart(2,'0')}`,slot=changed.U[finalOrder.indexOf(i+1)];
    if(right.includes(code)){
     assert.equal(slot.leftPct,slots.find(s=>s.code==='U-02').leftPct);
     assert.equal(slot.topPct,slots.find(s=>s.code===left[right.indexOf(code)]).topPct);
    }else{const source=slots.find(s=>s.code===code);assert.equal(slot.leftPct,source.leftPct);assert.equal(slot.topPct,source.topPct);}
   });
   for(const [code,anchor,direction] of [['U-03','U-06',-1],['U-04','U-07',-1],['U-21','U-18',1],['U-22','U-19',1]]){
    const slot=changed.U.find(s=>s.code===code),a=changed.U.find(s=>s.code===anchor);
    assert.equal(slot.leftPct,a.leftPct);assert.ok((slot.topPct-a.topPct)*direction>.7);
   }
   assert.equal(changed.U.find(s=>s.code==='U-03').topPct,changed.U.find(s=>s.code==='U-04').topPct);
   assert.equal(changed.U.find(s=>s.code==='U-21').topPct,changed.U.find(s=>s.code==='U-22').topPct);
   const removed=slots.find(s=>s.code==='U-18');
   assert.equal(changed.U.some(s=>s.leftPct===slots.find(s=>s.code==='U-02').leftPct&&s.topPct===removed.topPct),false);
   continue;
  }
  if(zone==='M-1'){
   assert.equal(changed[zone].length,24);
   assert.equal(new Set(changed[zone].map(s=>s.code)).size,24);
   for(const slot of slots.filter(s=>!['M1-20','M1-22'].includes(s.code)))assert.deepEqual(changed[zone].find(s=>s.code===slot.code),slot);
   for(const code of ['M1-20','M1-22'])assert.equal(changed[zone].find(s=>s.code===code),undefined);
   const find=code=>changed[zone].find(s=>s.code===code);
   assert.equal(find('M1-23').leftPct,find('M1-16').leftPct);
   assert.equal(find('M1-24').leftPct,find('M1-17').leftPct);
   assert.equal(find('M1-23').topPct,find('M1-24').topPct);
   assert.ok(find('M1-23').topPct>find('M1-16').topPct);
   assert.ok(find('M1-23').topPct<find('M1-19').topPct);
   for(const [code,neighbor] of [['M1-25','M1-19'],['M1-26','M1-21']]){
    assert.equal(find(code).leftPct,find('M1-16').leftPct);
    assert.equal(find(code).topPct,find(neighbor).topPct);
   }
   for(const a of changed[zone])for(const b of changed[zone])if(a!==b)assert.ok(Math.abs(a.leftPct-b.leftPct)>=.65 || Math.abs(a.topPct-b.topPct)>=.95,'M1 cells must not overlap');
   assert.match(html,/palletNo: 530,/);
   continue;
  }
  if(zone==='S-1'){
   const current=changed[zone],top=slots[0].topPct,middle=slots.find(s=>s.code==='S1-03').topPct;
   assert.equal(current.length,17);
   assert.equal(new Set(current.map(s=>s.code)).size,17);
   assert.equal(current.filter(s=>s.topPct===top).length,3);
   assert.equal(current.filter(s=>s.topPct===middle).length,8);
   const order=[1,2,15,16,17,3,4,5,6,7,8,9,10,11,12,13,14];
   assert.deepEqual(Array.from(current,s=>s.code),Array.from({length:17},(_,i)=>`S1-${String(i+1).padStart(2,'0')}`));
   for(const slot of slots){
    const actual=current[order.indexOf(Number(slot.code.slice(3)))];
    assert.equal(actual.topPct,slot.topPct);
    if(Number(slot.code.slice(3))>=9)assert.deepEqual({...actual,code:slot.code},slot);
   }
   for(const [lower,upper] of [[6,1],[7,2],[8,3]])assert.ok(Math.abs(current[lower-1].leftPct-current[upper-1].leftPct)<1e-9,'middle columns align with the top row');
   for(let i=4;i<11;i++)assert.ok(Math.abs((current[i].leftPct-current[i-1].leftPct)-.728)<1e-9,'the entire middle row keeps equal spacing');
   for(const a of current)for(const b of current)if(a!==b)assert.ok(Math.abs(a.leftPct-b.leftPct)>=.65 || Math.abs(a.topPct-b.topPct)>=.95,'S1 cells must not overlap');
   continue;
  }
  assert.deepEqual(changed[zone].map(s=>s.code),slots.map(s=>s.code));
  assert.deepEqual(changed[zone].map(s=>s.topPct),slots.map(s=>s.topPct));
  if(!targets.has(zone)){assert.deepEqual(changed[zone],slots);continue}
  const left=Math.min(...slots.map(s=>s.leftPct)),right=Math.max(...slots.map(s=>s.leftPct));
  assert.equal(Math.min(...changed[zone].map(s=>s.leftPct)),left);
  assert.ok(Math.abs(Math.max(...changed[zone].map(s=>s.leftPct))-(left+(right-left)*.9))<1e-10);
  const xs=[...new Set(changed[zone].map(s=>s.leftPct))].sort((a,b)=>a-b);
  for(let i=1;i<xs.length;i++)assert.ok(xs[i]-xs[i-1]>=.70*.9-1e-9,'cells must not overlap');
 }
 assert.equal(changed['T-1'].length,20);
 assert.deepEqual(Array.from(changed['T-1'],s=>s.code),Array.from({length:20},(_,i)=>`T1-${String(i+1).padStart(2,'0')}`));
 assert.equal(new Set(changed['T-1'].map(s=>s.leftPct)).size,2);
 assert.equal(new Set(changed['T-1'].map(s=>s.topPct)).size,10);
 for(let i=0;i<20;i++){
  assert.equal(changed['T-1'][i].leftPct,48.94+(i%2)*.727);
  assert.equal(changed['T-1'][i].topPct,i<2?36.39-((45.096-36.39)/8):36.39+Math.floor((i-2)/2)*((45.096-36.39)/8));
 }
 for(let i=0;i<2;i++){
  const added=changed['T-1'][i],below=changed['T-1'][i+2];
  assert.equal(added.leftPct,below.leftPct);
  assert.ok(Math.abs(below.topPct-added.topPct-((45.096-36.39)/8))<1e-10);
  for(const [zone,slots] of Object.entries(changed))for(const s of slots)if(s!==added)assert.ok(Math.abs(s.leftPct-added.leftPct)>=.65||Math.abs(s.topPct-added.topPct)>=.95,`new T1 cell overlaps ${zone}/${s.code}`);
 }
 assert.ok(changed['T-1'][0].leftPct<changed['T-1'][1].leftPct);
 assert.equal(changed['T-1'][0].topPct,changed['T-1'][1].topPct);
 assert.ok(changed['T-1'][2].topPct>changed['T-1'][0].topPct);
 const mRows=changed['M-1'];
 assert.equal(changed['T-1'][2].topPct,Math.min(...mRows.map(s=>s.topPct)));
 assert.equal(changed['T-1'][19].topPct,Math.max(...mRows.map(s=>s.topPct)));
 assert.ok(Math.abs((changed['T-1'][1].leftPct-changed['T-1'][0].leftPct)-(mRows[1].leftPct-mRows[0].leftPct))<1e-10);
});
