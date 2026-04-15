'use client'

import { useState } from 'react'
import Button from './Button'

// 審核狀態類型
type ApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'published'

interface Announcement {
  id: number
  title: string
  content: string
  type: 'notice' | 'public' | 'urgent'
  publishDate: string
  expireDate?: string
  isPinned: boolean
  isActive: boolean
  createdBy: string
  createdAt: string
  status: ApprovalStatus
  submittedAt?: string
  reviewedBy?: string
  reviewedAt?: string
  rejectReason?: string
}

// 模擬待審核資料
const initialPendingAnnouncements: Announcement[] = [
  {
    id: 3,
    title: '年終獎金發放公告',
    content: '年終獎金將於1月10日發放，請同仁留意。\n\n發放對象：全體正職員工\n計算基準：依年資及考績計算',
    type: 'notice',
    publishDate: '2025-12-20',
    isPinned: false,
    isActive: true,
    createdBy: '人事部',
    createdAt: '2025-12-18',
    status: 'pending',
    submittedAt: '2025/12/18 14:30'
  },
  {
    id: 4,
    title: '春節放假公告',
    content: '春節假期為1/28-2/4，共8天。\n\n注意事項：\n1. 請於放假前完成工作交接\n2. 緊急聯絡人：管理部 林小姐',
    type: 'urgent',
    publishDate: '2025-12-25',
    isPinned: true,
    isActive: true,
    createdBy: '管理部',
    createdAt: '2025-12-17',
    status: 'pending',
    submittedAt: '2025/12/17 09:00'
  },
  {
    id: 7,
    title: '新年度保險更新通知',
    content: '2026年度團體保險將更新，請同仁確認受益人資料。',
    type: 'notice',
    publishDate: '2025-12-22',
    isPinned: false,
    isActive: true,
    createdBy: '會計部',
    createdAt: '2025-12-18',
    status: 'pending',
    submittedAt: '2025/12/18 16:45'
  }
]

export default function AnnouncementReviewPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialPendingAnnouncements)
  const [selectedAnn, setSelectedAnn] = useState<Announcement | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 1500)
  }

  const handleApprove = (ann: Announcement, publishNow: boolean = false) => {
    const action = publishNow ? '核准並發布' : '核准'
    if (!confirm(`確定要${action}「${ann.title}」嗎？`)) return
    
    setAnnouncements(prev => prev.filter(a => a.id !== ann.id))
    setSelectedAnn(null)
    showToast(publishNow ? 'APPROVED & PUBLISHED' : 'APPROVED')
  }

  const handleReject = () => {
    if (!selectedAnn) return
    if (!rejectReason.trim()) {
      alert('請輸入駁回原因')
      return
    }
    
    setAnnouncements(prev => prev.filter(a => a.id !== selectedAnn.id))
    setSelectedAnn(null)
    setShowRejectDialog(false)
    setRejectReason('')
    showToast('REJECTED')
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'notice': return 'NOTICE'
      case 'public': return 'PUBLIC'
      case 'urgent': return 'URGENT'
      default: return type
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'notice': return { bg: '#000080', color: '#FFF' }
      case 'public': return { bg: '#008000', color: '#FFF' }
      case 'urgent': return { bg: '#800000', color: '#FFF' }
      default: return { bg: '#808080', color: '#FFF' }
    }
  }

  const pendingCount = announcements.length

  return (
    <div style={{ fontFamily: 'monospace' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          background: '#000',
          color: '#0F0',
          padding: '4px 12px',
          border: '1px solid #0F0',
          fontSize: '11px',
          fontFamily: 'monospace',
          zIndex: 9999
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="window" style={{ marginBottom: '8px' }}>
        <div className="titlebar" style={{ padding: '2px 8px', fontSize: '10px' }}>
          ANNOUNCEMENT REVIEW - ADMIN ONLY
        </div>
        <div style={{ padding: '8px', fontSize: '11px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              background: pendingCount > 0 ? '#FF8C00' : '#008000',
              color: '#FFF',
              padding: '2px 8px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {pendingCount} 件待審核
            </span>
            {pendingCount === 0 && (
              <span style={{ color: '#008000' }}>✓ 沒有待審核的公告</span>
            )}
          </div>
        </div>
      </div>

      {/* Pending List */}
      <div className="window">
        <div className="titlebar" style={{ padding: '2px 8px', fontSize: '10px' }}>
          PENDING QUEUE
        </div>
        <div className="inset" style={{ background: '#FFF', maxHeight: 'calc(100vh - 350px)', overflowY: 'auto' }}>
          {announcements.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#808080' }}>
              <div style={{ fontSize: '20px', marginBottom: '8px' }}>✓</div>
              <div>所有公告都已審核完畢</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#C0C0C0' }}>
                <tr>
                  <th style={{ width: '25px', padding: '4px', textAlign: 'center', borderBottom: '1px solid #808080' }}>#</th>
                  <th style={{ width: '55px', padding: '4px', textAlign: 'left', borderBottom: '1px solid #808080' }}>TYPE</th>
                  <th style={{ padding: '4px', textAlign: 'left', borderBottom: '1px solid #808080' }}>TITLE</th>
                  <th style={{ width: '55px', padding: '4px', textAlign: 'left', borderBottom: '1px solid #808080' }}>FROM</th>
                  <th style={{ width: '100px', padding: '4px', textAlign: 'center', borderBottom: '1px solid #808080' }}>SUBMITTED</th>
                  <th style={{ width: '140px', padding: '4px', textAlign: 'center', borderBottom: '1px solid #808080' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {announcements.map((ann, index) => {
                  const typeStyle = getTypeColor(ann.type)
                  return (
                    <tr
                      key={ann.id}
                      onMouseEnter={() => setHoveredId(ann.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{
                        borderBottom: '1px solid #E0E0E0',
                        background: hoveredId === ann.id ? '#FFF8E0' : (index % 2 === 0 ? '#FFF' : '#F8F8F8'),
                        transition: 'background 0.1s'
                      }}
                    >
                      <td style={{ padding: '4px', textAlign: 'center', color: '#808080' }}>{index + 1}</td>
                      <td style={{ padding: '4px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '1px 4px',
                          fontSize: '8px',
                          background: typeStyle.bg,
                          color: typeStyle.color,
                          border: '1px solid #000'
                        }}>
                          {getTypeLabel(ann.type)}
                        </span>
                      </td>
                      <td style={{ padding: '4px' }}>
                        {ann.isPinned && <span style={{ color: '#800000', marginRight: '2px' }}>[📌]</span>}
                        <span 
                          style={{ cursor: 'pointer', textDecoration: 'underline' }}
                          onClick={() => setSelectedAnn(ann)}
                        >
                          {ann.title}
                        </span>
                      </td>
                      <td style={{ padding: '4px', fontSize: '9px', color: '#666' }}>
                        {ann.createdBy}
                      </td>
                      <td style={{ padding: '4px', textAlign: 'center', fontSize: '9px', color: '#666' }}>
                        {ann.submittedAt}
                      </td>
                      <td style={{ padding: '4px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '2px', justifyContent: 'center' }}>
                          <button
                            onClick={() => setSelectedAnn(ann)}
                            title="查看詳情"
                            style={{
                              fontSize: '8px',
                              fontFamily: 'monospace',
                              padding: '2px 4px',
                              background: '#C0C0C0',
                              border: '1px solid #808080',
                              cursor: 'pointer'
                            }}
                          >
                            [REVIEW]
                          </button>
                          <button
                            onClick={() => handleApprove(ann, true)}
                            title="直接核准並發布"
                            style={{
                              fontSize: '8px',
                              fontFamily: 'monospace',
                              padding: '2px 4px',
                              background: '#008000',
                              color: '#FFF',
                              border: '1px solid #005000',
                              cursor: 'pointer'
                            }}
                          >
                            [OK]
                          </button>
                          <button
                            onClick={() => { setSelectedAnn(ann); setShowRejectDialog(true) }}
                            title="駁回"
                            style={{
                              fontSize: '8px',
                              fontFamily: 'monospace',
                              padding: '2px 4px',
                              background: '#800000',
                              color: '#FFF',
                              border: '1px solid #500000',
                              cursor: 'pointer'
                            }}
                          >
                            [NO]
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="window" style={{ marginTop: '8px' }}>
        <div className="titlebar" style={{ padding: '2px 8px', fontSize: '9px' }}>INFO</div>
        <div className="inset" style={{ padding: '6px', background: '#FFF', fontSize: '9px' }}>
          <div><strong>審核流程：</strong></div>
          <div style={{ marginLeft: '8px' }}>• 點擊 [REVIEW] 查看公告詳情後再決定</div>
          <div style={{ marginLeft: '8px' }}>• 點擊 [OK] 直接核准並發布</div>
          <div style={{ marginLeft: '8px' }}>• 點擊 [NO] 駁回並填寫原因（HR 可修改後重新提交）</div>
        </div>
      </div>

      {/* Review Dialog */}
      {selectedAnn && !showRejectDialog && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onClick={() => setSelectedAnn(null)}
        >
          <div 
            className="window"
            style={{ width: '550px', maxHeight: '90vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="titlebar" style={{ fontSize: '11px' }}>
              REVIEW: #{selectedAnn.id}
              <span style={{ 
                marginLeft: '8px',
                padding: '1px 6px',
                background: '#FF8C00',
                color: '#FFF',
                fontSize: '9px'
              }}>
                PENDING
              </span>
            </div>
            
            <div style={{ padding: '12px', fontSize: '11px', fontFamily: 'monospace' }}>
              {/* Meta Info */}
              <div style={{ 
                marginBottom: '12px', 
                padding: '8px', 
                background: '#F0F0F0', 
                border: '1px solid #808080',
                fontSize: '10px'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '4px' }}>
                  <span style={{ color: '#808080' }}>提交者：</span>
                  <span>{selectedAnn.createdBy}</span>
                  <span style={{ color: '#808080' }}>提交時間：</span>
                  <span>{selectedAnn.submittedAt}</span>
                  <span style={{ color: '#808080' }}>發布日期：</span>
                  <span>{selectedAnn.publishDate}</span>
                  <span style={{ color: '#808080' }}>類型：</span>
                  <span style={{
                    display: 'inline-block',
                    padding: '1px 6px',
                    background: getTypeColor(selectedAnn.type).bg,
                    color: getTypeColor(selectedAnn.type).color,
                    fontSize: '9px'
                  }}>
                    {getTypeLabel(selectedAnn.type)}
                  </span>
                  <span style={{ color: '#808080' }}>置頂：</span>
                  <span>{selectedAnn.isPinned ? '是' : '否'}</span>
                </div>
              </div>

              {/* Title */}
              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', marginBottom: '2px', color: '#808080' }}>TITLE:</label>
                <div style={{ 
                  padding: '8px', 
                  background: '#FFF', 
                  border: '1px solid #808080',
                  fontWeight: 'bold'
                }}>
                  {selectedAnn.title}
                </div>
              </div>

              {/* Content */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '2px', color: '#808080' }}>CONTENT:</label>
                <div style={{ 
                  padding: '8px', 
                  background: '#FFF', 
                  border: '1px solid #808080',
                  minHeight: '100px',
                  whiteSpace: 'pre-wrap'
                }}>
                  {selectedAnn.content}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '4px' }}>
                <Button 
                  onClick={() => handleApprove(selectedAnn, false)} 
                  style={{ flex: 1, fontSize: '10px', background: '#008080' }}
                >
                  ✓ APPROVE (核准)
                </Button>
                <Button 
                  onClick={() => handleApprove(selectedAnn, true)} 
                  style={{ flex: 1, fontSize: '10px', background: '#008000' }}
                >
                  ✓ APPROVE & PUBLISH
                </Button>
                <Button 
                  onClick={() => setShowRejectDialog(true)} 
                  style={{ flex: 1, fontSize: '10px', background: '#800000', color: '#FFF' }}
                >
                  ✗ REJECT (駁回)
                </Button>
              </div>
              <div style={{ marginTop: '8px' }}>
                <Button onClick={() => setSelectedAnn(null)} style={{ width: '100%', fontSize: '10px' }}>
                  CLOSE
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      {showRejectDialog && selectedAnn && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex: 10001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onClick={() => { setShowRejectDialog(false); setRejectReason('') }}
        >
          <div 
            className="window"
            style={{ width: '400px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="titlebar" style={{ fontSize: '11px', background: '#800000' }}>
              REJECT: {selectedAnn.title}
            </div>
            
            <div style={{ padding: '12px', fontSize: '11px', fontFamily: 'monospace' }}>
              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', marginBottom: '4px' }}>
                  駁回原因 <span style={{ color: '#800000' }}>*</span>
                </label>
                <textarea
                  className="input"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  style={{ width: '100%', fontSize: '11px', minHeight: '80px', resize: 'vertical' }}
                  placeholder="請說明駁回原因，讓提交者知道如何修改..."
                  autoFocus
                />
              </div>
              
              <div style={{ fontSize: '9px', color: '#808080', marginBottom: '12px' }}>
                ※ 駁回後，提交者可以修改內容並重新提交審核
              </div>

              <div style={{ display: 'flex', gap: '4px' }}>
                <Button 
                  onClick={handleReject} 
                  style={{ flex: 1, fontSize: '10px', background: '#800000', color: '#FFF' }}
                >
                  CONFIRM REJECT
                </Button>
                <Button 
                  onClick={() => { setShowRejectDialog(false); setRejectReason('') }} 
                  style={{ flex: 1, fontSize: '10px' }}
                >
                  CANCEL
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}









