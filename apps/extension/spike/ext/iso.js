const vault={PG_SECRET_1:'AKIAIOSFODNN7EXAMPLE'};
document.addEventListener('pg-copy',e=>{
  navigator.clipboard.writeText(e.detail.replace(/PG_SECRET_\d+/g,m=>vault[m]??m)).then(()=>document.documentElement.dataset.pgCopy='ok',err=>document.documentElement.dataset.pgCopy='err:'+err.name)});
window.addEventListener('copy',e=>{
  const sel=getSelection();if(!sel||sel.isCollapsed)return;
  let text='';for(let i=0;i<sel.rangeCount;i++){const r=sel.getRangeAt(i).cloneRange();
    for(let c=r.endContainer;c.nodeType===3&&r.endOffset===c.length&&c.nextSibling?.nodeName==='PG-V';c=r.endContainer)r.setEndAfter(c.nextSibling);
    const d=document.createElement('div');d.append(r.cloneContents());text+=d.textContent}
  if(!text.includes('PG_SECRET_'))return;
  e.preventDefault();e.stopImmediatePropagation();
  e.clipboardData.setData('text/plain',text.replace(/PG_SECRET_\d+/g,m=>vault[m]??m));
  document.documentElement.dataset.pgSelCopy='ok';
},true);
