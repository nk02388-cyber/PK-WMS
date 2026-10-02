(function(root) {
  'use strict';
  const text = (value, label, max) => {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new Error(`กรุณาระบุ${label} (ไม่เกิน ${max} ตัวอักษร)`);
    return value.trim();
  };
  const qty = (value, label) => {
    if (!['number','string'].includes(typeof value) || String(value).trim() === '') throw new Error(`กรุณาระบุ${label}`);
    const n = Number(value);
    if (!Number.isFinite(n) || n < 1e-9 || n >= 1e12 || Math.abs(n - Math.round(n * 1e9) / 1e9) > Math.max(1e-15, n * Number.EPSILON))
      throw new Error(`${label}ต้องมากกว่า 0 และมีทศนิยมไม่เกิน 9 ตำแหน่ง`);
    return n;
  };
  function validateRecipe(raw) {
    if (!raw || !Array.isArray(raw.lines) || raw.lines.length < 1 || raw.lines.length > 500) throw new Error('สูตรต้องมี 1–500 ส่วนประกอบ');
    const codes = new Set();
    const recipe = {
      fg_code:text(raw.fg_code,'รหัส FG',120).toUpperCase(), fg_name:text(raw.fg_name,'ชื่อ FG',500),
      base_qty:qty(raw.base_qty,'จำนวน FG ตั้งต้น'), fg_unit:text(raw.fg_unit,'หน่วย FG',40),
      lines:raw.lines.map((line,index) => {
        const code=text(line.pk_code,`รหัสส่วนประกอบแถว ${index+1}`,120).toUpperCase();
        if (codes.has(code)) throw new Error(`รหัส ${code} ซ้ำ กรุณารวมปริมาณไว้ในแถวเดียว`);
        codes.add(code);
        return {pk_code:code,pk_name:text(line.pk_name,`ชื่อส่วนประกอบแถว ${index+1}`,500),qty:qty(line.qty,`จำนวนใช้แถว ${index+1}`),unit:text(line.unit,`หน่วยแถว ${index+1}`,40)};
      }),
    };
    return recipe;
  }
  function toBomDetail(raw) {
    const recipe=validateRecipe(raw);
    return {fg_name:recipe.fg_name, fg_unit:recipe.fg_unit, recipe_version:raw.version,
      recipe_base_qty:recipe.base_qty, line_count:recipe.lines.length,
      lines:recipe.lines.map(line=>({...line,qty_per_unit:line.qty/recipe.base_qty,component_type:'packaging',shared_fgs:[]}))};
  }
  const api={validateRecipe,toBomDetail};
  if(typeof module !== 'undefined' && module.exports) module.exports=api;
  root.PKRecipesCore=api;
})(typeof window !== 'undefined' ? window : globalThis);
