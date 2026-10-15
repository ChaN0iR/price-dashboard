# 商品追蹤儀表板

靜態網頁（純 HTML/CSS/JS，無需建置），讀取 `data/items.json` 顯示追蹤商品。

## 資料格式 data/items.json

    { "updated": "YYYY-MM-DD HH:MM", "items": [ {
      "id": "唯一代碼", "name": "名稱", "category": "服飾|重訓器材|補給品|其他",
      "store": "店家", "url": "連結", "baseline": 基準價, "current": 目前價,
      "stock": "有貨|低庫存|缺貨", "status": "降價|補貨|缺貨|無變化",
      "purchased": false, "note": "備註", "lastChecked": "YYYY-MM-DD HH:MM" } ] }

## 更新方式

- 助理每天更新並提交 `data/items.json`。
- 網頁內「編輯模式」可新增、修改、刪除商品，變更存於瀏覽器 localStorage；按「匯出 JSON」下載後，可取代 `data/items.json` 提交。
- 「重設為倉庫資料」會清除本機變更。

## 資料格式 v2（向下相容，新增欄位）

items.json 每項商品新增：

- `history`: `[{ "date": "YYYY-MM-DD", "price": 數字 }]`，由舊到新；缺少時網頁以基準價補一筆。
- `lowest`: 歷史最低價（網頁會自動以 history 重算）。
- `target`: 目標價，數字或 null；目前價 <= 目標價且有貨時，卡片標示「已達目標價」。

`data/log.json`：`{ "log": [ { "date": "YYYY-MM-DD HH:MM", "id": "商品id或null", "name": "名稱", "type": "價格|狀態|新增|刪除|系統", "text": "說明" } ] }`，最新在最前面，「最近變動」面板顯示前 30 筆。

## 每日更新（助理用）

    node scripts/update.mjs <id> <新價格> [庫存] [狀態] [--note 文字] [--dir data]

例：`node scripts/update.mjs bros-te4061-xl 1190 有貨 降價`。會追加 history、寫入 log.json、更新 `updated` 與 `lastChecked`；狀態省略時，降價自動標為「降價」。無需任何套件。

## 資料格式 v3：同商品多店報價（offers）

每個商品（同一款商品只追蹤一張卡）含 `offers` 陣列：

    "offers": [ { "store": "店家", "url": "連結或空字串", "price": 數字, "stock": "有貨|低庫存|缺貨",
                  "lastChecked": "YYYY-MM-DD HH:MM", "note": "備註", "history": [ { "date": "YYYY-MM-DD", "price": 數字 } ] } ]

- 舊欄位 `store`、`url`、`current`、`stock` 由「最便宜且非缺貨」的報價推導（全部缺貨時取最便宜者）；價格相同時取陣列較前者。`history` 為該商品最低價的歷史，各店歷史在 `offers[].history`。
- `offers[].used: true` 表示二手報價：不參與最低價／標題價計算，網頁在卡片獨立「二手」區顯示（連結、價格、備註）。
- 沒有 `offers` 的舊資料，網頁與腳本會自動由舊欄位建立單一報價。
- 沒有連結的報價（例如蝦皮 Myprotein、BUDDY）`url` 留空，卡片顯示「無連結」。

更新單一店家：

    node scripts/update.mjs <id> <價格> [庫存] [狀態] --store "蝦皮 TUK" [--url 連結] [--note 文字]

`--store` 找不到該店家時會新增一筆報價；省略 `--store` 時更新第一筆報價。之後自動重算最低價、店家、庫存、狀態、歷史最低與 log。

## 功能

分頁（關注、全部、服飾、重訓器材、補給品、其他）、摘要、迷你價格走勢、詳細抽屜（完整歷史與備註）、新增/編輯/刪除、匯出/匯入 JSON（匯出同時下載 items.json 與 log.json）、深色模式跟隨系統。

## 獨特精選與回饋（v4）

items.json 商品可加：

- `pick`: `"unique"` 表示獨特精選（高價但不錯、不一定有價格競爭力）。這類商品只出現在「獨特精選」分頁（及全部/分類分頁），不參與「價格最好優先」排序、「降價」狀態與摘要統計、目標價提醒。
- `reason`: 短理由，顯示在卡片上。

新增獨特精選（腳本會建立商品，不會產生降價狀態）：

    node scripts/update.mjs <新id> <價格> 有貨 --name 名稱 --category 服飾 --store 店家 --url 連結 --pick unique --reason "理由"

`--pick unique` 必須搭配 `--reason`；對既有 id 也可補上 `--pick` / `--reason`。

### 回饋 data/feedback.json

陣列，每筆：`{ "id", "vote": "like|dislike", "name", "category", "store", "price", "date" }`。

- 每張卡片有「喜歡 / 不喜歡」（再按一次取消），存於 localStorage（`pd-fb-v1`）；獨特精選分頁未評分者排最前。
- 頁面讀取 `data/feedback.json`，與本機合併，衝突時以本機為準。
- 「匯出回饋」下載合併後的 `feedback.json`，取代 repo 內檔案後提交；「匯入回饋」匯入檔案（本機已有的票不被覆蓋）。
- 「送出回饋（N）」為選用：開啟預填的 GitHub 新 issue（title `feedback`，body 為尚未寫入 repo 的票數 JSON，取消票為 `vote: "clear"`），按 Submit 即可，助理再讀 issue 寫入 feedback.json。需登入 GitHub；票數很多時網址可能過長，請改用匯出。

### 分頁、降價中與待刪除

- 「關注」只列出你按「喜歡」的商品，不再由降價或目標價自動帶入。
- 「降價中」分頁（點摘要的降價中方塊也會跳到這裡並捲動）只列目前狀態為 `降價` 的商品，降幅最大的在前。
- 按「不喜歡」的商品會變灰，從其他分頁、降價中和摘要統計移除，集中到「待刪除」分頁。該分頁有「還原」（取消不喜歡）、「永久刪除」（確認後從商品移除）與「全部清空待刪除」（確認）。永久刪除和清空與其他網頁修改一樣只存在本機，需匯出 items.json 提交。
- `scripts/update.mjs` 會讀 `data/feedback.json`：id 的 vote 為 `dislike` 的商品視為待刪除，直接略過不更新。
- 每日追蹤流程：讀 feedback.json 後，對你已在「待刪除」確認或匯出（匯出的 items.json 已不含該商品，或 feedback 中仍為 dislike）的商品，由每日追蹤從 `data/items.json` 刪除，並寫一筆 log；刪除後 feedback 的 dislike 保留，避免同 id 被重新加入。

## 狀態與歷史規則（v4）

- 狀態只對「該輪」有效：`降價` = 本輪最低價低於上一輪；`補貨` = 本輪由缺貨轉有貨；目前缺貨為 `缺貨`；其餘一律 `無變化`。價格回升或下一輪沒變化就自動重置為 `無變化`。「上一輪」快照存在商品的 `prevCurrent`、`prevStock`、`runKey`（預設 `日期 AM/PM`，可用 `--run` 指定），同一輪多次呼叫共用同一快照。
- 與基準價的比較（百分比）、歷史最低、目標價另外顯示，不影響狀態標籤。
- 歷史每個序列（商品與各店報價）每日只留一點，同日後寫覆蓋；網頁載入時也會去重。

## 資料更正紀錄（2026-10-15）

- BUDDY 肌酸：原誤植 1kg=NT$499（實為 500g 價）。改為 PChome 24h 1kg NT$899（原價 1,500，約 NT$899/kg）。PChome 500g NT$499（原價 850）沒有已驗證連結，暫不追蹤。
- Tixteel 23kg 一對新增 TUK 官網報價 NT$8,800（官網原價 9,000）。
- 1KG/2.5KG/5KG 槓片原有的「Tixteel 官網」報價沒有實際來源（僅首頁），已改為 TUK 官網商品頁（價格與蝦皮 TUK 相同）。
- 新增 TUK 官網 Tixteel XT-GRIP 33kg / 43kg / 53kg 一對商品頁報價（NT$12,960 / 15,640 / 19,800，有貨，2026-10-15 讀頁面）。
