const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const source=html.match(/function ovClamp\(layout\) \{[^]*?\n\}/)[0];
for(const rotation of [0,90,180,270]){
 const helper=html.match(/function overviewPortraitLayout\([^]*?\n\}/)[0];
 const layout=vm.runInNewContext('('+helper+')')(1920,1700/2200,rotation);
 const c={floorplanWrap:{clientWidth:1920,clientHeight:900},ovScale:1,ovPanX:-500,ovPanY:-200,layout};
 vm.runInNewContext(source+';ovClamp(layout)',c);
 const min=Math.min(0,900-1920/layout.aspectRatio);
 assert.equal(c.ovPanX,0);assert.equal(c.ovPanY,Math.max(min,-200));
 c.ovPanY=-100000;vm.runInNewContext('ovClamp(layout)',c);assert.equal(c.ovPanY,min);
 c.ovPanY=100;vm.runInNewContext('ovClamp(layout)',c);assert.equal(c.ovPanY,0);
 c.floorplanWrap.clientHeight=1920/layout.aspectRatio;c.ovPanY=-200;vm.runInNewContext('ovClamp(layout)',c);assert.equal(c.ovPanY,0);
}
console.log('PASS actual rotated drawing bounds in fullscreen and normal overview');
