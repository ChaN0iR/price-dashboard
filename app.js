const KEY="price-dashboard-v1";let repo={items:[],updated:""},items=[],editing=null;
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fmt=n=>n==null||n===""?"-":"NT$"+Number(n).toLocaleString("en-US");
const now=()=>{const d=new Date(),p=n=>String(n).padStart(2,"0");return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`};
function save(){localStorage.setItem(KEY,JSON.stringify({base:repo.updated||"",items}))}
async function load(){
 try{repo=await (await fetch("data/items.json",{cache:"no-store"})).json()}catch(e){}
 let l=null,note="";try{l=JSON.parse(localStorage.getItem(KEY))}catch(e){}
 const fresh=()=>JSON.parse(JSON.stringify(repo.items||[]));
 if(l&&!Array.isArray(l)&&Array.isArray(l.items)&&(l.base||"")>=(repo.updated||"")){items=l.items;note="（本機有未匯出的變更）"}
 else{items=fresh();if(l){localStorage.removeItem(KEY);note="（倉庫資料較新，已捨棄舊的本機副本）"}}
 $("#meta").textContent="倉庫資料更新："+(repo.updated||"-")+note;render()}
function change(i){const b=+i.baseline,c=+i.current;return b&&c?(c-b)/b*100:null}
const pct=i=>{const p=change(i);return p==null?0:p};
const rank=i=>i.purchased?3:(i.stock==="缺貨"||i.status==="缺貨")?2:(i.status==="降價"||i.status==="補貨")?0:1;
const sorters={best:(a,b)=>rank(a)-rank(b)||pct(a)-pct(b)||(a.name>b.name?1:-1),
 drop:(a,b)=>pct(a)-pct(b),
 price:(a,b)=>(+a.current||Infinity)-(+b.current||Infinity),
 last:(a,b)=>String(b.lastChecked||"").localeCompare(String(a.lastChecked||""))};
function render(){
 const cats=[...new Set(items.map(i=>i.category).filter(Boolean))],cs=$("#cat"),cv=cs.value;
 cs.innerHTML='<option value="">全部分類</option>'+cats.map(c=>`<option>${esc(c)}</option>`).join("");cs.value=cats.includes(cv)?cv:"";
 const q=$("#q").value.trim().toLowerCase(),st=$("#st").value;
 const list=items.filter(i=>(!cs.value||i.category===cs.value)&&(!st||i.status===st)&&(!q||[i.name,i.store,i.note].join(" ").toLowerCase().includes(q))).sort(sorters[$("#sort").value]||sorters.best);
 $("#rows").innerHTML=list.map(i=>{const p=change(i);
  const pc=p==null?"-":`<span class="${p<0?"down":p>0?"up":""}">${p>0?"+":""}${p.toFixed(1)}%</span>`;
  return `<tr><td>${i.url?`<a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.name)}</a>`:esc(i.name)}${i.purchased?" （已購買）":""}<small>${esc(i.category)}${i.note?" ・ "+esc(i.note):""}</small></td>
  <td>${esc(i.store)}</td><td class="n">${fmt(i.baseline)}</td><td class="n">${fmt(i.current)}</td><td class="n">${pc}</td><td>${esc(i.stock)}</td>
  <td><span class="b ${esc(i.status)}">${esc(i.status)}</span></td><td>${esc(i.lastChecked)}</td>
  <td class="ed"><button data-e="${esc(i.id)}">編輯</button> <button data-d="${esc(i.id)}">刪除</button></td></tr>`}).join("");
 $("#empty").hidden=list.length>0;
 const n=s=>items.filter(i=>i.status===s).length;
 $("#sum").innerHTML=`<span>共 <b>${items.length}</b> 項</span><span>降價 <b>${n("降價")}</b></span><span>補貨 <b>${n("補貨")}</b></span><span>缺貨 <b>${n("缺貨")}</b></span>`}
["#q","#cat","#st","#sort"].forEach(s=>$(s).addEventListener("input",render));
$("#edit").onchange=e=>{document.body.classList.toggle("editing",e.target.checked);$("#tools").hidden=!e.target.checked};
function open(i){editing=i||null;const f=$("#f");$("#dt").textContent=i?"編輯商品":"新增商品";
 for(const el of f.elements){if(!el.name)continue;const v=i?i[el.name]:(el.name=="stock"?"有貨":el.name=="status"?"無變化":"");
  if(el.type=="checkbox")el.checked=!!v;else el.value=v??""}
 $("#dlg").showModal()}
$("#add").onclick=()=>open();
$("#dlg").addEventListener("close",()=>{const d=$("#dlg");if(d.returnValue!=="ok")return;const f=$("#f"),o={};
 for(const el of f.elements){if(!el.name)continue;o[el.name]=el.type=="checkbox"?el.checked:el.type=="number"?(el.value===""?null:+el.value):el.value}
 o.lastChecked=now();
 if(editing)Object.assign(editing,o);else{o.id="i"+Date.now();items.push(o)}
 save();render();$("#meta").textContent+=""});
$("#rows").onclick=e=>{const b=e.target.closest("button");if(!b)return;
 if(b.dataset.e)open(items.find(i=>i.id===b.dataset.e));
 if(b.dataset.d&&confirm("確定刪除此商品？")){items=items.filter(i=>i.id!==b.dataset.d);save();render()}};
$("#exp").onclick=()=>{const blob=new Blob([JSON.stringify({updated:now(),items},null,2)],{type:"application/json"});
 const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="items.json";a.click()};
$("#reset").onclick=()=>{if(confirm("清除本機變更並還原為倉庫資料？")){localStorage.removeItem(KEY);load()}};
load();
