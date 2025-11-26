# 🔍 例行公事按鈕問題分析報告

## 📊 當前程式碼狀態

### EventList.tsx (第 19-30 行)
```typescript
export default function EventList({ title, events, onToggle, onAdd, onItemClick, showAddButton = true }: EventListProps) {
  return (
    <div className="outset p-2">
      {/* 標題列 - 根據是否有按鈕調整佈局 */}
      <div className="flex items-center mb-2 p-1 bg-blue-900 text-white" style={{ minHeight: '20px' }}>
        <div className="text-bold flex-1" style={{ lineHeight: '18px' }}>{title}</div>
        {showAddButton && onAdd && (
          <button onClick={onAdd} className="text-bold text-xs" style={{ padding: '0 6px', marginLeft: '4px' }}>
            +
          </button>
        )}
      </div>
```

### home/page.tsx (第 155-168 行)
```typescript
<EventList
  title="例行公事"
  events={routineTasks}
  onToggle={handleToggleTask}
  onAdd={handleAddEvent}
  showAddButton={true}
/>
<EventList
  title="交辦事項"
  events={assignments}
  onToggle={handleToggleTask}
  onAdd={handleAddEvent}
  showAddButton={true}
/>
```

---

## 🎯 可能的問題原因分析

### 原因 1：Flexbox 空間分配問題
**問題**：
```typescript
<div className="text-bold flex-1" style={{ lineHeight: '18px' }}>{title}</div>
```

**分析**：
- `flex-1` 會讓標題佔據所有可用空間
- 但如果按鈕的 `marginLeft: '4px'` 不夠，或按鈕本身寬度不固定
- 可能導致兩個 EventList 的按鈕位置略有不同

**視覺效果**：
```
例行公事：  [標題...........................] [+]
交辦事項：  [標題....................] [+]
                                    ↑ 這裡可能有 1-2px 的差異
```

---

### 原因 2：文字長度影響
**問題**：
- "例行公事" = 4 個中文字
- "交辦事項" = 4 個中文字

**但如果內部有微小的渲染差異**：
- 字體渲染（antialiasing）
- Subpixel rendering
- 瀏覽器 flexbox 計算誤差

**可能導致**：
```
例行公事：標題寬度 = 100px → 按鈕在 X 位置
交辦事項：標題寬度 = 100.5px → 按鈕在 X+0.5 位置
```

---

### 原因 3：按鈕自身寬度不固定
**問題**：
```typescript
<button style={{ padding: '0 6px', marginLeft: '4px' }}>+</button>
```

**分析**：
- 按鈕寬度由內容（"+"）+ padding 決定
- "+" 符號可能因字體渲染有微小差異
- 沒有設定固定 `width`

**可能效果**：
```
按鈕 1：padding(6px) + 內容(8px) + padding(6px) = 20px
按鈕 2：padding(6px) + 內容(8.5px) + padding(6px) = 20.5px
                                                  ↑ 微小差異
```

---

### 原因 4：父容器寬度不一致
**問題**：
```typescript
<div className="grid-2 mb-2">
```

**檢查點**：
- `.grid-2` 的定義
- 是否左右兩個格子寬度完全相同？
- 是否有 gap 或 margin 影響？

**globals.css 中的定義**：
```css
.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
```

**可能問題**：
- 如果總寬度是奇數（如 1001px）
- 分成兩個 1fr 可能是：500px 和 501px
- 導致按鈕位置有 1px 差異

---

### 原因 5：Tailwind CSS 類別衝突
**問題**：
```typescript
className="text-bold text-xs"
```

**檢查點**：
- Tailwind 的 `text-xs` 可能有 `line-height` 設定
- `text-bold` 可能影響字體寬度
- 與自訂的 `style={{ padding: '0 6px', marginLeft: '4px' }}` 可能有衝突

**Tailwind 預設值**：
```css
.text-xs {
  font-size: 0.75rem;  /* 12px */
  line-height: 1rem;   /* 16px */
}
```

**與我們的 11px 全域字體有衝突！**

---

### 原因 6：box-shadow 或 border 影響
**問題**：
- `.outset` 類別有 `box-shadow` 和 `border`
- 可能影響內部元素的定位

**globals.css**：
```css
.outset {
  border-top: 2px solid var(--win-white);
  border-left: 2px solid var(--win-white);
  border-right: 2px solid var(--win-black);
  border-bottom: 2px solid var(--win-black);
  box-shadow: inset 1px 1px 0 var(--win-light-grey), inset -1px -1px 0 var(--win-dark-grey);
}
```

---

## 🔍 診斷步驟建議

### 步驟 1：確認實際渲染的寬度
```typescript
// 在 EventList 加入 debug 資訊
<div className="flex items-center mb-2 p-1 bg-blue-900 text-white" 
     style={{ minHeight: '20px' }}
     ref={(el) => {
       if (el) {
         console.log(`${title} - 容器寬度:`, el.offsetWidth);
         const btn = el.querySelector('button');
         if (btn) {
           console.log(`${title} - 按鈕位置:`, btn.offsetLeft);
         }
       }
     }}>
```

### 步驟 2：強制固定按鈕寬度和位置
```typescript
<button 
  style={{ 
    width: '20px',           // 固定寬度
    height: '18px',          // 固定高度
    padding: '0',            // 移除 padding
    marginLeft: '4px',
    textAlign: 'center',
    flexShrink: 0            // 防止被壓縮
  }}>
  +
</button>
```

### 步驟 3：使用絕對定位
```typescript
<div className="flex items-center mb-2 p-1 bg-blue-900 text-white" 
     style={{ minHeight: '20px', position: 'relative' }}>
  <div className="text-bold" style={{ lineHeight: '18px' }}>{title}</div>
  {showAddButton && onAdd && (
    <button 
      onClick={onAdd} 
      style={{ 
        position: 'absolute',
        right: '4px',          // 固定在右側 4px
        top: '50%',
        transform: 'translateY(-50%)',
        padding: '0 6px'
      }}>
      +
    </button>
  )}
</div>
```

### 步驟 4：統一容器寬度
```typescript
<div className="grid-2 mb-2" style={{ gridTemplateColumns: '600px 600px' }}>
  {/* 強制固定寬度，避免 1fr 計算誤差 */}
</div>
```

---

## 🎯 最可能的原因（排序）

### 1. **Tailwind `text-xs` 衝突** (機率: 80%)
- `text-xs` 設定 12px，與全域 11px 衝突
- 導致按鈕高度/寬度略有不同

### 2. **Flexbox 計算誤差** (機率: 15%)
- `flex-1` 在不同容器寬度下的計算結果略有差異
- 導致按鈕位置有 1-2px 偏移

### 3. **按鈕寬度不固定** (機率: 5%)
- "+" 符號渲染寬度略有不同
- 導致整體按鈕寬度不一致

---

## 💡 建議的修正方案

### 方案 A：最簡單（推薦）
```typescript
<button 
  onClick={onAdd} 
  className="text-bold" 
  style={{ 
    fontSize: '11px',        // 明確設定，覆蓋 Tailwind
    width: '20px',           // 固定寬度
    height: '18px',          // 固定高度
    padding: '0',
    marginLeft: '4px',
    flexShrink: 0,
    textAlign: 'center'
  }}>
  +
</button>
```

### 方案 B：絕對定位
```typescript
<div style={{ position: 'relative', ... }}>
  <div className="text-bold">{title}</div>
  <button style={{ position: 'absolute', right: '4px', ... }}>+</button>
</div>
```

### 方案 C：Grid 佈局
```typescript
<div style={{ 
  display: 'grid', 
  gridTemplateColumns: '1fr auto',  // 標題自動寬度，按鈕固定
  alignItems: 'center' 
}}>
  <div>{title}</div>
  {showAddButton && <button>+</button>}
</div>
```

---

## ⚠️ 不要動作，等待確認

**需要用戶確認**：
1. 按鈕是「完全對不齊」還是「差 1-2 像素」？
2. 是水平位置問題還是垂直位置問題？
3. 兩個按鈕是否在同一垂直線上？

**確認後再採取行動！**


