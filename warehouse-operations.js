(() => {
 const button=document.getElementById('tab-warehouse-operations');
 const pane=document.getElementById('pane-warehouse-operations');
 const frame=document.getElementById('warehouseOperationsFrame');
 let initial=false;
 function sync(){
  const allowed=window.getWmsCanAccess?.('warehouse-operations')===true;
  button.hidden=!allowed;
  if(!allowed){
   frame.removeAttribute('src');
   if(!pane.hidden)pane.hidden=true;
   return;
  }
  if(!initial){initial=true;if(new URLSearchParams(location.search).get('module')==='warehouse-operations')button.click();}
  if(!pane.hidden&&!frame.hasAttribute('src'))frame.src='/operations/';
 }
 window.addEventListener('wms:account-changed',()=>{
  const wasLoaded=frame.hasAttribute('src');
  sync();
  if(wasLoaded&&!button.hidden&&frame.hasAttribute('src'))frame.contentWindow?.location.reload();
 });
 new MutationObserver(sync).observe(pane,{attributes:true,attributeFilter:['hidden']});
 sync();
})();
