(() => {
  'use strict';
  const $=id=>document.getElementById(id), core=window.PKRecipesCore;
  const client=typeof supabaseClient !== 'undefined' ? supabaseClient : null;
  const baseline=new Map(), recipes=new Map();
  let baselineCatalog=[];
  let ready=false, saving=false, generation=0, editingCode='', expectedVersion=0;
  const isAdmin=()=>window.getWmsIsAdmin?.()===true;
  const allowed=()=>window.getWmsCanAccess?.('bompk') || window.getWmsCanAccess?.('bom-plan');
  const status=(message,error=false)=>{ $('pkRecipesStatus').textContent=message; $('pkRecipesStatus').className=error?'error':''; };
  const feedback=(message,error=false)=>{ $('pkRecipeMessage').textContent=message; $('pkRecipeMessage').className=error?'error':'success'; };
  const input=(value,max,type='text')=>{const el=document.createElement('input');el.type=type;el.required=true;el.maxLength=max;el.value=value??'';if(type==='number'){el.min='0.000000001';el.step='any';el.inputMode='decimal';}return el;};
  const products=()=>new Map((STOCK.items||[]).map(item=>[String(item.code).trim().toUpperCase(),item]));
  function addLine(line={}) {
    if($('pkRecipeLines').children.length>=500) return feedback('เพิ่มได้ไม่เกิน 500 ส่วนประกอบ',true);
    const row=document.createElement('div'); row.className='pk-recipe-line';
    for(const [key,label,max,type] of [['pk_code','รหัสบรรจุภัณฑ์ *',120],['pk_name','ชื่อบรรจุภัณฑ์ *',500],['qty','จำนวนใช้รวม *',0,'number'],['unit','หน่วย *',40]]) {
      const wrap=document.createElement('label');wrap.textContent=label;
      const field=input(line[key],max,type);field.dataset.field=key;
      if(key==='pk_code') {field.setAttribute('list','pkRecipeProducts');window.PKKeywordPicker?.attach(field,()=>[...products().values()].map(item=>({...item,searchName:item.search_name||item.searchName||''})));field.addEventListener('change',()=>{
        const item=products().get(field.value.trim().toUpperCase());
        if(item){row.querySelector('[data-field="pk_name"]').value=item.name||'';row.querySelector('[data-field="unit"]').value=item.unit||'';}
      });}
      wrap.append(field);row.append(wrap);
    }
    const remove=document.createElement('button');remove.type='button';remove.textContent='ลบแถว';remove.dataset.confirmDestructive='ลบแถวส่วนประกอบสูตร';remove.onclick=()=>row.remove();row.append(remove);$('pkRecipeLines').append(row);
  }
  function collect() {
    return core.validateRecipe({fg_code:$('pkRecipeCode').value,fg_name:$('pkRecipeName').value,base_qty:$('pkRecipeBase').value,fg_unit:$('pkRecipeUnit').value,
      lines:[...$('pkRecipeLines').children].map(row=>Object.fromEntries([...row.querySelectorAll('input')].map(field=>[field.dataset.field,field.value])))});
  }
  function newRecipe() {
    if(saving)return;
    $('pkRecipeForm').reset();$('pkRecipeLines').replaceChildren();addLine();editingCode='';expectedVersion=0;
    $('pkRecipeCode').readOnly=false;$('pkRecipeVersion').textContent='สูตรใหม่ · เวอร์ชัน 1';$('pkRecipeMessage').textContent='';$('pkRecipeHistory').replaceChildren();
  }
  function edit(code) {
    if(saving || !ready)return;
    const recipe=recipes.get(code), detail=BOMPK.bom_detail[code];
    if(!recipe && !detail) return feedback('ไม่พบสูตรตามรหัสนี้ หากเป็นสินค้าใหม่ให้กรอกข้อมูลและบันทึกสูตรใหม่',true);
    newRecipe();editingCode=code;expectedVersion=recipe?.version||0;
    $('pkRecipeCode').value=code;$('pkRecipeCode').readOnly=true;
    $('pkRecipeName').value=recipe?.fg_name||detail.fg_name;
    $('pkRecipeBase').value=recipe?.base_qty||1;$('pkRecipeUnit').value=recipe?.fg_unit||detail.fg_unit||'';
    $('pkRecipeLines').replaceChildren();
    (recipe?.lines||(detail.source_lines||detail.lines).filter(line=>bomComponentType(line)==='packaging').map(line=>({...line,qty:line.qty_per_unit}))).forEach(addLine);
    $('pkRecipeVersion').textContent=recipe?`กำลังแก้ไขเวอร์ชัน ${expectedVersion} · บันทึกเป็นเวอร์ชัน ${expectedVersion+1}`:'สูตรต้นฉบับจากฐานข้อมูล · บันทึกเป็นเวอร์ชัน 1';
    $('pkRecipeEditor').open=true;
  }
  function showList() {
    $('pkRecipesList').replaceChildren();
    for(const recipe of recipes.values()) {
      const element=document.createElement(isAdmin()?'button':'span');element.textContent=`${recipe.fg_code} · ${recipe.fg_name} · v${recipe.version}`;
      if(isAdmin()){element.type='button';element.onclick=()=>edit(recipe.fg_code);}
      $('pkRecipesList').append(element);
    }
  }
  function apply(rows) {
    // Validate every recipe before replacing any BOM so malformed responses leave the current view intact.
    if(!Array.isArray(rows))throw new Error('ข้อมูลสูตรจากฐานข้อมูลไม่ถูกต้อง');
    const converted=rows.map(row=>[row,core.toBomDetail(row)]);
    const previousVersions=new Map([...recipes].map(([code,row])=>[code,row.version]));
    for(const [code,detail] of baseline) {if(detail===null)delete BOMPK.bom_detail[code];else BOMPK.bom_detail[code]=structuredClone(detail);}
    recipes.clear();
    for(const [recipe,detail] of converted) {
      if(!baseline.has(recipe.fg_code)) baseline.set(recipe.fg_code,BOMPK.bom_detail[recipe.fg_code]?structuredClone(BOMPK.bom_detail[recipe.fg_code]):null);
      recipes.set(recipe.fg_code,recipe);BOMPK.bom_detail[recipe.fg_code]=detail;
      if(previousVersions.get(recipe.fg_code)!==recipe.version)delete fgLineExclusions[recipe.fg_code];
    }
    const catalog=new Map(baselineCatalog.map(item=>[item.fg,item]));
    for(const [fg,detail] of Object.entries(BOMPK.bom_detail))catalog.set(fg,{fg,fg_name:detail.fg_name});
    BOMPK.fg_list=[...catalog.values()];
    document.querySelectorAll('.kota-chip[data-fg] .kota-name').forEach(el=>{el.textContent=BOMPK.bom_detail[el.parentElement.dataset.fg]?.fg_name||'(ไม่พบข้อมูล BOM สำหรับรหัสนี้)';});
    $('fgCodeList').replaceChildren(...BOMPK.fg_list.map(item=>{const option=document.createElement('option');option.value=item.fg;option.textContent=item.fg_name;return option;}));
    recalculateBomFromStock();showList();
  }
  function clearBaseline() {
    baseline.clear(); baselineCatalog=[]; recipes.clear();
    for(const code of Object.keys(BOMPK.bom_detail))delete BOMPK.bom_detail[code];
    apply([]);
  }
  async function refresh() {
    if(saving)return;
    const id=++generation;
    $('pkRecipeEditor').hidden=!isAdmin();
    if(!client || !allowed()){ready=false;clearBaseline();newRecipe();return status('เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ BOM เพื่อโหลดสูตร');}
    try {
      const [original,saved]=await Promise.all([client.rpc('get_pk_bom_baseline'),client.rpc('get_pk_recipes')]);
      if(id!==generation || !allowed())return;
      if(original.error)throw original.error;if(saved.error)throw saved.error;
      const data=original.data;
      if(!data || !data.bom_detail || typeof data.bom_detail!=='object' || !data.fg_catalog)throw new Error('ยังไม่มีต้นฉบับ BOM ในฐานข้อมูล');
      if(!Array.isArray(saved.data))throw new Error('ข้อมูลสูตรที่บันทึกไม่ถูกต้อง');
      for(const detail of Object.values(data.bom_detail))if(!detail || !Array.isArray(detail.lines))throw new Error('ข้อมูลต้นฉบับ BOM ไม่ถูกต้อง');
      baseline.clear();for(const [code,detail] of Object.entries(data.bom_detail))baseline.set(code,structuredClone(detail));
      baselineCatalog=Object.values(data.fg_catalog);BOMPK.assumptions=data.metadata?.assumptions||{};
      for(const code of Object.keys(BOMPK.bom_detail))delete BOMPK.bom_detail[code];
      apply(saved.data);ready=true;$('pkRecipeSave').disabled=saving;
      status('โหลด BOM จาก API แล้ว · '+baseline.size+' สูตรต้นฉบับ · '+recipes.size+' สูตรที่บันทึก');
    }catch(error){if(id!==generation)return;ready=false;clearBaseline();$('pkRecipeSave').disabled=true;
      status('โหลดสูตรไม่ได้ · '+(error.message||'ตรวจสอบการเชื่อมต่อ')+' · กรุณาโหลดใหม่',true);}
  }
  $('pkRecipeForm').addEventListener('submit',async event=>{
    event.preventDefault();if(saving)return;
    if(!ready || !isAdmin())return feedback('ต้องเชื่อมต่อฐานข้อมูลและเป็น Admin ก่อนบันทึก',true);
    let recipe;
    try {recipe=collect();if(editingCode && recipe.fg_code!==editingCode)throw new Error('กรุณาใช้ปุ่มสูตรใหม่เพื่อเพิ่มรหัส FG อื่น');
      if(!editingCode && recipes.has(recipe.fg_code))throw new Error('รหัสนี้มีสูตรแล้ว กรุณากดโหลดสูตรตามรหัส FG เพื่อแก้ไข');
    }catch(error){return feedback(error.message,true);}
    saving=true;const saveGeneration=++generation;$('pkRecipeForm').inert=true;$('pkRecipeSave').disabled=true;feedback('กำลังบันทึกสูตร…');
    try {
      const {data,error}=await client.rpc('save_pk_recipe',{p_recipe:recipe,p_expected_version:expectedVersion});
      if(saveGeneration!==generation || !allowed() || !isAdmin())return;
      if(error)throw error;
      const rows=[...recipes.values()].filter(row=>row.fg_code!==recipe.fg_code);rows.push(data);apply(rows);
      editingCode=data.fg_code;expectedVersion=data.version;$('pkRecipeCode').readOnly=true;
      $('pkRecipeVersion').textContent=`เวอร์ชัน ${data.version} · บันทึกโดย ${data.updated_username}`;
      $('pkRecipeHistory').replaceChildren();feedback(`บันทึก ${data.fg_code} เวอร์ชัน ${data.version} ลงฐานข้อมูลแล้ว`);
      $('fgBomSearch').value=data.fg_code;renderFgBom(data.fg_code);
    }catch(error){if(saveGeneration===generation)feedback(error.message||'บันทึกไม่สำเร็จ ข้อมูลที่กรอกยังอยู่',true);}
    finally{saving=false;$('pkRecipeForm').inert=false;$('pkRecipeSave').disabled=!ready;}
  });
  $('pkRecipeAddLine').onclick=()=>addLine();$('pkRecipeNew').onclick=newRecipe;
  $('pkRecipeLoad').onclick=()=>{
    const raw=$('pkRecipeCode').value.trim(),exact=Object.keys(BOMPK.bom_detail).find(code=>code.toUpperCase()===raw.toUpperCase());
    if(exact)return edit(exact);
    const results=getFgSearchResults(raw);if(results.length===1)return edit(results[0].fg);
    feedback(results.length?'พบหลายสูตร กรุณาเลือกสินค้าจากผลค้นหา':'ไม่พบสูตรตาม Keyword หากเป็นสินค้าใหม่ให้กรอกรหัสและสร้างสูตรใหม่',true);
  };
  $('pkRecipesRefresh').onclick=refresh;
  $('pkRecipeHistoryLoad').onclick=async()=>{
    if(!editingCode)return feedback('เลือกสูตรที่บันทึกในฐานข้อมูลก่อน',true);
    const code=editingCode,historyGeneration=generation;const {data,error}=await client.rpc('get_pk_recipe_versions',{p_fg_code:code});
    if(code!==editingCode || historyGeneration!==generation || !isAdmin())return;
    if(error)return feedback(error.message,true);
    $('pkRecipeHistory').replaceChildren();
    for(const version of data){const row=document.createElement('div');row.className='pk-recipe-history';
      row.textContent=`v${version.version} · ${version.saved_username} · ${new Date(version.saved_at).toLocaleString('th-TH')} · ${version.recipe.lines.length} ส่วนประกอบ`;
      const details=document.createElement('details'),summary=document.createElement('summary'),pre=document.createElement('pre');summary.textContent='ดูสูตรเวอร์ชันนี้';pre.textContent=JSON.stringify(version.recipe,null,2);pre.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere';details.append(summary,pre);row.append(details);$('pkRecipeHistory').append(row);}
  };
  window.addEventListener('wms:account-changed',()=>{
    ++generation;ready=false;clearBaseline();$('pkRecipeHistory').replaceChildren();
    $('pkRecipeEditor').hidden=!isAdmin();$('pkRecipeSave').disabled=true;
    if(saving){status('บัญชีเปลี่ยนแล้ว · กรุณาโหลดสูตรใหม่');return;}
    newRecipe();refresh();
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden && !saving)refresh();});
  setInterval(()=>{if(!document.hidden && !saving && allowed())refresh();},60000);
  $('pkRecipeProducts').replaceChildren(...[...products().values()].map(item=>{const option=document.createElement('option');option.value=item.code;option.textContent=item.name;return option;}));
  newRecipe();refresh();
})();
