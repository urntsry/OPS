// 批次產生「唯一初始密碼」工具
// 用途：上線前，為每位非 admin 員工各產生一組隨機初始密碼，
//       設定 must_change_password=true（首次登入會被強制改密），
//       並輸出 CSV（員工編號,姓名,部門,初始密碼）供發放。
//
// 執行：
//   node scripts/generate_initial_passwords.mjs            # 產生並寫入 DB + 輸出 CSV
//   node scripts/generate_initial_passwords.mjs --dry-run  # 只試跑、不寫入 DB
//   node scripts/generate_initial_passwords.mjs --include-admins  # 連 admin 也重設（預設不含）
//
// 需要環境變數（自動讀取 .env.local）：
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// --- 載入 .env.local ---
function loadEnv() {
  const envPath = join(__dirname, '..', '.env.local')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
loadEnv()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY（請確認 .env.local）')
  process.exit(1)
}

const dryRun = process.argv.includes('--dry-run')
const includeAdmins = process.argv.includes('--include-admins')

function genPassword(len = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

const supabase = createClient(url, key)

const { data: profiles, error } = await supabase
  .from('profiles')
  .select('employee_id, full_name, department, role, is_active')
  .order('department').order('employee_id')

if (error) { console.error('讀取 profiles 失敗：', error.message); process.exit(1) }

const targets = profiles.filter(p => p.is_active !== false && (includeAdmins || p.role !== 'admin'))
console.log(`對象人數：${targets.length}（${includeAdmins ? '含' : '不含'} admin）${dryRun ? ' [DRY RUN]' : ''}`)

const rows = [['employee_id', 'full_name', 'department', 'role', 'initial_password']]
let ok = 0, fail = 0

for (const p of targets) {
  const pw = genPassword()
  if (!dryRun) {
    const { data, error: e } = await supabase.rpc('set_user_password', {
      p_employee_id: p.employee_id,
      p_new_password: pw,
      p_must_change: true,
    })
    if (e || !data) { console.error(`  ✗ ${p.employee_id} ${p.full_name}: ${e?.message || '找不到'}`); fail++; continue }
  }
  rows.push([p.employee_id, p.full_name, p.department || '', p.role, pw])
  ok++
}

const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
const outPath = join(__dirname, '..', `initial_passwords_${new Date().toISOString().slice(0, 10)}.csv`)
writeFileSync(outPath, '\uFEFF' + csv, 'utf-8') // BOM 讓 Excel 正確顯示中文

console.log(`完成：成功 ${ok}、失敗 ${fail}`)
console.log(`CSV 已輸出：${outPath}`)
console.log('請妥善保管並逐一發放，發放後建議刪除此 CSV。')
