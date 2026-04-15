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
  // 審核相關欄位
  status: ApprovalStatus
  submittedAt?: string
  reviewedBy?: string
  reviewedAt?: string
  rejectReason?: string
}

// 初始模擬資料（含審核狀態）
const initialAnnouncements: Announcement[] = [
  {
    id: 1,
    title: '本週五消防演練通知',
    content: '本週五下午2點將進行消防演練，請全體同仁配合。',
    type: 'notice',
    publishDate: '2025-12-18',
    isPinned: true,
    isActive: true,
    createdBy: '管理部',
    createdAt: '2025-12-15',
    status: 'published',
    reviewedBy: 'Admin',
    reviewedAt: '2025-12-15'
  },
  {
    id: 2,
    title: '12月薪資已發放',
    content: '12月薪資已於今日發放至各位帳戶。',
    type: 'notice',
    publishDate: '2025-12-10',
    isPinned: false,
    isActive: true,
    createdBy: '會計部',
    createdAt: '2025-12-10',
    status: 'published',
    reviewedBy: 'Admin',
    reviewedAt: '2025-12-10'
  },
  {
    id: 3,
    title: '年終獎金發放公告',
    content: '年終獎金將於1月10日發放，請同仁留意。',
    type: 'notice',
    publishDate: '2025-12-20',
    isPinned: false,
    isActive: true,
    createdBy: '人事部',
    createdAt: '2025-12-18',
    status: 'pending',
    submittedAt: '2025-12-18 14:30'
  },
  {
    id: 4,
    title: '春節放假公告',
    content: '春節假期為1/28-2/4，共8天。',
    type: 'urgent',
    publishDate: '2025-12-25',
    isPinned: true,
    isActive: true,
    createdBy: '管理部',
    createdAt: '2025-12-17',
    status: 'pending',
    submittedAt: '2025-12-17 09:00'
  },
  {
    id: 5,
    title: '員工旅遊意見調查',
    content: '請填寫員工旅遊意見調查表。',
    type: 'notice',
    publishDate: '2025-12-15',
    isPinned: false,
    isActive: true,
    createdBy: '人事部',
    createdAt: '2025-12-14',
    status: 'rejected',
    submittedAt: '2025-12-14 10:00',
    reviewedBy: 'Admin',
    reviewedAt: '2025-12-14 11:30',
    rejectReason: '內容不完整，請補充調查截止日期和連結。'
  },
  {
    id: 6,
    title: '新進人員介紹（草稿）',
    content: '歡迎新同事加入...',
    type: 'notice',
    publishDate: '2025-12-20',
    isPinned: false,
    isActive: true,
    createdBy: '人事部',
    createdAt: '2025-12-18',
    status: 'draft'
  }
]

interface AnnouncementManagementPageProps {
  isAdmin?: boolean
}

export default function AnnouncementManagementPage({ isAdmin = false }: AnnouncementManagementPageProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements)
  const [editingAnn, setEditingAnn] = useState<Announcement | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | ApprovalStatus>('all')
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 1500)
  }

  const filteredAnnouncements = announcements.filter(a => {
    if (filterStatus === 'all') return true
    return a.status === filterStatus
  })

  const handleCreate = () => {
    const newAnn: Announcement = {
      id: Date.now(),
      title: '',
      content: '',
      type: 'notice',
      publishDate: new Date().toISOString().split('T')[0],
      isPinned: false,
      isActive: true,
      createdBy: '管理員',
      createdAt: new Date().toISOString().split('T')[0],
      status: 'draft'
    }
    setEditingAnn(newAnn)
    setIsCreating(true)
  }

  const handleSave = (asDraft: boolean = true) => {
    if (!editingAnn) return
    if (!editingAnn.title.trim()) {
      alert('請輸入標題')
      return
    }

    const updatedAnn = { ...editingAnn }
    
    if (!asDraft) {
      // 提交審核
      updatedAnn.status = 'pending'
      updatedAnn.submittedAt = new Date().toLocaleString('zh-TW')
    }

    if (isCreating) {
      setAnnouncements(prev => [updatedAnn, ...prev])
      showToast(asDraft ? 'DRAFT SAVED' : 'SUBMITTED FOR REVIEW')
    } else {
      setAnnouncements(prev => prev.map(a => a.id === updatedAnn.id ? updatedAnn : a))
      showToast(asDraft ? 'SAVED' : 'SUBMITTED FOR REVIEW')
    }
    setEditingAnn(null)
    setIsCreating(false)
  }

  const handleSubmitForReview = (ann: Announcement) => {
    if (!confirm(`確定要提交「${ann.title}」進行審核嗎？`)) return
    setAnnouncements(prev => prev.map(a => 
      a.id === ann.id ? { 
        ...a, 
        status: 'pending' as ApprovalStatus,
        submittedAt: new Date().toLocaleString('zh-TW'),
        rejectReason: undefined
      } : a
    ))
    showToast('SUBMITTED')
  }

  const handleDelete = (ann: Announcement) => {
    if (!confirm(`確定要刪除「${ann.title}」嗎？`)) return
    setAnnouncements(prev => prev.filter(a => a.id !== ann.id))
    showToast('DELETED')
  }

  const getStatusLabel = (status: ApprovalStatus) => {
    switch (status) {
      case 'draft': return 'DRAFT'
      case 'pending': return 'PENDING'
      case 'approved': return 'APPROVED'
      case 'rejected': return 'REJECTED'
      case 'published': return 'PUBLISHED'
      default: return status
    }
  }

  const getStatusColor = (status: ApprovalStatus) => {
    switch (status) {
      case 'draft': return { bg: '#808080', color: '#FFF' }
      case 'pending': return { bg: '#FF8C00', color: '#FFF' }
      case 'approved': return { bg: '#008000', color: '#FFF' }
      case 'rejected': return { bg: '#800000', color: '#FFF' }
      case 'published': return { bg: '#000080', color: '#FFF' }
      default: return { bg: '#808080', color: '#FFF' }
    }
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

  const stats = {
    total: announcements.length,
    draft: announcements.filter(a => a.status === 'draft').length,
    pending: announcements.filter(a => a.status === 'pending').length,
    approved: announcements.filter(a => a.status === 'approved').length,
    rejected: announcements.filter(a => a.status === 'rejected').length,
    published: announcements.filter(a => a.status === 'published').length
  }

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

      {/* Header Stats */}
      <div className="window" style={{ marginBottom: '8px' }}>
        <div className="titlebar" style={{ padding: '2px 8px', fontSize: '10px' }}>
          BULLETIN BOARD v2.0 {isAdmin && '(ADMIN)'}
        </div>
        <div style={{ padding: '6px', fontSize: '10px' }}>
          {/* Stats Row */}
          <div style={{ marginBottom: '6px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span>TOTAL: {stats.total}</span>
            <span style={{ color: '#808080' }}>DRAFT: {stats.draft}</span>
            <span style={{ color: '#FF8C00' }}>PENDING: {stats.pending}</span>
            <span style={{ color: '#800000' }}>REJECTED: {stats.rejected}</span>
            <span style={{ color: '#000080' }}>PUBLISHED: {stats.published}</span>
          </div>
          
          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
            {[
              { key: 'all', label: `ALL(${stats.total})` },
              { key: 'draft', label: `DRAFT(${stats.draft})` },
              { key: 'pending', label: `PENDING(${stats.pending})` },
              { key: 'rejected', label: `REJECTED(${stats.rejected})` },
              { key: 'published', label: `PUBLISHED(${stats.published})` }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilterStatus(tab.key as typeof filterStatus)}
                style={{
                  padding: '2px 6px',
                  fontSize: '9px',
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                  background: filterStatus === tab.key ? '#000080' : '#C0C0C0',
                  color: filterStatus === tab.key ? '#FFF' : '#000',
                  border: '1px solid #808080'
                }}
              >
                {tab.label}
              </button>
            ))}
            
            <div style={{ flex: 1 }} />
            
            <button
              onClick={handleCreate}
              style={{
                padding: '2px 10px',
                fontSize: '9px',
                fontFamily: 'monospace',
                cursor: 'pointer',
                background: '#008000',
                color: '#FFF',
                border: '1px solid #005000',
                fontWeight: 'bold'
              }}
            >
              + NEW
            </button>
          </div>
        </div>
      </div>

      {/* Announcements Table */}
      <div className="window">
        <div className="titlebar" style={{ padding: '2px 8px', fontSize: '10px' }}>
          ANNOUNCEMENT LIST
        </div>
        <div className="inset" style={{ background: '#FFF', maxHeight: 'calc(100vh - 380px)', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#C0C0C0' }}>
              <tr>
                <th style={{ width: '25px', padding: '3px', textAlign: 'center', borderBottom: '1px solid #808080' }}>#</th>
                <th style={{ width: '65px', padding: '3px', textAlign: 'left', borderBottom: '1px solid #808080' }}>STATUS</th>
                <th style={{ width: '55px', padding: '3px', textAlign: 'left', borderBottom: '1px solid #808080' }}>TYPE</th>
                <th style={{ padding: '3px', textAlign: 'left', borderBottom: '1px solid #808080' }}>TITLE</th>
                <th style={{ width: '70px', padding: '3px', textAlign: 'center', borderBottom: '1px solid #808080' }}>DATE</th>
                <th style={{ width: '55px', padding: '3px', textAlign: 'left', borderBottom: '1px solid #808080' }}>BY</th>
                <th style={{ width: '90px', padding: '3px', textAlign: 'center', borderBottom: '1px solid #808080' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredAnnouncements.map((ann, index) => {
                const statusStyle = getStatusColor(ann.status)
                const typeStyle = getTypeColor(ann.type)
                return (
                  <tr
                    key={ann.id}
                    onMouseEnter={() => setHoveredId(ann.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      borderBottom: '1px solid #E0E0E0',
                      background: hoveredId === ann.id ? '#E0E8FF' : (index % 2 === 0 ? '#FFF' : '#F8F8F8'),
                      transition: 'background 0.1s'
                    }}
                  >
                    <td style={{ padding: '3px', textAlign: 'center', color: '#808080' }}>{index + 1}</td>
                    <td style={{ padding: '3px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '1px 4px',
                        fontSize: '8px',
                        background: statusStyle.bg,
                        color: statusStyle.color,
                        border: '1px solid #000'
                      }}>
                        {getStatusLabel(ann.status)}
                      </span>
                    </td>
                    <td style={{ padding: '3px' }}>
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
                    <td style={{ padding: '3px' }}>
                      {ann.isPinned && <span style={{ color: '#800000', marginRight: '2px' }}>[📌]</span>}
                      {ann.title}
                      {ann.status === 'rejected' && ann.rejectReason && (
                        <div style={{ fontSize: '8px', color: '#800000', marginTop: '2px' }}>
                          ⚠ {ann.rejectReason}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '3px', textAlign: 'center', fontSize: '9px', color: '#666' }}>
                      {ann.publishDate}
                    </td>
                    <td style={{ padding: '3px', fontSize: '9px', color: '#666' }}>
                      {ann.createdBy}
                    </td>
                    <td style={{ padding: '3px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {/* 草稿或被駁回：可以提交審核 */}
                        {(ann.status === 'draft' || ann.status === 'rejected') && (
                          <button
                            onClick={() => handleSubmitForReview(ann)}
                            title="提交審核"
                            style={{
                              fontSize: '8px',
                              fontFamily: 'monospace',
                              padding: '1px 3px',
                              background: '#FF8C00',
                              color: '#FFF',
                              border: '1px solid #808080',
                              cursor: 'pointer'
                            }}
                          >
                            [送審]
                          </button>
                        )}
                        {/* 編輯（草稿/被駁回才能編輯） */}
                        {(ann.status === 'draft' || ann.status === 'rejected') && (
                          <button
                            onClick={() => { setEditingAnn(ann); setIsCreating(false) }}
                            title="編輯"
                            style={{
                              fontSize: '8px',
                              fontFamily: 'monospace',
                              padding: '1px 3px',
                              background: '#C0C0C0',
                              border: '1px solid #808080',
                              cursor: 'pointer'
                            }}
                          >
                            [E]
                          </button>
                        )}
                        {/* 查看（已發布/待審核） */}
                        {(ann.status === 'pending' || ann.status === 'published' || ann.status === 'approved') && (
                          <button
                            onClick={() => { setEditingAnn(ann); setIsCreating(false) }}
                            title="查看"
                            style={{
                              fontSize: '8px',
                              fontFamily: 'monospace',
                              padding: '1px 3px',
                              background: '#C0C0C0',
                              border: '1px solid #808080',
                              cursor: 'pointer'
                            }}
                          >
                            [V]
                          </button>
                        )}
                        {/* 刪除（只有草稿可刪） */}
                        {ann.status === 'draft' && (
                          <button
                            onClick={() => handleDelete(ann)}
                            title="刪除"
                            style={{
                              fontSize: '8px',
                              fontFamily: 'monospace',
                              padding: '1px 3px',
                              background: '#C0C0C0',
                              color: '#800000',
                              border: '1px solid #808080',
                              cursor: 'pointer'
                            }}
                          >
                            [X]
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filteredAnnouncements.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: '#808080' }}>
                    NO DATA
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="window" style={{ marginTop: '8px' }}>
        <div className="titlebar" style={{ padding: '2px 8px', fontSize: '9px' }}>WORKFLOW</div>
        <div className="inset" style={{ padding: '6px', background: '#FFF', fontSize: '9px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
            <span style={{ background: '#808080', color: '#FFF', padding: '1px 4px' }}>DRAFT</span>
            <span>→</span>
            <span style={{ background: '#FF8C00', color: '#FFF', padding: '1px 4px' }}>PENDING</span>
            <span>→</span>
            <span style={{ background: '#008000', color: '#FFF', padding: '1px 4px' }}>APPROVED</span>
            <span>→</span>
            <span style={{ background: '#000080', color: '#FFF', padding: '1px 4px' }}>PUBLISHED</span>
          </div>
          <div style={{ marginTop: '4px', color: '#808080' }}>
            ※ 被駁回的公告可修改後重新提交審核
          </div>
        </div>
      </div>

      {/* Edit/View Dialog */}
      {editingAnn && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onClick={() => { setEditingAnn(null); setIsCreating(false) }}
        >
          <div 
            className="window"
            style={{ width: '500px', maxHeight: '90vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="titlebar" style={{ fontSize: '11px' }}>
              {isCreating ? 'NEW ANNOUNCEMENT' : `${editingAnn.status === 'draft' || editingAnn.status === 'rejected' ? 'EDIT' : 'VIEW'}: #${editingAnn.id}`}
              {editingAnn.status !== 'draft' && (
                <span style={{ 
                  marginLeft: '8px',
                  padding: '1px 6px',
                  background: getStatusColor(editingAnn.status).bg,
                  color: getStatusColor(editingAnn.status).color,
                  fontSize: '9px'
                }}>
                  {getStatusLabel(editingAnn.status)}
                </span>
              )}
            </div>
            
            <div style={{ padding: '12px', fontSize: '11px', fontFamily: 'monospace' }}>
              {/* 駁回原因顯示 */}
              {editingAnn.status === 'rejected' && editingAnn.rejectReason && (
                <div style={{ 
                  marginBottom: '12px', 
                  padding: '8px', 
                  background: '#FFE0E0', 
                  border: '1px solid #800000',
                  fontSize: '10px'
                }}>
                  <strong style={{ color: '#800000' }}>⚠ 駁回原因：</strong>
                  <div style={{ marginTop: '4px' }}>{editingAnn.rejectReason}</div>
                  <div style={{ marginTop: '4px', color: '#808080', fontSize: '9px' }}>
                    審核人：{editingAnn.reviewedBy} | {editingAnn.reviewedAt}
                  </div>
                </div>
              )}

              {/* Title */}
              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', marginBottom: '2px' }}>TITLE:</label>
                <input
                  type="text"
                  className="input"
                  value={editingAnn.title}
                  onChange={(e) => setEditingAnn({ ...editingAnn, title: e.target.value })}
                  disabled={editingAnn.status !== 'draft' && editingAnn.status !== 'rejected' && !isCreating}
                  style={{ width: '100%', fontSize: '11px' }}
                  placeholder="公告標題"
                />
              </div>

              {/* Type */}
              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', marginBottom: '2px' }}>TYPE:</label>
                <select
                  className="input"
                  value={editingAnn.type}
                  onChange={(e) => setEditingAnn({ ...editingAnn, type: e.target.value as Announcement['type'] })}
                  disabled={editingAnn.status !== 'draft' && editingAnn.status !== 'rejected' && !isCreating}
                  style={{ width: '100%', fontSize: '11px' }}
                >
                  <option value="notice">NOTICE (內部公告)</option>
                  <option value="public">PUBLIC (公共事項/行事曆)</option>
                  <option value="urgent">URGENT (緊急公告)</option>
                </select>
              </div>

              {/* Publish Date */}
              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', marginBottom: '2px' }}>PUBLISH DATE:</label>
                <input
                  type="date"
                  className="input"
                  value={editingAnn.publishDate}
                  onChange={(e) => setEditingAnn({ ...editingAnn, publishDate: e.target.value })}
                  disabled={editingAnn.status !== 'draft' && editingAnn.status !== 'rejected' && !isCreating}
                  style={{ width: '100%', fontSize: '11px' }}
                />
              </div>

              {/* Content */}
              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', marginBottom: '2px' }}>CONTENT:</label>
                <textarea
                  className="input"
                  value={editingAnn.content}
                  onChange={(e) => setEditingAnn({ ...editingAnn, content: e.target.value })}
                  disabled={editingAnn.status !== 'draft' && editingAnn.status !== 'rejected' && !isCreating}
                  style={{ width: '100%', fontSize: '11px', minHeight: '100px', resize: 'vertical' }}
                  placeholder="公告內容..."
                />
              </div>

              {/* Options */}
              {(editingAnn.status === 'draft' || editingAnn.status === 'rejected' || isCreating) && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={editingAnn.isPinned}
                      onChange={(e) => setEditingAnn({ ...editingAnn, isPinned: e.target.checked })}
                    />
                    {' '}置頂
                  </label>
                </div>
              )}

              {/* Audit Trail */}
              {editingAnn.submittedAt && (
                <div style={{ marginBottom: '8px', fontSize: '9px', color: '#808080', borderTop: '1px solid #E0E0E0', paddingTop: '8px' }}>
                  <div>提交時間：{editingAnn.submittedAt}</div>
                  {editingAnn.reviewedBy && (
                    <div>審核人：{editingAnn.reviewedBy} | {editingAnn.reviewedAt}</div>
                  )}
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '4px' }}>
                {(editingAnn.status === 'draft' || editingAnn.status === 'rejected' || isCreating) ? (
                  <>
                    <Button onClick={() => handleSave(true)} style={{ flex: 1, fontSize: '10px' }}>
                      SAVE DRAFT
                    </Button>
                    <Button onClick={() => handleSave(false)} style={{ flex: 1, fontSize: '10px', background: '#FF8C00' }}>
                      SUBMIT FOR REVIEW
                    </Button>
                  </>
                ) : (
                  <div style={{ flex: 1, textAlign: 'center', color: '#808080', fontSize: '10px' }}>
                    （此公告已提交，無法編輯）
                  </div>
                )}
                <Button onClick={() => { setEditingAnn(null); setIsCreating(false) }} style={{ fontSize: '10px' }}>
                  CLOSE
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}









