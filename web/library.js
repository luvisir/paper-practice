let libraryTab='files',libraryBusy=false,previewEpoch=0;
const libraryDialog=$('libraryDialog'),snapshotDialog=$('snapshotDialog');
$('library').onclick=()=>{touchController.reset();renderLibrary();libraryDialog.showModal()};
$('libraryClose').onclick=()=>libraryDialog.close();
$('showFiles').onclick=()=>{libraryTab='files';renderLibrary()};
$('showHistory').onclick=()=>{libraryTab='history';renderLibrary()};
function renderLibrary(){
 $('showFiles').classList.toggle('primary',libraryTab==='files');$('showHistory').classList.toggle('primary',libraryTab==='history');
 $('libraryNote').textContent=libraryTab==='files'?'删除试卷会移除原图和当前草稿，已提交的历史快照仍保留。多页 PDF 按页管理。':'最近 '+history.length+' / 50 份提交，包含原图和提交时的笔迹。第 51 份提交保存成功后，自动移除最早一份。历史仅保存在本机，清除应用或浏览器数据会丢失，请及时导出。';
 const list=$('libraryList');list.replaceChildren();const entries=libraryTab==='files'?pages:history;
 if(!entries.length){const empty=document.createElement('p');empty.textContent=libraryTab==='files'?'暂无试卷，请关闭后导入。':'暂无历史快照，点击“完成作业”后自动保存。';list.append(empty);return}
 if(libraryTab==='files'){const all=document.createElement('button');all.textContent='清理全部导入试卷';all.className='danger';all.disabled=libraryBusy;all.onclick=()=>removeFiles(null);list.append(all)}
 entries.forEach((p,i)=>{const row=document.createElement('div');row.className='library-row';const img=document.createElement('img');img.src=p.src;img.alt='';const info=document.createElement('div');const name=document.createElement('b');name.textContent=p.name;const desc=document.createElement('small');desc.textContent=libraryTab==='files'?`第 ${i+1} 页 · ${p.items.length} 笔作答` : new Date(p.time).toLocaleString('zh-CN');info.append(name,desc);const open=document.createElement('button');open.textContent=libraryTab==='files'?'打开':'查看快照';open.onclick=async()=>{if(libraryTab==='files'){libraryDialog.close();await show(i)}else await previewSnapshot(p)};row.append(img,info,open);
 if(libraryTab==='files'){const del=document.createElement('button');del.textContent='删除试卷';del.className='danger';del.disabled=libraryBusy;del.onclick=()=>removeFiles(p.docid);row.append(del)}list.append(row)});
}
async function removeFiles(docid){
 if(libraryBusy||importing)return;
 const affected=docid?pages.filter(p=>p.docid===docid):pages;
 const unsaved=affected.filter(p=>p.items.length&&(!p.submission||JSON.stringify(p.items)!==JSON.stringify(p.submission.items))).length;
 if(!confirm(`删除${docid?'这页试卷':'全部 '+affected.length+' 页试卷'}及当前草稿？${unsaved?'其中 '+unsaved+' 页有未提交内容，请先取消并提交或导出。':''}已保存的最近 50 份历史快照不受影响。删除后无法撤销。`))return;
 libraryBusy=true;renderLibrary();touchController.reset();
 try{const current=pages[index]?.docid,next=docid?pages.filter(p=>p.docid!==docid):[];if(!await persistState(next,history))return;pages=next;index=Math.max(0,pages.findIndex(p=>p.docid===current));await show(index);toast('试卷已清理，历史快照仍保留')}finally{libraryBusy=false;renderLibrary()}
}
async function previewSnapshot(s){const epoch=++previewEpoch;$('snapshotName').textContent=s.name+' · '+new Date(s.time).toLocaleString('zh-CN');$('snapshotImage').removeAttribute('src');$('snapshotExport').disabled=true;snapshotDialog.showModal();try{const c=await composite(PaperlyHistory.asPage(s));if(epoch!==previewEpoch||!snapshotDialog.open)return;const url=c.toDataURL('image/png');$('snapshotImage').src=url;$('snapshotExport').disabled=false;$('snapshotExport').onclick=()=>{const a=document.createElement('a');a.href=url;a.download='纸上-历史作业-'+s.time+'.png';a.click()}}catch{toast('快照打开失败，请重试')}}
function closeSnapshot(){previewEpoch++;$('snapshotImage').removeAttribute('src');$('snapshotExport').onclick=null}
$('snapshotClose').onclick=()=>snapshotDialog.close();snapshotDialog.addEventListener('close',closeSnapshot);
