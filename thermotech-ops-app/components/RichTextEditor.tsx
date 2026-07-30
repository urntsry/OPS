'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { sanitizeRichText } from '@/lib/richText'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  rows?: number
  placeholder?: string
  /** 填滿父層剩餘高度（編輯區自動長高，取代固定 maxHeight） */
  fill?: boolean
}

const HILITE = '#FFF275'

// 顏色下拉（值同時對應 lib/lineFlex.ts 的色名，LINE 彩色公告才會一致）
const COLORS: { label: string; value: string }[] = [
  { label: '紅', value: '#D40000' },
  { label: '橘', value: '#E67300' },
  { label: '藍', value: '#005FAF' },
  { label: '綠', value: '#1B7F1B' },
  { label: '紫', value: '#7B2FA0' },
  { label: '黑', value: '#111111' },
]

// 字級 → execCommand fontSize (1..7)
const SIZES: { label: string; value: string }[] = [
  { label: '小', value: '2' },
  { label: '正常', value: '3' },
  { label: '大', value: '5' },
  { label: '特大', value: '6' },
]

// 符號插入組（皆為純文字/Unicode，系統內與 LINE 都能顯示）
const SYMBOL_GROUPS: { title: string; items: string[] }[] = [
  { title: '數字標記', items: ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '一、', '二、', '三、', '四、'] },
  { title: '警示重點', items: ['⚠️', '❗', '❓', '❌', '✅', '✔️', '⭕', '🔴', '🟠', '🟡', '⭐', '🔺', '🔻', '▶️', '‼️', '✖️'] },
  { title: '條列箭頭', items: ['・', '‧', '◆', '◇', '■', '□', '●', '○', '▶', '→', '⇒', '↳', '‣', '★', '☆', '※'] },
  { title: '常用圖示', items: ['📌', '📢', '📣', '🗓️', '⏰', '📝', '☎️', '📞', '✉️', '🔔', '💡', '✍️', '📅', '🈺', '🕐', '🚫'] },
]

type MenuKind = 'color' | 'size' | 'symbol' | null

// Win95 風格
const toolBtn: React.CSSProperties = {
  fontSize: '9px', fontFamily: 'monospace', padding: '2px 6px', cursor: 'pointer',
  background: 'var(--bg-button, #C0C0C0)', color: 'var(--text-primary)',
  border: '1px solid var(--border-mid-dark)', minWidth: '22px', lineHeight: 1.4,
}
const groupSep: React.CSSProperties = {
  width: '1px', alignSelf: 'stretch', background: 'var(--border-mid-dark)', margin: '0 2px',
}
const popover: React.CSSProperties = {
  position: 'absolute', top: '100%', left: 0, marginTop: '2px', zIndex: 50,
  background: 'var(--bg-window, #C0C0C0)', border: '2px solid var(--border-mid-dark)',
  boxShadow: '2px 2px 0 rgba(0,0,0,0.35)', padding: '4px',
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export default function RichTextEditor({ value, onChange, rows = 6, placeholder, fill = false }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [menu, setMenu] = useState<MenuKind>(null)

  // 只在外部 value 與目前內容不同步時才回填（避免游標跳動）
  useEffect(() => {
    const el = ref.current
    if (el && el.innerHTML !== value) {
      el.innerHTML = value || ''
    }
  }, [value])

  // 點編輯器外面就關閉下拉
  useEffect(() => {
    if (!menu) return
    const onDocDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMenu(null)
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [menu])

  const emit = useCallback(() => {
    if (ref.current) onChange(ref.current.innerHTML)
  }, [onChange])

  const exec = useCallback((command: string, arg?: string) => {
    ref.current?.focus()
    document.execCommand(command, false, arg)
    emit()
  }, [emit])

  const insertText = useCallback((s: string) => {
    ref.current?.focus()
    if (!document.execCommand('insertText', false, s)) {
      document.execCommand('insertHTML', false, escapeHtml(s))
    }
    emit()
  }, [emit])

  const onPaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault()
    const html = e.clipboardData.getData('text/html')
    const text = e.clipboardData.getData('text/plain')
    const toInsert = html
      ? sanitizeRichText(html)
      : escapeHtml(text).replace(/\r?\n/g, '<br>')
    document.execCommand('insertHTML', false, toInsert)
    emit()
  }, [emit])

  // 讓工具列按鈕不搶走編輯器的文字選取（顏色/字級才會套在選取字上）
  const keepSelection = (e: React.MouseEvent) => e.preventDefault()

  const toggleMenu = (kind: Exclude<MenuKind, null>) => setMenu(m => (m === kind ? null : kind))

  return (
    <div ref={wrapRef} style={{ border: '1px solid var(--border-mid-dark)', ...(fill ? { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 } : {}) }}>
      {/* 工具列 */}
      <div style={{ display: 'flex', gap: '3px', padding: '3px', flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-window, #C0C0C0)', borderBottom: '1px solid var(--border-mid-dark)', flexShrink: 0 }}>
        {/* 基本格式 */}
        <button type="button" title="粗體" onMouseDown={keepSelection} onClick={() => exec('bold')} style={{ ...toolBtn, fontWeight: 'bold' }}>B</button>
        <button type="button" title="底線" onMouseDown={keepSelection} onClick={() => exec('underline')} style={{ ...toolBtn, textDecoration: 'underline' }}>U</button>
        <button type="button" title="螢光底色（LINE 上會顯示為橘字）" onMouseDown={keepSelection} onClick={() => exec('hiliteColor', HILITE)} style={{ ...toolBtn, background: HILITE }}>螢光</button>

        <span style={groupSep} />

        {/* 顏色下拉 */}
        <div style={{ position: 'relative' }}>
          <button type="button" title="文字顏色" onMouseDown={keepSelection} onClick={() => toggleMenu('color')} style={toolBtn}>顏色 ▾</button>
          {menu === 'color' && (
            <div style={{ ...popover, display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: '3px' }}>
              {COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  onMouseDown={keepSelection}
                  onClick={() => { exec('foreColor', c.value); setMenu(null) }}
                  style={{ ...toolBtn, color: c.value, fontWeight: 'bold', minWidth: '30px' }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 字級下拉 */}
        <div style={{ position: 'relative' }}>
          <button type="button" title="字級大小" onMouseDown={keepSelection} onClick={() => toggleMenu('size')} style={toolBtn}>字級 ▾</button>
          {menu === 'size' && (
            <div style={{ ...popover, display: 'flex', flexDirection: 'column', gap: '3px', minWidth: '54px' }}>
              {SIZES.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onMouseDown={keepSelection}
                  onClick={() => { exec('fontSize', s.value); setMenu(null) }}
                  style={toolBtn}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <span style={groupSep} />

        {/* 清單 */}
        <button type="button" title="項目清單（•）" onMouseDown={keepSelection} onClick={() => exec('insertUnorderedList')} style={toolBtn}>• 清單</button>
        <button type="button" title="編號清單（1. 2. 3.）" onMouseDown={keepSelection} onClick={() => exec('insertOrderedList')} style={toolBtn}>1. 編號</button>

        <span style={groupSep} />

        {/* 符號插入 */}
        <div style={{ position: 'relative' }}>
          <button type="button" title="插入符號" onMouseDown={keepSelection} onClick={() => toggleMenu('symbol')} style={toolBtn}>符號 ▾</button>
          {menu === 'symbol' && (
            <div style={{ ...popover, width: '240px', maxHeight: '220px', overflowY: 'auto' }}>
              {SYMBOL_GROUPS.map(g => (
                <div key={g.title} style={{ marginBottom: '4px' }}>
                  <div style={{ fontSize: '8px', color: 'var(--text-muted)', margin: '2px 0' }}>{g.title}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                    {g.items.map(sym => (
                      <button
                        key={sym}
                        type="button"
                        onMouseDown={keepSelection}
                        onClick={() => insertText(sym)}
                        style={{ ...toolBtn, minWidth: '24px', fontSize: '13px', padding: '1px 4px' }}
                      >
                        {sym}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <span style={groupSep} />

        <button type="button" title="清除格式" onMouseDown={keepSelection} onClick={() => exec('removeFormat')} style={toolBtn}>清除格式</button>
      </div>

      {/* 編輯區 */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        onPaste={onPaste}
        data-placeholder={placeholder}
        style={{
          ...(fill
            ? { flex: 1, minHeight: 0, maxHeight: 'none' }
            : { minHeight: `${rows * 18}px`, maxHeight: '260px' }),
          overflowY: 'auto',
          fontSize: '10px', fontFamily: 'monospace', lineHeight: 1.5,
          padding: '4px 6px', background: 'var(--bg-input)', color: 'var(--text-primary)',
          outline: 'none', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}
      />
    </div>
  )
}
