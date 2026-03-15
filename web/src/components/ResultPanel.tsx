import React from 'react';
import type { FileAnalysis, CodeFeature } from '../types';
import { BrowserBadgeList } from './BrowserBadge';

interface ResultPanelProps {
  analysis: FileAnalysis | null;
  isLoading: boolean;
}

// Compare version strings for sorting
function compareVersions(a: string, b: string): number {
  if (a === 'N/A') return -1;
  if (b === 'N/A') return 1;
  if (a === 'all') return 1;
  if (b === 'all') return -1;
  if (a === 'preview') return -1;
  if (b === 'preview') return 1;

  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aVal = aParts[i] ?? 0;
    const bVal = bParts[i] ?? 0;

    if (aVal > bVal) return 1;
    if (aVal < bVal) return -1;
  }

  return 0;
}

// Group features by feature name
interface FeatureGroup {
  feature: string;
  syntax: string;
  maxVersion: string;
  locations: Array<{ file: string; line: number; column: number }>;
}

function groupFeatures(features: CodeFeature[]): FeatureGroup[] {
  const groups = new Map<string, FeatureGroup>();

  for (const f of features) {
    if (!groups.has(f.feature)) {
      groups.set(f.feature, {
        feature: f.feature,
        syntax: f.syntax,
        maxVersion: f.maxVersion ?? '0',
        locations: [],
      });
    }
    groups.get(f.feature)!.locations.push(f.location);
  }

  // Sort groups by maxVersion descending (higher version first)
  return Array.from(groups.values()).sort((a, b) =>
    compareVersions(b.maxVersion, a.maxVersion)
  );
}

async function openFile(filePath: string, line: number) {
  try {
    const response = await fetch(`/api/open-file?path=${encodeURIComponent(filePath)}&line=${line}`);
    const result = await response.json();
    if (!result.success) {
      console.error('Failed to open file:', result.error);
    }
  } catch (error) {
    console.error('Failed to open file:', error);
  }
}

function FeatureGroupItem({ group }: { group: FeatureGroup }) {
  return (
    <div
      style={{
        padding: '10px 14px',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '6px',
        marginBottom: '6px',
        fontSize: '13px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div>
          <span style={{ color: '#4da6ff', fontWeight: 500 }}>{group.syntax}</span>
          <span style={{ color: '#666', marginLeft: '8px' }}>
            ({group.feature})
          </span>
        </div>
        <span style={{ color: '#888', fontSize: '12px' }}>
          v{group.maxVersion}+
        </span>
      </div>
      <div style={{ paddingLeft: '12px', borderLeft: '2px solid #333' }}>
        {group.locations.map((loc, idx) => {
          const fileName = loc.file.split('/').pop() ?? loc.file;
          return (
            <a
              key={idx}
              onClick={() => openFile(loc.file, loc.line)}
              style={{
                display: 'block',
                color: '#888',
                cursor: 'pointer',
                fontSize: '12px',
                marginBottom: '2px',
              }}
              title={loc.file}
            >
              {fileName}:{loc.line}
            </a>
          );
        })}
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
  const groupedFeatures = hasFeatures ? groupFeatures(analysis.features) : [];

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
          Detected Features ({groupedFeatures.length})
        </h3>

        {hasFeatures ? (
          <div>
            {groupedFeatures.map((group) => (
              <FeatureGroupItem key={group.feature} group={group} />
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
