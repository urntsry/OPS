// =====================================================================
// 公告 HTML → LINE Flex Message 轉換
//
// 目的：讓公告推到 LINE 時也能有顏色、粗體、字級、清單。
// 限制：
//  - LINE Flex 的行內文字（span）不支援底色，故「螢光標示」一律改成「橘色文字」代替。
//  - 單則 Flex 有大小上限（約 10KB），過長會回傳 null，由呼叫端 fallback 成純文字。
//
// 使用時機：在瀏覽器端（發布公告時）呼叫，因此可用 DOMParser。
// =====================================================================

const HILITE_FALLBACK_COLOR = '#E67300' // 螢光 → 橘色文字（Flex 不支援行內底色）
const DEFAULT_TEXT_COLOR = '#111111'

export interface FlexSpan {
  type: 'span'
  text: string
  color?: string
  size?: string
  weight?: 'regular' | 'bold'
  decoration?: 'none' | 'underline' | 'line-through'
  style?: 'normal' | 'italic'
}

interface LineSpans { spans: FlexSpan[] }

interface StyleCtx {
  color?: string
  bold?: boolean
  underline?: boolean
  strike?: boolean
  italic?: boolean
  size?: string
}

function rgbToHex(v: string): string | undefined {
  const m = v.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  if (!m) return undefined
  const [r, g, b] = [m[1], m[2], m[3]].map(n => Math.max(0, Math.min(255, parseInt(n, 10))))
  return '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('').toUpperCase()
}

function normalizeColor(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined
  const v = raw.trim()
  if (!v || v === 'inherit' || v === 'transparent') return undefined
  if (v.startsWith('#')) return v.length === 4
    ? '#' + v.slice(1).split('').map(c => c + c).join('').toUpperCase()
    : v.toUpperCase()
  if (v.toLowerCase().startsWith('rgb')) return rgbToHex(v)
  // 常見色名對應
  const named: Record<string, string> = {
    red: '#D40000', blue: '#005FAF', green: '#1B7F1B', orange: '#E67300',
    black: '#111111', white: '#FFFFFF', yellow: '#E6B800', purple: '#7B2FA0', gray: '#666666', grey: '#666666',
  }
  return named[v.toLowerCase()]
}

// 把各種字級來源對應到 LINE Flex 的 size 關鍵字
function mapFontSize(el: HTMLElement): string | undefined {
  // <font size="1..7">
  const fontSizeAttr = el.getAttribute('size')
  if (fontSizeAttr && /^[1-7]$/.test(fontSizeAttr)) {
    return (['xs', 'sm', 'md', 'lg', 'xl', 'xxl', '3xl'] as const)[parseInt(fontSizeAttr, 10) - 1]
  }
  // style: font-size: Npx
  const fs = el.style?.fontSize
  if (fs) {
    const px = parseFloat(fs)
    if (!isNaN(px)) {
      if (px <= 10) return 'xs'
      if (px <= 13) return 'sm'
      if (px <= 16) return 'md'
      if (px <= 20) return 'lg'
      if (px <= 26) return 'xl'
      return 'xxl'
    }
  }
  return undefined
}

function deriveStyle(el: HTMLElement, parent: StyleCtx): StyleCtx {
  const ctx: StyleCtx = { ...parent }
  const tag = el.tagName.toLowerCase()

  if (tag === 'b' || tag === 'strong') ctx.bold = true
  if (tag === 'i' || tag === 'em') ctx.italic = true
  if (tag === 'u') ctx.underline = true
  if (tag === 's' || tag === 'strike' || tag === 'del') ctx.strike = true

  // font 標籤的 color 屬性
  const colorAttr = el.getAttribute?.('color')
  const attrColor = normalizeColor(colorAttr)
  if (attrColor) ctx.color = attrColor

  // 行內樣式
  const style = el.style
  if (style) {
    const c = normalizeColor(style.color)
    if (c) ctx.color = c
    const fw = style.fontWeight
    if (fw === 'bold' || fw === 'bolder' || (parseInt(fw, 10) >= 600)) ctx.bold = true
    const deco = (style.textDecoration || style.textDecorationLine || '').toLowerCase()
    if (deco.includes('underline')) ctx.underline = true
    if (deco.includes('line-through')) ctx.strike = true
    if ((style.fontStyle || '').toLowerCase() === 'italic') ctx.italic = true
    // 螢光底色 → 改成橘色文字
    const bg = normalizeColor(style.backgroundColor)
    if (bg && bg !== '#FFFFFF') ctx.color = HILITE_FALLBACK_COLOR
  }

  // <mark> → 螢光 → 橘色文字
  if (tag === 'mark') ctx.color = HILITE_FALLBACK_COLOR

  const size = mapFontSize(el)
  if (size) ctx.size = size

  return ctx
}

function ctxToSpan(text: string, ctx: StyleCtx): FlexSpan {
  const span: FlexSpan = { type: 'span', text }
  if (ctx.color) span.color = ctx.color
  if (ctx.size) span.size = ctx.size
  if (ctx.bold) span.weight = 'bold'
  if (ctx.italic) span.style = 'italic'
  if (ctx.underline) span.decoration = 'underline'
  else if (ctx.strike) span.decoration = 'line-through'
  return span
}

const BLOCK_TAGS = new Set(['p', 'div', 'li', 'h1', 'h2', 'h3', 'ul', 'ol', 'tr'])

function parseLines(html: string): LineSpans[] {
  if (typeof DOMParser === 'undefined') return []
  const doc = new DOMParser().parseFromString(`<div id="__root">${html}</div>`, 'text/html')
  const root = doc.getElementById('__root')
  if (!root) return []

  const lines: LineSpans[] = []
  let current: FlexSpan[] = []
  const flush = () => { lines.push({ spans: current }); current = [] }

  const walk = (node: Node, ctx: StyleCtx) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === 3) {
        // 文字節點
        const raw = child.textContent || ''
        if (raw.length === 0) continue
        // 保留內部空白但壓縮全空白
        const text = raw.replace(/\s+/g, ' ')
        if (text.trim() === '' && current.length === 0) continue
        current.push(ctxToSpan(text, ctx))
      } else if (child.nodeType === 1) {
        const el = child as HTMLElement
        const tag = el.tagName.toLowerCase()
        if (tag === 'br') { flush(); continue }
        const isBlock = BLOCK_TAGS.has(tag)
        if (isBlock && current.length > 0) flush()
        const childCtx = deriveStyle(el, ctx)
        if (tag === 'li') current.push({ type: 'span', text: '・' })
        walk(el, childCtx)
        if (isBlock && current.length > 0) flush()
      }
    }
  }

  walk(root, {})
  if (current.length > 0) flush()

  // 過濾整行皆空白者，但保留段落間的單一空行
  const cleaned: LineSpans[] = []
  for (const ln of lines) {
    const textLen = ln.spans.reduce((s, sp) => s + sp.text.trim().length, 0)
    if (textLen === 0) {
      // 避免連續空行
      if (cleaned.length > 0 && cleaned[cleaned.length - 1].spans.length !== 0) cleaned.push({ spans: [] })
    } else {
      cleaned.push(ln)
    }
  }
  return cleaned
}

export interface BuildFlexOptions {
  /** 標題（含 [緊急]/[重要] 前綴） */
  title: string
  /** 標題顏色（緊急→紅） */
  titleColor?: string
  /** 是否需確認已閱 */
  requireAck?: boolean
  /** 系統連結（點擊看完整公告） */
  url?: string | null
}

/**
 * 由公告 HTML 內容建立 LINE Flex bubble。
 * 若內容過大（> 9KB）或無法解析，回傳 null（呼叫端 fallback 純文字）。
 */
export function buildBulletinFlex(contentHtml: string | null | undefined, opts: BuildFlexOptions): object | null {
  const lines = parseLines(contentHtml || '')

  const bodyContents: object[] = [
    {
      type: 'text',
      text: opts.title,
      weight: 'bold',
      size: 'lg',
      wrap: true,
      color: opts.titleColor || '#005FAF',
    },
    { type: 'separator', margin: 'md' },
  ]

  for (const ln of lines) {
    if (ln.spans.length === 0) {
      bodyContents.push({ type: 'text', text: ' ', size: 'xs', wrap: true })
      continue
    }
    bodyContents.push({
      type: 'text',
      wrap: true,
      size: 'sm',
      color: DEFAULT_TEXT_COLOR,
      contents: ln.spans,
    })
  }

  if (opts.requireAck) {
    bodyContents.push({ type: 'separator', margin: 'md' })
    bodyContents.push({ type: 'text', text: '＊ 此公告需確認已閱', size: 'xs', color: '#B00000', wrap: true, margin: 'sm' })
  }

  const bubble: Record<string, unknown> = {
    type: 'bubble',
    size: 'giga',
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: bodyContents,
    },
  }

  if (opts.url) {
    bubble.footer = {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          style: 'primary',
          height: 'sm',
          color: '#005FAF',
          action: { type: 'uri', label: '開啟系統查看', uri: opts.url },
        },
      ],
    }
  }

  // 大小保護：Flex bubble 上限約 10KB
  try {
    if (JSON.stringify(bubble).length > 9000) return null
  } catch {
    return null
  }
  return bubble
}
