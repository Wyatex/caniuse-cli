import React, { useState, useEffect, useCallback } from 'react';
import { FileTreeContainer } from './components/FileTree';
import { ResultPanel } from './components/ResultPanel';
import { ProgressBar } from './components/ProgressBar';
import { useWebSocket } from './hooks/useWebSocket';
import type { TreeNode, FileAnalysis } from './types';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const API_BASE = '/api';

export function App() {
  const [fileTree, setFileTree] = useState<TreeNode | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'file' | 'directory' | null>(null);
  const [analysis, setAnalysis] = useState<FileAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzingDir, setIsAnalyzingDir] = useState(false);

  const wsProtocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsHost = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';

  const { progress, results, error, isConnected } = useWebSocket(
    `${wsProtocol}//${wsHost}/ws`
  );

  // Fetch file tree on mount
  useEffect(() => {
    fetch(`${API_BASE}/file-tree`)
      .then((res) => res.json())
      .then((data: ApiResponse<TreeNode>) => {
        if (data.success && data.data) {
          setFileTree(data.data);
        }
      })
      .catch((err) => console.error('Failed to fetch file tree:', err));
  }, []);

  // Handle directory analysis completion
  useEffect(() => {
    if (results.length > 0 && isAnalyzingDir) {
      // Aggregate all results
      const aggregated = aggregateResults(results);
      setAnalysis(aggregated);
      setIsAnalyzingDir(false);
    }
  }, [results, isAnalyzingDir]);

  const handleSelect = useCallback(async (path: string, type: 'file' | 'directory') => {
    setSelectedPath(path);
    setSelectedType(type);

    if (type === 'file') {
      // Fetch single file analysis
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE}/analyze/file?path=${encodeURIComponent(path)}`);
        const data: ApiResponse<FileAnalysis> = await res.json();
        if (data.success && data.data) {
          setAnalysis(data.data);
        } else {
          setAnalysis(null);
        }
      } catch (err) {
        console.error('Failed to analyze file:', err);
        setAnalysis(null);
      }
      setIsLoading(false);
    } else {
      // Start directory analysis via WebSocket
      setIsAnalyzingDir(true);
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE}/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path }),
        });
        const data: ApiResponse<null> = await res.json();
        if (!data.success) {
          console.error('Failed to start analysis:', data.error);
          setIsLoading(false);
          setIsAnalyzingDir(false);
        }
      } catch (err) {
        console.error('Failed to start analysis:', err);
        setIsLoading(false);
        setIsAnalyzingDir(false);
      }
    }
  }, []);

  // Update loading state based on progress
  useEffect(() => {
    if (progress) {
      setIsLoading(true);
    } else if (!isAnalyzingDir) {
      setIsLoading(false);
    }
  }, [progress, isAnalyzingDir]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#1a1a2e',
        color: '#eee',
      }}
    >
      {/* Header */}
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

      {/* Progress Bar */}
      {progress && <ProgressBar progress={progress} />}

      {/* Main Content */}
      <main style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* File Tree Panel */}
        <aside
          style={{
            width: '280px',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '12px',
              fontWeight: 600,
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            Files
          </div>
          <FileTreeContainer
            tree={fileTree}
            selectedPath={selectedPath}
            onSelect={handleSelect}
          />
        </aside>

        {/* Result Panel */}
        <section style={{ flex: 1, overflow: 'hidden' }}>
          <ResultPanel analysis={analysis} isLoading={isLoading} />
        </section>
      </main>

      {/* Error Toast */}
      {error && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            padding: '12px 20px',
            backgroundColor: 'rgba(239, 68, 68, 0.9)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '14px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

// Helper function to aggregate results
function aggregateResults(results: FileAnalysis[]): FileAnalysis {
  if (results.length === 0) {
    return {
      path: '',
      relativePath: '',
      features: [],
      browserSupport: [],
      minVersions: { chrome: '0', firefox: '0', safari: '0', edge: '0' },
    };
  }

  const allFeatures = results.flatMap((r) => r.features);
  const allBrowserSupport = results.flatMap((r) => r.browserSupport);

  // Calculate max versions
  const maxVersions = { chrome: '0', firefox: '0', safari: '0', edge: '0' };
  for (const result of results) {
    for (const [browser, version] of Object.entries(result.minVersions)) {
      if (version && version !== '0') {
        const current = maxVersions[browser as keyof typeof maxVersions];
        if (compareVersions(version, current) > 0) {
          maxVersions[browser as keyof typeof maxVersions] = version;
        }
      }
    }
  }

  return {
    path: results[0]!.path,
    relativePath: results[0]!.relativePath,
    features: allFeatures,
    browserSupport: allBrowserSupport,
    minVersions: maxVersions,
  };
}

function compareVersions(a: string, b: string): number {
  if (a === '0') return -1;
  if (b === '0') return 1;

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
