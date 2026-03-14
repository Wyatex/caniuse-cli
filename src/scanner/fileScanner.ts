import fg from 'fast-glob';
import {join} from 'path';

export const SCAN_PATTERNS = ['**/*.{js,ts,jsx,tsx,vue}'];
export const IGNORE_PATTERNS = ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'];

export interface ScanResult {
  files: string[];
  total: number;
}

export interface FileEntry {
  path: string;
  relativePath: string;
  type: 'file' | 'directory';
  extension: string;
}

export async function scanFiles(targetDir: string): Promise<ScanResult> {
  const files = await fg(SCAN_PATTERNS, {
    cwd: targetDir,
    absolute: true,
    ignore: IGNORE_PATTERNS,
    onlyFiles: true,
  });

  return {
    files: files.sort(),
    total: files.length,
  };
}

export async function getFileTree(targetDir: string): Promise<FileEntry[]> {
  const files = await fg(SCAN_PATTERNS, {
    cwd: targetDir,
    ignore: IGNORE_PATTERNS,
    onlyFiles: true,
  });

  return files.map((file) => {
    const ext = file.split('.').pop() ?? '';
    return {
      path: join(targetDir, file),
      relativePath: file,
      type: 'file',
      extension: ext,
    };
  });
}

export interface TreeNode {
  name: string;
  path: string;
  relativePath: string;
  type: 'file' | 'directory';
  children?: TreeNode[];
  extension?: string;
}

export function buildFileTree(targetDir: string): TreeNode {
  const files = fg.sync(SCAN_PATTERNS, {
    cwd: targetDir,
    ignore: IGNORE_PATTERNS,
    onlyFiles: true,
  });

  const root: TreeNode = {
    name: targetDir.split(/[/\\]/).pop() ?? 'root',
    path: targetDir,
    relativePath: '',
    type: 'directory',
    children: [],
  };

  for (const file of files) {
    const parts = file.split(/[/\\]/);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i] ?? '';
      const isFile = i === parts.length - 1;

      if (!current.children) {
        current.children = [];
      }

      let child = current.children.find((c) => c.name === part);

      if (!child) {
        const childPath = join(targetDir, ...parts.slice(0, i + 1));
        const relativePath = parts.slice(0, i + 1).join('/');

        child = {
          name: part,
          path: childPath,
          relativePath,
          type: isFile ? 'file' : 'directory',
          children: isFile ? undefined : [],
          extension: isFile ? part.split('.').pop() : undefined,
        };

        current.children.push(child);
      }

      current = child;
    }
  }

  // Sort children: directories first, then files, alphabetically
  function sortChildren(node: TreeNode): void {
    if (node.children) {
      node.children.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      node.children.forEach(sortChildren);
    }
  }

  sortChildren(root);

  return root;
}
