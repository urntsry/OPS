import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// === Config ===
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || ''
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
const CAPACITY_APP_URL = process.env.CAPACITY_APP_URL || 'https://ca-chi.vercel.app'

// === Dual Supabase Clients ===
function getOpsSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function getCapacitySupabase(): SupabaseClient {
  return createClient(
    process.env.CAPACITY_SUPABASE_URL!,
    process.env.CAPACITY_SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// === Capacity Command Detection ===
const CAPACITY_KEYWORDS = ['加班', '申請加班', '加班申請', '確認', '確認建單', '取消', '完成']

function isCapacityCommand(text: string): boolean {
  if (CAPACITY_KEYWORDS.includes(text)) return true
  if (/^業務\s*[A-Za-z]$/i.test(text)) return true
  if (/^回報\s+\S+[,\s]+\d+$/i.test(text)) return true
  return false
}

// === Main Webhook Handler ===
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-line-signature')

    // Verify LINE signature
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
    const ops = getOpsSupabase()
    const capacity = getCapacitySupabase()

    for (const event of events) {
      if (event.type === 'follow') {
        await handleFollow(event)
        continue
      }

      if (event.type === 'message' && event.message?.type === 'audio') {
        await handleAudioMessage(capacity, event)
        continue
      }

      if (event.type === 'postback') {
        await handlePostback(capacity, event)
        continue
      }

      if (event.type === 'join') {
        await handleGroupJoin(capacity, event)
        continue
      }

      if (event.type === 'message' && event.message?.type === 'text') {
        const lineUserId = event.source?.userId
        const text = (event.message.text || '').trim()
        if (!lineUserId) continue

        // Employee code binding (3-5 digits) → OPS first, then sync to Capacity
        if (/^\d{3,5}$/.test(text)) {
          await handleBinding(ops, capacity, lineUserId, text)
          continue
        }

        // Legacy sales code binding
        const salesMatch = text.match(/^業務\s*([A-Za-z])$/i)
        if (salesMatch) {
          await bindBySalesCode(capacity, lineUserId, salesMatch[1].toUpperCase())
          continue
        }

        // Overtime application
        if (text === '加班' || text === '申請加班' || text === '加班申請') {
          try { await startOvertimeApplication(capacity, lineUserId) }
          catch (err) { console.error('OT start error:', err); await sendLineMessage(lineUserId, '加班申請功能發生錯誤，請聯繫管理員。') }
          continue
        }

        // Progress report
        const reportMatch = text.match(/^回報\s+(\S+)[,\s]+(\d+)$/i)
        if (reportMatch) {
          try { await handleProgressReport(capacity, lineUserId, reportMatch[1], parseInt(reportMatch[2])) }
          catch (err) { console.error('Report error:', err); await sendLineMessage(lineUserId, '回報格式：回報 工單號碼,數量\n範例：回報 20260505K,23') }
          continue
        }

        // Voice WO confirmation/cancellation
        if (text === '確認' || text === '確認建單') {
          await confirmPendingVoiceWO(capacity, lineUserId)
          continue
        }
        if (text === '取消') {
          await cancelPendingVoiceWO(capacity, lineUserId)
          continue
        }

        // Check if in overtime draft flow
        try {
          const { data: otDraft } = await capacity
            .from('overtime_draft')
            .select('*')
            .eq('line_user_id', lineUserId)
            .maybeSingle()

          if (otDraft?.step === 'manual_wo') {
            if (text === '完成') { await handleOvertimeWoDone(capacity, lineUserId); continue }
            await handleManualWoInput(capacity, lineUserId, text, otDraft)
            continue
          }
        } catch (err) { console.error('OT draft check error:', err) }

        // TODO: Future OPS commands (e.g. 佈告欄) can be added here
        // if (text === '佈告欄') { await handleBulletin(ops, lineUserId); continue }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[LINE Webhook] Error:', err)
    return NextResponse.json({ ok: true })
  }
}

// ============================================================
// BINDING — OPS 為主，同步到 Capacity
// ============================================================

async function handleBinding(ops: SupabaseClient, capacity: SupabaseClient, lineUserId: string, employeeCode: string) {
  // Step 1: Find in OPS profiles
  const { data: profile } = await ops
    .from('profiles')
    .select('id, employee_id, full_name, site_code, sales_code')
    .eq('employee_id', employeeCode)
    .eq('is_active', true)
    .maybeSingle()

  if (!profile) {
    await sendLineMessage(lineUserId, `❌ 找不到員工代碼：${employeeCode}\n\n請確認代碼是否正確，或聯繫管理員。`)
    return
  }

  // Step 2: Write line_user_id to OPS profiles
  await ops
    .from('profiles')
    .update({ line_user_id: lineUserId, line_bound_at: new Date().toISOString() })
    .eq('id', profile.id)

  // Step 3: Sync to Capacity company_personnel
  let capacitySyncOk = true
  try {
    const { error } = await capacity
      .from('company_personnel')
      .update({ line_user_id: lineUserId, updated_at: new Date().toISOString() })
      .eq('employee_code', employeeCode)

    if (error) { console.error('[Sync to Capacity] Error:', error); capacitySyncOk = false }
  } catch (err) {
    console.error('[Sync to Capacity] Error:', err)
    capacitySyncOk = false
  }

  // Step 4: Also sync to Capacity report_personnel + sales_personnel if applicable
  try {
    const { data: reportPerson } = await capacity
      .from('report_personnel')
      .select('id')
      .eq('employee_code', employeeCode)
      .maybeSingle()
    if (reportPerson) {
      await capacity.from('report_personnel').update({ line_user_id: lineUserId }).eq('id', reportPerson.id)
    }

    if (profile.sales_code) {
      await capacity.from('sales_personnel').update({ line_user_id: lineUserId, updated_at: new Date().toISOString() }).eq('code', profile.sales_code)
    }
  } catch (err) { console.error('[Sync subsidiary tables] Error:', err) }

  // Step 5: Update Capacity line_user_bindings
  try {
    await capacity.from('line_user_bindings').upsert({
      line_user_id: lineUserId,
      employee_code: employeeCode,
      is_bound: true,
      bound_at: new Date().toISOString(),
      last_message_at: new Date().toISOString()
    }, { onConflict: 'line_user_id' })
  } catch (err) { console.error('[line_user_bindings] Error:', err) }

  // Step 6: Reply
  if (capacitySyncOk) {
    await sendLineMessage(lineUserId,
      `✅ 綁定成功！\n\n姓名：${profile.full_name}\n代碼：${employeeCode}\n\n已連結振禹系統（OPS + Capacity）。`)
  } else {
    await sendLineMessage(lineUserId,
      `✅ OPS 綁定成功！\n\n姓名：${profile.full_name}\n代碼：${employeeCode}\n\n⚠️ Capacity 同步失敗，請聯繫管理員。`)
  }
}

// ============================================================
// FOLLOW EVENT
// ============================================================

async function handleFollow(event: any) {
  const userId = event.source.userId
  await sendLineMessage(userId,
    `歡迎加入振禹企業系統！\n\n` +
    `📋 綁定方式：\n` +
    `請直接回覆您的員工代碼（例如：70231）\n\n` +
    `綁定後即可在系統接收通知。`)
}

// ============================================================
// CAPACITY FUNCTIONS — 直接操作 Capacity DB
// ============================================================

const PLANT_NAMES: Record<string, string> = {
  'OPS': '管理部', 'GAOSHI': '高獅廠', 'GAOSHANG': '高上廠', 'JAPAN': '日本廠', 'RH': '越南廠'
}

async function bindBySalesCode(capacity: SupabaseClient, userId: string, code: string) {
  const { data: person } = await capacity
    .from('company_personnel')
    .select('*')
    .eq('sales_code', code)
    .eq('is_active', true)
    .maybeSingle()

  if (person) {
    await capacity.from('company_personnel')
      .update({ line_user_id: userId, updated_at: new Date().toISOString() })
      .eq('id', person.id)
    await sendLineMessage(userId, `✅ 業務綁定成功！\n\n姓名：${person.name}\n代碼：${code}`)
  } else {
    await sendLineMessage(userId, `❌ 找不到業務代碼：${code}\n\n請改用員工代碼綁定。`)
  }
}

// === Audio (voice work order) ===
async function handleAudioMessage(capacity: SupabaseClient, event: any) {
  const userId = event.source.userId
  const messageId = event.message.id
  const googleKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GEMINI_API_KEY

  if (!googleKey) {
    await sendLineMessage(userId, '❌ 語音建單功能尚未設定 (missing GOOGLE_API_KEY)')
    return
  }

  await sendLineMessage(userId, '🎙️ 收到語音，正在處理中...')

  try {
    const audioBuffer = await downloadLineContent(messageId)
    const result = await geminiProcessAudio(audioBuffer, googleKey)

    if (!result) { await sendLineMessage(userId, '❌ 無法辨識語音內容，請重新錄音。'); return }

    const { transcript, parsed } = result
    if (!parsed || !parsed.wo_no) {
      await sendLineMessage(userId,
        `📝 語音轉文字結果：\n${transcript}\n\n❌ 無法解析出完整的工單資訊，請重新錄音。\n\n💡 請依序唸出：工單號碼、客戶名稱、開單日期、交期、品名、數量、產品類別`)
      return
    }

    if (parsed.customer_name && !parsed.customer_code) {
      const { data: customer } = await capacity
        .from('customers')
        .select('code')
        .ilike('name', `%${parsed.customer_name}%`)
        .limit(1)
        .maybeSingle()
      if (customer) parsed.customer_code = customer.code
    }

    await capacity.from('voice_wo_pending').insert({
      line_user_id: userId,
      sales_code: parsed.wo_no.slice(-1).toUpperCase(),
      raw_transcript: transcript,
      parsed_data: parsed,
      status: 'pending_confirm'
    })

    await sendLineMessage(userId,
      `📋 語音建單 — 請確認：\n\n` +
      `工單號碼：${parsed.wo_no}\n` +
      `客戶名稱：${parsed.customer_name || '(未識別)'}${parsed.customer_code ? ` [${parsed.customer_code}]` : ''}\n` +
      `開單日期：${parsed.date_open || '(未識別)'}\n` +
      `交　　期：${parsed.date_due || '(未識別)'}\n` +
      `品　　名：${parsed.item_name || '(未識別)'}\n` +
      `數　　量：${parsed.qty_total || '(未識別)'}\n` +
      `產品類別：${parsed.product_category || '(未識別)'}\n` +
      `廠　　別：${parsed.plant_code || 'GAOSHI'}\n\n` +
      `✅ 回覆「確認」建單\n❌ 回覆「取消」重來`)
  } catch (error) {
    console.error('Voice WO error:', error)
    await sendLineMessage(userId, '❌ 處理語音時發生錯誤，請稍後重試。')
  }
}

// === Postback ===
async function handlePostback(capacity: SupabaseClient, event: any) {
  const userId = event.source.userId
  const params = new URLSearchParams(event.postback.data)
  const action = params.get('action')
  const woNo = params.get('wo_no')

  if (action === 'voice_create' && woNo) {
    await sendLineMessage(userId,
      `🎙️ 語音建單模式\n\n工單號碼：${woNo}\n\n請錄一段語音，依序唸出：\n1. 工單號碼（${woNo}）\n2. 客戶名稱\n3. 開單日期\n4. 交期\n5. 品名\n6. 數量\n7. 產品類別\n\n錄完直接傳送即可！`)
  }
  if (action === 'ignore_wo' && woNo) {
    await capacity.from('audit_notifications').update({ status: 'ignored', ignored_at: new Date().toISOString() }).eq('wo_no', woNo)
    await sendLineMessage(userId, `✅ 已忽略 ${woNo}，不再提醒。`)
  }
  if (action === 'confirm_wo') await confirmPendingVoiceWO(capacity, userId)
  if (action === 'cancel_wo') await cancelPendingVoiceWO(capacity, userId)
  if (action === 'ot_select_slot') { const slot = params.get('slot'); if (slot) await handleOvertimeSlotSelect(capacity, userId, slot) }
  if (action === 'ot_select_wo') { const wo = params.get('wo_no'); if (wo) await handleOvertimeWoSelect(capacity, userId, wo) }
  if (action === 'ot_confirm') await handleOvertimeConfirm(capacity, userId)
  if (action === 'ot_cancel') { await capacity.from('overtime_draft').delete().eq('line_user_id', userId); await sendLineMessage(userId, '已取消加班申請。') }
  if (action === 'ot_wo_done') await handleOvertimeWoDone(capacity, userId)
  if (action === 'ot_wo_manual') { await capacity.from('overtime_draft').update({ step: 'manual_wo' }).eq('line_user_id', userId); await sendLineMessage(userId, '請直接輸入工單號碼（如 0505K），輸入完成後傳送「完成」。') }
  if (action === 'ot_approve' || action === 'ot_reject') { const otId = params.get('id'); if (otId) await handleSupervisorDecision(capacity, userId, otId, action === 'ot_approve' ? 'approved' : 'rejected') }
}

// === Group join ===
async function handleGroupJoin(capacity: SupabaseClient, event: any) {
  const groupId = event.source.groupId
  await capacity.from('system_settings').upsert({
    setting_key: 'line_supervisor_group_id',
    setting_value: groupId,
    description: 'LINE supervisor group ID',
    updated_at: new Date().toISOString()
  }, { onConflict: 'setting_key' })
  await sendLineMessage(groupId, `✅ THERMOTECH回報系統已加入群組！\n每天18:00會自動發送回報檢查結果。`)
}

// === Voice WO confirm/cancel ===
async function confirmPendingVoiceWO(capacity: SupabaseClient, userId: string) {
  const { data: pending } = await capacity
    .from('voice_wo_pending')
    .select('*')
    .eq('line_user_id', userId)
    .eq('status', 'pending_confirm')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!pending) { await sendLineMessage(userId, '⚠️ 沒有待確認的語音建單。'); return }

  const p = pending.parsed_data
  const woPayload = {
    wo_no: p.wo_no,
    customer_code: p.customer_code || p.customer_name?.slice(0, 6)?.toUpperCase() || 'UNKNOWN',
    customer_name: p.customer_name || '',
    plant_code: p.plant_code || 'GAOSHI',
    product_category: p.product_category || 'OTHER',
    item_name: p.item_name || p.wo_no,
    qty_total: Number(p.qty_total) || 1,
    date_open: p.date_open || new Date().toISOString().split('T')[0],
    date_due: p.date_due || '',
    priority: 0,
    note: `[語音建單] ${pending.raw_transcript?.slice(0, 100) || ''}`
  }

  try {
    const res = await fetch(`${CAPACITY_APP_URL}/api/workorders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(woPayload)
    })
    const result = await res.json()

    if (res.ok && (result.success || result.id)) {
      await capacity.from('voice_wo_pending').update({ status: 'confirmed', confirmed_at: new Date().toISOString() }).eq('id', pending.id)
      await capacity.from('audit_notifications').update({ status: 'created', created_wo_at: new Date().toISOString() }).eq('wo_no', p.wo_no)
      await sendLineMessage(userId, `✅ 建單完成！\n\n工單號碼：${p.wo_no}\n客　　戶：${p.customer_name || woPayload.customer_code}\n數　　量：${woPayload.qty_total}\n\n📋 已建立至 Capacity 系統`)
    } else {
      await sendLineMessage(userId, `❌ 建單失敗：${result.error || 'Unknown error'}\n\n請至網頁手動建單。`)
    }
  } catch (error) {
    console.error('Voice WO create error:', error)
    await sendLineMessage(userId, '❌ 建單時發生網路錯誤，請稍後重試。')
  }
}

async function cancelPendingVoiceWO(capacity: SupabaseClient, userId: string) {
  await capacity.from('voice_wo_pending').update({ status: 'cancelled' }).eq('line_user_id', userId).eq('status', 'pending_confirm')
  await sendLineMessage(userId, '❌ 已取消語音建單，您可以重新錄音。')
}

// ============================================================
// OVERTIME FUNCTIONS
// ============================================================

const SHIFT_SLOTS: Record<string, { label: string; slots: { value: string; label: string }[] }> = {
  early:     { label: '早班(8:00)',  slots: [{ value: '17:00-18:30', label: '17:00-18:30' }, { value: '18:30-20:00', label: '18:30-20:00' }] },
  normal:    { label: '正常班',       slots: [{ value: '18:30-20:00', label: '18:30-20:00' }, { value: '20:00-22:00', label: '20:00-22:00' }] },
  late:      { label: '9:00班',      slots: [{ value: '19:00-20:30', label: '19:00-20:30' }, { value: '20:30-22:30', label: '20:30-22:30' }] },
  late_plus: { label: '9:30班',      slots: [{ value: '19:30-21:00', label: '19:30-21:00' }, { value: '21:00-23:00', label: '21:00-23:00' }] },
  exempt:    { label: '免打卡',       slots: [{ value: '18:30-20:00', label: '18:30-20:00' }, { value: '20:00-22:00', label: '20:00-22:00' }] },
}

async function startOvertimeApplication(capacity: SupabaseClient, userId: string) {
  const { data: person } = await capacity
    .from('company_personnel')
    .select('id, name, employee_code, plant_code, shift_type')
    .eq('line_user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (!person) { await sendLineMessage(userId, '請先完成員工綁定，再申請加班。'); return }

  try { await capacity.from('overtime_draft').delete().eq('line_user_id', userId) } catch { /* ignore */ }

  const today = new Date().toISOString().split('T')[0]
  const { error } = await capacity.from('overtime_draft').insert({
    line_user_id: userId, employee_id: person.id, employee_name: person.name,
    employee_code: person.employee_code, plant_code: person.plant_code,
    work_date: today, step: 'select_slot', selected_slots: [], selected_wos: [],
  })

  if (error) { await sendLineMessage(userId, `建立申請草稿失敗：${error.message}`); return }

  const shift = person.shift_type || 'normal'
  const config = SHIFT_SLOTS[shift] || SHIFT_SLOTS.normal

  const slotButtons = config.slots.map(s => ({ type: 'button', style: 'primary', color: '#b8a588', action: { type: 'postback', label: s.label, data: `action=ot_select_slot&slot=${s.value}` } }))
  const bothBtn = { type: 'button', style: 'primary', color: '#b8a588', action: { type: 'postback', label: '兩段都加', data: `action=ot_select_slot&slot=${config.slots.map(s => s.value).join('+')}` } }
  const cancelBtn = { type: 'button', style: 'secondary', action: { type: 'postback', label: '取消', data: 'action=ot_cancel' } }

  await sendLineFlex(userId, {
    type: 'bubble', size: 'kilo',
    header: { type: 'box', layout: 'vertical', contents: [{ type: 'text', text: '加班申請', weight: 'bold', size: 'md' }] },
    body: { type: 'box', layout: 'vertical', spacing: 'sm', contents: [
      { type: 'text', text: `${person.name}（${config.label}）`, size: 'sm', color: '#b8a588' },
      { type: 'text', text: `日期：${today}`, size: 'sm', color: '#aaaaaa' },
      { type: 'separator', margin: 'md' },
      { type: 'text', text: '選擇加班時段：', size: 'sm', margin: 'md' },
    ]},
    footer: { type: 'box', layout: 'vertical', spacing: 'sm', contents: [...slotButtons, bothBtn, cancelBtn] }
  })
}

async function handleOvertimeSlotSelect(capacity: SupabaseClient, userId: string, slot: string) {
  const slots = slot.split('+')
  await capacity.from('overtime_draft').update({ selected_slots: slots, step: 'select_wo' }).eq('line_user_id', userId)

  const { data: draft } = await capacity.from('overtime_draft').select('plant_code').eq('line_user_id', userId).maybeSingle()

  let woQuery = capacity.from('workorders').select('wo_no, item_name, customers(name)').in('status', ['in_progress', 'open', 'hold']).order('wo_no', { ascending: false }).limit(20)
  if (draft?.plant_code) {
    const { data: plant } = await capacity.from('plants').select('id').eq('code', draft.plant_code).maybeSingle()
    if (plant) woQuery = woQuery.eq('plant_id', plant.id)
  }

  const { data: workorders } = await woQuery
  const wos = (workorders || []).filter((wo: any) => !wo.wo_no.includes('-'))

  if (wos.length === 0) {
    await sendLineMessage(userId, `已選擇時段：${slots.join('、')}\n\n該廠區目前無進行中工單，請直接輸入工單號碼（如 0505K），輸入完成後傳送「完成」。`)
    await capacity.from('overtime_draft').update({ step: 'manual_wo' }).eq('line_user_id', userId)
    return
  }

  const woButtons = wos.slice(0, 10).map((wo: any) => ({
    type: 'button', style: 'secondary', height: 'sm',
    action: { type: 'postback', label: `${wo.wo_no.slice(-7)} ${((wo.customers as any)?.name || '').slice(0, 6)}`, data: `action=ot_select_wo&wo_no=${wo.wo_no}` }
  }))

  await sendLineFlex(userId, {
    type: 'bubble', size: 'mega',
    header: { type: 'box', layout: 'vertical', contents: [
      { type: 'text', text: '選擇加班工單', weight: 'bold', size: 'md' },
      { type: 'text', text: `時段：${slots.join('、')}`, size: 'xs', color: '#aaaaaa' },
    ]},
    body: { type: 'box', layout: 'vertical', spacing: 'xs', contents: woButtons.length > 0 ? woButtons : [{ type: 'text', text: '無工單', size: 'sm' }] },
    footer: { type: 'box', layout: 'vertical', spacing: 'sm', contents: [
      { type: 'button', style: 'primary', color: '#b8a588', action: { type: 'postback', label: '選完送出', data: 'action=ot_wo_done' } },
      { type: 'button', style: 'secondary', action: { type: 'postback', label: '手動輸入工單', data: 'action=ot_wo_manual' } },
      { type: 'button', style: 'secondary', action: { type: 'postback', label: '取消', data: 'action=ot_cancel' } },
    ]}
  })
}

async function handleOvertimeWoSelect(capacity: SupabaseClient, userId: string, woNo: string) {
  const { data: draft } = await capacity.from('overtime_draft').select('selected_wos').eq('line_user_id', userId).maybeSingle()
  if (!draft) return
  const wos = new Set(draft.selected_wos || [])
  if (wos.has(woNo)) { wos.delete(woNo) } else { wos.add(woNo) }
  await capacity.from('overtime_draft').update({ selected_wos: Array.from(wos) }).eq('line_user_id', userId)
  await sendLineMessage(userId, `已選擇 ${wos.size} 張工單：${Array.from(wos).map(w => (w as string).slice(-7)).join('、') || '(無)'}`)
}

async function handleManualWoInput(capacity: SupabaseClient, userId: string, text: string, draft: any) {
  const year = new Date().getFullYear().toString()
  let woNo = text.trim()
  if (/^\d{4,6}[A-Za-z]\d{0,2}$/.test(woNo)) woNo = year + woNo
  woNo = woNo.toUpperCase()

  const wos = new Set(draft.selected_wos || [])
  wos.add(woNo)
  await capacity.from('overtime_draft').update({ selected_wos: Array.from(wos) }).eq('line_user_id', userId)
  await sendLineMessage(userId, `已加入 ${woNo.slice(-7)}，目前 ${wos.size} 張工單。\n繼續輸入或傳送「完成」。`)
}

async function handleOvertimeWoDone(capacity: SupabaseClient, userId: string) {
  const { data: draft } = await capacity.from('overtime_draft').select('*').eq('line_user_id', userId).maybeSingle()
  if (!draft) { await sendLineMessage(userId, '找不到加班申請草稿，請重新申請。'); return }

  const slots = (draft.selected_slots || []).join('、')
  const wos = (draft.selected_wos || []).map((w: string) => w.slice(-7)).join('、') || '未指定'

  await sendLineFlex(userId, {
    type: 'bubble', size: 'kilo',
    header: { type: 'box', layout: 'vertical', contents: [{ type: 'text', text: '確認加班申請', weight: 'bold', size: 'md' }] },
    body: { type: 'box', layout: 'vertical', spacing: 'sm', contents: [
      { type: 'text', text: `人員：${draft.employee_name}`, size: 'sm' },
      { type: 'text', text: `日期：${draft.work_date}`, size: 'sm' },
      { type: 'text', text: `時段：${slots}`, size: 'sm' },
      { type: 'text', text: `工單：${wos}`, size: 'sm', wrap: true },
    ]},
    footer: { type: 'box', layout: 'horizontal', spacing: 'sm', contents: [
      { type: 'button', style: 'primary', color: '#b8a588', action: { type: 'postback', label: '送出', data: 'action=ot_confirm' } },
      { type: 'button', style: 'secondary', action: { type: 'postback', label: '取消', data: 'action=ot_cancel' } },
    ]}
  })
}

async function handleOvertimeConfirm(capacity: SupabaseClient, userId: string) {
  const { data: draft } = await capacity.from('overtime_draft').select('*').eq('line_user_id', userId).maybeSingle()
  if (!draft) { await sendLineMessage(userId, '找不到加班申請草稿。'); return }

  const { data: otReq, error } = await capacity.from('overtime_requests').insert({
    employee_id: draft.employee_id, employee_name: draft.employee_name,
    employee_code: draft.employee_code, plant_code: draft.plant_code,
    work_date: draft.work_date, time_slots: draft.selected_slots,
    wo_nos: draft.selected_wos, status: 'pending',
  }).select().single()

  if (error) { await sendLineMessage(userId, `申請失敗：${error.message}`); return }

  await capacity.from('overtime_draft').delete().eq('line_user_id', userId)
  await sendLineMessage(userId,
    `加班申請已送出\n\n日期：${draft.work_date}\n時段：${(draft.selected_slots || []).join('、')}\n工單：${(draft.selected_wos || []).map((w: string) => w.slice(-7)).join('、') || '未指定'}\n\n等待主管審核。`)

  // Notify supervisors
  const { data: supervisors } = await capacity
    .from('company_personnel')
    .select('line_user_id, name')
    .eq('is_supervisor', true)
    .eq('is_active', true)
    .not('line_user_id', 'is', null)

  for (const sup of (supervisors || []).filter((s: any) => s.line_user_id)) {
    await sendLineFlex(sup.line_user_id, {
      type: 'bubble', size: 'kilo',
      header: { type: 'box', layout: 'vertical', contents: [{ type: 'text', text: '加班申請待審核', weight: 'bold', size: 'md', color: '#b8a588' }] },
      body: { type: 'box', layout: 'vertical', spacing: 'sm', contents: [
        { type: 'text', text: `人員：${draft.employee_name}`, size: 'sm' },
        { type: 'text', text: `日期：${draft.work_date}`, size: 'sm' },
        { type: 'text', text: `時段：${(draft.selected_slots || []).join('、')}`, size: 'sm' },
        { type: 'text', text: `工單：${(draft.selected_wos || []).map((w: string) => w.slice(-7)).join('、') || '未指定'}`, size: 'sm', wrap: true },
      ]},
      footer: { type: 'box', layout: 'horizontal', spacing: 'sm', contents: [
        { type: 'button', style: 'primary', color: '#06C755', action: { type: 'postback', label: '核准', data: `action=ot_approve&id=${otReq.id}` } },
        { type: 'button', style: 'primary', color: '#FF4444', action: { type: 'postback', label: '駁回', data: `action=ot_reject&id=${otReq.id}` } },
      ]}
    })
  }
}

async function handleSupervisorDecision(capacity: SupabaseClient, userId: string, otId: string, decision: 'approved' | 'rejected') {
  const { data: sup } = await capacity.from('company_personnel').select('name, is_supervisor').eq('line_user_id', userId).maybeSingle()
  if (!sup?.is_supervisor) { await sendLineMessage(userId, '您沒有審核權限。'); return }

  const { data: otReq, error } = await capacity.from('overtime_requests')
    .update({ status: decision, approved_by: sup.name, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', otId).eq('status', 'pending').select().single()

  if (error || !otReq) { await sendLineMessage(userId, '此申請已處理或不存在。'); return }

  const statusText = decision === 'approved' ? '已核准' : '已駁回'
  await sendLineMessage(userId, `${statusText} ${otReq.employee_name} 的加班申請（${otReq.work_date}）`)

  if (otReq.employee_id) {
    const { data: emp } = await capacity.from('company_personnel').select('line_user_id').eq('id', otReq.employee_id).maybeSingle()
    if (emp?.line_user_id) {
      await sendLineMessage(emp.line_user_id, `加班申請${statusText}\n\n日期：${otReq.work_date}\n時段：${(otReq.time_slots || []).join('、')}\n審核人：${sup.name}`)
    }
  }
}

async function handleProgressReport(capacity: SupabaseClient, userId: string, woInput: string, qty: number) {
  const year = new Date().getFullYear().toString()
  let woNo = woInput.trim().toUpperCase()
  if (/^\d{4,6}[A-Za-z]\d{0,2}$/.test(woNo)) woNo = year + woNo

  const { data: wo } = await capacity.from('workorders').select('id, wo_no, qty_total').eq('wo_no', woNo).maybeSingle()
  if (!wo) { await sendLineMessage(userId, `找不到工單 ${woNo}，請確認號碼是否正確。\n\n格式：回報 工單號碼,數量\n範例：回報 20260505K,23`); return }

  const today = new Date().toISOString().split('T')[0]
  const { data: person } = await capacity.from('company_personnel').select('id').eq('line_user_id', userId).maybeSingle()
  if (person) {
    await capacity.from('overtime_requests')
      .update({ actual_qty: qty, updated_at: new Date().toISOString() })
      .eq('employee_id', person.id).eq('work_date', today).eq('status', 'approved')
  }
  await sendLineMessage(userId, `回報成功\n\n工單：${wo.wo_no}\n回報數量：${qty} 件`)
}

// ============================================================
// LINE API HELPERS
// ============================================================

async function sendLineMessage(to: string, message: string) {
  if (!LINE_CHANNEL_ACCESS_TOKEN || !to) return
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
    body: JSON.stringify({ to, messages: [{ type: 'text', text: message }] }),
  })
  if (!res.ok) console.error('LINE send failed:', await res.text())
}

async function sendLineFlex(to: string, flex: any) {
  if (!LINE_CHANNEL_ACCESS_TOKEN || !to) return
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
    body: JSON.stringify({ to, messages: [{ type: 'flex', altText: flex.header?.contents?.[0]?.text || '系統通知', contents: flex }] }),
  })
  if (!res.ok) console.error('LINE Flex send failed:', await res.text())
}

async function downloadLineContent(messageId: string): Promise<Buffer> {
  const response = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
    headers: { Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` }
  })
  if (!response.ok) throw new Error('Failed to download LINE content')
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

async function geminiProcessAudio(audioBuffer: Buffer, apiKey: string): Promise<{ transcript: string; parsed: any } | null> {
  const currentYear = new Date().getFullYear()
  const audioBase64 = audioBuffer.toString('base64')

  const prompt = `You are processing a voice message from a salesperson at a Taiwanese manufacturing company (THERMOTECH/振禹企業).

Task 1: Transcribe the audio to Chinese text.
Task 2: Extract structured work order fields from the transcription.

Work order field rules:
- wo_no: 8 digits + 1 letter (e.g. 20260501H). Year is ${currentYear}.
- customer_name: Company name mentioned.
- date_open: Opening date as YYYY-MM-DD. If only month/day, assume year ${currentYear}.
- date_due: Due date as YYYY-MM-DD. Same year assumption.
- item_name: Product/item description.
- qty_total: Integer quantity.
- product_category: e.g. 電熱布包, 保溫布包, 矽膠加熱器, etc.
- plant_code: Default "GAOSHI" unless stated otherwise.

Return ONLY valid JSON (no markdown, no explanation) in this exact format:
{"transcript":"...", "wo_no":"...", "customer_name":"...", "date_open":"...", "date_due":"...", "item_name":"...", "qty_total":0, "product_category":"...", "plant_code":"GAOSHI"}

If a field cannot be determined, set it to null.`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: 'audio/m4a', data: audioBase64 } }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1000 }
        })
      }
    )
    if (!response.ok) { console.error('Gemini error:', await response.text()); return null }
    const result = await response.json()
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    if (!text) return null
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const data = JSON.parse(cleaned)
    return {
      transcript: data.transcript || cleaned,
      parsed: { wo_no: data.wo_no, customer_name: data.customer_name, date_open: data.date_open, date_due: data.date_due, item_name: data.item_name, qty_total: data.qty_total, product_category: data.product_category, plant_code: data.plant_code || 'GAOSHI' }
    }
  } catch (error) { console.error('Gemini process error:', error); return null }
}

// === Health check ===
export async function GET() {
  return NextResponse.json({ ok: true, service: 'ops-line-webhook-central' })
}
