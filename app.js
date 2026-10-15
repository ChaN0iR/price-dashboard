(function(){
'use strict';
var KEY='pd-state-v2',CATS=['服飾','重訓器材','補給品','其他'];
var S={items:[],log:[],updated:'',local:false},tab='watch',$=function(i){return document.getElementById(i)};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function money(n){return n==null||n===''?'-':'NT$'+Number(n).toLocaleString('en-US')}
function today(){var d=new Date(),p=function(n){return ('0'+n).slice(-2)};return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())}
function now(){var d=new Date(),p=function(n){return ('0'+n).slice(-2)};return today()+' '+p(d.getHours())+':'+p(d.getMinutes())}
function norm(i){
 i.baseline=Number(i.baseline)||0;i.current=Number(i.current)||0;
 if(!Array.isArray(i.history)||!i.history.length)i.history=[{date:(i.lastChecked||today()).slice(0,10),price:i.baseline}];
 var prices=i.history.map(function(h){return h.price}).concat([i.current,i.baseline]).filter(function(p){return p>0});
 i.lowest=Math.min.apply(null,prices.concat(i.lowest>0?[i.lowest]:[]));
 i.target=i.target===''||i.target==null?null:Number(i.target);
 i.stock=i.stock||'有貨';i.status=i.status||'無變化';i.category=i.category||'其他';return i}
function load(){
 return Promise.all([fetch('data/items.json?'+Date.now()).then(function(r){return r.json()}),
  fetch('data/log.json?'+Date.now()).then(function(r){return r.json()}).catch(function(){return {log:[]}})]).then(function(a){
  S.items=a[0].items;S.updated=a[0].updated;S.log=a[1].log||[];S.local=false;
  var l=null;try{l=JSON.parse(localStorage.getItem(KEY))}catch(e){}
  if(l&&l.items){S.items=l.items;S.log=l.log||S.log;S.local=true}
  S.items.forEach(norm);render()}).catch(function(e){$('notice').textContent='載入失敗：'+e.message})}
function save(){S.local=true;try{localStorage.setItem(KEY,JSON.stringify({items:S.items,log:S.log}))}catch(e){}}
function pct(i){return i.baseline?(i.current-i.baseline)/i.baseline*100:0}
function isWatch(i){return !i.purchased&&(i.status==='降價'||i.status==='補貨'||i.status==='低庫存')}
function hit(i){return i.target!=null&&i.current>0&&i.current<=i.target&&i.stock!=='缺貨'}
function score(i){if(i.purchased)return 1e6;var s=pct(i);if(hit(i))s-=1000;if(i.status==='降價'||i.status==='補貨')s-=500;if(i.stock==='缺貨')s+=200;return s}
function spark(h){
 if(h.length<2)return '<svg class="spark" viewBox="0 0 100 32" preserveAspectRatio="none"><line x1="0" y1="16" x2="100" y2="16" stroke="currentColor" stroke-opacity=".3" stroke-dasharray="3"/></svg>';
 var p=h.map(function(x){return x.price}),mn=Math.min.apply(null,p),mx=Math.max.apply(null,p),r=mx-mn||1;
 var pts=p.map(function(v,k){return (k/(p.length-1)*100).toFixed(1)+','+(28-(v-mn)/r*24).toFixed(1)}).join(' ');
 var last=pts.split(' ').pop().split(',');
 return '<svg class="spark" viewBox="0 0 100 32" preserveAspectRatio="none"><polyline points="'+pts+'" vector-effect="non-scaling-stroke"/><circle cx="'+last[0]+'" cy="'+last[1]+'" r="2"/></svg>'}
function card(i){
 var c=pct(i),cs=c<0?'down':c>0?'up':'';
 return '<div class="item'+(hit(i)?' hit':'')+(i.purchased?' done':'')+'" data-id="'+esc(i.id)+'">'
 +'<div class="top"><span class="name">'+esc(i.name)+'</span><span class="tag'+(i.status==='降價'||i.status==='補貨'?' g':'')+'">'+esc(i.status)+'</span></div>'
 +'<div class="muted">'+esc(i.store)+' / '+esc(i.category)+(i.purchased?' / 已購買':'')+'</div>'
 +'<div><span class="price">'+money(i.current)+'</span> <span class="'+cs+'">'+(c?(c>0?'+':'')+c.toFixed(1)+'%':'')+'</span></div>'
 +spark(i.history)
 +'<div class="muted">基準 '+money(i.baseline)+' / 最低 '+money(i.lowest)+(i.target!=null?' / 目標 '+money(i.target):'')+'</div>'
 +'<div class="muted">'+esc(i.stock)+(hit(i)?' / 已達目標價':'')+'</div></div>'}
function sorted(a){
 var m=$('sort').value,b=a.slice();
 b.sort(function(x,y){if(m==='price')return x.current-y.current;if(m==='drop')return pct(x)-pct(y);
  if(m==='checked')return String(y.lastChecked||'').localeCompare(String(x.lastChecked||''));return score(x)-score(y)});return b}
function render(){
 var it=S.items,act=it.filter(function(i){return !i.purchased});
 var drops=it.filter(function(i){return i.status==='降價'}).length;
 var sav=act.reduce(function(s,i){return s+Math.max(0,i.baseline-i.current)},0);
 $('summary').innerHTML=[['追蹤商品',it.length],['降價中',drops],['已達目標',it.filter(hit).length],['相較基準可省',money(sav)]]
  .map(function(x){return '<div class="card"><span class="muted">'+x[0]+'</span><b>'+x[1]+'</b></div>'}).join('');
 $('updated').textContent='更新 '+(S.updated||'-');
 $('notice').textContent=S.local?'目前顯示本機修改版本（尚未提交到倉庫），可匯出，或按重設還原。':'';
 var tabs=[['watch','關注'],['all','全部']].concat(CATS.map(function(c){return [c,c]}));
 $('tabs').innerHTML=tabs.map(function(t){return '<button data-t="'+t[0]+'" class="'+(tab===t[0]?'on':'')+'">'+t[1]+'</button>'}).join('');
 var q=$('q').value.trim().toLowerCase(),st=$('status').value;
 var f=it.filter(function(i){
  if(tab==='watch'&&!(isWatch(i)||hit(i)))return false;
  if(tab!=='watch'&&tab!=='all'&&i.category!==tab)return false;
  if(st&&i.status!==st&&!(st==='低庫存'&&i.stock==='低庫存')&&!(st==='缺貨'&&i.stock==='缺貨'))return false;
  if(q&&(i.name+' '+i.store).toLowerCase().indexOf(q)<0)return false;return true});
 var w=it.filter(function(i){return isWatch(i)||hit(i)});
 $('watch').innerHTML=(tab==='all'&&!q&&!st&&w.length)?'<h2>關注清單（降價 / 補貨）</h2><div class="grid">'+sorted(w).map(card).join('')+'</div><h2 style="margin-top:14px">全部商品</h2>':'';
 $('list').innerHTML=f.length?sorted(f).map(card).join(''):'<div class="muted">'+(tab==='watch'?'目前沒有降價或補貨的商品':'沒有符合的商品')+'</div>';
 $('log').innerHTML=S.log.slice(0,30).map(function(l){return '<li><span class="muted">'+esc(l.date)+'</span><br>'+esc(l.name?l.name+'：':'')+esc(l.text)+'</li>'}).join('')||'<li class="muted">尚無變動</li>'}
function logAdd(i,type,text){S.log.unshift({date:now(),id:i?i.id:null,name:i?i.name:'',type:type,text:text})}
function drawer(id){
 var i=S.items.filter(function(x){return x.id===id})[0];if(!i)return;
 var rows=i.history.slice().reverse().map(function(h){return '<tr><td>'+esc(h.date)+'</td><td>'+money(h.price)+'</td></tr>'}).join('');
 $('panel').innerHTML='<h2>'+esc(i.name)+'</h2><div class="muted">'+esc(i.store)+' / '+esc(i.category)+'</div>'
 +'<p><span class="price">'+money(i.current)+'</span> '+esc(i.stock)+' / '+esc(i.status)+'</p>'
 +spark(i.history)+'<p class="muted">基準 '+money(i.baseline)+'；歷史最低 '+money(i.lowest)+'；目標 '+money(i.target)+(hit(i)?'（已達目標）':'')+'<br>最後檢查 '+esc(i.lastChecked||'-')+'</p>'
 +(i.note?'<p>'+esc(i.note)+'</p>':'')
 +'<table><tr><th>日期</th><th>價格</th></tr>'+rows+'</table>'
 +'<div class="row">'+(/^https?:/.test(i.url||'')?'<a href="'+esc(i.url)+'" target="_blank" rel="noopener"><button type="button">前往商品頁</button></a>':'')
 +'<button data-a="edit">編輯</button><button data-a="del">刪除</button><button data-a="close">關閉</button></div>';
 $('panel').setAttribute('data-id',id);$('drawer').hidden=false}
var editing=null;
function openForm(i){
 editing=i||null;var f=$('f');$('ftitle').textContent=i?'編輯商品':'新增商品';
 ['name','category','store','url','baseline','current','target','stock','status','note'].forEach(function(k){f.elements[k].value=i&&i[k]!=null?i[k]:(k==='category'?(CATS.indexOf(tab)>=0?tab:'其他'):k==='stock'?'有貨':k==='status'?'無變化':'')});
 f.elements.purchased.checked=!!(i&&i.purchased);$('form').showModal()}
function submitForm(){
 var f=$('f');if(!f.reportValidity())return;var v=function(k){return f.elements[k].value};
 var cur=Number(v('current')),o=editing;
 var n=o||{id:'u'+Date.now().toString(36),history:[{date:today(),price:cur}],lowest:cur};
 var old=o?o.current:null;
 n.name=v('name').trim();n.category=v('category');n.store=v('store');n.url=v('url');n.baseline=Number(v('baseline'));n.current=cur;
 n.target=v('target')===''?null:Number(v('target'));n.stock=v('stock');n.status=v('status');n.note=v('note');n.purchased=f.elements.purchased.checked;n.lastChecked=now();
 if(!o){S.items.push(n);logAdd(n,'新增','新增追蹤，目前 '+money(cur))}
 else if(old!==cur){n.history.push({date:today(),price:cur});logAdd(n,'價格',money(old)+' → '+money(cur))}
 else logAdd(n,'編輯','更新商品資料');
 norm(n);S.updated=now();save();$('form').close();$('drawer').hidden=true;render()}
function download(name,obj){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(obj,null,1)],{type:'application/json'}));a.download=name;a.click();setTimeout(function(){URL.revokeObjectURL(a.href)},1000)}
document.addEventListener('click',function(e){
 var t=e.target.closest('[data-t]');if(t){tab=t.getAttribute('data-t');render();return}
 var a=e.target.closest('[data-a]');
 if(a){var id=$('panel').getAttribute('data-id'),it=S.items.filter(function(x){return x.id===id})[0],k=a.getAttribute('data-a');
  if(k==='close')$('drawer').hidden=true;
  if(k==='edit')openForm(it);
  if(k==='del'&&confirm('刪除「'+it.name+'」？')){S.items=S.items.filter(function(x){return x!==it});logAdd(it,'刪除','已刪除');save();$('drawer').hidden=true;render()}
  return}
 if(e.target===$('drawer')){$('drawer').hidden=true;return}
 var c=e.target.closest('.item');if(c)drawer(c.getAttribute('data-id'))});
['q','status','sort'].forEach(function(i){$(i).addEventListener('input',render)});
$('add').onclick=function(){openForm(null)};
$('save').onclick=function(e){e.preventDefault();submitForm()};
$('cancel').onclick=function(){$('form').close()};
$('export').onclick=function(){download('items.json',{updated:S.updated||now(),items:S.items});download('log.json',{log:S.log})};
$('import').onclick=function(){$('file').click()};
$('file').onchange=function(){var r=new FileReader(),fl=this.files[0];if(!fl)return;
 r.onload=function(){try{var d=JSON.parse(r.result);
  if(d.items&&Array.isArray(d.items)){S.items=d.items.map(norm);S.updated=d.updated||now()}
  else if(Array.isArray(d.log)){S.log=d.log}else throw new Error('格式不符');
  save();render()}catch(x){alert('匯入失敗：'+x.message)}};r.readAsText(fl);this.value=''};
$('reset').onclick=function(){if(confirm('清除本機修改並還原為倉庫資料？')){localStorage.removeItem(KEY);load()}};
load();
})();
