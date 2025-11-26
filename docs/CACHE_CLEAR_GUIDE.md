# 🔄 緩存清除指南

## ⚠️ 重要！更新未生效的原因

### 可能的原因
1. **Next.js 緩存**：`.next` 資料夾保留舊版本
2. **瀏覽器緩存**：瀏覽器使用舊的 JS/CSS
3. **Node 模組緩存**：`node_modules/.cache` 有舊資料
4. **開發伺服器未重啟**：仍在運行舊代碼

---

## ✅ 解決方案（3 種方法）

### 方法 1：使用清除緩存腳本（推薦）
```
執行：CLEAR_CACHE_AND_RESTART.bat
```

這個腳本會：
1. 停止所有 Node 進程
2. 刪除 `.next` 緩存
3. 刪除 `node_modules/.cache`
4. 重啟開發伺服器

---

### 方法 2：手動清除
```bash
# 1. 停止開發伺服器
Ctrl + C

# 2. 刪除緩存
cd thermotech-ops-app
rmdir /s /q .next
rmdir /s /q node_modules\.cache

# 3. 重啟
npm run dev
```

---

### 方法 3：瀏覽器硬重載
```
Chrome/Edge: Ctrl + Shift + R
Firefox: Ctrl + F5
```

---

## 🔍 如何確認更新成功？

### 檢查版本號
```
頁面頂部應該顯示：THERMOTECH-OPS v1.1
```

**如果仍是 v1.0**：
- 緩存未清除
- 需要執行方法 1 或方法 2

**如果是 v1.1**：
- 更新已生效
- 可以進行測試

---

## 📝 當前更改（v1.1）

### EventList.tsx
- ✅ 已移除按鈕（測試用）
- ✅ 使用純 inline style
- ✅ 不依賴 Tailwind 類別

### 預期效果
- 四個區塊（例行公事、交辦事項、公共事項、公告欄）
- **都沒有按鈕**
- 只有標題

---

## 🚀 測試步驟

### 步驟 1：清除緩存
```
執行：CLEAR_CACHE_AND_RESTART.bat
或
手動清除（見方法 2）
```

### 步驟 2：訪問頁面
```
http://localhost:3000
```

### 步驟 3：確認版本
```
檢查頁面頂部：THERMOTECH-OPS v1.1
```

### 步驟 4：觀察結果
```
- 例行公事：只有標題，無按鈕
- 交辦事項：只有標題，無按鈕
- 公共事項：只有標題，無按鈕
- 公告欄：只有標題，無按鈕
```

---

## ⚡ 之後每次更新

**請記得更新版本號**：

```typescript
// app/home/page.tsx
<div className="titlebar">
  THERMOTECH-OPS v1.2  // ← 更新這裡
</div>
```

**版本號規則**：
- 小改動：v1.1 → v1.2 → v1.3
- 大改動：v1.x → v2.0
- 修復 bug：v1.1.0 → v1.1.1

---

## 🔧 如果還是不行？

### 終極方法：完全重建
```bash
# 1. 停止伺服器
Ctrl + C

# 2. 刪除所有緩存和構建產物
cd thermotech-ops-app
rmdir /s /q .next
rmdir /s /q node_modules\.cache
rmdir /s /q out

# 3. 清除 npm 緩存（可選）
npm cache clean --force

# 4. 重新安裝依賴（可選，如果上面不行）
rmdir /s /q node_modules
npm install

# 5. 重啟
npm run dev
```

---

**請執行 CLEAR_CACHE_AND_RESTART.bat，然後確認版本號是否變成 v1.1！** 🙏


