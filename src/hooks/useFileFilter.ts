import { useMemo } from 'react';
import { FileNode } from '@/types/file';
import { useFinderStore } from '@/store/useFinderStore';
import { toBase64 } from '@/lib/utils';

export const useFileFilter = (allFiles: FileNode[]) => {
  const { currentPath, searchQuery, sortBy, sortDirection } = useFinderStore();

  const filteredFiles = useMemo(() => {
    let result: FileNode[] = [];

    // 1. [검색 모드] vs [일반 탐색 모드]
    if (searchQuery.trim().length > 0) {
      // Global Search: 전체 파일 대상
      const lowerQuery = searchQuery.toLowerCase();
      result = allFiles.filter(f => 
        !f.isTrashed && f.name.toLowerCase().includes(lowerQuery)
      );
    } else {
      // Local Navigation: 현재 경로 대상
      const rootSegment = currentPath[0];
      
      if (rootSegment === 'recent') {
        result = allFiles.filter(f => !f.isTrashed);
      } else if (rootSegment === 'trash') {
        result = allFiles.filter(f => f.isTrashed);
      } else {
        // ID Calculation based on Path (Server Logic Mirroring)
        let currentParentId = 'root';
        
        // currentPath: ['root', 'A', 'B'] -> relative: 'A/B'
        if (currentPath.length > 1) {
          // Remove 'root' from start
          const relativeSegments = currentPath.slice(1);
          // Join with '/'
          const relativePath = relativeSegments.join('/');
          // Base64 Encode
          currentParentId = toBase64(relativePath);
        }

        result = allFiles.filter(f => f.parentId === currentParentId && !f.isTrashed);
      }
    }

    // 2. 정렬 (Sorting)
    return result.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'date':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'kind':
          const typeA = a.type === 'folder' ? 'folder' : (a.mimeType || '');
          const typeB = b.type === 'folder' ? 'folder' : (b.mimeType || '');
          comparison = typeA.localeCompare(typeB);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

  }, [allFiles, currentPath, searchQuery, sortBy, sortDirection]);

  return filteredFiles;
};