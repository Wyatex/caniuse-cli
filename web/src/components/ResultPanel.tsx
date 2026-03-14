import React from 'react';
import type { FileAnalysis, CodeFeature } from '../types';
import { BrowserBadgeList } from './BrowserBadge';

interface ResultPanelProps {
  analysis: FileAnalysis | null;
  isLoading: boolean;
}

function FeatureItem({ feature }: { feature: CodeFeature }) {
  return (
    <div
      style={{
        padding: '10px 14px',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '6px',
        marginBottom: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '13px',
      }}
    >
      <div>
        <span style={{ color: '#4da6ff', fontWeight: 500 }}>{feature.syntax}</span>
        <span style={{ color: '#666', marginLeft: '8px' }}>
          ({feature.feature})
        </span>
      </div>
      <div style={{ color: '#888', fontSize: '12px' }}>
        Line {feature.location.line}:{feature.location.column}
      </div>
    </div>
  );
}

export function ResultPanel({ analysis, isLoading }: ResultPanelProps) {
  if (isLoading) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ fontSize: '32px', marginBottom: '16px' }}>
            ⏳
          </div>
          <div>Analyzing...</div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
          <div style={{ fontSize: '16px' }}>Select a file or directory to analyze</div>
          <div style={{ fontSize: '14px', marginTop: '8px', color: '#555' }}>
            Click on any file or folder in the left panel
          </div>
        </div>
      </div>
    );
  }

  const hasFeatures = analysis.features.length > 0;

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '20px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h3
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#888',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '12px',
          }}
        >
          Browser Requirements
        </h3>
        <BrowserBadgeList minVersions={analysis.minVersions} />
      </div>

      <div>
        <h3
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#888',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '12px',
          }}
        >
          Detected Features ({analysis.features.length})
        </h3>

        {hasFeatures ? (
          <div>
            {analysis.features.map((feature, index) => (
              <FeatureItem key={`${feature.feature}-${feature.location.line}-${index}`} feature={feature} />
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: '20px',
              textAlign: 'center',
              color: '#555',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '8px',
            }}
          >
            No modern JavaScript features detected
          </div>
        )}
      </div>
    </div>
  );
}
