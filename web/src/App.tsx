import type { FileAnalysis, TreeNode } from './types'
import * as React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { FileTreeContainer } from './components/FileTree'
import { Header } from './components/Header'
import { ResultPanel } from './components/ResultPanel'
import { useWebSocket } from './hooks/useWebSocket'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

const API_BASE = '/api'

export function App() {
  const [fileTree, setFileTree] = useState<TreeNode | null>(null)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<'file' | 'directory' | null>(null)
  const [analysis, setAnalysis] = useState<FileAnalysis | null>(null)

  // 1. 将原先的 isLoading 改名，仅用于 fetch file 的加载控制
  const [isFetchingFile, setIsFetchingFile] = useState(false)
  const [isAnalyzingDir, setIsAnalyzingDir] = useState(false)

  const wsProtocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsHost = typeof window !== 'undefined' ? window.location.host : 'localhost:3000'

  const { progress, results, error, isConnected } = useWebSocket(
    `${wsProtocol}//${wsHost}/ws`,
  )

  // 2. 动态派生 isLoading 状态，彻底去掉更新 isLoading 的 useEffect
  const isLoading = isFetchingFile || isAnalyzingDir || !!progress

  // Fetch file tree on mount
  // (这里不受警告影响，因为 setFileTree 在异步的 .then 回调中)
  useEffect(() => {
    fetch(`${API_BASE}/file-tree`)
      .then(res => res.json())
      .then((data: ApiResponse<TreeNode>) => {
        if (data.success && data.data) {
          setFileTree(data.data)
        }
      })
      .catch(err => console.error('Failed to fetch file tree:', err))
  }, [])

  // 3. 按照 React 官方推荐做法：直接在渲染期间更新派生状态，取代 useEffect
  // React 会在执行到这里时立即触发重新渲染，省去了一次多余的 Effect 渲染生命周期
  if (results.length > 0 && isAnalyzingDir) {
    const aggregated = aggregateResults(results)
    setAnalysis(aggregated)
    setIsAnalyzingDir(false)
  }

  const handleSelect = useCallback(async (path: string, type: 'file' | 'directory') => {
    setSelectedPath(path)
    setSelectedType(type)

    if (type === 'file') {
      // Fetch single file analysis
      setIsFetchingFile(true) // 原本是 setIsLoading(true)
      try {
        const res = await fetch(`${API_BASE}/analyze/file?path=${encodeURIComponent(path)}`)
        const data: ApiResponse<FileAnalysis> = await res.json()
        if (data.success && data.data) {
          setAnalysis(data.data)
        }
        else {
          setAnalysis(null)
        }
      }
      catch (err) {
        console.error('Failed to analyze file:', err)
        setAnalysis(null)
      }
      setIsFetchingFile(false) // 原本是 setIsLoading(false)
    }
    else {
      // Start directory analysis via WebSocket
      setIsAnalyzingDir(true)
      // 注意：这里不需要再手动设置 setIsLoading(true) 啦，因为 isAnalyzingDir 已经为 true
      try {
        const res = await fetch(`${API_BASE}/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path }),
        })
        const data: ApiResponse<null> = await res.json()
        if (!data.success) {
          console.error('Failed to start analysis:', data.error)
          setIsAnalyzingDir(false)
        }
      }
      catch (err) {
        console.error('Failed to start analysis:', err)
        setIsAnalyzingDir(false)
      }
    }
  }, [])

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
      <Header
        progress={progress}
        isConnected={isConnected}
        selectedPath={selectedPath}
        selectedType={selectedType}
      />

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
  )
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
    }
  }

  const allFeatures = results.flatMap(r => r.features)
  const allBrowserSupport = results.flatMap(r => r.browserSupport)

  // Calculate max versions
  const maxVersions = { chrome: '0', firefox: '0', safari: '0', edge: '0' }
  for (const result of results) {
    for (const [browser, version] of Object.entries(result.minVersions)) {
      if (version && version !== '0') {
        const current = maxVersions[browser as keyof typeof maxVersions]
        if (compareVersions(version, current) > 0) {
          maxVersions[browser as keyof typeof maxVersions] = version
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
  }
}

function compareVersions(a: string, b: string): number {
  if (a === '0')
    return -1
  if (b === '0')
    return 1

  const aParts = a.split('.').map(Number)
  const bParts = b.split('.').map(Number)

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aVal = aParts[i] ?? 0
    const bVal = bParts[i] ?? 0
    if (aVal > bVal)
      return 1
    if (aVal < bVal)
      return -1
  }
  return 0
}
