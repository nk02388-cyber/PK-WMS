(() => {
  'use strict';
  const libraries={excel:{src:'vendor/xlsx-0.20.3.min.js',global:'XLSX',label:'Excel'},scanner:{src:'vendor/html5-qrcode.min.js',global:'Html5Qrcode',label:'ตัวสแกน QR/บาร์โค้ด'}};
  const pending=new Map();
  function load(name){
    const spec=libraries[name];
    if(!spec)return Promise.reject(new Error('ไม่รู้จักไลบรารีที่ขอโหลด'));
    if(window[spec.global])return Promise.resolve(window[spec.global]);
    if(pending.has(name))return pending.get(name);
    const promise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src=spec.src;script.async=true;
      const timer=setTimeout(()=>finish(new Error('โหลด '+spec.label+' ใช้เวลานานเกินไป กรุณาลองอีกครั้ง')),20000);
      function finish(error){
        clearTimeout(timer);script.onload=null;script.onerror=null;
        if(error){script.remove();reject(error);}else resolve(window[spec.global]);
      }
      script.onload=()=>finish(window[spec.global]?null:new Error('โหลด '+spec.label+' ไม่สำเร็จ กรุณาลองอีกครั้ง'));
      script.onerror=()=>finish(new Error('โหลด '+spec.label+' ไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง'));
      document.head.append(script);
    });
    pending.set(name,promise);
    promise.catch(()=>{if(pending.get(name)===promise)pending.delete(name);});
    return promise;
  }
  window.PKDependencies={excel:()=>load('excel'),scanner:()=>load('scanner')};
})();
