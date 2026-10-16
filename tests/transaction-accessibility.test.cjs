const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const names=['returnFieldValidity','updateReturnBtnState','withdrawFieldValidity','updateWithdrawBtnState'];
const source=names.map(name=>{const start=html.indexOf('function '+name+'(');assert.ok(start>=0);return html.slice(start,html.indexOf('\nfunction ',start+1));}).join('\n');
for(const [kind,prefix] of [['Withdraw','fw'],['Return','fr']])test(kind+' fields announce required/invalid states and recover without changing validation',()=>{
 const fields={};
 for(const key of ['date','qty','unit','by','reference'])fields['.'+prefix+'-'+key]={value:key==='date'?'2026-10-16':key==='unit'?'ชิ้น':'',attrs:{},classList:{toggle(){}},setAttribute(key,value){this.attrs[key]=value;}};
 const button={disabled:true};fields['.'+prefix+'-save-btn']=button;
 const form={querySelector:selector=>fields[selector]};
 const context={fseItemsList:{querySelector:()=>form},editingSlot:{zone:'A',slot:'A-01'},withdrawOpenIndex:0,returnOpenIndex:0,slotItemsFor:()=>[{}],getRemainingQty:()=>10,getReturnableQty:()=>10};
 vm.createContext(context);vm.runInContext(source,context);
 const update=()=>vm.runInContext('update'+kind+'BtnState()',context);
 update();assert.equal(fields['.'+prefix+'-qty'].attrs['aria-invalid'],'true');assert.equal(button.disabled,true);
 for(const key of ['date','qty','unit','by','reference'])assert.equal(fields['.'+prefix+'-'+key].attrs['aria-required'],'true');
 fields['.'+prefix+'-qty'].value='5';fields['.'+prefix+'-by'].value='QA';fields['.'+prefix+'-reference'].value='REF';update();
 assert.equal(button.disabled,false);for(const key of ['date','qty','unit','by','reference'])assert.equal(fields['.'+prefix+'-'+key].attrs['aria-invalid'],'false');
 for(const qty of ['11','0','-1','']){fields['.'+prefix+'-qty'].value=qty;update();assert.equal(button.disabled,true);assert.equal(fields['.'+prefix+'-qty'].attrs['aria-invalid'],'true');}
 fields['.'+prefix+'-qty'].value='1';update();assert.equal(button.disabled,false);
});
