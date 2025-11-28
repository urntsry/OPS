# 管理者視圖功能 - Admin View Feature v2.8

## 📋 功能概述

為管理者（Admin）新增「查看員工行事曆」功能，讓管理者可以切換視角，查看任何員工的行事曆和任務。

---

## 🎯 核心功能

### 1. **當前檢視提示**
- 顯示當前正在查看的員工資訊
- 自己的視角：🟢 藍綠色 (#008080)
- 其他員工視角：🔵 藍色 (#000080)
- 提供「返回自己」快速按鈕

### 2. **三種切換方式**

#### A. 下拉選單（最直觀）
```
選擇員工：[古志禹 (70231) - 自己 ▼]
          ├─ 古志禹 (70231) - 自己
          ├─ ────── 其他員工 ──────
          ├─ 張庭萱 (10003) - 管理部
          ├─ 范姜群皓 (50144) - 業務部
          └─ ...
```
- ✅ 按員工編號排序
- ✅ 顯示部門資訊
- ✅ 清楚區分「自己」和「其他員工」

#### B. 搜尋框（快速查找）
```
搜尋：[10003___] 🔍
```
- ✅ 輸入員工編號
- ✅ 支援 Enter 鍵快速搜尋
- ✅ 找不到時顯示錯誤提示

#### C. 快速切換按鈕
```
快速切換：[自己] [重新載入]  共 79 位員工
```
- ✅ 一鍵返回自己
- ✅ 重新載入員工清單
- ✅ 顯示員工總數

---

## 🎨 UI 設計

### 視覺位置（方案 2）
```
┌────────────────────────────────────────┐
│ THERMOTECH-OPS v2.8                    │
│ User: 古志禹 (70231) [登出]            │
├────────────────────────────────────────┤
│ 【管理者視圖切換器】                    │
│ 當前檢視：張庭萱 (10003) [返回自己]    │
│ 選擇員工：[下拉選單 ▼]                 │
│ 搜尋：[10003___] 🔍                    │
│ 快速切換：[自己] [重新載入]            │
├────────────────────────────────────────┤
│ [首頁] [人事] [廠務] [業務] [設定]     │ ← Admin Tabs
├────────────────────────────────────────┤
│ 【行事曆】                              │
│ 顯示：張庭萱 (10003) 的任務            │
└────────────────────────────────────────┘
```

### Win95 風格樣式
```css
/* 當前檢視提示 */
background: #000080 (查看他人) / #008080 (查看自己)
color: #FFFFFF
border: 2px outset
font-size: 11px

/* 下拉選單 */
background: #FFFFFF
border: 2px inset
font-family: monospace
font-size: 11px

/* 搜尋框 */
background: #FFFFFF
border: 2px inset
font-family: monospace
font-size: 11px
width: 100px
```

---

## 💻 技術實作

### 狀態管理
```typescript
// 管理者視圖狀態
const [allUsers, setAllUsers] = useState<Profile[]>([])          // 所有用戶
const [viewingUserId, setViewingUserId] = useState<string>('')   // 當前查看的用戶 ID
const [viewingUserProfile, setViewingUserProfile] = useState<Profile | null>(null)  // 當前查看的用戶資料
const [searchEmployeeId, setSearchEmployeeId] = useState('')     // 搜尋框輸入
```

### 核心函數

#### 1. 載入所有用戶（僅 Admin）
```typescript
useEffect(() => {
  if (userRole === 'admin' && userId) {
    loadAllUsers()
  }
}, [userRole, userId])

const loadAllUsers = async () => {
  try {
    const users = await getAllProfiles()
    setAllUsers(users)
  } catch (error) {
    console.error('載入用戶失敗:', error)
  }
}
```

#### 2. 切換查看的用戶
```typescript
const handleSwitchView = async (targetUserId: string) => {
  if (!targetUserId) {
    // 切換回自己
    setViewingUserId(userId)
    setViewingUserProfile(userProfile)
    return
  }
  
  setViewingUserId(targetUserId)
  
  // 從 allUsers 中找到該用戶
  const targetUser = allUsers.find(u => u.id === targetUserId)
  if (targetUser) {
    setViewingUserProfile(targetUser)
  }
}
```

#### 3. 通過員工編號搜尋
```typescript
const handleSearchByEmployeeId = async () => {
  if (!searchEmployeeId.trim()) return
  
  try {
    const user = await getProfileByEmployeeId(searchEmployeeId)
    if (user) {
      handleSwitchView(user.id)
      setSearchEmployeeId('')
    } else {
      showToast('找不到該員工編號', 'error')
    }
  } catch (error) {
    showToast('搜尋失敗', 'error')
  }
}
```

#### 4. 載入任務（自動切換）
```typescript
useEffect(() => {
  if (!userId) return
  
  // 決定要載入哪個用戶的任務
  const targetUserId = viewingUserId || userId
  
  async function loadUserTasks() {
    const taskDefs = await getTaskDefinitionsByAssignee(targetUserId)
    // ... 處理任務資料
  }
  
  loadUserTasks()
}, [userId, viewingUserId]) // 當 viewingUserId 變化時重新載入
```

---

## 🛡️ 權限控制

### 僅 Admin 可見
```typescript
{userRole === 'admin' && (
  <div className="window p-2 mb-2">
    {/* 管理者視圖切換器 */}
  </div>
)}
```

### 普通員工
- ❌ 看不到切換器
- ❌ 只能查看自己的行事曆
- ❌ `viewingUserId` 永遠等於 `userId`

---

## 🎯 使用場景

### 場景 1：檢查特定員工的任務
```
1. 管理者登入
2. 在下拉選單選擇「張庭萱 (10003)」
3. 行事曆立即切換為張庭萱的視角
4. 查看她的所有任務和行事曆
```

### 場景 2：快速搜尋員工
```
1. 在搜尋框輸入「10003」
2. 按 Enter 或點擊 🔍
3. 自動切換到該員工的視角
```

### 場景 3：對比不同員工
```
1. 查看員工 A 的行事曆
2. 切換到員工 B
3. 切換到員工 C
4. 點擊「自己」返回自己的視角
```

### 場景 4：驗證任務分配
```
1. 在設定頁分配任務給張庭萱
2. 切換到張庭萱的視角
3. 確認任務是否正確顯示在她的行事曆上
```

---

## ✅ 完成項目

- ✅ 管理者視圖 UI（方案 C - 混合式）
- ✅ 下拉選單（按員工編號排序）
- ✅ 搜尋框（支援 Enter 鍵）
- ✅ 快速切換按鈕
- ✅ 當前檢視提示（顏色區分）
- ✅ 返回自己按鈕
- ✅ 權限控制（僅 Admin）
- ✅ 自動重新載入任務
- ✅ 錯誤提示（找不到員工）
- ✅ 顯示員工總數
- ✅ Win95 風格樣式
- ✅ 設定頁視窗高度優化

---

## 📊 資料流

```
登入
  ↓
判斷是否為 Admin
  ↓ (Yes)
載入所有用戶清單 (getAllProfiles)
  ↓
預設 viewingUserId = userId (查看自己)
  ↓
使用者選擇員工 (下拉選單 / 搜尋框)
  ↓
handleSwitchView(targetUserId)
  ↓
更新 viewingUserId 和 viewingUserProfile
  ↓
useEffect 偵測到 viewingUserId 變化
  ↓
重新載入任務 (getTaskDefinitionsByAssignee(viewingUserId))
  ↓
更新行事曆和任務列表
```

---

## 🔧 相關檔案

- `app/home/page.tsx` - 主要實作
- `lib/api.ts` - API 函數 (`getAllProfiles`, `getProfileByEmployeeId`)
- `components/TaskClassificationPage.tsx` - 設定頁高度調整

---

## 📝 測試步驟

### 1. 測試基本切換
```
1. 以 Admin 帳號登入 (70231/70250/A0001)
2. 確認看到「管理者視圖切換器」
3. 下拉選單選擇任意員工
4. 確認行事曆切換成功
5. 確認當前檢視提示正確
```

### 2. 測試搜尋功能
```
1. 在搜尋框輸入「10003」
2. 按 Enter 或點擊 🔍
3. 確認切換成功
4. 輸入不存在的編號「99999」
5. 確認顯示錯誤提示
```

### 3. 測試快速切換
```
1. 切換到其他員工
2. 點擊「自己」按鈕
3. 確認返回自己的視角
4. 點擊「重新載入」
5. 確認員工清單重新載入
```

### 4. 測試權限控制
```
1. 以普通員工登入 (非 Admin)
2. 確認看不到「管理者視圖切換器」
3. 確認只能查看自己的行事曆
```

### 5. 測試任務分配驗證
```
1. 以 Admin 登入
2. 進入設定頁
3. 分配任務給張庭萱 (10003)
4. 返回首頁
5. 切換到張庭萱的視角
6. 確認任務顯示在她的行事曆上
```

---

## 🚀 版本資訊

- **版本**: v2.8
- **更新日期**: 2025-11-27
- **功能**: 管理者視圖切換器（方案 C - 混合式）
- **權限**: 僅 Admin 可見

---

## 💡 未來可能的擴展

1. **常用員工清單**
   - 記住最近查看的 5 位員工
   - 提供「最近查看」快速按鈕

2. **部門篩選**
   - 按部門分組顯示員工
   - 一鍵切換整個部門

3. **批量比較**
   - 同時顯示多個員工的行事曆
   - 並排對比工作量

4. **統計資訊**
   - 顯示該員工的任務總數
   - 顯示完成率和積分

---

## 📞 支援

如有任何問題或建議，請聯繫開發團隊。

**建立者**: Claude 4.5  
**專案**: THERMOTECH-OPS  
**風格**: Win95 + DOS 復古工業風

