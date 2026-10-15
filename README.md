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
