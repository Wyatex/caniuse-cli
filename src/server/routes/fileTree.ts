import Elysia from 'elysia';
import { buildFileTree } from '../../scanner';

export function fileTreeRoute(targetDir: string) {
  return new Elysia({ prefix: '/api' }).get('/file-tree', () => {
    const tree = buildFileTree(targetDir);
    return {
      success: true,
      data: tree,
    };
  });
}
