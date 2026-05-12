'use client'

interface ExternalAppFrameProps {
  windowId: string
  url: string
  title: string
}

export default function ExternalAppFrame({ url }: ExternalAppFrameProps) {
  return (
    <iframe
      src={url}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        backgroundColor: 'var(--bg-window)',
      }}
      allow="clipboard-read; clipboard-write"
      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
    />
  )
}
