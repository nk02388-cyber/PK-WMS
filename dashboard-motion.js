(() => {
 'use strict';
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)'),live=new Set(),pendingCharts=new Set();
 const stock=document.getElementById('pane-stock');let chartFrame=0,entryFrame=0,activePane=null;
 const enabled=()=>!reduced.matches&&!document.hidden;
 function visible(el){return !!el&&!el.hidden&&!!el.getClientRects().length;}
 function animate(el,keyframes,duration,delay=0){
  if(!enabled()||!visible(el)||typeof el.animate!=='function')return;
  for(const entry of live)if(entry.el===el){entry.animation.cancel();live.delete(entry);}
  const animation=el.animate(keyframes,{duration,delay,easing:'cubic-bezier(.22,1,.36,1)',fill:'none'}),entry={el,animation};live.add(entry);
  animation.id='pk-motion';
  animation.finished.then(()=>live.delete(entry),()=>live.delete(entry));
 }
 function charts(root){
  if(!enabled()||!visible(stock))return;
  [...root.querySelectorAll('.bar-fill,.building-usage-fill,.packaging-age-fill')].slice(0,40).forEach((el,index)=>{
   const rect=el.getBoundingClientRect();if(!rect.width||!rect.height||rect.top>innerHeight+80||rect.bottom<0)return;
   const vertical=el.classList.contains('bar-fill')&&!!el.style.height;
   animate(el,[{transform:vertical?'scaleY(0)':'scaleX(0)',transformOrigin:vertical?'center bottom':'left center'},{transform:'scale(1)',transformOrigin:vertical?'center bottom':'left center'}],520,Math.min(index*24,180));
  });
 }
 function enterPane(pane){
  if(entryFrame)cancelAnimationFrame(entryFrame);
  if(activePane&&activePane!==pane)for(const entry of live)if(activePane.contains(entry.el)){entry.animation.cancel();live.delete(entry);}
  activePane=pane;
  if(!enabled()||!pane||pane.id==='pane-floorplan'||pane.id==='pane-warehouse-operations')return;
  entryFrame=requestAnimationFrame(()=>{
   entryFrame=0;if(!visible(pane))return;
   const cards=[...pane.querySelectorAll('.filter-bar,.panel,.packaging-age-card,.speed-meter-card,.kpi-total-fixed')].filter(el=>{const r=el.getBoundingClientRect();return r.height&&r.top<innerHeight+80&&r.bottom>0;}).slice(0,8);
   for(const [index,card] of cards.entries())animate(card,[{opacity:.45,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],340,index*35);
   if(pane===stock)charts(stock);
  });
 }
 if(stock)new MutationObserver(records=>{
  if(!enabled()||!visible(stock))return;
  for(const record of records){const host=record.target.closest?.('#whChart,#catChart,#buildingUsageList,#packagingAgeChart');if(host)pendingCharts.add(host);}
  if(pendingCharts.size&&!chartFrame)chartFrame=requestAnimationFrame(()=>{chartFrame=0;for(const host of pendingCharts)charts(host);pendingCharts.clear();});
 }).observe(stock,{childList:true,subtree:true});
 document.addEventListener('pointerdown',event=>{
  const button=event.target.closest('button');if(!button||button.disabled||!button.closest('#mainDashboard')||button.closest('#floorplanImageWrap,#floorplanZoomModal,dialog'))return;
  animate(button,[{transform:'scale(1)'},{transform:'scale(.97)',offset:.4},{transform:'scale(1)'}],150);
 },{passive:true});
 function cancelAll(){for(const entry of live)entry.animation.cancel();live.clear();if(chartFrame)cancelAnimationFrame(chartFrame);if(entryFrame)cancelAnimationFrame(entryFrame);chartFrame=0;entryFrame=0;pendingCharts.clear();}
 function preference(){document.body.classList.toggle('pk-motion-enabled',!reduced.matches);if(reduced.matches)cancelAll();}
 reduced.addEventListener('change',preference);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelAll();});
 window.PKMotion={enterPane,sidebar(){if(window.matchMedia('(min-width:1024px)').matches)animate(document.getElementById('tabs'),[{opacity:.7},{opacity:1}],180);}};
 let ready=false;
 function readyState(){const now=document.body.classList.contains('auth-ready')&&!document.body.classList.contains('department-choosing');if(now&&!ready)enterPane(document.querySelector('.tab-pane:not([hidden])'));ready=now;}
 new MutationObserver(readyState).observe(document.body,{attributes:true,attributeFilter:['class']});
 preference();readyState();
})();
