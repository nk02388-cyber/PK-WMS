(() => {
 'use strict';
 const toggle=document.getElementById('sidebarToggle'),nav=document.getElementById('tabs'),closeButton=document.getElementById('sidebarClose'),content=document.getElementById('dashboardContent'),header=document.querySelector('header.top');
 const desktop=window.matchMedia('(min-width:1024px)'),key='pk-sidebar-collapsed-v2';
 const backdrop=document.createElement('div');backdrop.className='sidebar-backdrop';backdrop.hidden=true;backdrop.setAttribute('aria-hidden','true');document.body.append(backdrop);
 let collapsed=true,open=false,keyboardNav=false;
 const menuNames=new Map([...nav.querySelectorAll('.tab-btn')].map(button=>[button,{name:button.querySelector('span')?.textContent.trim()||'',label:button.getAttribute('aria-label')} ]));
 try{collapsed=localStorage.getItem(key)!=='false';}catch{}
 function render(){
  hidePeek();
  const shown=desktop.matches?!collapsed:open;
  document.body.classList.toggle('sidebar-collapsed',desktop.matches&&collapsed);
  document.body.classList.remove('sidebar-hover-open');
  document.body.classList.toggle('sidebar-drawer-open',!desktop.matches&&open);
  toggle.setAttribute('aria-expanded',String(shown));toggle.setAttribute('aria-label',shown?'ปิดไซด์บาร์':'เปิดไซด์บาร์');toggle.title=shown?'ปิดไซด์บาร์':'เปิดไซด์บาร์';
  const navigationVisible=desktop.matches||open;
  nav.inert=!navigationVisible;nav.setAttribute('aria-hidden',String(!navigationVisible));backdrop.hidden=desktop.matches||!open;
  for(const [button,info] of menuNames){button.title='';if(desktop.matches&&collapsed)button.setAttribute('aria-label',info.name);else if(info.label)button.setAttribute('aria-label',info.label);else button.removeAttribute('aria-label');}
  content.inert=!desktop.matches&&open;header.inert=!desktop.matches&&open;
 }
 function close(focus=true){open=false;render();if(focus)toggle.focus({preventScroll:true});}
 toggle.addEventListener('click',()=>{
  if(desktop.matches){collapsed=!collapsed;try{localStorage.setItem(key,String(collapsed));}catch{}render();}
  else{open=!open;render();if(open){nav.scrollTop=0;(nav.querySelector('.tab-btn.active:not([hidden])')||closeButton).focus({preventScroll:true});}}
 });
 const finePointer=matchMedia('(hover:hover) and (pointer:fine)');
 const peek=document.createElement('div');peek.className='sidebar-label-peek';peek.setAttribute('aria-hidden','true');document.body.append(peek);
 function hidePeek(){if(typeof peek!=='undefined')peek.classList.remove('is-open');}
 function showPeek(button){if(!desktop.matches||!collapsed||!button||button.hidden)return;const r=button.getBoundingClientRect();peek.textContent=menuNames.get(button)?.name||'';peek.dataset.menu=button.id;peek.style.left=(r.right+8)+'px';peek.style.top=Math.max(8,Math.min(innerHeight-52,r.top))+'px';peek.classList.add('is-open');}
 for(const button of menuNames.keys()){
  button.addEventListener('pointerenter',()=>{if(finePointer.matches)showPeek(button);});
  button.addEventListener('pointerleave',hidePeek);
  button.addEventListener('focus',()=>{if(keyboardNav)showPeek(button);});button.addEventListener('blur',hidePeek);
 }
 nav.addEventListener('scroll',hidePeek,{passive:true});window.addEventListener('resize',hidePeek);
 document.addEventListener('pointerdown',()=>{keyboardNav=false;hidePeek();},true);
 document.addEventListener('keydown',event=>{if(event.key==='Tab')keyboardNav=true;if(event.key==='Escape')hidePeek();},true);
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
