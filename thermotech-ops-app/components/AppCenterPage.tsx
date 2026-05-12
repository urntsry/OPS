'use client'

import { useState, useEffect } from 'react'
import DepartmentShell, { type DepartmentTab } from './DepartmentShell'
import { useWindowManager, WINDOW_CONFIGS } from '@/lib/useWindowManager'
import { getExternalApps, getSoftwareDownloads, createExternalApp, deleteExternalApp, incrementDownloadCount, type ExternalApp, type SoftwareDownload } from '@/lib/appsApi'

interface AppCenterPageProps {
  isAdmin?: boolean
  userDepartment?: string
}

export default function AppCenterPage({ isAdmin, userDepartment }: AppCenterPageProps) {
  const [apps, setApps] = useState<ExternalApp[]>([])
  const [downloads, setDownloads] = useState<SoftwareDownload[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [appData, dlData] = await Promise.all([
        getExternalApps(userDepartment),
        getSoftwareDownloads(userDepartment),
      ])
      setApps(appData)
      setDownloads(dlData)
    } catch (err) {
      console.error('[AppCenter] Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const builtinCount = WINDOW_CONFIGS.filter(c => c.type === 'external' && c.externalUrl).length
  const webCount = Math.max(apps.length, builtinCount)

  const tabs: DepartmentTab[] = [
    { id: 'web', label: 'WEB APPS', show: true, component: <WebAppsTab apps={apps} loading={loading} /> },
    { id: 'downloads', label: 'DOWNLOADS', show: true, component: <DownloadsTab downloads={downloads} loading={loading} /> },
    { id: 'manage', label: 'MANAGE', show: !!isAdmin, component: <ManageTab apps={apps} onRefresh={loadData} /> },
  ]

  return (
    <DepartmentShell
      departmentId="appcenter"
      departmentName="APP CENTER - 軟體中心"
      tabs={tabs}
      defaultTab="web"
      statusInfo={`Web: ${webCount} | Downloads: ${downloads.length}`}
    />
  )
}

const thStyle: React.CSSProperties = {
  padding: '3px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-mid-dark)', fontSize: '8px', fontWeight: 'bold',
}

// ---- WEB APPS TAB ----
interface WebAppEntry {
  id: string
  name: string
  description: string
  url: string
  departments: string[]
  windowId: string
}

function WebAppsTab({ apps, loading }: { apps: ExternalApp[]; loading: boolean }) {
  const { openWindow } = useWindowManager()

  const builtinApps: WebAppEntry[] = WINDOW_CONFIGS
    .filter(c => c.type === 'external' && c.externalUrl)
    .map(c => ({
      id: c.id,
      name: c.title,
      description: c.externalUrl!,
      url: c.externalUrl!,
      departments: ['all'],
      windowId: c.id,
    }))

  const dbApps: WebAppEntry[] = apps.map(app => {
    const configMatch = WINDOW_CONFIGS.find(c => c.type === 'external' && c.externalUrl === app.url)
    return {
      id: app.id,
      name: app.name,
      description: app.description || app.url,
      url: app.url,
      departments: app.departments,
      windowId: configMatch ? configMatch.id : app.id,
    }
  })

  const seenUrls = new Set<string>()
  const merged: WebAppEntry[] = []
  for (const app of dbApps) {
    seenUrls.add(app.url)
    merged.push(app)
  }
  for (const app of builtinApps) {
    if (!seenUrls.has(app.url)) merged.push(app)
  }

  if (loading) return <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>LOADING...</div>
  if (merged.length === 0) return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>尚無可用的網頁應用</div>

  return (
    <div className="inset" style={{ background: 'var(--bg-inset)', padding: '1px', maxHeight: '420px', overflow: 'hidden auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'monospace', tableLayout: 'fixed' }}>
        <thead>
          <tr style={{ background: 'var(--bg-window)' }}>
            <th style={thStyle}>應用名稱</th>
            <th style={thStyle}>說明</th>
            <th style={{ ...thStyle, width: '80px' }}>部門</th>
            <th style={{ ...thStyle, width: '50px', textAlign: 'center' }}>開啟</th>
          </tr>
        </thead>
        <tbody>
          {merged.map(app => (
            <tr key={app.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
              <td style={{ padding: '2px 4px', fontWeight: 'bold' }}>{app.name}</td>
              <td style={{ padding: '2px 4px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.description}</td>
              <td style={{ padding: '2px 4px', fontSize: '8px' }}>{app.departments.join(', ')}</td>
              <td style={{ padding: '2px 4px', textAlign: 'center' }}>
                <button onClick={() => openWindow(app.windowId)} className="btn" style={{ fontSize: '8px', padding: '1px 6px' }}>OPEN</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---- DOWNLOADS TAB ----
function DownloadsTab({ downloads, loading }: { downloads: SoftwareDownload[]; loading: boolean }) {
  async function handleDownload(dl: SoftwareDownload) {
    await incrementDownloadCount(dl.id)
    window.open(dl.file_path, '_blank')
  }

  function formatBytes(bytes: number | null): string {
    if (!bytes) return '--'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) return <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>LOADING...</div>
  if (downloads.length === 0) return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '9px' }}>尚無可下載軟體</div>

  return (
    <div className="inset" style={{ background: 'var(--bg-inset)', padding: '1px', maxHeight: '420px', overflow: 'hidden auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'monospace', tableLayout: 'fixed' }}>
        <thead>
          <tr style={{ background: 'var(--bg-window)' }}>
            <th style={thStyle}>軟體名稱</th>
            <th style={thStyle}>說明</th>
            <th style={{ ...thStyle, width: '50px', textAlign: 'center' }}>版本</th>
            <th style={{ ...thStyle, width: '55px', textAlign: 'center' }}>大小</th>
            <th style={{ ...thStyle, width: '40px', textAlign: 'center' }}>↓</th>
          </tr>
        </thead>
        <tbody>
          {downloads.map(dl => (
            <tr key={dl.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
              <td style={{ padding: '2px 4px', fontWeight: 'bold' }}>{dl.name}</td>
              <td style={{ padding: '2px 4px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dl.description || '--'}</td>
              <td style={{ padding: '2px 4px', textAlign: 'center' }}>v{dl.version}</td>
              <td style={{ padding: '2px 4px', textAlign: 'center', color: 'var(--text-muted)' }}>{formatBytes(dl.file_size_bytes)}</td>
              <td style={{ padding: '2px 4px', textAlign: 'center' }}>
                <button onClick={() => handleDownload(dl)} className="btn" style={{ fontSize: '8px', padding: '1px 4px' }}>↓</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---- MANAGE TAB (admin) ----
function ManageTab({ apps, onRefresh }: { apps: ExternalApp[]; onRefresh: () => void }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newApp, setNewApp] = useState({ name: '', url: '', description: '', departments: 'all' })

  async function handleAddApp() {
    if (!newApp.name || !newApp.url) return
    try {
      await createExternalApp({
        name: newApp.name,
        url: newApp.url,
        description: newApp.description || null,
        icon: 'globe',
        departments: newApp.departments === 'all' ? ['all'] : newApp.departments.split(',').map(s => s.trim()),
        is_active: true,
        fullscreen_default: true,
        sort_order: apps.length + 1,
      })
      setShowAddForm(false)
      setNewApp({ name: '', url: '', description: '', departments: 'all' })
      onRefresh()
    } catch (err) {
      console.error('[AppCenter] Add error:', err)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('確定要移除此應用？')) return
    try {
      await deleteExternalApp(id)
      onRefresh()
    } catch (err) {
      console.error('[AppCenter] Delete error:', err)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', fontSize: '8px', color: 'var(--text-muted)', alignItems: 'center' }}>
        <span>已註冊 <b style={{ color: 'var(--text-primary)' }}>{apps.length}</b> 個應用</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowAddForm(!showAddForm)} className="btn" style={{ fontSize: '8px', padding: '1px 6px' }}>
          {showAddForm ? 'CANCEL' : '+ ADD'}
        </button>
      </div>

      {showAddForm && (
        <div className="inset" style={{ padding: '6px', marginBottom: '6px', background: 'var(--bg-inset)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '9px', fontFamily: 'monospace' }}>
            <div>
              <label style={{ fontSize: '8px', color: 'var(--text-muted)' }}>名稱</label>
              <input value={newApp.name} onChange={e => setNewApp(f => ({ ...f, name: e.target.value }))} style={{ width: '100%', fontSize: '9px', padding: '2px 4px', fontFamily: 'monospace', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '8px', color: 'var(--text-muted)' }}>URL</label>
              <input value={newApp.url} onChange={e => setNewApp(f => ({ ...f, url: e.target.value }))} style={{ width: '100%', fontSize: '9px', padding: '2px 4px', fontFamily: 'monospace', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '8px', color: 'var(--text-muted)' }}>說明</label>
              <input value={newApp.description} onChange={e => setNewApp(f => ({ ...f, description: e.target.value }))} style={{ width: '100%', fontSize: '9px', padding: '2px 4px', fontFamily: 'monospace', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '8px', color: 'var(--text-muted)' }}>部門 (all/逗號分隔)</label>
              <input value={newApp.departments} onChange={e => setNewApp(f => ({ ...f, departments: e.target.value }))} style={{ width: '100%', fontSize: '9px', padding: '2px 4px', fontFamily: 'monospace', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-mid-dark)', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ marginTop: '4px', textAlign: 'right' }}>
            <button onClick={handleAddApp} className="btn" style={{ fontSize: '8px', padding: '2px 8px', fontWeight: 'bold' }}>ADD</button>
          </div>
        </div>
      )}

      <div className="inset" style={{ background: 'var(--bg-inset)', padding: '1px', maxHeight: '350px', overflow: 'hidden auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'monospace', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ background: 'var(--bg-window)' }}>
              <th style={thStyle}>名稱</th>
              <th style={thStyle}>URL</th>
              <th style={{ ...thStyle, width: '65px' }}>部門</th>
              <th style={{ ...thStyle, width: '35px', textAlign: 'center' }}>X</th>
            </tr>
          </thead>
          <tbody>
            {apps.map(app => (
              <tr key={app.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                <td style={{ padding: '2px 4px', fontWeight: 'bold' }}>{app.name}</td>
                <td style={{ padding: '2px 4px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.url}</td>
                <td style={{ padding: '2px 4px', fontSize: '8px' }}>{app.departments.join(', ')}</td>
                <td style={{ padding: '2px 4px', textAlign: 'center' }}>
                  <button onClick={() => handleDelete(app.id)} style={{ fontSize: '8px', border: '1px solid var(--border-mid-dark)', background: 'var(--bg-window)', color: 'var(--accent-red)', cursor: 'pointer', padding: '0 3px' }}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
