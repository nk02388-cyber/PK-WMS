(()=>{
'use strict';
const norm=v=>String(v??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('th-TH').replace(/[\u0e48-\u0e4b]/g,'');
const matches=(values,query)=>{const hay=norm(values.join(' '));return norm(query).split(' ').filter(Boolean).every(term=>hay.includes(term));};
let serial=0;
function attach(input,source,onChoose){
 if(!input||input.dataset.keywordPicker)return;input.dataset.keywordPicker='true';input.removeAttribute('list');input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-expanded','false');
 const list=document.createElement('div');list.className='keyword-picker-results';list.id='keywordPicker'+(++serial);list.hidden=true;list.setAttribute('role','listbox');list.setAttribute('aria-label','ผลค้นหาสินค้า');input.setAttribute('aria-controls',list.id);input.insertAdjacentElement('afterend',list);let rows=[],active=-1;
 function close(){list.hidden=true;active=-1;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');}
 function choose(row){if(!row)return;input.value=row.code;close();onChoose?.(row);input.dispatchEvent(new Event('change',{bubbles:true}));input.focus();}
 function render(){const q=norm(input.value);if(!q||input.readOnly||input.disabled){close();return;}rows=source().filter(row=>matches([row.code,row.name,row.searchName,row.unit],q)).sort((a,b)=>(norm(a.code)===q?-1:norm(b.code)===q?1:0)||String(a.code).localeCompare(String(b.code),'th',{numeric:true}));active=-1;list.replaceChildren();
 rows.slice(0,20).forEach((row,i)=>{const button=document.createElement('button');button.type='button';button.id=list.id+'-'+i;button.setAttribute('role','option');button.setAttribute('aria-selected','false');button.textContent=row.code+' · '+(row.name||'ไม่ระบุชื่อสินค้า');button.addEventListener('click',()=>choose(row));list.append(button);});
 const hint=document.createElement('p');hint.textContent=rows.length?'พบ '+rows.length+' รายการ · เลือกสินค้าก่อนเพิ่ม'+(rows.length>20?' · แสดง 20 รายการแรก':''):'ไม่พบสินค้าที่ตรงกับทุก Keyword';list.append(hint);list.hidden=false;input.setAttribute('aria-expanded','true');}
 input.addEventListener('input',render);input.addEventListener('focus',render);
 input.addEventListener('keydown',e=>{if(e.key==='Escape'){close();return;}if(list.hidden)return;const buttons=[...list.querySelectorAll('button')];if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();active=Math.max(0,Math.min(buttons.length-1,active+(e.key==='ArrowDown'?1:-1)));buttons.forEach((b,i)=>b.setAttribute('aria-selected',String(i===active)));if(buttons[active]){input.setAttribute('aria-activedescendant',buttons[active].id);buttons[active].scrollIntoView({block:'nearest'});}}else if(e.key==='Enter'&&rows.length>1&&active<0){e.preventDefault();}else if(e.key==='Enter'&&(active>=0||rows.length===1)){e.preventDefault();choose(rows[active>=0?active:0]);}});
 input.addEventListener('blur',e=>{if(!list.contains(e.relatedTarget))close();});list.addEventListener('focusout',e=>{if(e.relatedTarget!==input&&!list.contains(e.relatedTarget))close();});
 input.closest('form')?.addEventListener('submit',e=>{if(input.readOnly||input.disabled||!input.isConnected)return;const q=norm(input.value),results=source().filter(row=>matches([row.code,row.name,row.searchName,row.unit],q));if(!q||results.some(row=>norm(row.code)===q)||!results.length)return;if(results.length===1)choose(results[0]);else{e.preventDefault();e.stopImmediatePropagation();render();input.focus();}},true);
 return {close,render};
}
window.PKKeywordPicker={attach,matches,normalize:norm};
const fgRows=()=>Object.entries(BOMPK.bom_detail||{}).map(([code,detail])=>({code,name:detail.fg_name}));
attach(document.getElementById('bomPlanFg'),fgRows);
attach(document.getElementById('pkRecipeCode'),fgRows,row=>{const field=document.getElementById('pkRecipeName');if(field&&!field.readOnly)field.value=row.name||'';});
})();
