(() => {
 const button=document.getElementById('tab-warehouse-operations');
 const pane=document.getElementById('pane-warehouse-operations');
 const frame=document.getElementById('warehouseOperationsFrame');
 let initial=false;
 function sync(){
  const allowed=window.getWmsIsAdmin?.()===true;
  button.hidden=!allowed;
  if(!allowed){if(!pane.hidden)pane.hidden=true;frame.removeAttribute('src');return;}
  if(!initial){initial=true;if(new URLSearchParams(location.search).get('module')==='warehouse-operations')button.click();}
  if(!pane.hidden&&!frame.hasAttribute('src'))frame.src='/operations/';
 }
 button.addEventListener('click',sync);
 window.addEventListener('wms:account-changed',sync);
 new MutationObserver(sync).observe(pane,{attributes:true,attributeFilter:['hidden']});
 sync();
})();
