/* APK-only bridge. The web edition never loads this file. */
(function(){
    if(!window.PaperlyNative) return;
    if(!window.crypto.randomUUID) window.crypto.randomUUID=function(){const b=new Uint8Array(16);crypto.getRandomValues(b);b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=Array.from(b,v=>v.toString(16).padStart(2,'0')).join('');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20)};
    const pending=new Map();let sequence=0;
    window.__paperlyNativeResult=function(id,result){const p=pending.get(id);if(!p)return;pending.delete(id);clearTimeout(p.timeout);if(result.status>=400){const e=new Error(result.body.error||'操作失败');e.status=result.status;e.code=result.body.code||('HTTP_'+result.status);p.reject(e)}else p.resolve(result.body)};
    window.offlineParentAPI=function(path,body,signal){return new Promise((resolve,reject)=>{if(signal?.aborted){reject(new DOMException('请求已取消','AbortError'));return}const id=++sequence;const timeout=setTimeout(()=>{pending.delete(id);reject(new Error('本机操作超时，请重试'))},30000);pending.set(id,{resolve,reject,timeout});PaperlyNative.request(id,path,JSON.stringify(body||{}))})};
    const nativeClick=HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click=function(){if(this.download&&/^(data:|blob:)/.test(this.href)){const a=this;fetch(this.href).then(r=>r.blob()).then(blob=>{const reader=new FileReader();reader.onload=()=>PaperlyNative.saveFile(a.download,String(reader.result));reader.readAsDataURL(blob)}).catch(()=>alert('导出失败，请重试'));return}return nativeClick.call(this)};
    window.addEventListener('contextmenu',e=>e.preventDefault());
})();
window.addEventListener('paperly-native-lock',function(){if(typeof lockParent==='function')lockParent()});
(function(){function fitApp(){document.documentElement.style.setProperty('--paperly-height',window.innerHeight+'px');const h=document.querySelector('header');if(h)document.documentElement.style.setProperty('--paperly-header',h.offsetHeight+'px')}window.addEventListener('resize',fitApp);window.addEventListener('DOMContentLoaded',fitApp)})();
