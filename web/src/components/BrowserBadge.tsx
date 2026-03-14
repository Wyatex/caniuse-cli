import React from 'react';

interface BrowserBadgeProps {
  browser: string;
  version: string;
}

const BROWSER_CONFIG: Record<string, { color: string; icon: string; name: string }> = {
  chrome: { color: '#4285f4', icon: '🌐', name: 'Chrome' },
  firefox: { color: '#ff7139', icon: '🦊', name: 'Firefox' },
  safari: { color: '#006cff', icon: '🧭', name: 'Safari' },
  edge: { color: '#0078d4', icon: '🔷', name: 'Edge' },
};

export function BrowserBadge({ browser, version }: BrowserBadgeProps) {
  const config = BROWSER_CONFIG[browser] || {
    color: '#666',
    icon: '🔍',
    name: browser,
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        borderLeft: `4px solid ${config.color}`,
        marginBottom: '8px',
        transition: 'transform 0.15s, background-color 0.15s',
      }}
      onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        target.style.transform = 'translateX(4px)';
        target.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        target.style.transform = 'translateX(0)';
        target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
      }}
    >
      <span style={{ fontSize: '24px' }}>{config.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
          {config.name}
        </div>
        <div style={{ fontSize: '12px', color: '#888' }}>Minimum version</div>
      </div>
      <div
        style={{
          fontSize: '20px',
          fontWeight: 700,
          color: config.color,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          padding: '8px 16px',
          borderRadius: '6px',
        }}
      >
        ≥ {version}
      </div>
    </div>
  );
}

interface BrowserBadgeListProps {
  minVersions: {
    chrome: string;
    firefox: string;
    safari: string;
    edge: string;
  };
}

export function BrowserBadgeList({ minVersions }: BrowserBadgeListProps) {
  const browsers = Object.entries(minVersions)
    .filter(([, version]) => version && version !== '0')
    .sort((a, b) => {
      if (a[1] === '0') return 1;
      if (b[1] === '0') return -1;
      return 0;
    });

  if (browsers.length === 0) {
    return (
      <div style={{ padding: '20px', color: '#666', textAlign: 'center' }}>
        No browser requirements detected
      </div>
    );
  }

  return (
    <div>
      {browsers.map(([browser, version]) => (
        <BrowserBadge key={browser} browser={browser} version={version} />
      ))}
    </div>
  );
}
