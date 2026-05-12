# LINE Webhook 中央化 — OPS 實作指南

> 本文件為 OPS Agent 的完整操作指南。目標是將 LINE Bot Webhook 架設在 OPS，使 OPS 成為 LINE 訊息的中央處理器，同時轉發 Capacity App 相關指令。

## 背景

兩個系統共用同一個 LINE Bot（同一組 Channel Secret / Access Token）：

| 項目 | Supabase | 部署位置 | 使用者綁定表 |
|------|----------|----------|------------|
| **OPS** (thermotech-ops-app) | `gjmkckijqurympmssizb.supabase.co` | Vercel (OPS) | `profiles.line_user_id` |
| **Capacity App** (capacity-app) | `bacsqydbhmiictqtgidy.supabase.co` | `ca-chi.vercel.app` | `company_personnel.line_user_id` |

LINE Bot 只能設定一個 Webhook URL，現在要指向 OPS。

## 架構圖

```
LINE 使用者
    │
    ▼
OPS /api/line/webhook （中央 Webhook）
    │
    ├── 6碼綁定碼 → OPS 本地處理（profiles 表）
    │                 └─→ 同步呼叫 Capacity App API 寫入 company_personnel.line_user_id
    │
    ├── 員工代碼綁定（3-5位數字）→ 轉發給 Capacity App
    │                               └─→ Capacity App 綁定 company_personnel + 回傳結果
    │                               └─→ OPS 同步寫入 profiles.line_user_id
    │
    ├── Capacity 指令（加班/回報/語音/確認/取消/業務X）→ 轉發給 Capacity App Webhook
    │
    └── 其他訊息 → OPS 預設回覆
```

## 需要的環境變數

OPS 的 `.env.local` 和 Vercel 環境變數需要新增：

```env
# LINE Bot（應該已存在，確認有值）
LINE_CHANNEL_ACCESS_TOKEN=<與 Capacity App 相同的 token>
LINE_CHANNEL_SECRET=<與 Capacity App 相同的 secret>

# Capacity App 轉發用
CAPACITY_APP_URL=https://ca-chi.vercel.app
CAPACITY_WEBHOOK_SECRET=<自訂一個密鑰，用於 OPS→Capacity 轉發驗證>
```

Capacity App 的 `.env.local` 和 Vercel 環境變數需要新增：

```env
# 接受 OPS 轉發的密鑰（與上面 CAPACITY_WEBHOOK_SECRET 相同）
CAPACITY_WEBHOOK_SECRET=<與 OPS 設的相同值>
```

## 實作步驟

---

### 第一步：改寫 OPS Webhook（中央路由器）

**檔案：`thermotech-ops-app/app/api/line/webhook/route.ts`**

完全替換為以下內容：

```typescript
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const CAPACITY_APP_URL = process.env.CAPACITY_APP_URL || 'https://ca-chi.vercel.app'
const CAPACITY_WEBHOOK_SECRET = process.env.CAPACITY_WEBHOOK_SECRET || ''
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || ''
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// 需要轉發給 Capacity App 的關鍵字和模式
const CAPACITY_KEYWORDS = ['加班', '申請加班', '加班申請', '確認', '確認建單', '取消']
const CAPACITY_PATTERNS = [
  /^\d{3,5}$/,                    // 員工代碼綁定（3-5位數字）
  /^業務\s*[A-Za-z]$/i,          // 業務代碼綁定
  /^回報\s+\S+[,\s]+\d+$/i,     // 進度回報
  /^完成$/,                       // 加班流程完成
]

function isCapacityCommand(text: string): boolean {
  if (CAPACITY_KEYWORDS.includes(text)) return true
  return CAPACITY_PATTERNS.some(p => p.test(text))
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-line-signature')

    // 驗證 LINE 簽名
    if (LINE_CHANNEL_SECRET && signature) {
      const hash = crypto
        .createHmac('SHA256', LINE_CHANNEL_SECRET)
        .update(rawBody)
        .digest('base64')
      if (signature !== hash) {
        return NextResponse.json({ error: 'Signature invalid' }, { status: 401 })
      }
    }

    const data = JSON.parse(rawBody)
    const events = data.events || []
    const supabase = getSupabase()

    for (const event of events) {
      // follow 事件：使用者加好友
      if (event.type === 'follow') {
        await handleFollow(supabase, event)
        continue
      }

      // 音訊訊息：一律轉給 Capacity（語音建單）
      if (event.type === 'message' && event.message?.type === 'audio') {
        await forwardToCapacity(rawBody)
        continue
      }

      // postback：檢查是 OPS 或 Capacity 的
      if (event.type === 'postback') {
        const params = new URLSearchParams(event.postback.data)
        const action = params.get('action') || ''

        // Capacity 相關的 postback action 前綴
        if (action.startsWith('ot_') || action.startsWith('voice_') ||
            action === 'ignore_wo' || action === 'confirm_wo' || action === 'cancel_wo') {
          await forwardToCapacity(rawBody)
        }
        // OPS 相關的 postback 可在此處理
        continue
      }

      // group join：轉給 Capacity
      if (event.type === 'join') {
        await forwardToCapacity(rawBody)
        continue
      }

      // 文字訊息：路由判斷
      if (event.type === 'message' && event.message?.type === 'text') {
        const lineUserId = event.source?.userId
        const text = (event.message.text || '').trim()

        if (!lineUserId) continue

        // 6碼英數綁定碼 → OPS 綁定
        if (/^[A-Z0-9]{6}$/i.test(text.toUpperCase())) {
          await handleOpsBinding(supabase, event, text.toUpperCase())
          continue
        }

        // 員工代碼（3-5位數字）→ 轉給 Capacity 綁定，同時同步到 OPS
        if (/^\d{3,5}$/.test(text)) {
          await forwardToCapacity(rawBody)
          // 同步：Capacity 綁定成功後 line_user_id 會寫入 company_personnel
          // OPS 也嘗試同步寫入 profiles（用 employee_id 匹配）
          await syncBindingToOps(supabase, lineUserId, text)
          continue
        }

        // Capacity 指令
        if (isCapacityCommand(text)) {
          await forwardToCapacity(rawBody)
          continue
        }

        // 檢查是否在 Capacity 的加班流程中（overtime_draft）
        // 由於 overtime_draft 在 Capacity 的 DB，直接轉發
        await forwardToCapacity(rawBody)
        // 如果 Capacity 沒處理，OPS 會顯示預設訊息
        // （Capacity webhook 會忽略無法匹配的訊息，不會回覆）
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[LINE Webhook] Error:', err)
    return NextResponse.json({ ok: true })
  }
}

// === Follow 事件 ===
async function handleFollow(supabase: any, event: any) {
  const userId = event.source.userId
  await replyMessage(event.replyToken,
    `歡迎加入振禹企業系統！\n\n` +
    `📋 綁定方式：\n` +
    `• OPS 系統：請從 OPS 設定頁產生 6 碼綁定碼\n` +
    `• Capacity 系統：請直接回覆您的員工代碼（例如：70231）\n\n` +
    `綁定後即可在兩個系統接收通知。`
  )
}

// === OPS 6碼綁定 ===
async function handleOpsBinding(supabase: any, event: any, code: string) {
  const lineUserId = event.source?.userId
  const { data: bound } = await supabase.rpc('bind_line_account', {
    p_binding_code: code,
    p_line_user_id: lineUserId,
  })

  if (bound) {
    // 綁定成功後，同步到 Capacity App
    await syncOpsBindingToCapacity(supabase, lineUserId)
    await replyMessage(event.replyToken, '✅ OPS 綁定成功！您已連結振禹 OPS 系統。')
  } else {
    await replyMessage(event.replyToken, '❌ 綁定碼無效或已過期，請從 OPS 系統重新產生。')
  }
}

// === 轉發給 Capacity App ===
async function forwardToCapacity(rawBody: string) {
  try {
    // 用共享密鑰產生簽名，讓 Capacity 驗證來源
    const forwardSignature = crypto
      .createHmac('SHA256', CAPACITY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('base64')

    const res = await fetch(`${CAPACITY_APP_URL}/api/line/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-line-signature': forwardSignature,
        'x-forwarded-from': 'ops',
      },
      body: rawBody,
    })

    if (!res.ok) {
      console.error('[Forward to Capacity] Failed:', res.status, await res.text())
    }
  } catch (err) {
    console.error('[Forward to Capacity] Error:', err)
  }
}

// === 同步綁定：OPS → Capacity ===
async function syncOpsBindingToCapacity(supabase: any, lineUserId: string) {
  try {
    // 從 OPS profiles 找到剛綁定的人
    const { data: profile } = await supabase
      .from('profiles')
      .select('employee_id')
      .eq('line_user_id', lineUserId)
      .maybeSingle()

    if (!profile?.employee_id) return

    // 呼叫 Capacity App API 同步 line_user_id
    await fetch(`${CAPACITY_APP_URL}/api/line/sync-binding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': CAPACITY_WEBHOOK_SECRET,
      },
      body: JSON.stringify({
        employee_code: profile.employee_id,
        line_user_id: lineUserId,
      }),
    })
  } catch (err) {
    console.error('[Sync OPS→Capacity] Error:', err)
  }
}

// === 同步綁定：員工代碼綁定時 → OPS profiles ===
async function syncBindingToOps(supabase: any, lineUserId: string, employeeCode: string) {
  try {
    // 用 employee_id 在 OPS profiles 中找到對應的人
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('employee_id', employeeCode)
      .maybeSingle()

    if (profile) {
      await supabase
        .from('profiles')
        .update({ line_user_id: lineUserId, line_bound_at: new Date().toISOString() })
        .eq('id', profile.id)
    }
  } catch (err) {
    console.error('[Sync Capacity→OPS] Error:', err)
  }
}

// === LINE Reply ===
async function replyMessage(replyToken: string, text: string) {
  if (!LINE_CHANNEL_ACCESS_TOKEN || !replyToken) return
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: 'text', text }],
    }),
  })
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'ops-line-webhook-hub' })
}
```

---

### 第二步：Capacity App 新增同步綁定 API

**在 Capacity App 新增檔案：`capacity-app/src/app/api/line/sync-binding/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  try {
    // 驗證來源（OPS 轉發）
    const secret = request.headers.get('x-webhook-secret')
    if (secret !== process.env.CAPACITY_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { employee_code, line_user_id } = await request.json()

    if (!employee_code || !line_user_id) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const supabase = getAdmin()

    // 寫入 company_personnel
    const { error } = await supabase
      .from('company_personnel')
      .update({
        line_user_id,
        updated_at: new Date().toISOString()
      })
      .eq('employee_code', employee_code)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
```

---

### 第三步：修改 Capacity App Webhook 接受 OPS 轉發

**修改 `capacity-app/src/app/api/line/webhook/route.ts`**

在簽名驗證的部分，增加接受 OPS 轉發的邏輯：

找到這段：
```typescript
const channelSecret = process.env.LINE_CHANNEL_SECRET!
const hash = crypto
  .createHmac('SHA256', channelSecret)
  .update(body)
  .digest('base64')

if (signature !== hash) {
  return NextResponse.json({ error: 'Signature invalid' }, { status: 401 })
}
```

替換為：
```typescript
const isForwarded = request.headers.get('x-forwarded-from') === 'ops'

if (isForwarded) {
  // OPS 轉發：用共享密鑰驗證
  const webhookSecret = process.env.CAPACITY_WEBHOOK_SECRET!
  const expectedSig = crypto
    .createHmac('SHA256', webhookSecret)
    .update(body)
    .digest('base64')
  if (signature !== expectedSig) {
    return NextResponse.json({ error: 'Forward signature invalid' }, { status: 401 })
  }
} else {
  // 直接來自 LINE 的請求（向下相容）
  const channelSecret = process.env.LINE_CHANNEL_SECRET!
  const hash = crypto
    .createHmac('SHA256', channelSecret)
    .update(body)
    .digest('base64')
  if (signature !== hash) {
    return NextResponse.json({ error: 'Signature invalid' }, { status: 401 })
  }
}
```

---

### 第四步：切換 LINE Developers Webhook URL

1. 登入 [LINE Developers Console](https://developers.line.biz)
2. 進入 Messaging API 設定
3. 將 Webhook URL 從：
   `https://ca-chi.vercel.app/api/line/webhook`
   改為：
   `https://<OPS的Vercel域名>/api/line/webhook`
4. 確認 "Use webhook" 為啟用狀態
5. 點擊 "Verify" 測試

---

## 訊息路由規則總結

| 使用者輸入 | 處理者 | 說明 |
|-----------|--------|------|
| 6碼英數綁定碼 | **OPS** | OPS profiles 綁定 + 同步到 Capacity |
| 3-5位數字（員工代碼）| **Capacity**（OPS轉發）| company_personnel 綁定 + 同步到 OPS profiles |
| 「業務X」| **Capacity**（OPS轉發）| 業務代碼綁定 |
| 「加班」「申請加班」| **Capacity**（OPS轉發）| 加班申請流程 |
| 「回報 XXXXX,數量」| **Capacity**（OPS轉發）| 進度回報 |
| 「確認」「取消」| **Capacity**（OPS轉發）| 語音建單確認/取消 |
| 語音訊息 | **Capacity**（OPS轉發）| 語音建單 |
| ot_* postback | **Capacity**（OPS轉發）| 加班流程按鈕 |
| voice_* postback | **Capacity**（OPS轉發）| 語音建單按鈕 |
| 其他文字 | **OPS 轉發給 Capacity**（Capacity 無匹配則忽略）| 可能是加班流程中的手動輸入 |

## 重要備註

1. **同一個 LINE Bot、同一組 Token** — 兩邊的 `LINE_CHANNEL_ACCESS_TOKEN` 和 `LINE_CHANNEL_SECRET` 必須一致
2. **兩個 Supabase 是不同的** — OPS 和 Capacity 各有自己的資料庫，綁定需要同步
3. **LINE Push 訊息不受影響** — Capacity App 的各種推播通知（cron、建單提醒等）繼續直接呼叫 LINE Push API，不經過 webhook
4. **向下相容** — Capacity Webhook 同時接受 LINE 原始簽名和 OPS 轉發簽名，切換期間不會中斷
5. **OPS 已有 `bind_line_account` RPC** — 6碼綁定碼的 DB 函式已存在，不需要額外建立
