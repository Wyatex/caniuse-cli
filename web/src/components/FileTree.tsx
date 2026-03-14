import React, { useState } from 'react';
import type { TreeNode } from '../types';

interface FileTreeProps {
  node: TreeNode;
  selectedPath: string | null;
  onSelect: (path: string, type: 'file' | 'directory') => void;
  level?: number;
}

const FILE_ICONS: Record<string, string> = {
  ts: '📘',
  tsx: '⚛️',
  js: '📒',
  jsx: '⚛️',
  vue: '💚',
};

const DEFAULT_FILE_ICON = '📄';
const DIRECTORY_ICON = '📁';
const DIRECTORY_OPEN_ICON = '📂';

export function FileTree({ node, selectedPath, onSelect, level = 0 }: FileTreeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2);

  const isDirectory = node.type === 'directory';
  const isSelected = selectedPath === node.path;
  const hasChildren = isDirectory && node.children && node.children.length > 0;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDirectory) {
      setIsExpanded(!isExpanded);
    }
    onSelect(node.path, node.type);
  };

  const getIcon = () => {
    if (isDirectory) {
      return isExpanded ? DIRECTORY_OPEN_ICON : DIRECTORY_ICON;
    }
    const ext = node.extension?.toLowerCase() || '';
    return FILE_ICONS[ext] || DEFAULT_FILE_ICON;
  };

  return (
    <div style={{ paddingLeft: level * 16 }}>
      <div
        onClick={handleClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 12px',
          cursor: 'pointer',
          borderRadius: '4px',
          backgroundColor: isSelected ? 'rgba(77, 166, 255, 0.2)' : 'transparent',
          transition: 'background-color 0.15s',
          userSelect: 'none',
        }}
        onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
          const target = e.currentTarget;
          if (!isSelected) {
            target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
          }
        }}
        onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
          const target = e.currentTarget;
          if (!isSelected) {
            target.style.backgroundColor = 'transparent';
          }
        }}
      >
        <span style={{ marginRight: '8px', fontSize: '14px' }}>{getIcon()}</span>
        <span style={{ fontSize: '14px', color: isSelected ? '#4da6ff' : '#ccc' }}>
          {node.name}
        </span>
        {isDirectory && hasChildren && (
          <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#666' }}>
            {node.children?.length}
          </span>
        )}
      </div>

      {isDirectory && isExpanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <FileTree
              key={child.path}
              node={child}
              selectedPath={selectedPath}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FileTreeContainerProps {
  tree: TreeNode | null;
  selectedPath: string | null;
  onSelect: (path: string, type: 'file' | 'directory') => void;
}

export function FileTreeContainer({ tree, selectedPath, onSelect }: FileTreeContainerProps) {
  if (!tree) {
    return (
      <div style={{ padding: '20px', color: '#666', textAlign: 'center' }}>
        Loading file tree...
      </div>
    );
  }

  return (
    <div
      style={{
        height: '100%',
        overflow: 'auto',
        padding: '8px 0',
      }}
    >
      <FileTree node={tree} selectedPath={selectedPath} onSelect={onSelect} />
    </div>
  );
}
