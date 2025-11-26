'use client'

import Button from './Button'

interface AnnouncementDetailModalProps {
  isOpen: boolean
  onClose: () => void
  announcement: {
    title: string
    content: string
    postedBy: string
    postedAt: string
    images?: string[]
    links?: string[]
  } | null
  zIndex?: number
  position?: { x: number; y: number }
}

export default function AnnouncementDetailModal({ 
  isOpen, 
  onClose, 
  announcement,
  zIndex = 1001,
  position = { x: 140, y: 140 }
}: AnnouncementDetailModalProps) {
  console.log('[AnnouncementDetailModal] 渲染:', { isOpen, announcement: announcement?.title, zIndex, position })
  
  if (!isOpen || !announcement) return null

  return (
    <>
      {/* 半透明背景 */}
      <div 
        className="fixed inset-0"
        style={{ 
          backgroundColor: 'rgba(0,0,0,0.3)',
          zIndex: zIndex - 1 
        }}
        onClick={onClose}
      />
      
      {/* 視窗 */}
      <div 
        className="window fixed" 
        style={{ 
          left: `${position.x}px`, 
          top: `${position.y}px`,
          width: '600px', 
          maxHeight: '80vh', 
          overflow: 'auto',
          zIndex: zIndex
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="titlebar">
          公告詳情
        </div>

        <div className="p-4 bg-grey-200">
          {/* 標題 */}
          <div className="mb-4 outset p-2">
            <div className="text-bold mb-2">{announcement.title}</div>
            <div className="text-11 text-grey-600 text-mono">
              發布時間: {announcement.postedAt} | 發布人: {announcement.postedBy}
            </div>
          </div>

          {/* 內容 */}
          <div className="inset p-4 bg-white mb-4" style={{ minHeight: '150px' }}>
            <div className="text-11" style={{ whiteSpace: 'pre-wrap' }}>
              {announcement.content}
            </div>
          </div>

          {/* 圖片 */}
          {announcement.images && announcement.images.length > 0 && (
            <div className="mb-4">
              <div className="text-bold mb-2">圖片附件</div>
              <div className="inset p-2 bg-white">
                {announcement.images.map((img, idx) => (
                  <div key={idx} className="mb-2">
                    <img src={img} alt={`附件${idx + 1}`} className="max-w-full" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 連結 */}
          {announcement.links && announcement.links.length > 0 && (
            <div className="mb-4">
              <div className="text-bold mb-2">相關連結</div>
              <div className="inset p-2 bg-white">
                {announcement.links.map((link, idx) => (
                  <div key={idx} className="mb-1">
                    <a 
                      href={link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-11 text-blue-900 underline"
                    >
                      → {link}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 關閉按鈕 */}
          <Button onClick={onClose} className="w-full">
            關閉
          </Button>
        </div>
      </div>
    </>
  )
}

