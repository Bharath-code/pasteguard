const orig=navigator.clipboard.writeText.bind(navigator.clipboard);
navigator.clipboard.writeText=t=>{
  if(String(t).includes('PG_SECRET_')){document.dispatchEvent(new CustomEvent('pg-copy',{detail:String(t)}));return Promise.resolve()}
  return orig(t)};
const origWrite=navigator.clipboard.write.bind(navigator.clipboard);
navigator.clipboard.write=async items=>{
  for(const it of items){
    if(!it.types.includes('text/plain'))continue;
    const t=await (await it.getType('text/plain')).text();
    if(t.includes('PG_SECRET_')){document.dispatchEvent(new CustomEvent('pg-copy',{detail:t}));return}
  }
  return origWrite(items)};
