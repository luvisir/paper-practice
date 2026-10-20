const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),H=require('../web/history.js');
const page={docid:'p',src:'data:image/jpeg;base64,test',name:'旧试卷',w:100,h:200,items:[{points:[{x:1,y:2}]}],redo:[],submission:{id:'legacy',time:1,items:[{points:[{x:3,y:4}]}]}};
let h=H.migrate([page]);assert.equal(h.length,1);page.submission.items[0].points[0].x=999;assert.equal(h[0].items[0].points[0].x,3);
assert.equal(H.migrate([page],h).length,1);
for(let i=2;i<=53;i++)h=H.add(h,H.snapshot({...page,submission:{id:'s'+i,time:i,items:[{answer:i}]}}));
assert.equal(h.length,50);assert.equal(h[0].id,'s53');assert.equal(h[49].id,'s4');
assert.equal(H.migrate([page],h).length,50);assert.equal(H.migrate([page],h)[49].id,'s4');
const original=h[0].src;const restored=H.asPage(h[0]);assert.equal(restored.submission.id,'s53');assert.equal(restored.src,original);assert.equal(h.length,50); // independent of active pages
const source=fs.readFileSync('web/app.js','utf8');const persistence=source.slice(source.indexOf('async function persistState('),source.indexOf('\nfunction loadImg'));
(async()=>{let fail=false,writes={},messages=[];const context={ready:Promise.resolve(),pages:[],history:h,toast:s=>messages.push(s),$:()=>({textContent:''}),db:{transaction(){const tx={objectStore:()=>({put(v,k){writes[k]=JSON.parse(JSON.stringify(v))}})};queueMicrotask(()=>fail?tx.onabort():tx.oncomplete());return tx}}};vm.createContext(context);vm.runInContext(persistence,context);
assert.equal(await context.persistState([],h),true);assert.equal(writes.pages.length,0);assert.equal(writes.history.length,50);
fail=true;assert.equal(await context.persistState([],h),false);assert.ok(messages.length);context.db=null;assert.equal(await context.persistState([],h),false);
const lib=fs.readFileSync('web/library.js','utf8'),remove=lib.slice(lib.indexOf('async function removeFiles('),lib.indexOf('async function previewSnapshot('));
const d={libraryBusy:false,importing:false,pages:[page],history:h,index:0,confirm:()=>true,renderLibrary(){},touchController:{reset(){}},persistState:async()=>false,show:async()=>{},toast(){}};vm.createContext(d);vm.runInContext(remove,d);await d.removeFiles(null);assert.equal(d.pages.length,1);assert.equal(d.history.length,50);d.persistState=async()=>true;await d.removeFiles(null);assert.equal(d.pages.length,0);assert.equal(d.history.length,50);assert.equal(d.history[0].src,original);
console.log('PASS: legacy migration, immutable snapshots, newest 50 retention, deduplication, independent originals, atomic save completion and failure handling');})().catch(e=>{console.error(e);process.exitCode=1});
