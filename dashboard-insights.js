(function(){
'use strict';
function dateKey(value){
 const m=/^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(value||'')),s=/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(String(value||''));if(!m&&!s)return null;
 let y=Number(m?m[1]:s[3]);if(y<100)y+=1957;else if(y>=2400)y-=543;const month=Number(m?m[2]:s[2]),d=Number(m?m[3]:s[1]);const dt=new Date(Date.UTC(y,month-1,d));return dt.getUTCFullYear()===y&&dt.getUTCMonth()===month-1&&dt.getUTCDate()===d?dt.toISOString().slice(0,10):null;
}
function summarize(source,asOf,days=30){
 const end=dateKey(asOf);if(!end)throw new Error('Invalid asOf');days=days===7?7:30;
 return summarizeRange(source,new Date(Date.parse(end+'T00:00:00Z')-(days-1)*86400000).toISOString().slice(0,10),end);
}
function summarizeRange(source,from,to){
 const start=dateKey(from),end=dateKey(to);if(!start||!end)throw new Error('Invalid date range');
 const endMs=Date.parse(end+'T00:00:00Z'),days=(endMs-Date.parse(start+'T00:00:00Z'))/86400000+1;
 if(days<1)throw new Error('Start date must not follow end date');
 if(days>10000)throw new Error('Date range exceeds 10000 days');
 const points=Array.from({length:days},(_,i)=>({date:new Date(endMs-(days-1-i)*86400000).toISOString().slice(0,10),receive:0,issue:0,returns:0})),byDate=new Map(points.map(p=>[p.date,p]));const total={receive:0,issue:0,returns:0};let undated=0;
 function add(type,m){if(!Number.isFinite(Number(m.qty))||Number(m.qty)<=0)return;const key=dateKey(m.date);if(!key){undated++;return;}const p=byDate.get(key);if(p){p[type]++;total[type]++;}}
 for(const slots of Object.values(source||{}))for(const items of Object.values(slots||{}))for(const item of items||[]){add('receive',{date:item.receiveDate,qty:item.qty});for(const m of item.withdrawals||[])add('issue',m);for(const m of item.returns||[])add('returns',m);}
 return {points,total,undated,transactions:Object.values(total).reduce((a,b)=>a+b,0)};
}
if(typeof module!=='undefined'&&module.exports){module.exports={dateKey,summarize,summarizeRange};return;}
const host=document.getElementById('dashboardInsights');if(!host)return;
const from=host.querySelector('#diFromDate'),date=host.querySelector('#diToDate'),chart=host.querySelector('.di-trend'),mix=document.querySelector('#dashboardActivity .di-mix') || host.querySelector('.di-mix'),stats=host.querySelector('.di-stats'),note=host.querySelector('.di-note');
const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const part=t=>parts.find(p=>p.type===t).value;date.value=part('year')+'-'+part('month')+'-'+part('day');
from.value=date.value.slice(0,7)+'-01';
const series=[['receive','รับเข้า','#6ba6c0'],['issue','เบิกออก','#c99c39'],['returns','รับคืน','#74bc95']];let last='', pendingMotion=false;const reduced=matchMedia('(prefers-reduced-motion: reduce)'),motions=new Set();
function cancelMotion(){for(const a of motions)a.cancel();motions.clear();}
function playMotion(replay=true){
 if(replay)pendingMotion=true;cancelMotion();if(reduced.matches){pendingMotion=false;return;}
 const rect=chart.getBoundingClientRect();if(!pendingMotion||document.hidden||!chart.getClientRects().length||rect.bottom<=0||rect.top>=innerHeight)return;
 pendingMotion=false;for(const [i,group] of [...chart.querySelectorAll('.di-trend-series')].entries()){const animation=group.animate([{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0 0% 0 0)'}],{duration:1100,delay:i*80,easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'});animation.id='pk-trend';motions.add(animation);animation.finished.then(()=>motions.delete(animation),()=>motions.delete(animation));}
}
reduced.addEventListener('change',()=>{if(reduced.matches){pendingMotion=false;cancelMotion();}});document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelMotion();});
if(typeof IntersectionObserver!=='undefined')new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)&&pendingMotion)playMotion(false);},{threshold:.1}).observe(chart);
let trendData=null,lastTrendWidth=0,resizeFrame=0;
function renderTrend(s){
 const width=Math.max(180,Math.round(chart.clientWidth));lastTrendWidth=width;
 const max=Math.max(1,...s.points.flatMap(p=>series.map(([k])=>p[k]))),x=i=>s.points.length===1?width/2:48+i*(width-76)/(s.points.length-1),y=n=>190-n/max*154;
 let svg='<svg viewBox="0 0 '+width+' 230" role="img" aria-label="แนวโน้มจำนวนรายการรับเข้า เบิกออก และรับคืน"><title>จำนวนรายการต่อวัน สูงสุด '+max+' รายการ</title>';
 for(let i=0;i<=4;i++){const n=max*i/4;svg+='<line x1="48" x2="'+(width-28)+'" y1="'+y(n)+'" y2="'+y(n)+'" class="di-grid"/><text x="40" y="'+(y(n)+4)+'" text-anchor="end">'+Number(n.toFixed(1))+'</text>';}
 for(const [k,label,color] of series){svg+='<g class="di-trend-series"><polyline fill="none" stroke="'+color+'" stroke-width="2.5" stroke-linejoin="round" points="'+s.points.map((p,i)=>x(i)+','+y(p[k])).join(' ')+'"/>';s.points.forEach((p,i)=>{svg+='<circle cx="'+x(i)+'" cy="'+y(p[k])+'" r="3" fill="'+color+'"><title>'+p.date+' · '+label+' '+p[k]+' รายการ</title></circle>';});svg+='</g>';}
 for(const i of new Set([0,Math.floor((s.points.length-1)/2),s.points.length-1]))svg+='<text x="'+x(i)+'" y="220" text-anchor="middle">'+WmsDates.date(s.points[i].date)+'</text>';
 svg+='</svg>';chart.innerHTML='<div class="di-legend">'+series.map(([,label,color])=>'<span><i style="background:'+color+'"></i>'+label+'</span>').join('')+'</div>'+(s.transactions?'':'<p class="di-empty">ไม่มีรายการที่มีวันที่ในช่วงนี้</p>')+svg;
}
if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>{
 if(!trendData||!chart.clientWidth||Math.round(chart.clientWidth)===lastTrendWidth||resizeFrame)return;
 resizeFrame=requestAnimationFrame(()=>{resizeFrame=0;cancelMotion();if(trendData&&chart.clientWidth)renderTrend(trendData);});
}).observe(chart);
function render(){
 if(!palletDataReady){trendData=null;stats.textContent='กำลังรอข้อมูลพาเลต';chart.textContent='ยังไม่แสดงกราฟจนกว่าจะโหลดข้อมูลครบ';mix.textContent='—';note.textContent='';last='';return;}
 from.setCustomValidity('');date.setCustomValidity('');
 if(!dateKey(from.value)){from.setCustomValidity('กรุณาเลือกวันที่เริ่มต้น');from.reportValidity();return;}
 if(!dateKey(date.value)){date.setCustomValidity('กรุณาเลือกวันที่สิ้นสุด');date.reportValidity();return;}
 if(from.value>date.value){from.setCustomValidity('วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด');from.reportValidity();return;}
 let s;try{s=summarizeRange(SLOT_ITEMS,from.value,date.value);}catch{from.setCustomValidity('กรุณาเลือกช่วงวันที่ไม่เกิน 10,000 วัน');from.reportValidity();return;}
 const key=JSON.stringify(s);if(last===key)return;last=key;
 const scope=document.getElementById('dashboardActivityScope');if(scope)scope.textContent=from.value.split('-').reverse().join('/')+' – '+date.value.split('-').reverse().join('/');
 stats.innerHTML=series.map(([k,label])=>'<div><small>'+label+'</small><strong>'+s.total[k].toLocaleString('en-US')+' <span>รายการ</span></strong></div>').join('');
 trendData=s;renderTrend(s);
 let offset=0;mix.innerHTML='<svg viewBox="0 0 160 160" role="img" aria-label="สัดส่วนกิจกรรมรวม '+s.transactions+' รายการ"><circle cx="80" cy="80" r="58" fill="none" stroke="var(--gridline)" stroke-width="18"/>'+series.map(([k,label,color])=>{const pct=s.transactions?s.total[k]/s.transactions*100:0,seg='<circle cx="80" cy="80" r="58" fill="none" stroke="'+color+'" stroke-width="18" pathLength="100" stroke-dasharray="'+pct+' '+(100-pct)+'" stroke-dashoffset="'+(-offset)+'" transform="rotate(-90 80 80)"><title>'+label+' '+pct.toFixed(1)+'%</title></circle>';offset+=pct;return seg;}).join('')+'<text x="80" y="80" text-anchor="middle" class="di-donut-value">'+s.transactions+'</text><text x="80" y="102" text-anchor="middle">รายการ</text></svg><ul>'+series.map(([k,label,color])=>'<li><i style="background:'+color+'"></i>'+label+'<b>'+(s.transactions?s.total[k]/s.transactions*100:0).toFixed(1)+'%</b></li>').join('')+'</ul>';
 host.querySelector('tbody').innerHTML=s.points.map(p=>'<tr><td>'+WmsDates.date(p.date)+'</td><td>'+p.receive+'</td><td>'+p.issue+'</td><td>'+p.returns+'</td></tr>').join('');
 playMotion();
 note.textContent='ข้อมูลประวัติในรายการพาเลตทุกโซน · นับจำนวนรายการ ไม่รวมจำนวนสินค้าต่างหน่วย · ไม่รวมย้ายภายใน'+(s.undated?' · มี '+s.undated+' รายการไม่มีวันที่ที่ถูกต้อง จึงไม่รวมในกราฟ':'');
}
from.addEventListener('change',()=>{last='';render();});date.addEventListener('change',()=>{last='';render();});window.PKDashboardInsights={refresh:render,animate:playMotion,cancel:cancelMotion};render();
})();
