const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const source = html.match(/function bindMapGestures\([^]*?\n\}/)[0];
function setup(centered=false) {
  const events={},windowEvents={},captures=new Set(),classes=new Set();
  let state={scale:1,panX:0,panY:0}, taps=0,writes=0,nextFrame=0;const frames=new Map();
  const flush=()=>{const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn());};
  const viewport={addEventListener:(type,fn)=>events[type]=fn,
    getBoundingClientRect:()=>({left:10,top:20,width:400,height:600}),
    setPointerCapture:id=>captures.add(id),hasPointerCapture:id=>captures.has(id),releasePointerCapture:id=>captures.delete(id),
    classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)}};
  const bind=vm.runInNewContext(`(${source})`,{window:{addEventListener:(type,fn)=>windowEvents[type]=fn},requestAnimationFrame:fn=>{frames.set(++nextFrame,fn);return nextFrame},cancelAnimationFrame:id=>frames.delete(id)});
  const controller=bind(viewport,{read:()=>state,write:(scale,panX,panY)=>{writes++;state={scale,panX,panY}},
    limits:()=>({min:1,max:6}),centered,target:'.pin',ignore:'.controls',dragClass:'dragging',tap:()=>taps++});
  const send=(type,id,x,y,extra={})=>events[type]({type,pointerId:id,clientX:x,clientY:y,button:0,target:{closest:s=>s==='.pin'?{}:null},...extra});
  return {send,controller,windowEvents,captures,classes,flush,get writes(){return writes},get state(){flush();return state},get taps(){return taps}};
}
for(const centered of [false,true]) {
  const g=setup(centered);
  g.send('pointerdown',1,110,220);g.send('pointerdown',2,210,220);
  g.send('pointermove',1,60,220);g.send('pointermove',2,260,220);
  assert.equal(g.state.scale,2,'Spread doubles scale');
  const originX=centered?210:10,originY=centered?320:20;
  assert.equal(originX+g.state.panX+(160-originX)*2,160,'Map point stays under finger midpoint');
  assert.equal(originY+g.state.panY+(220-originY)*2,220);
  g.send('pointermove',1,110,220);g.send('pointermove',2,210,220);
  assert.equal(g.state.scale,1,'Pinch returns to original scale');
  g.send('pointermove',1,0,220);g.send('pointermove',2,2000,220);
  assert.equal(g.state.scale,6,'Clamp maximum');
  g.send('pointerup',2,2000,220);
  const previous={...g.state};g.send('pointermove',1,10,225);
  assert.equal(g.state.panX,previous.panX+10,'One-finger continuation does not jump');
  assert.equal(g.state.panY,previous.panY+5);
  g.send('pointerup',1,10,225);assert.equal(g.taps,0,'Pinch never selects a slot');
  assert.equal(g.captures.size,0);
  g.send('pointerdown',3,100,200);g.send('pointerup',3,100,200);assert.equal(g.taps,1,'Normal tap still works');
  g.send('pointerdown',4,100,200);g.send('pointermove',4,120,200);g.send('pointermove',4,100,200);g.send('pointerup',4,100,200);
  assert.equal(g.taps,1,'Drag returning to start is not a tap');
  for(const cancel of ['pointercancel','lostpointercapture']) {
    g.send('pointerdown',5,100,200);g.send(cancel,5,100,200);assert.equal(g.taps,1,'Cancellation never selects a slot');
  }
  g.send('pointerdown',6,100,200);g.send('pointerdown',7,100,200);g.send('pointermove',7,120,200);
  assert.ok(Number.isFinite(g.state.scale),'Coincident fingers never divide by zero');
  g.send('pointerdown',8,150,200);g.send('pointerup',6,100,200);g.send('pointermove',8,180,200);
  assert.ok(Number.isFinite(g.state.panX),'Third finger and replacement remain stable');
  g.windowEvents.blur();assert.equal(g.captures.size,0);assert.equal(g.classes.size,0);
  g.send('pointerdown',9,100,200,{button:2});assert.equal(g.captures.size,0,'Ignore right mouse button');
  g.send('pointerdown',10,100,200,{target:{closest:()=>({})}});assert.equal(g.captures.size,0,'Map controls keep native clicks');
}
assert.match(html,/bindMapGestures\(floorplanWrap/);
assert.match(html,/bindMapGestures\(zoomViewport/);
const burst=setup();burst.send('pointerdown',1,100,200);
for(let i=1;i<=200;i++)burst.send('pointermove',1,100+i,200+i);
assert.equal(burst.writes,0,'Moves wait for the next paint frame');burst.flush();assert.equal(burst.writes,1,'A burst paints only the latest position');
assert.equal(burst.state.panX,200);assert.equal(burst.state.panY,200);
burst.send('pointermove',1,350,450);burst.controller.clear();burst.flush();assert.equal(burst.writes,1,'Closing clears pending paint');
console.log('PASS: two-finger zoom, anchored midpoint, limits, continuation, tap/drag isolation and cancellation on both maps');
