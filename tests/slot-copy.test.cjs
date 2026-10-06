const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx=vm.createContext({window:{}});vm.runInContext(fs.readFileSync(path.join(__dirname,'..','slot-copy-core.js'),'utf8'),ctx);
const build=ctx.window.PKSlotCopyCore.build;
const source={zone:'M-1',slot_code:'M1-04',items:[{code:'PK-1',name:'กล่อง',lotNo:'LOT-1',unit:'ใบ',qty:100,remainingQty:70,withdrawals:[{qty:30}],returns:[{qty:5}],transfersIn:[{qty:8}],receiveDate:'2026-09-01'}]};
const old={code:'OLD',name:'เดิม',qty:8,remainingQty:8,unit:'ใบ'};
const dest=[{zone:'M-1',slot_code:'M1-05',items:[old],expected_version:3},{zone:'M-1',slot_code:'M1-06',items:[],expected_version:0}];
const before=JSON.stringify({source,dest});const result=build(source,dest,[{index:0,qty:60}],'2026-10-06','RC-1','tester');
assert.equal(JSON.stringify({source,dest}),before);assert.equal(result[0].items.length,2);assert.equal(result[1].items.length,1);
for(const row of result){const copy=row.items.at(-1);assert.equal(copy.qty,60);assert.equal(copy.remainingQty,60);assert.equal(copy.lotNo,'LOT-1');assert.equal(copy.receiveReference,'RC-1');assert.equal(copy.receivedBy,'tester');assert.equal(copy.withdrawals.length,0);assert.equal(copy.returns,undefined);assert.equal(copy.transfersIn,undefined);assert.equal(copy.copiedFrom.slot,'M1-04');}
result[0].items.at(-1).qty=99;assert.equal(result[1].items[0].qty,60,'Each pallet has independent data');
for(const qty of [0,-1,'',NaN,Infinity])assert.throws(()=>build(source,dest,[{index:0,qty}],'2026-10-06','RC','tester'));
assert.throws(()=>build(source,dest,[{index:0,qty:2}],'2026-02-30','RC','tester'));
assert.throws(()=>build(source,dest,[{index:0,qty:2}],'2026-10-06','','tester'));
assert.throws(()=>build(source,dest,[{index:0,qty:2}],'2026-10-06','RC',''));
assert.throws(()=>build(source,[{...source,expected_version:1}],[{index:0,qty:2}],'2026-10-06','RC','tester'));
assert.throws(()=>build(source,[dest[0],dest[0]],[{index:0,qty:2}],'2026-10-06','RC','tester'));
assert.throws(()=>build(source,dest,[{index:0,qty:2},{index:0,qty:3}],'2026-10-06','RC','tester'));
console.log('PASS: multi-pallet copy, source preservation, append, independent quantities, fresh receipt history and validation');
