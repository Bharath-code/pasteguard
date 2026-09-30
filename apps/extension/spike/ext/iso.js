const vault={PG_SECRET_1:'AKIAIOSFODNN7EXAMPLE'};
document.addEventListener('pg-copy',e=>{
  navigator.clipboard.writeText(e.detail.replace(/PG_SECRET_\d+/g,m=>vault[m]??m)).then(()=>document.documentElement.dataset.pgCopy='ok',err=>document.documentElement.dataset.pgCopy='err:'+err.name)});
