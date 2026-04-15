'use client'

import { useState, useRef } from 'react'

interface MeetingUploaderProps {
  userProfile?: any
  onUploadComplete: () => void
}

type UploadPhase = 'idle' | 'uploading' | 'analyzing' | 'done' | 'error'

export default function MeetingUploader({ userProfile, onUploadComplete }: MeetingUploaderProps) {
  const [phase, setPhase] = useState<UploadPhase>('idle')
  const [title, setTitle] = useState('')
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [progress, setProgress] = useState('')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const ACCEPTED = '.pdf,.docx,.doc,.png,.jpg,.jpeg,.gif,.webp,.txt'

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    if (!title) {
      setTitle(file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' '))
    }
    setError('')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleUpload = async () => {
    if (!selectedFile || !title.trim()) return

    setPhase('uploading')
    setProgress('UPLOADING FILE...')
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('title', title)
      formData.append('meeting_date', meetingDate)
      if (userProfile?.id) formData.append('uploaded_by', userProfile.id)

      const uploadRes = await fetch('/api/meetings/upload', { method: 'POST', body: formData })
      const uploadData = await uploadRes.json()

      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error || 'Upload failed')
      }

      setProgress('ANALYZING WITH AI...')
      setPhase('analyzing')

      const analyzeRes = await fetch('/api/meetings/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meeting_id: uploadData.meeting.id,
          raw_content: uploadData.meeting.raw_content,
          file_url: uploadData.meeting.file_url,
          file_type: uploadData.meeting.file_type,
        })
      })
      const analyzeData = await analyzeRes.json()

      setResult(analyzeData.analysis || null)
      setPhase('done')
      setProgress('COMPLETE')
    } catch (e: any) {
      console.error('[Uploader] Error:', e)
      setError(e.message || 'Upload failed')
      setPhase('error')
    }
  }

  const handleReset = () => {
    setPhase('idle')
    setTitle('')
    setMeetingDate(new Date().toISOString().split('T')[0])
    setSelectedFile(null)
    setProgress('')
    setResult(null)
    setError('')
  }

  return (
    <div>
      {/* Upload Form */}
      {(phase === 'idle' || phase === 'error') && (
        <div>
          {/* Drop Zone */}
          <div
            className="inset"
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '20px',
              textAlign: 'center',
              cursor: 'pointer',
              marginBottom: '6px',
              background: dragOver ? 'var(--hover-bg)' : 'var(--bg-inset)',
              border: dragOver ? '2px dashed var(--accent-blue)' : undefined,
              transition: 'background 0.1s',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED}
              onChange={e => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]) }}
              style={{ display: 'none' }}
            />
            {selectedFile ? (
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: 'var(--text-primary)' }}>{selectedFile.name}</div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                  {(selectedFile.size / 1024).toFixed(1)} KB | Click to change
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '14px', marginBottom: '4px', color: 'var(--text-muted)' }}>DROP FILE HERE</div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                  PDF / DOCX / IMAGE / TXT
                </div>
              </div>
            )}
          </div>

          {/* Title & Date */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '1px' }}>TITLE</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Meeting title..."
                className="inset"
                style={{ width: '100%', fontSize: '10px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '1px' }}>DATE</label>
              <input
                type="date"
                value={meetingDate}
                onChange={e => setMeetingDate(e.target.value)}
                className="inset"
                style={{ fontSize: '10px', fontFamily: 'monospace', padding: '2px 4px', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          {error && (
            <div style={{ padding: '4px', marginBottom: '6px', background: 'var(--accent-red)', color: '#FFF', fontSize: '10px' }}>
              ERROR: {error}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!selectedFile || !title.trim()}
            className="btn"
            style={{ fontSize: '10px', padding: '3px 16px', opacity: (!selectedFile || !title.trim()) ? 0.5 : 1 }}
          >
            UPLOAD & ANALYZE
          </button>
        </div>
      )}

      {/* Progress */}
      {(phase === 'uploading' || phase === 'analyzing') && (
        <div className="window" style={{ padding: 0 }}>
          <div className="titlebar" style={{ padding: '2px 6px', fontSize: '10px' }}>
            {phase === 'uploading' ? 'UPLOADING...' : 'AI ANALYZING...'}
          </div>
          <div className="inset" style={{ padding: '20px', textAlign: 'center', background: 'var(--bg-inset)' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-primary)' }}>
              {progress}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {phase === 'analyzing' && (
                <span>Gemini AI is reading and analyzing your document...</span>
              )}
            </div>
            <div style={{ marginTop: '8px' }}>
              <div style={{
                width: '100%', height: '8px',
                background: 'var(--bg-window)',
                border: '1px solid var(--border-mid-dark)',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: phase === 'uploading' ? '40%' : '80%',
                  background: 'var(--accent-blue)',
                  transition: 'width 1s',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {phase === 'done' && result && (
        <div>
          <div className="window" style={{ padding: 0, marginBottom: '4px' }}>
            <div className="titlebar" style={{ padding: '2px 6px', fontSize: '10px' }}>
              AI ANALYSIS COMPLETE
            </div>
            <div style={{ padding: '6px' }}>
              <div style={{ marginBottom: '4px' }}>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>SUMMARY:</span>
                <div style={{ fontSize: '10px', padding: '2px 0' }}>{result.summary || '-'}</div>
              </div>
              <div style={{ marginBottom: '4px' }}>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>CATEGORY:</span>
                <span style={{ fontSize: '10px', marginLeft: '4px', fontWeight: 'bold' }}>{result.suggested_category || '-'}</span>
              </div>

              {result.deadlines?.length > 0 && (
                <div style={{ marginBottom: '4px' }}>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>DEADLINES ({result.deadlines.length}):</span>
                  {result.deadlines.map((d: any, i: number) => (
                    <div key={i} style={{ fontSize: '10px', padding: '1px 0', display: 'flex', gap: '4px' }}>
                      {d.is_urgent && <span style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>!</span>}
                      <span>{d.description}</span>
                      {d.date && <span style={{ color: 'var(--text-muted)' }}>({d.date})</span>}
                    </div>
                  ))}
                </div>
              )}

              {result.tasks?.length > 0 && (
                <div style={{ marginBottom: '4px' }}>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>TASKS ({result.tasks.length}):</span>
                  {result.tasks.map((t: any, i: number) => (
                    <div key={i} style={{ fontSize: '10px', padding: '1px 0' }}>
                      <span style={{ fontWeight: 'bold' }}>{t.assignee}</span>: {t.description}
                      {t.due_date && <span style={{ color: 'var(--text-muted)' }}> (by {t.due_date})</span>}
                    </div>
                  ))}
                </div>
              )}

              {result.key_decisions?.length > 0 && (
                <div>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>KEY DECISIONS:</span>
                  {result.key_decisions.map((d: string, i: number) => (
                    <div key={i} style={{ fontSize: '10px', padding: '1px 0' }}>- {d}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => { handleReset(); }} className="btn" style={{ fontSize: '10px', padding: '3px 12px' }}>
              UPLOAD ANOTHER
            </button>
            <button onClick={onUploadComplete} className="btn" style={{ fontSize: '10px', padding: '3px 12px' }}>
              VIEW RECORDS
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
