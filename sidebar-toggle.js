(() => {
 'use strict';
 const toggle=document.getElementById('sidebarToggle'),nav=document.getElementById('tabs'),closeButton=document.getElementById('sidebarClose'),content=document.getElementById('dashboardContent'),header=document.querySelector('header.top');
 const desktop=window.matchMedia('(min-width:1024px)'),key='pk-sidebar-collapsed-v2';
 const backdrop=document.createElement('div');backdrop.className='sidebar-backdrop';backdrop.hidden=true;backdrop.setAttribute('aria-hidden','true');document.body.append(backdrop);
 let collapsed=true,open=false,hovering=false,keyboardNav=false;
 const menuNames=new Map([...nav.querySelectorAll('.tab-btn')].map(button=>[button,{name:button.querySelector('span')?.textContent.trim()||'',label:button.getAttribute('aria-label')} ]));
 try{collapsed=localStorage.getItem(key)!=='false';}catch{}
 function render(){
  if(!desktop.matches||!collapsed)hovering=false;
  const shown=desktop.matches?(!collapsed||hovering):open;
  document.body.classList.toggle('sidebar-collapsed',desktop.matches&&collapsed);
  document.body.classList.toggle('sidebar-hover-open',desktop.matches&&collapsed&&hovering);
  document.body.classList.toggle('sidebar-drawer-open',!desktop.matches&&open);
  toggle.setAttribute('aria-expanded',String(shown));toggle.setAttribute('aria-label',shown?'ปิดไซด์บาร์':'เปิดไซด์บาร์');toggle.title=shown?'ปิดไซด์บาร์':'เปิดไซด์บาร์';
  const navigationVisible=desktop.matches||open;
  nav.inert=!navigationVisible;nav.setAttribute('aria-hidden',String(!navigationVisible));backdrop.hidden=desktop.matches||!open;
  for(const [button,info] of menuNames){button.title=desktop.matches&&collapsed&&!hovering?info.name:'';if(desktop.matches&&collapsed)button.setAttribute('aria-label',info.name);else if(info.label)button.setAttribute('aria-label',info.label);else button.removeAttribute('aria-label');}
  content.inert=!desktop.matches&&open;header.inert=!desktop.matches&&open;
 }
 function close(focus=true){open=false;render();if(focus)toggle.focus({preventScroll:true});}
 toggle.addEventListener('click',()=>{
  if(desktop.matches){collapsed=!collapsed;try{localStorage.setItem(key,String(collapsed));}catch{}render();}
  else{open=!open;render();if(open){nav.scrollTop=0;(nav.querySelector('.tab-btn.active:not([hidden])')||closeButton).focus({preventScroll:true});}}
 });
 const finePointer=matchMedia('(hover:hover) and (pointer:fine)');
 nav.addEventListener('pointerenter',()=>{if(desktop.matches&&collapsed&&finePointer.matches){hovering=true;render();}});
 nav.addEventListener('pointerleave',()=>{if(desktop.matches&&collapsed&&!(keyboardNav&&nav.contains(document.activeElement))){hovering=false;render();}});
 nav.addEventListener('focusin',()=>{if(desktop.matches&&collapsed&&keyboardNav){hovering=true;render();}});
 nav.addEventListener('focusout',event=>{if(!nav.contains(event.relatedTarget)){hovering=false;render();}});
 document.addEventListener('pointerdown',()=>{keyboardNav=false;},true);
 document.addEventListener('keydown',event=>{if(event.key==='Tab')keyboardNav=true;if(event.key==='Escape'&&desktop.matches&&collapsed&&hovering){hovering=false;render();toggle.focus({preventScroll:true});}},true);
 closeButton.addEventListener('click',()=>close());backdrop.addEventListener('click',()=>close());
 document.addEventListener('keydown',event=>{
  if(desktop.matches||!open)return;
  if(document.querySelector('dialog[open]'))return;
  if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();return;}
  if(event.key==='Tab'){
   const stops=[...nav.querySelectorAll('button:not([disabled])')].filter(el=>el.tabIndex>=0&&el.getClientRects().length&&!el.hidden);
   const first=stops[0],last=stops.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }
 },true);
 desktop.addEventListener('change',()=>{open=false;render();});
 new MutationObserver(()=>{if(open&&!document.body.classList.contains('auth-ready'))close(false);}).observe(document.body,{attributes:true,attributeFilter:['class']});
 window.PKSidebar={afterNavigation(){if(!desktop.matches&&open){close(false);toggle.focus({preventScroll:true});}}};
 render();
})();
