const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const extract=name=>html.match(new RegExp(`function ${name}\\([^]*?\\n\\}`))[0];
const history=require('../product-history.js');
test('zero balances leave active rows but retain history, original indices and return access',()=>{
 const items=[{code:'ZERO',name:'Empty lot',qty:10,remainingQty:0,withdrawals:[{date:'2026-10-05',qty:10,unit:'ใบ'}]},
  {code:'ACTIVE',qty:8,remainingQty:8},{code:'UNKNOWN'}, {code:'STRING-ZERO',qty:4,remainingQty:'0'}, {code:'BLANK',remainingQty:' '}];
 const before=JSON.stringify(items);
 const ctx=vm.createContext({editingSlot:{zone:'T-1',slot:'T1-01'},slotItemsFor:()=>items,
  fseSlotTitle:{},fseItemCount:{},fseItemsList:{},FSE_ITEMS_HEADER:'',
  editItemIndex:null,withdrawOpenIndex:null,returnOpenIndex:null,removeConfirmIndex:null,movementEdit:null,
  escapeHtml:value=>String(value??''),renderStockMovement:(item)=>`<p>LOG-${item.code}</p>`,renderMovementEditForm:()=>'',
  renderSlotBalance:()=>'',updateAddBtnState(){},updateWithdrawBtnState(){},updateReturnBtnState(){},fmt3:String});
 vm.runInContext(['getRemainingQty','getReturnableQty','renderReturnForm','renderSlotEdit'].map(extract).join('\n'),ctx);
 ctx.renderSlotEdit();
 const [active,archived]=ctx.fseItemsList.innerHTML.split('<details');
 assert.equal(ctx.fseItemCount.textContent,'3 รายการ');
 assert.doesNotMatch(active,/LOG-ZERO|LOG-STRING-ZERO/);
 assert.match(active,/LOG-ACTIVE/);assert.match(active,/data-idx="1"/);
 assert.match(active,/LOG-UNKNOWN/);assert.match(active,/LOG-BLANK/);
 assert.match(archived,/LOG-ZERO/);assert.match(archived,/LOG-STRING-ZERO/);
 assert.doesNotMatch(archived,/class="fse-depleted-history" open/);
 ctx.returnOpenIndex=0;ctx.renderSlotEdit();
 assert.match(ctx.fseItemsList.innerHTML,/<details class="fse-depleted-history" open>/);
 assert.match(ctx.fseItemsList.innerHTML,/class="fse-return-form" data-idx="0"/);
 assert.equal(JSON.stringify(items),before,'Rendering never deletes the source log');
 const movements=history.collectMovements({'T-1':{'T1-01':items}},'ZERO',item=>({rows:[{type:'withdraw',date:'2026-10-05',qty:10,unit:'ใบ'}]}),[]);
 assert.equal(movements.length,1,'Depleted SKU remains searchable in movement history');
 items[0].remainingQty=2;ctx.returnOpenIndex=null;ctx.renderSlotEdit();
 assert.equal(ctx.fseItemCount.textContent,'4 รายการ');
 assert.match(ctx.fseItemsList.innerHTML.split('<details')[0],/LOG-ZERO/);
});
