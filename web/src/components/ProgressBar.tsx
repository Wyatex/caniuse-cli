import React from 'react';
import type { ProgressMessage } from '../types';

interface ProgressBarProps {
  progress: ProgressMessage | null;
}

export function ProgressBar({ progress }: ProgressBarProps) {
  if (!progress) {
    return null;
  }

  const { current, total, currentFile, percentage } = progress;

  return (
    <div
      style={{
        padding: '12px 20px',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}
      >
        <span style={{ fontSize: '14px', color: '#fff' }}>
          Analyzing files...
        </span>
        <span style={{ fontSize: '14px', color: '#4da6ff', fontWeight: 600 }}>
          {current} / {total}
        </span>
      </div>

      <div
        style={{
          width: '100%',
          height: '6px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '3px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: '#4da6ff',
            borderRadius: '3px',
            transition: 'width 0.2s ease-out',
          }}
        />
      </div>

      <div
        style={{
          marginTop: '8px',
          fontSize: '12px',
          color: '#888',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {currentFile}
      </div>
    </div>
  );
}
