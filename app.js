(function(){
'use strict';
var KEY='pd-state-v2',FKEY='pd-fb-v1',CATS=['服飾','重訓器材','補給品','其他'];
var S={items:[],log:[],updated:'',local:false},FB={repo:{},local:{}},tab='watch',$=function(i){return document.getElementById(i)};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function money(n){return n==null||n===''?'-':'NT$'+Number(n).toLocaleString('en-US')}
function today(){var d=new Date(),p=function(n){return ('0'+n).slice(-2)};return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())}
function now(){var d=new Date(),p=function(n){return ('0'+n).slice(-2)};return today()+' '+p(d.getHours())+':'+p(d.getMinutes())}
function derive(i){
 var ok=i.offers.filter(function(o){return o.price>0&&!o.used}),ins=ok.filter(function(o){return o.stock!=='缺貨'}),pool=ins.length?ins:ok;
 var c=pool.reduce(function(a,o){return !a||o.price<a.price?o:a},null);i.cheapest=c;
 if(c){i.current=c.price;i.store=c.store;i.url=c.url||'';i.stock=c.stock||'有貨'}}
function norm(i){
 i.baseline=Number(i.baseline)||0;i.current=Number(i.current)||0;
 if(!Array.isArray(i.offers)||!i.offers.length)i.offers=[{store:i.store||'',url:i.url||'',price:i.current,stock:i.stock||'有貨',lastChecked:i.lastChecked||'',note:'',history:[]}];
 i.offers.forEach(function(o){o.price=Number(o.price)||0;o.stock=o.stock||'有貨';o.url=o.url||'';if(!Array.isArray(o.history))o.history=[]});
 [i.history].concat(i.offers.map(function(o){return o.history})).forEach(function(h){if(!Array.isArray(h))return;var m={};h.forEach(function(x){m[x.date]=x});var k=Object.keys(m).sort();h.length=0;k.forEach(function(d){h.push(m[d])})});
 derive(i);
 if(!Array.isArray(i.history)||!i.history.length)i.history=[{date:(i.lastChecked||today()).slice(0,10),price:i.baseline}];
 var prices=i.history.map(function(h){return h.price}).concat([i.current,i.baseline]).filter(function(p){return p>0});
 i.lowest=Math.min.apply(null,prices.concat(i.lowest>0?[i.lowest]:[]));
 i.target=i.target===''||i.target==null?null:Number(i.target);
 i.stock=i.stock||'有貨';i.status=i.status||'無變化';i.category=i.category||'其他';return i}
function uniq(i){return i.pick==='unique'}
function vote(id){var l=FB.local[id];if(l)return l.vote==='none'?'':l.vote;var r=FB.repo[id];return r?r.vote:''}
function fbSave(){try{localStorage.setItem(FKEY,JSON.stringify(FB.local))}catch(e){}}
function rec(i,v){return {id:i.id,vote:v,name:i.name,category:i.category,store:i.store,price:i.current,date:today()}}
function setVote(id,v){var i=S.items.filter(function(x){return x.id===id})[0];if(!i)return;
 var cur=vote(id);FB.local[id]=rec(i,cur===v?'none':v);fbSave();render()}
function merged(){var m={};Object.keys(FB.repo).forEach(function(k){m[k]=FB.repo[k]});
 Object.keys(FB.local).forEach(function(k){if(FB.local[k].vote==='none')delete m[k];else m[k]=FB.local[k]});
 return Object.keys(m).map(function(k){return m[k]})}
function pending(){return Object.keys(FB.local).map(function(k){return FB.local[k]}).filter(function(r){var p=FB.repo[r.id];return r.vote==='none'?!!p:!p||p.vote!==r.vote})}
function toMap(a){var m={};(Array.isArray(a)?a:[]).forEach(function(r){if(r&&r.id&&(r.vote==='like'||r.vote==='dislike'))m[r.id]=r});return m}
function issueUrl(){var p=pending().map(function(r){return {id:r.id,vote:r.vote==='none'?'clear':r.vote,name:r.name,category:r.category,store:r.store,price:r.price,date:r.date}});
 return 'https://github.com/ChaN0iR/price-dashboard/issues/new?title='+encodeURIComponent('feedback')+'&body='+encodeURIComponent(JSON.stringify(p))}
function load(){
 return Promise.all([fetch('data/items.json?'+Date.now()).then(function(r){return r.json()}),
  fetch('data/log.json?'+Date.now()).then(function(r){return r.json()}).catch(function(){return {log:[]}}),
  fetch('data/feedback.json?'+Date.now()).then(function(r){return r.json()}).catch(function(){return []})]).then(function(a){
  FB.repo=toMap(a[2]);try{FB.local=JSON.parse(localStorage.getItem(FKEY))||{}}catch(e){FB.local={}}
  S.items=a[0].items;S.updated=a[0].updated;S.log=a[1].log||[];S.local=false;
  var l=null;try{l=JSON.parse(localStorage.getItem(KEY))}catch(e){}
  if(l&&l.items){S.items=l.items;S.log=l.log||S.log;S.local=true}
  S.items.forEach(norm);var h0=hashTab();if(h0){goTab(h0,h0==='drops')}else render()}).catch(function(e){$('notice').textContent='載入失敗：'+e.message})}
function save(){S.local=true;try{localStorage.setItem(KEY,JSON.stringify({items:S.items,log:S.log}))}catch(e){}}
function pct(i){return i.baseline?(i.current-i.baseline)/i.baseline*100:0}
function dis(i){return vote(i.id)==='dislike'}
function liked(i){return vote(i.id)==='like'}
function isDrop(i){return !uniq(i)&&!dis(i)&&i.status==='降價'}
function hit(i){return !uniq(i)&&i.target!=null&&i.current>0&&i.current<=i.target&&i.stock!=='缺貨'}
function score(i){if(uniq(i))return 0;if(i.purchased)return 1e6;var s=pct(i);if(hit(i))s-=1000;if(i.status==='降價'||i.status==='補貨')s-=500;if(i.stock==='缺貨')s+=200;return s}
function spark(h){
 if(h.length<2)return '<svg class="spark" viewBox="0 0 100 32" preserveAspectRatio="none"><line x1="0" y1="16" x2="100" y2="16" stroke="currentColor" stroke-opacity=".3" stroke-dasharray="3"/></svg>';
 var p=h.map(function(x){return x.price}),mn=Math.min.apply(null,p),mx=Math.max.apply(null,p),r=mx-mn||1;
 var pts=p.map(function(v,k){return (k/(p.length-1)*100).toFixed(1)+','+(28-(v-mn)/r*24).toFixed(1)}).join(' ');
 var last=pts.split(' ').pop().split(',');
 return '<svg class="spark" viewBox="0 0 100 32" preserveAspectRatio="none"><polyline points="'+pts+'" vector-effect="non-scaling-stroke"/><circle cx="'+last[0]+'" cy="'+last[1]+'" r="2"/></svg>'}
function offerList(i){
 var nw=i.offers.filter(function(o){return !o.used}),us=i.offers.filter(function(o){return o.used});
 var usH=us.length?'<ul class="offers used"><li class="usedh"><span>二手</span></li>'+us.map(function(o){var u=/^https?:/.test(o.url||'');return '<li><span>'+esc(o.store)+(o.note?'<br><small class="muted">'+esc(o.note)+'</small>':'')+'</span><span>'+(o.price>0?money(o.price):'-')+'</span>'+(u?'<a href="'+esc(o.url)+'" target="_blank" rel="noopener" data-link>前往</a>':'<span class="muted">無連結</span>')+'</li>'}).join('')+'</ul>':'';
 if(nw.length<2&&!(nw[0]&&/^https?:/.test(nw[0].url)))return usH;
 return '<ul class="offers">'+nw.map(function(o){var u=/^https?:/.test(o.url||'');
  return '<li class="'+(o===i.cheapest?'best':'')+(o.stock==='缺貨'?' oos':'')+'"><span>'+esc(o.store)+'</span><span>'+(o.price>0?money(o.price):'-')+' <small>'+esc(o.stock)+'</small></span>'
  +(u?'<a href="'+esc(o.url)+'" target="_blank" rel="noopener" data-link>前往</a>':'<span class="muted">無連結</span>')+'</li>'}).join('')+'</ul>'+usH}
function fbBtns(i){var v=vote(i.id);
 return '<div class="fb"><button type="button" data-v="like" data-id="'+esc(i.id)+'" class="'+(v==='like'?'on':'')+'" aria-pressed="'+(v==='like')+'">喜歡</button><button type="button" data-v="dislike" data-id="'+esc(i.id)+'" class="'+(v==='dislike'?'on':'')+'" aria-pressed="'+(v==='dislike')+'">不喜歡</button></div>'}
function card(i){
 var u=uniq(i),c=u?0:pct(i),cs=c<0?'down':c>0?'up':'';
 var d=dis(i),dr=isDrop(i);
 return '<div class="item'+(hit(i)?' hit':'')+(i.purchased?' done':'')+(dr?' drop':'')+(d?' trash':'')+'" data-id="'+esc(i.id)+'">'
 +'<div class="top"><span class="name">'+esc(i.name)+'</span>'+(u?'<span class="tag">獨特精選</span>':'<span class="tag'+(dr?' drop':i.status==='補貨'?' g':'')+'">'+esc(i.status)+'</span>')+'</div>'
 +'<div class="muted"><span class="badge">'+esc(i.store)+'</span> '+(i.offers.length>1?'共 '+i.offers.length+' 家 / ':'')+esc(i.category)+(i.purchased?' / 已購買':'')+'</div>'
 +'<div><span class="price">'+money(i.current)+'</span> <span class="'+cs+'">'+(c?(c>0?'+':'')+c.toFixed(1)+'%':'')+'</span></div>'
 +(u&&i.reason?'<div class="reason">'+esc(i.reason)+'</div>':'')
 +(u?'':spark(i.history))
 +offerList(i)
 +(u?'':'<div class="muted">基準 '+money(i.baseline)+' / 最低 '+money(i.lowest)+(i.target!=null?' / 目標 '+money(i.target):'')+'</div>')
 +'<div class="muted">'+esc(i.stock)+(hit(i)?' / 已達目標價':'')+'</div>'+(d?trashBtns(i):fbBtns(i))+'</div>'}
function trashBtns(i){return '<div class="fb"><button type="button" data-r="restore" data-id="'+esc(i.id)+'">還原</button><button type="button" data-r="purge" data-id="'+esc(i.id)+'" class="danger">永久刪除</button></div>'}
function sorted(a){
 var m=$('sort').value,b=a.slice();
 if(tab==='drops')return b.sort(function(x,y){return pct(x)-pct(y)});
 if(tab==='unique'){var r=function(i){return vote(i.id)?1:0};return b.sort(function(x,y){return r(x)-r(y)})}
 b.sort(function(x,y){if(m==='price')return x.current-y.current;if(m==='drop')return pct(x)-pct(y);
  if(m==='checked')return String(y.lastChecked||'').localeCompare(String(x.lastChecked||''));return score(x)-score(y)});return b}
function render(){
 var all=S.items,trash=all.filter(dis),it=all.filter(function(i){return !dis(i)}),act=it.filter(function(i){return !i.purchased&&!uniq(i)});
 var dl=it.filter(isDrop);
 var sav=act.reduce(function(s,i){return s+Math.max(0,i.baseline-i.current)},0);
 $('summary').innerHTML=[['追蹤商品',it.length],['降價中',dl.length],['已達目標',it.filter(hit).length],['相較基準可省',money(sav)]]
  .map(function(x){return x[0]==='降價中'?'<button type="button" class="card tile'+(x[1]?' drop':'')+'" data-go="drops"><span class="muted">降價中</span><b>'+x[1]+'</b></button>':'<div class="card"><span class="muted">'+x[0]+'</span><b>'+x[1]+'</b></div>'}).join('');
 $('updated').textContent='更新 '+(S.updated||'-');
 $('notice').textContent=S.local?'目前顯示本機修改版本（尚未提交到倉庫），可匯出，或按重設還原。':'';
 var tabs=[['watch','關注'],['drops','降價中'+(dl.length?'（'+dl.length+'）':'')],['unique','獨特精選'],['all','全部']].concat(CATS.map(function(c){return [c,c]})).concat([['trash','待刪除'+(trash.length?'（'+trash.length+'）':'')]]);
 $('tabs').innerHTML=tabs.map(function(t){return '<button data-t="'+t[0]+'" class="'+(tab===t[0]?'on':'')+(t[0]==='drops'?' dropt':'')+'">'+t[1]+'</button>'}).join('');
 var q=$('q').value.trim().toLowerCase(),st=$('status').value;
 var base=tab==='trash'?trash:it;
 var f=base.filter(function(i){
  if(tab==='watch'&&!liked(i))return false;
  if(tab==='drops'&&!isDrop(i))return false;
  if(tab==='unique'&&!uniq(i))return false;
  if(CATS.indexOf(tab)>=0&&i.category!==tab)return false;
  if(st&&i.status!==st&&!(st==='低庫存'&&i.stock==='低庫存')&&!(st==='缺貨'&&i.stock==='缺貨'))return false;
  if(q&&(i.name+' '+i.offers.map(function(o){return o.store}).join(' ')).toLowerCase().indexOf(q)<0)return false;return true});
 var head='';
 if(tab==='trash')head='<div class="row"><span class="muted">不喜歡的商品會集中在這裡，不計入統計與其他分頁；每日追蹤不再更新。</span>'+(trash.length?'<button type="button" data-r="purgeall" class="danger">全部清空待刪除</button>':'')+'</div>';
 if(tab==='drops')head='<h2 class="drophead">降價中（'+f.length+'）</h2>';
 $('watch').innerHTML=(tab==='all'&&!q&&!st&&dl.length)?'<h2 class="drophead">降價中</h2><div class="grid">'+sorted(dl).map(card).join('')+'</div><h2 style="margin-top:14px">全部商品</h2>':head;
 var empty={watch:'還沒有按「喜歡」的商品',drops:'目前沒有降價的商品',trash:'待刪除是空的'}[tab]||'沒有符合的商品';
 $('list').innerHTML=f.length?sorted(f).map(card).join(''):'<div class="muted">'+empty+'</div>';
var ps=pending(),fl=$('fblink');fl.hidden=!ps.length;fl.href=ps.length?issueUrl():'#';fl.textContent='送出回饋（'+ps.length+'）';
 $('log').innerHTML=S.log.slice(0,30).map(function(l){return '<li><span class="muted">'+esc(l.date)+'</span><br>'+esc(l.name?l.name+'：':'')+esc(l.text)+'</li>'}).join('')||'<li class="muted">尚無變動</li>'}
function logAdd(i,type,text){S.log.unshift({date:now(),id:i?i.id:null,name:i?i.name:'',type:type,text:text})}
function drawer(id){
 var i=S.items.filter(function(x){return x.id===id})[0];if(!i)return;
 var rows=i.history.slice().reverse().map(function(h){return '<tr><td>'+esc(h.date)+'</td><td>'+money(h.price)+'</td></tr>'}).join('');
 $('panel').innerHTML='<h2>'+esc(i.name)+'</h2><div class="muted">'+esc(i.store)+' / '+esc(i.category)+'</div>'
 +'<p><span class="price">'+money(i.current)+'</span> '+esc(i.stock)+' / '+esc(i.status)+'</p>'
 +spark(i.history)+'<p class="muted">基準 '+money(i.baseline)+'；歷史最低 '+money(i.lowest)+'；目標 '+money(i.target)+(hit(i)?'（已達目標）':'')+'<br>最後檢查 '+esc(i.lastChecked||'-')+'</p>'
 +(uniq(i)&&i.reason?'<p class="reason">'+esc(i.reason)+'</p>':'')+(i.note?'<p>'+esc(i.note)+'</p>':'')+fbBtns(i)
 +'<h2>各店報價</h2>'+i.offers.map(function(o){var u=/^https?:/.test(o.url||'');
  return '<div class="offer'+(o===i.cheapest?' best':'')+'"><div class="top"><b>'+esc(o.store)+(o.used?' <span class="tag">二手</span>':'')+(o===i.cheapest?' <span class="tag g">最低</span>':'')+'</b><span>'+(o.price>0?money(o.price):'-')+' / '+esc(o.stock)+'</span></div>'
  +'<div class="muted">檢查 '+esc(o.lastChecked||'-')+(o.note?' / '+esc(o.note):'')+'</div>'+(o.history.length?spark(o.history)+'<div class="muted">'+o.history.slice().reverse().slice(0,8).map(function(h){return esc(h.date)+' '+money(h.price)}).join('；')+'</div>':'')
  +(u?'<a href="'+esc(o.url)+'" target="_blank" rel="noopener"><button type="button">前往此店</button></a>':'<span class="muted">無連結</span>')+'</div>'}).join('')
 +'<h2 style="margin-top:12px">最低價歷史</h2><table><tr><th>日期</th><th>價格</th></tr>'+rows+'</table>'
 +'<div class="row">'+'<button data-a="edit">編輯</button><button data-a="del">刪除</button><button data-a="close">關閉</button></div>';
 $('panel').setAttribute('data-id',id);$('drawer').hidden=false}
var editing=null;
function openForm(i){
 editing=i||null;var f=$('f');$('ftitle').textContent=i?'編輯商品':'新增商品';
 ['name','category','baseline','target','status','note'].forEach(function(k){f.elements[k].value=i&&i[k]!=null?i[k]:(k==='category'?(CATS.indexOf(tab)>=0?tab:'其他'):k==='stock'?'有貨':k==='status'?'無變化':'')});
 f.elements.purchased.checked=!!(i&&i.purchased);
 drafts=(i?i.offers:[{store:'',url:'',price:'',stock:'有貨'}]).map(function(o){return {store:o.store,url:o.url,price:o.price,stock:o.stock,lastChecked:o.lastChecked,note:o.note,used:o.used,history:o.history}});
 drawOffers();$('form').showModal()}
var drafts=[];
function drawOffers(){
 $('offered').innerHTML=drafts.map(function(o,k){return '<div class="oe" data-k="'+k+'"><input data-f="store" placeholder="店家" value="'+esc(o.store)+'"><input data-f="price" type="number" min="0" placeholder="價格" value="'+esc(o.price)+'">'
  +'<select data-f="stock">'+['有貨','低庫存','缺貨'].map(function(s){return '<option'+(o.stock===s?' selected':'')+'>'+s+'</option>'}).join('')+'</select>'
  +'<button type="button" data-rm="'+k+'">移除</button><input data-f="url" type="url" placeholder="連結 https://" value="'+esc(o.url)+'" class="w"></div>'}).join('')}
document.addEventListener('input',function(e){var r=e.target.closest('.oe');if(r&&e.target.getAttribute('data-f'))drafts[+r.getAttribute('data-k')][e.target.getAttribute('data-f')]=e.target.value});
function goTab(name,scroll){tab=name;$('q').value='';$('status').value='';
 try{if(location.hash!=='#'+name)history.replaceState(null,'','#'+name)}catch(e){}
 render();
 if(scroll)requestAnimationFrame(function(){var el=$('watch');if(!el||!el.firstChild)el=$('list');if(!el||!el.firstChild)el=$('tabs');el.scrollIntoView({behavior:'smooth',block:'start'})})}
function hashTab(){var h=(location.hash||'').replace('#','');var ok=['watch','drops','unique','all','trash'].concat(CATS);if(h&&ok.indexOf(h)>=0)return h;return null}
window.addEventListener('hashchange',function(){var h=hashTab();if(h&&h!==tab)goTab(h,h==='drops')});
document.addEventListener('click',function(e){var rm=e.target.getAttribute&&e.target.getAttribute('data-rm');if(rm!=null){drafts.splice(+rm,1);drawOffers()}});
$('addoffer').onclick=function(){drafts.push({store:'',url:'',price:'',stock:'有貨'});drawOffers()};
function submitForm(){
 var f=$('f');if(!f.reportValidity())return;var v=function(k){return f.elements[k].value};
 var o=editing,t=today(),offs=drafts.filter(function(x){return String(x.store).trim()||Number(x.price)>0});
 if(!offs.length){alert('至少需要一筆報價');return}
 offs=offs.map(function(x){var prev=o?o.offers.filter(function(p){return p.store===x.store})[0]:null,pr=Number(x.price)||0,h=(x.history||[]).slice();
  if(pr>0&&(!h.length||h[h.length-1].price!==pr))h.push({date:t,price:pr});
  return {store:String(x.store).trim(),url:x.url||'',price:pr,stock:x.stock||'有貨',lastChecked:prev&&prev.price===pr&&prev.stock===x.stock?x.lastChecked:now(),note:x.note||'',history:h}});
 var n=o||{id:'u'+Date.now().toString(36),history:[]};
 var old=o?o.current:null;n.offers=offs;derive(n);var cur=n.current;
 if(!o)n.history=[{date:t,price:cur}];
 n.name=v('name').trim();n.category=v('category');n.baseline=Number(v('baseline'));
 n.target=v('target')===''?null:Number(v('target'));n.status=v('status');n.note=v('note');n.purchased=f.elements.purchased.checked;n.lastChecked=now();
 if(!o){S.items.push(n);logAdd(n,'新增','新增追蹤，目前 '+money(cur))}
 else if(old!==cur){n.history.push({date:today(),price:cur});logAdd(n,'價格',money(old)+' → '+money(cur))}
 else logAdd(n,'編輯','更新商品資料');
 norm(n);S.updated=now();save();$('form').close();$('drawer').hidden=true;render()}
function download(name,obj){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(obj,null,1)],{type:'application/json'}));a.download=name;a.click();setTimeout(function(){URL.revokeObjectURL(a.href)},1000)}
document.addEventListener('click',function(e){
 var v=e.target.closest('[data-v]');if(v){e.stopPropagation();setVote(v.getAttribute('data-id'),v.getAttribute('data-v'));if(!$('drawer').hidden)drawer(v.getAttribute('data-id'));return}
 var go=e.target.closest('[data-go]');if(go){e.preventDefault();goTab(go.getAttribute('data-go'),true);return}
 var rb=e.target.closest('[data-r]');if(rb){e.stopPropagation();var k=rb.getAttribute('data-r'),rid=rb.getAttribute('data-id');
  if(k==='restore')setVote(rid,'dislike');
  else if(k==='purge'){var p=S.items.filter(function(x){return x.id===rid})[0];if(p&&confirm('永久刪除「'+p.name+'」？此動作無法復原。')){S.items=S.items.filter(function(x){return x!==p});logAdd(p,'刪除','已永久刪除（待刪除）');save();render()}}
  else if(k==='purgeall'){var ds=S.items.filter(dis);if(ds.length&&confirm('永久刪除待刪除中的 '+ds.length+' 項商品？此動作無法復原。')){ds.forEach(function(p){logAdd(p,'刪除','已永久刪除（待刪除）')});S.items=S.items.filter(function(x){return !dis(x)});save();render()}}
  return}
 var t=e.target.closest('[data-t]');if(t){goTab(t.getAttribute('data-t'),false);return}
 var a=e.target.closest('[data-a]');
 if(a){var id=$('panel').getAttribute('data-id'),it=S.items.filter(function(x){return x.id===id})[0],k=a.getAttribute('data-a');
  if(k==='close')$('drawer').hidden=true;
  if(k==='edit')openForm(it);
  if(k==='del'&&confirm('刪除「'+it.name+'」？')){S.items=S.items.filter(function(x){return x!==it});logAdd(it,'刪除','已刪除');save();$('drawer').hidden=true;render()}
  return}
 if(e.target===$('drawer')){$('drawer').hidden=true;return}
 if(e.target.closest('[data-link]'))return;
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
$('fbexport').onclick=function(){download('feedback.json',merged())};
$('fbimport').onclick=function(){$('ffile').click()};
$('ffile').onchange=function(){var r=new FileReader(),fl=this.files[0];if(!fl)return;
 r.onload=function(){try{var d=JSON.parse(r.result);if(!Array.isArray(d))throw new Error('需為陣列');
  var m=toMap(d);Object.keys(m).forEach(function(k){if(!FB.local[k])FB.repo[k]=m[k]});render()}catch(x){alert('匯入失敗：'+x.message)}};r.readAsText(fl);this.value=''};
$('reset').onclick=function(){if(confirm('清除本機修改並還原為倉庫資料？')){localStorage.removeItem(KEY);load()}};
load();
})();
