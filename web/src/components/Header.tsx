import type { ProgressMessage } from '../types'

interface HeaderProps {
  progress: ProgressMessage | null
  isConnected: boolean
  selectedPath: string | null
  selectedType: 'file' | 'directory' | null
}

export function Header({ progress, isConnected, selectedPath, selectedType }: HeaderProps) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '24px' }}>🔍</span>
        <h1 style={{ fontSize: '18px', fontWeight: 600 }}>caniuse-cli</h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {progress && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: '#fbbf24',
            }}
          >
            <span style={{ fontSize: '12px' }}>⏳</span>
            {progress.current}/{progress.total}
          </div>
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: isConnected ? '#4ade80' : '#ef4444',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isConnected ? '#4ade80' : '#ef4444',
            }}
          />
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
        {selectedPath && (
          <div
            style={{
              fontSize: '12px',
              color: '#888',
              maxWidth: '300px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {selectedType === 'directory' ? '📁 ' : '📄 '}
            {selectedPath.split(/[/\\]/).pop()}
          </div>
        )}
      </div>
    </header>
  )
}
