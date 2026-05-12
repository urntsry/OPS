# OPS profiles ↔ Capacity company_personnel 欄位對照

> 兩個系統各自保留原本的表名和結構。  
> LINE 綁定以 OPS 為主，同步到 Capacity。  
> 此文件記錄兩邊欄位的對應關係，供 webhook 同步邏輯參考。

## 表名對照

| 系統 | Supabase Project | 表名 | 用途 |
|------|-----------------|------|------|
| OPS | `gjmkckijqurympmssizb` | `profiles` | 人員主表（行政/HR） |
| Capacity | `bacsqydbhmiictqtgidy` | `company_personnel` | 人員參照表（生產） |

## 共用 Key

兩邊用 **員工代碼** 作為對應 key：
- OPS: `profiles.employee_id`
- Capacity: `company_personnel.employee_code`

## 欄位對照

### 共用欄位（兩邊都有，名稱不同）

| 用途 | OPS `profiles` | Capacity `company_personnel` | 備註 |
|------|---------------|------------------------------|------|
| 主鍵 | `id` (UUID) | `id` (UUID) | 各自獨立，不同值 |
| 員工代碼 | `employee_id` | `employee_code` | **同步 key** |
| 姓名 | `full_name` | `name` | |
| 部門 | `department` | `department` | 名稱相同 |
| 廠區 | `site_code` | `plant_code` | |
| LINE 綁定 | `line_user_id` | `line_user_id` | 名稱相同，**綁定時需同步** |
| 在職狀態 | `is_active` | `is_active` | 名稱相同 |

### OPS 獨有欄位（不需同步到 Capacity）

| 欄位 | 用途 |
|------|------|
| `job_title` | 職稱 |
| `role` | 系統角色（admin/supervisor/user） |
| `points_balance` | 積分餘額 |
| `avatar_url` | 頭像 |
| `phone` | 電話 |
| `hire_date` | 到職日 |
| `birthday` | 生日 |
| `emergency_contact` | 緊急聯絡人 |
| `emergency_phone` | 緊急電話 |
| `address` | 地址 |
| `labor_insurance_date` | 勞保加保日 |
| `health_insurance_date` | 健保加保日 |
| `contract_expiry` | 合約到期日 |
| `nationality` | 國籍 |
| `password_hash` | 登入密碼 |
| `line_binding_code` | 6碼綁定碼（已廢除） |
| `line_bound_at` | 綁定時間 |
| `notification_prefs` | 通知偏好 |
| `notes` | 備註 |

### Capacity 獨有欄位（OPS profiles 需新增以支援 webhook 邏輯）

| 欄位 | 類型 | 用途 | OPS 是否需要 |
|------|------|------|-------------|
| `sales_code` | CHAR(1) | 業務代碼（如 H） | ✅ 需新增 |
| `shift_type` | TEXT | 班別（normal/late/late_plus/early/exempt） | ✅ 需新增 |
| `is_supervisor` | BOOLEAN | 是否為主管 | ✅ 需新增 |

## 同步規則

### LINE 綁定（OPS → Capacity）

```
觸發：員工代碼綁定成功後
方向：OPS profiles.line_user_id → Capacity company_personnel.line_user_id
匹配：profiles.employee_id = company_personnel.employee_code
失敗處理：告知使用者 OPS 綁定成功但 Capacity 同步失敗
```

### 人員新增/異動（未來）

```
主系統：OPS
同步方向：OPS → Capacity
需同步欄位：employee_code, name, is_active, line_user_id, plant_code, sales_code, shift_type, is_supervisor
```

## 環境變數需求

OPS 的 `.env.local` 需新增：

```env
# Capacity Supabase（用於同步 + LINE 功能）
CAPACITY_SUPABASE_URL=https://bacsqydbhmiictqtgidy.supabase.co
CAPACITY_SUPABASE_SERVICE_KEY=<Capacity 的 service_role key>

# LINE Bot（確認已存在）
LINE_CHANNEL_ACCESS_TOKEN=<token>
LINE_CHANNEL_SECRET=<secret>

# Google AI（語音建單用）
GOOGLE_API_KEY=<Gemini API key>
```
