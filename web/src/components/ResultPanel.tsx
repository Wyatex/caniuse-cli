import type { CodeFeature, FileAnalysis } from '../types'
import * as React from 'react'
import { BrowserBadgeList } from './BrowserBadge'

// Compare version strings for sorting
function compareVersions(a: string, b: string): number {
  if (a === 'N/A') return -1
  if (b === 'N/A') return 1
  if (a === 'all') return 1
  if (b === 'all') return -1
  if (a === 'preview') return -1
  if (b === 'preview') return 1

  const aParts = a.split('.').map(Number)
  const bParts = b.split('.').map(Number)

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aVal = aParts[i] ?? 0
    const bVal = bParts[i] ?? 0

    if (aVal > bVal) return 1
    if (aVal < bVal) return -1
  }

  return 0
}

// Group features by feature name
interface FeatureGroup {
  feature: string
  syntax: string
  maxVersion: string
  locations: Array<{ file: string; line: number; column: number }>
}

function groupFeatures(features: CodeFeature[]): FeatureGroup[] {
  const groups = new Map<string, FeatureGroup>()

  for (const f of features) {
    if (!groups.has(f.feature)) {
      groups.set(f.feature, {
        feature: f.feature,
        syntax: f.syntax,
        maxVersion: f.maxVersion ?? '0',
        locations: [],
      })
    }
    groups.get(f.feature)!.locations.push(f.location)
  }

  // Sort groups by maxVersion descending (higher version first)
  return [...groups.values()].toSorted((a, b) =>
    compareVersions(b.maxVersion, a.maxVersion),
  )
}

async function openFile(filePath: string, line: number) {
  try {
    const response = await fetch(
      `/api/open-file?path=${encodeURIComponent(filePath)}&line=${line}`,
    )
    const result = await response.json()
    if (!result.success) {
      console.error('Failed to open file:', result.error)
    }
  } catch (error) {
    console.error('Failed to open file:', error)
  }
}

function FeatureGroupItem({
  group,
  isExpanded,
  onToggle,
}: {
  group: FeatureGroup
  isExpanded: boolean
  onToggle: () => void
}) {
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
      <div
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: isExpanded ? '8px' : '0',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span
            style={{
              marginRight: '8px',
              transition: 'transform 0.2s ease',
              display: 'inline-block',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
          >
            ▶
          </span>
          <span style={{ color: '#4da6ff', fontWeight: 500 }}>
            {group.syntax}
          </span>
          <span style={{ color: '#666', marginLeft: '8px' }}>
            ({group.feature})
          </span>
        </div>
        <span style={{ color: '#888', fontSize: '12px' }}>
          v{group.maxVersion}+
        </span>
      </div>
      {isExpanded && (
        <div style={{ paddingLeft: '12px', borderLeft: '2px solid #333' }}>
          <div style={{ paddingLeft: '12px', borderLeft: '2px solid #333' }}>
            {group.locations.map((loc) => {
              const fileName = loc.file.split('/').pop() ?? loc.file
              return (
                <a
                  key={`${loc.file}-${loc.line}-${loc.column}`}
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
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
export interface ResultPanelRef {
  expandAll: () => void
  collapseAll: () => void
}

interface ResultPanelProps {
  analysis: FileAnalysis | null
  isLoading: boolean
  expandedFeatures?: Set<string>
  onToggleFeature?: (feature: string) => void
  onExpandAll?: () => void
  onCollapseAll?: () => void
}

export function ResultPanel({
  analysis,
  isLoading,
  expandedFeatures,
  onToggleFeature,
}: ResultPanelProps) {
  // 1. 处理“无分析数据”时的状态 (空状态与加载状态统一结构)
  if (!analysis) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666',
        }}
      >
        {/* 固定高度和宽度的容器，防止内容切换时发生上下跳动 */}
        <div style={{ textAlign: 'center', minHeight: '140px' }}>
          {/* 固定的图标区域 */}
          <div
            style={{
              height: '64px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            {isLoading ? (
              <div className="spinner" style={{ fontSize: '32px' }}>
                ⏳
              </div>
            ) : (
              <div style={{ fontSize: '48px', transition: 'all 0.2s ease' }}>
                🔍
              </div>
            )}
          </div>

          {/* 固定的标题区域 */}
          <div
            style={{
              fontSize: '16px',
              height: '24px',
              transition: 'color 0.2s ease',
            }}
          >
            {isLoading
              ? 'Analyzing...'
              : 'Select a file or directory to analyze'}
          </div>

          {/* 固定的副标题区域：使用透明度控制显示/隐藏，而不是直接销毁 DOM */}
          <div
            style={{
              fontSize: '14px',
              marginTop: '8px',
              color: '#555',
              opacity: isLoading ? 0 : 1, // 关键：加载时变为完全透明
              visibility: isLoading ? 'hidden' : 'visible',
              transition: 'opacity 0.2s ease',
            }}
          >
            Click on any file or folder in the left panel
          </div>
        </div>
      </div>
    )
  }

  // 2. 处理“有分析数据”时的状态
  const hasFeatures = analysis.features.length > 0
  const groupedFeatures = hasFeatures ? groupFeatures(analysis.features) : []

  return (
    <div
      style={{
        flex: 1, // 修复 2：外层容器使用 flex: 1 占满父级剩余空间
        minHeight: 0, // 修复 3：防止 Flex 子项内容溢出撑破容器的关键属性
        position: 'relative',
        display: 'flex', // 将外层设为 flex 容器
        flexDirection: 'column',
      }}
    >
      {/* 半透明的加载遮罩层 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.2)', // 半透明遮罩
          backdropFilter: 'blur(2px)', // 毛玻璃效果 (可选)
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          opacity: isLoading ? 1 : 0,
          pointerEvents: isLoading ? 'auto' : 'none', // 不加载时允许鼠标穿透
          transition: 'opacity 0.2s ease', // 平滑渐变
          borderRadius: '8px',
        }}
      >
        <div
          className="spinner"
          style={{
            fontSize: '32px',
            backgroundColor: '#222', // 给 spinner 加个小底色更显眼
            padding: '12px',
            borderRadius: '50%',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          ⏳
        </div>
      </div>

      {/* 原本的内容区域，加载时让其轻微变暗 */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '20px',
          boxSizing: 'border-box',
          opacity: isLoading ? 0.6 : 1,
          transition: 'opacity 0.2s ease',
        }}
      >
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
                <FeatureGroupItem
                  key={group.feature}
                  group={group}
                  isExpanded={expandedFeatures?.has(group.feature) ?? true}
                  onToggle={() => onToggleFeature?.(group.feature)}
                />
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
    </div>
  )
}
