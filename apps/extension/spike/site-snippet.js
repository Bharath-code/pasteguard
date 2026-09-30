(async()=>{
const SECRET='AKIAIOSFODNN7EXAMPLE',PH='PG_SECRET_1';
const root=document.querySelector('main')||document.body;
const t0=performance.now();let n=0;
const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];
while(w.nextNode())nodes.push(w.currentNode);
for(const t of nodes){if(t.parentElement.closest('textarea,[contenteditable=true]'))continue;
 const i=t.data.indexOf(PH);if(i<0)continue;
 const tail=t.splitText(i);tail.data=tail.data.slice(PH.length);
 const h=document.createElement('pg-v');h.textContent='PG_SECRET_1',sr=h.attachShadow({mode:'closed'}),s=document.createElement('span');
 s.textContent=SECRET;sr.append(s);tail.before(h);n++}
const ms=performance.now()-t0;
const leak=[root.innerText,root.textContent,root.innerHTML].some(x=>x.includes(SECRET));
await new Promise(r=>setTimeout(r,3000));
console.log(JSON.stringify({site:location.host,placeholdersFound:n,restoreMs:+ms.toFixed(2),pageSeesSecret:leak,survivedRerender3s:root.querySelectorAll('pg-v').length,
 selectionHasSecret:(getSelection().selectAllChildren(root),getSelection().toString().includes(SECRET))}));
getSelection().removeAllRanges();
})()
