// Presentation only: never use these strings as database or date-input values.
(function(root){
 const months=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
 const fullMonths=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
 const formatter=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',calendar:'gregory',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 function parts(value){
  const date=value instanceof Date?value:new Date(value);
  return Number.isFinite(date.getTime())?Object.fromEntries(formatter.formatToParts(date).map(p=>[p.type,p.value])):null;
 }
 function date(value){
  if(value instanceof Date){const p=parts(value);return p?`${p.day}/${p.month}/${p.year}`:'—';}
  const text=String(value??'').trim().replace(/^(?:ณ วันที่:?|ข้อมูล ณ วันที่|อัปเดต)\s*/,'');
  if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/i.test(text)){
   if(date(text.slice(0,10))==='—')return '—';
   const p=parts(text);return p?`${p.day}/${p.month}/${p.year}`:'—';
  }
  const iso=/^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text),slash=/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(text),thai=/^(\d{1,2})\s+([^\s]+)\s+(\d{2,4})$/.exec(text);
  if(!iso&&!slash&&!thai)return '—';
  let y=Number(iso?iso[1]:slash?slash[3]:thai[3]);
  if(!iso&&(slash?slash[3]:thai[3]).length===2)y+=1957;else if(y>=2400)y-=543;
  const m=iso?Number(iso[2]):slash?Number(slash[2]):Math.max(months.indexOf(thai[2]),fullMonths.indexOf(thai[2]))+1,d=Number(iso?iso[3]:slash?slash[1]:thai[1]);
  const leap=y%4===0&&(y%100!==0||y%400===0),days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
  return y>0&&m>=1&&m<=12&&d>=1&&d<=days[m-1]?`${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${String(y).padStart(4,'0')}`:'—';
 }
 function dateTime(value){
  if(!value)return '—';
  if(typeof value==='string'&&!value.includes('T'))return date(value);
  if(typeof value==='string'&&date(value)==='—')return '—';
  const p=parts(value);return p?`${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}:${p.second}`:'—';
 }
 const api={date,dateTime};root.WmsDates=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
