import DOMPurify from 'isomorphic-dompurify'

// =====================================================================
// 公告內文富文字處理
// - sanitizeRichText：清洗使用者輸入/貼上的 HTML，只保留安全的排版標籤與樣式
//   （粗體、紅字、螢光底色、放大字級…），移除 script / 事件屬性等 XSS 風險
// - richTextToPlainText：把 HTML 轉成乾淨純文字，供 LINE 推播 / 摘要使用
// - isProbablyHtml：粗略判斷字串是否含 HTML 標籤（區分舊純文字內容）
// =====================================================================

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'b', 'strong', 'i', 'em', 'u', 's', 'span', 'br', 'p', 'div',
    'font', 'mark', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'sub', 'sup',
  ],
  ALLOWED_ATTR: ['style', 'color', 'face', 'size', 'href', 'target', 'rel'],
  ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|#)/i,
  // 只允許安全的行內樣式屬性（DOMPurify 會再過濾具體值）
  ALLOWED_STYLE_PROPS: undefined as unknown as string[],
}

export function sanitizeRichText(dirty: string | null | undefined): string {
  if (!dirty) return ''
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: SANITIZE_CONFIG.ALLOWED_TAGS,
    ALLOWED_ATTR: SANITIZE_CONFIG.ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: SANITIZE_CONFIG.ALLOWED_URI_REGEXP,
    // a 連結一律加上 rel/target 安全屬性
    ADD_ATTR: ['target', 'rel'],
  })
}

export function isProbablyHtml(s: string | null | undefined): boolean {
  if (!s) return false
  return /<\/?[a-z][\s\S]*>/i.test(s)
}

/** 把富文字 HTML 轉成純文字：區塊標籤換行、去標籤、還原常見 HTML entity */
export function richTextToPlainText(html: string | null | undefined): string {
  if (!html) return ''
  let s = String(html)
  // 連結：保留網址（LINE 純文字訊息會自動把網址變成可點）
  s = s.replace(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, inner: string) => {
    const label = inner.replace(/<[^>]+>/g, '').trim()
    if (!label || label === href) return href
    return `${label}（${href}）`
  })
  // 區塊/換行標籤 → 換行
  s = s.replace(/<\s*br\s*\/?\s*>/gi, '\n')
  s = s.replace(/<\/\s*(p|div|li|h1|h2|h3|tr)\s*>/gi, '\n')
  s = s.replace(/<\s*li[^>]*>/gi, '・')
  // 去掉其餘所有標籤
  s = s.replace(/<[^>]+>/g, '')
  // 還原常見 entity
  s = s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
  // 收斂多餘空白與空行
  s = s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n')
  return s.trim()
}
