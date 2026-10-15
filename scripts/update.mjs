#!/usr/bin/env node
// 用法: node scripts/update.mjs <id> <price> [stock] [status] [--store 店家] [--url 連結] [--dir data] [--note 文字] [--run 輪次key]
// --store: 更新該商品中指定店家的報價（找不到就新增一筆）；省略時更新第一筆報價。
import fs from 'node:fs';
import path from 'node:path';
const args = process.argv.slice(2), pos = [], opt = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) opt[args[i].slice(2)] = args[++i]; else pos.push(args[i]);
}
const [id, priceArg, stockArg, statusArg] = pos;
const USAGE = '用法: node scripts/update.mjs <id> <price> [stock] [status] [--store 店家] [--url 連結] [--dir data] [--note 文字]\n  新增商品: node scripts/update.mjs <新id> <價格> [庫存] --name 名稱 [--category 分類] --store 店家 --url 連結 [--pick unique --reason 理由]';
if (!id || priceArg === undefined || isNaN(Number(priceArg))) { console.error(USAGE); process.exit(1); }
const dir = opt.dir || path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'data');
const fi = path.join(dir, 'items.json'), fl = path.join(dir, 'log.json');
const data = JSON.parse(fs.readFileSync(fi, 'utf8'));
const log = fs.existsSync(fl) ? JSON.parse(fs.readFileSync(fl, 'utf8')) : { log: [] };
// 待刪除：feedback.json 中 vote 為 dislike 的商品不更新（等使用者確認後由每日追蹤從 items.json 刪除）
try {
  const fb = JSON.parse(fs.readFileSync(path.join(dir, 'feedback.json'), 'utf8'));
  if (Array.isArray(fb) && fb.some(r => r && r.id === id && r.vote === 'dislike')) { console.log('略過：' + id + ' 在待刪除（feedback 不喜歡），不更新'); process.exit(0); }
} catch (e) { /* 沒有 feedback.json 就照常 */ }
let it = data.items.find(x => x.id === id);
const p = n => String(n).padStart(2, '0'), d = new Date();
const date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, ts = `${date} ${p(d.getHours())}:${p(d.getMinutes())}`;
if (!it && !opt.name) { console.error('找不到商品 id: ' + id + '（新增商品需 --name）'); process.exit(1); }
if (opt.pick && opt.pick !== 'unique') { console.error('--pick 目前只支援 unique'); process.exit(1); }
if (opt.pick === 'unique' && !opt.reason && !(it && it.reason)) { console.error('--pick unique 需要 --reason 理由'); process.exit(1); }
if (!it) {
  const pr = Number(priceArg), st = opt.store || '';
  it = { id, name: opt.name, category: opt.category || '其他', store: st, url: opt.url || '', baseline: pr, current: pr, stock: stockArg || '有貨', status: '無變化', purchased: false, note: opt.note || '', lastChecked: ts, history: [{ date, price: pr }], lowest: pr, target: null,
    offers: [{ store: st, url: opt.url || '', price: pr, stock: stockArg || '有貨', lastChecked: ts, note: '', history: [{ date, price: pr }] }] };
  data.items.push(it);
  log.log.unshift({ date: ts, id, name: it.name, type: '新增', text: `新增追蹤 NT$${pr}` + (opt.pick ? '（獨特精選）' : '') });
}
if (opt.pick) it.pick = opt.pick;
if (opt.reason) it.reason = opt.reason;
const price = Number(priceArg);
// 舊資料沒有 offers 時，由舊欄位建立
if (!Array.isArray(it.offers) || !it.offers.length)
  it.offers = [{ store: it.store, url: it.url || '', price: it.current, stock: it.stock, lastChecked: it.lastChecked, note: '', history: (it.history || []).map(h => ({ ...h })) }];
const cheapest = () => {
  const ok = it.offers.filter(o => o.price > 0);
  const ins = ok.filter(o => o.stock !== '缺貨');
  const pool = ins.length ? ins : ok;
  return pool.reduce((a, o) => (!a || o.price < a.price ? o : a), null);
};
const before = cheapest();
const old = it.current, oldStock = it.stock, oldStatus = it.status, oldStore = it.store;
let o, created = false;
if (opt.store) { o = it.offers.find(x => x.store === opt.store); if (!o) { o = { store: opt.store, url: '', price: 0, stock: '有貨', lastChecked: ts, note: '', history: [] }; it.offers.push(o); created = true; } }
else o = it.offers[0];
const oldOffer = o.price;
o.history = o.history || [];
const put = (h, v) => { const k = h.findIndex(x => x.date === date); if (k >= 0) h[k].price = v; else h.push({ date, price: v }); };  // 每日一點，後寫覆蓋
put(o.history, price);
o.price = price; if (stockArg) o.stock = stockArg; if (opt.url) o.url = opt.url; if (opt.note) o.note = opt.note;
o.lastChecked = ts;
// 重新計算最便宜報價與衍生欄位
const c = cheapest();
it.current = c.price; it.store = c.store; it.url = c.url || ''; it.stock = c.stock;
it.history = it.history && it.history.length ? it.history : [{ date, price: it.baseline }];
put(it.history, it.current);
// 狀態只對「本輪」有效：與上一輪的價格/庫存比較（同一輪多次呼叫共用同一個上一輪快照）
const runKey = opt.run || `${date} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
if (it.runKey !== runKey) { it.prevCurrent = old; it.prevStock = oldStock; it.runKey = runKey; }
const pc = it.prevCurrent, ps = it.prevStock;
it.status = statusArg || (it.pick === 'unique' ? '無變化' : (pc != null && it.current < pc) ? '降價' : (ps === '缺貨' && it.stock !== '缺貨') ? '補貨' : it.stock === '缺貨' ? '缺貨' : '無變化');
it.lowest = Math.min(it.lowest || Infinity, it.current, it.baseline || Infinity);
it.lastChecked = ts; data.updated = ts;
if (opt.note && !opt.store) it.note = opt.note;
const msgs = [];
if (created) msgs.push(`新增報價 ${o.store} NT$${price}`);
else if (price !== oldOffer) msgs.push(`${o.store} 報價 NT$${oldOffer} → NT$${price}`);
if (it.current !== old) msgs.push(`最低價 NT$${old} → NT$${it.current}（${it.store}）`);
else if (it.store !== oldStore) msgs.push(`最低價店家 ${oldStore} → ${it.store}`);
if (it.stock !== oldStock) msgs.push(`庫存 ${oldStock} → ${it.stock}`);
if (it.status !== oldStatus) msgs.push(`狀態 ${oldStatus} → ${it.status}`);
if (it.target != null && it.current <= it.target && it.current !== old) msgs.push('已達目標價');
if (msgs.length) log.log.unshift({ date: ts, id: it.id, name: it.name, type: it.current !== old ? '價格' : '狀態', text: msgs.join('；') });
fs.writeFileSync(fi, JSON.stringify(data, null, 1) + '\n');
fs.writeFileSync(fl, JSON.stringify(log, null, 1) + '\n');
console.log(msgs.length ? msgs.join('；') : '無變化，僅更新檢查時間');
