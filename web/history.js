(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.PaperlyHistory=factory()})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const clone=value=>JSON.parse(JSON.stringify(value));
function snapshot(p){return clone({id:p.submission.id,docid:p.docid,time:p.submission.time,name:p.name,src:p.src,w:p.w,h:p.h,items:p.submission.items})}
function normalize(records){return [...new Map(records.filter(x=>x&&x.id&&x.docid&&x.src).map(x=>[x.id,x])).values()].sort((a,b)=>b.time-a.time).slice(0,50)}
function add(history,record){return normalize([record,...history])}
function migrate(pages,history){return normalize([...(history||[]),...pages.filter(p=>p.submission).map(snapshot)])}
function asPage(s){return {...s,redo:[],submission:{id:s.id,time:s.time,items:s.items}}}
return {snapshot,add,migrate,asPage,normalize};
});
