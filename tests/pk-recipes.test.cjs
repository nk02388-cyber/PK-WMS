const assert=require('node:assert/strict');
const {validateRecipe,toBomDetail}=require('../pk-recipes-core.js');
const recipe={fg_code:'fg-test',fg_name:'สินค้าทดสอบ',base_qty:1000,fg_unit:'ชิ้น',lines:[
  {pk_code:'bottle',pk_name:'ขวด',qty:1000,unit:'ขวด'},
  {pk_code:'box',pk_name:'กล่อง',qty:100,unit:'ใบ'},
]};
const normalized=validateRecipe(recipe),detail=toBomDetail({...recipe,version:2});
assert.equal(normalized.fg_code,'FG-TEST');assert.equal(detail.lines[1].qty_per_unit,.1);
assert.equal(detail.lines[0].component_type,'packaging');assert.equal(detail.recipe_version,2);
for(const value of [0,-1,'',null,true,Infinity,'NaN',1e12,.0000000001])assert.throws(()=>validateRecipe({...recipe,base_qty:value}));
assert.throws(()=>validateRecipe({...recipe,lines:[recipe.lines[0],{...recipe.lines[0],pk_code:'BOTTLE'}]}),/ซ้ำ/);
assert.throws(()=>validateRecipe({...recipe,fg_unit:' '}));
assert.throws(()=>validateRecipe({...recipe,lines:[]}));
assert.deepEqual(recipe.lines.map(line=>line.pk_code),['bottle','box'],'Validation must not mutate input');
console.log('PASS: recipe validation, duplicate protection and batch-to-unit conversion');
