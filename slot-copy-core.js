(() => {
 'use strict';
 function build(source,destinations,selections,date,reference,actor) {
  if(!actor?.trim())throw new Error('กรุณาเข้าสู่ระบบก่อนคัดลอก');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw new Error('กรุณาระบุวันที่รับที่ถูกต้อง');
  if(!reference?.trim()||reference.trim().length>200)throw new Error('กรุณาระบุเลขเอกสารรับไม่เกิน 200 ตัวอักษร');
  if(!destinations.length||destinations.length>50)throw new Error('เลือกปลายทาง 1–50 พาเลต');
  if(!selections.length)throw new Error('เลือกสินค้าอย่างน้อย 1 รายการ');
  const seen=new Set(),recordedAt=new Date().toISOString();
  const items=selections.map(selection=>{
   const original=source.items[selection.index],qty=Number(selection.qty);
   if(!Number.isInteger(selection.index)||!original||seen.has(selection.index))throw new Error('รายการต้นทางไม่ถูกต้อง');seen.add(selection.index);
   if(!Number.isFinite(qty)||qty<=0)throw new Error('จำนวนรับต่อพาเลตต้องมากกว่า 0');
   if(!original.code?.trim()||!original.name?.trim()||!original.unit?.trim())throw new Error('รหัส ชื่อสินค้า และหน่วยต้นทางต้องครบ');
   return {code:original.code,name:original.name,lotNo:original.lotNo||'',unit:original.unit,note:original.note||'',qty,remainingQty:qty,receiveDate:date,receiveReference:reference.trim(),receivedBy:actor.trim(),receivedAt:recordedAt,withdrawals:[],copiedFrom:{zone:source.zone,slot:source.slot_code}};
  });
  const keys=new Set();
  return destinations.map(destination=>{
   const key=JSON.stringify([destination.zone,destination.slot_code]);
   if((destination.zone===source.zone&&destination.slot_code===source.slot_code)||keys.has(key))throw new Error('ปลายทางต้องไม่ซ้ำกันและไม่ใช่ต้นทาง');keys.add(key);
   if(!destination.zone||!destination.slot_code||!Number.isInteger(destination.expected_version)||destination.expected_version<0||!Array.isArray(destination.items))throw new Error('ข้อมูลปลายทางไม่ครบ');
   return {...destination,occupied:true,items:[...JSON.parse(JSON.stringify(destination.items)),...JSON.parse(JSON.stringify(items))]};
  });
 }
 window.PKSlotCopyCore={build};
})();
