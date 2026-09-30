const orig=navigator.clipboard.writeText.bind(navigator.clipboard);
navigator.clipboard.writeText=t=>{
  if(String(t).includes('PG_SECRET_')){document.dispatchEvent(new CustomEvent('pg-copy',{detail:String(t)}));return Promise.resolve()}
  return orig(t)};
