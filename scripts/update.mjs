#!/usr/bin/env node
// 用法: node scripts/update.mjs <id> <price> [stock] [status] [--dir data] [--note 文字]
import fs from 'node:fs';
import path from 'node:path';
const args = process.argv.slice(2), pos = [], opt = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) opt[args[i].slice(2)] = args[++i]; else pos.push(args[i]);
}
const [id, priceArg, stockArg, statusArg] = pos;
if (!id || priceArg === undefined || isNaN(Number(priceArg))) {
  console.error('用法: node scripts/update.mjs <id> <price> [stock] [status] [--dir data] [--note 文字]'); process.exit(1);
}
const dir = opt.dir || path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'data');
const fi = path.join(dir, 'items.json'), fl = path.join(dir, 'log.json');
const data = JSON.parse(fs.readFileSync(fi, 'utf8'));
const log = fs.existsSync(fl) ? JSON.parse(fs.readFileSync(fl, 'utf8')) : { log: [] };
const it = data.items.find(x => x.id === id);
if (!it) { console.error('找不到商品 id: ' + id); process.exit(1); }
const p = n => String(n).padStart(2, '0'), d = new Date();
const date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, ts = `${date} ${p(d.getHours())}:${p(d.getMinutes())}`;
const price = Number(priceArg), old = it.current, oldStock = it.stock, oldStatus = it.status;
it.history = it.history && it.history.length ? it.history : [{ date, price: it.baseline }];
const last = it.history[it.history.length - 1];
if (last.price !== price) it.history.push({ date, price });
it.current = price;
if (stockArg) it.stock = stockArg;
it.status = statusArg || (price < old ? '降價' : price > old ? '無變化' : it.status);
it.lowest = Math.min(it.lowest || Infinity, price, it.baseline || Infinity);
it.lastChecked = ts; data.updated = ts;
if (opt.note) it.note = opt.note;
const msgs = [];
if (price !== old) msgs.push(`價格 NT$${old} → NT$${price}`);
if (it.stock !== oldStock) msgs.push(`庫存 ${oldStock} → ${it.stock}`);
if (it.status !== oldStatus) msgs.push(`狀態 ${oldStatus} → ${it.status}`);
if (it.target != null && price <= it.target && price !== old) msgs.push('已達目標價');
if (msgs.length) log.log.unshift({ date: ts, id: it.id, name: it.name, type: price !== old ? '價格' : '狀態', text: msgs.join('；') });
fs.writeFileSync(fi, JSON.stringify(data, null, 1) + '\n');
fs.writeFileSync(fl, JSON.stringify(log, null, 1) + '\n');
console.log(msgs.length ? msgs.join('；') : '無變化，僅更新檢查時間');
