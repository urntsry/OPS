# THERMOTECH-OPS: Win95 設計系統規範

## 1. 核心色票 (Color Palette)
我們不使用現代的柔和色調，堅持使用 Windows 95 / NT 4.0 的標準色。

```css
:root {
  /* 系統基底 */
  --win-teal: #008080;       /* 桌布背景 */
  --win-grey: #C0C0C0;       /* 視窗表面 */
  --win-blue: #000080;       /* 標題列 (啟用) */
  --win-dark-grey: #808080;  /* 陰影/標題列 (停用) */
  --win-white: #FFFFFF;      /* 輸入框背景 */
  --win-black: #000000;      /*文字/邊框 */
  
  /* 功能色 */
  --win-red: #FF0000;        /* 錯誤/關閉按鈕 */
  --win-yellow: #FFFF00;     /* 警告 */
  --win-green: #00FF00;      /* 成功 (極少使用，通常用黑色文字表示完成) */
}
```

## 2. 3D導角物理學 (Bevel Physics)
所有的 UI 元素都必須有「厚度」。禁止平面設計 (Flat Design)。

### Outset (凸起 - 按鈕/視窗)
- Top/Left: `white` (光照面)
- Bottom/Right: `black` (陰影面)
- Inner Top/Left: `dfdfdf` (次光照)
- Inner Bottom/Right: `808080` (次陰影)

### Inset (凹陷 - 輸入框/狀態列)
- Top/Left: `808080` (內部陰影)
- Bottom/Right: `white` (內部光照)
- Inner Top/Left: `black` (深陰影)
- Inner Bottom/Right: `dfdfdf` (淺光照)

## 3. 字體排印 (Typography)
- **Primary**: `Microsoft Sans Serif`, `Arial`, `sans-serif` (無襯線，用於 UI)
- **Code/Data**: `Courier New`, `monospace` (等寬，用於數據表格)
- **Rendering**: 關閉抗鋸齒 (Antialiasing) 若可能，追求像素感。

## 4. 元件行為 (Component Behavior)

### 按鈕 (Button)
- 預設狀態：凸起 (Outset)
- 按下狀態 (`:active`)：凹陷 (Inset) + 內容位移 (transform: translate(1px, 1px))
- **必須**有明顯的點擊回饋。

### 視窗 (Window)
- 標題列：深藍色背景 + 白色粗體文字。
- 控制按鈕：右上角 [ _ ] [ □ ] [ X ]。
- 必須可拖曳 (Draggable)。

### 網格 (Grid/Table)
- 每一格都有邊框。
- 表頭凸起，內容凹陷或平面。
- 選中列反白 (深藍底白字)。

## 5. 音效設計 (Sound Design)
系統操作應伴隨細微的音效 (可全域靜音)。
- **Click**: 清脆的機械開關聲。
- **Error**: 標準 Windows 錯誤 "Chord"。
- **Success**: "Chime" 或 收銀機 "Ka-Ching"。


