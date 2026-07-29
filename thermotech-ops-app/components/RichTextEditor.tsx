'use client'

import { useRef, useEffect, useCallback } from 'react'
import { sanitizeRichText } from '@/lib/richText'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  rows?: number
  placeholder?: string
}

const RED = '#D40000'
const HILITE = '#FFF275'

// 工具列按鈕樣式（Win95 風格）
const toolBtn: React.CSSProperties = {
  fontSize: '9px', fontFamily: 'monospace', padding: '1px 6px', cursor: 'pointer',
  background: 'var(--bg-button, #C0C0C0)', color: 'var(--text-primary)',
  border: '1px solid var(--border-mid-dark)', minWidth: '24px',
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export default function RichTextEditor({ value, onChange, rows = 6, placeholder }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null)

  // 只在外部 value 與目前內容不同步時才回填（避免游標跳動）
  useEffect(() => {
    const el = ref.current
    if (el && el.innerHTML !== value) {
      el.innerHTML = value || ''
    }
  }, [value])

  const emit = useCallback(() => {
    if (ref.current) onChange(ref.current.innerHTML)
  }, [onChange])

  const exec = useCallback((command: string, arg?: string) => {
    ref.current?.focus()
    document.execCommand(command, false, arg)
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

  return (
    <div style={{ border: '1px solid var(--border-mid-dark)' }}>
      <div style={{ display: 'flex', gap: '3px', padding: '3px', flexWrap: 'wrap', background: 'var(--bg-window, #C0C0C0)', borderBottom: '1px solid var(--border-mid-dark)' }}>
        <button type="button" title="粗體" onClick={() => exec('bold')} style={{ ...toolBtn, fontWeight: 'bold' }}>B</button>
        <button type="button" title="紅字（警示重點）" onClick={() => exec('foreColor', RED)} style={{ ...toolBtn, color: RED, fontWeight: 'bold' }}>紅字</button>
        <button type="button" title="螢光底色" onClick={() => exec('hiliteColor', HILITE)} style={{ ...toolBtn, background: HILITE }}>螢光</button>
        <button type="button" title="放大字級" onClick={() => exec('fontSize', '5')} style={toolBtn}>放大</button>
        <button type="button" title="縮小字級" onClick={() => exec('fontSize', '2')} style={toolBtn}>縮小</button>
        <span style={{ width: '1px', background: 'var(--border-mid-dark)', margin: '0 2px' }} />
        <button type="button" title="清除格式" onClick={() => exec('removeFormat')} style={toolBtn}>清除格式</button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        onPaste={onPaste}
        data-placeholder={placeholder}
        style={{
          minHeight: `${rows * 18}px`, maxHeight: '260px', overflowY: 'auto',
          fontSize: '10px', fontFamily: 'monospace', lineHeight: 1.5,
          padding: '4px 6px', background: 'var(--bg-input)', color: 'var(--text-primary)',
          outline: 'none', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}
      />
    </div>
  )
}
