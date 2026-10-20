const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8'),ctx=vm.createContext({});
const extract=name=>html.match(new RegExp(`function ${name}\\([^]*?\\n\\}`))[0];
vm.runInContext(['formatMovementDate','getRemainingQty','movementNumber','movementDateKey','getStockMovement','buildSlotMovePlan','buildBulkSlotMovePlan'].map(extract).join('\n'),ctx);
const item={code:'QA',name:'กล่อง',qty:100,remainingQty:70,unit:'ใบ',receiveDate:'2026-10-01',lotNo:'L1',withdrawals:[{date:'2026-10-02',qty:30,unit:'ใบ'}],returns:[],note:'เก็บข้อมูลเดิม'};
const pair=(code,destination)=>({source:{zone:'A',slot_code:code,occupied:true,items:[structuredClone(item)]},destination:{zone:'B',slot_code:destination,occupied:false,items:[]},sourceVersion:3,destinationVersion:4});
const build=pairs=>ctx.buildBulkSlotMovePlan(pairs,'2026-10-20','QA','MOVE-001');
test('bulk move preserves quantities, units, lots and original history with one location move per item',()=>{
 const pairs=[pair('A-01','B-01'),pair('A-02','B-02')],before=JSON.stringify(pairs),rows=build(pairs);
 assert.equal(rows.length,4);assert.equal(JSON.stringify(pairs),before);
 for(let i=0;i<rows.length;i+=2){assert.equal(rows[i].items.length,0);assert.equal(rows[i].occupied,false);assert.equal(rows[i].expected_version,3);const moved=rows[i+1].items[0];assert.equal(rows[i+1].expected_version,4);for(const key of ['qty','remainingQty','unit','lotNo','note'])assert.equal(moved[key],item[key]);assert.equal(JSON.stringify(moved.withdrawals),JSON.stringify(item.withdrawals));assert.equal(moved.locationMoves.length,1);assert.equal(moved.locationMoves[0].reference,'MOVE-001');}
});
test('bulk move rejects duplicate destinations, occupied slots, source reuse, missing items and invalid versions',()=>{
 assert.throws(()=>build([pair('A-01','B-01'),pair('A-02','B-01')]),/ซ้ำ/);
 assert.throws(()=>build([pair('A-01','B-01'),pair('A-01','B-02')]),/ซ้ำ/);
 const p=pair('A-01','B-01');p.destination.occupied=true;assert.throws(()=>build([p]),/ว่าง/);
 p.destination.occupied=false;p.destination.items=[item];assert.throws(()=>build([p]),/ว่าง/);
 p.destination.items=[];p.destination.zone='A';p.destination.slot_code='A-01';assert.throws(()=>build([p]),/ต้นทาง/);
 p.destination=pair('A-01','B-01').destination;p.source.items=[];assert.throws(()=>build([p]),/สินค้า/);
 p.source.items=[item];p.sourceVersion=-1;assert.throws(()=>build([p]),/เวอร์ชัน/);
 assert.throws(()=>ctx.buildBulkSlotMovePlan([pair('A-01','B-01')],'2026-09-01','QA','MOVE'),/ก่อนวันที่รับ/);
 assert.throws(()=>build([]));
});
