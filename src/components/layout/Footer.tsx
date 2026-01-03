'use client';

import { useFinderStore } from '@/store/useFinderStore';
import { useRouter } from 'next/navigation';
import { formatSize } from '@/lib/format';
import { useMemo } from 'react';

export default function Footer() {
  const { currentPath, files, dragState, moveFiles, endDrag, setDragOver } = useFinderStore();
  const router = useRouter();

  // 현재 폴더의 파일 개수와 용량 계산
  const { itemCount, totalSize, availableSpace } = useMemo(() => {
    const rootSegment = currentPath.length > 0 ? currentPath[0] : 'root';
    let currentFiles: typeof files = [];
    let isVirtualView = false;

    // 1. 최근 항목 (Recent)
    if (rootSegment === 'recent') {
      isVirtualView = true;
      currentFiles = files
        .filter(f => !f.isTrashed)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
    // 2. 휴지통 (Trash)
    else if (rootSegment === 'trash') {
      isVirtualView = true;
      currentFiles = files.filter(f => f.isTrashed);
    }
    // 3. 일반 폴더 탐색
    else {
      let currentParentId = 'root';
      let folderNotFound = false;

      for (let i = 1; i < currentPath.length; i++) {
        const segmentName = decodeURIComponent(currentPath[i]);
        const folder = files.find(f => 
          f.name === segmentName && 
          f.type === 'folder' && 
          f.parentId === currentParentId && 
          !f.isTrashed
        );

        if (folder) {
          currentParentId = folder.id;
        } else {
          folderNotFound = true;
          break;
        }
      }

      if (!folderNotFound) {
        currentFiles = files.filter(f => f.parentId === currentParentId && !f.isTrashed);
      }
    }

    // 현재 폴더 아이템 개수
    const count = currentFiles.length;

    // 현재 폴더의 총 용량 계산
    const size = currentFiles.reduce((sum, file) => sum + file.size, 0);

    // 전체 사용 가능한 용량 (임시로 1TB로 설정, 나중에 API에서 가져올 수 있음)
    const totalAvailable = 1024 * 1024 * 1024 * 1024; // 1TB
    const usedSpace = files.filter(f => !f.isTrashed).reduce((sum, file) => sum + file.size, 0);
    const available = totalAvailable - usedSpace;

    return {
      itemCount: count,
      totalSize: size,
      availableSpace: available
    };
  }, [currentPath, files]);

  // 경로 세그먼트의 폴더 ID 찾기
  const getFolderIdByPathIndex = (pathIndex: number): string | null => {
    if (isVirtualView) return null;
    
    // Root인 경우
    if (pathIndex === 0 || (currentPath.length > 0 && currentPath[0] === 'root' && pathIndex === 0)) {
      return 'root';
    }
    
    // 특정 경로 세그먼트의 폴더 ID 찾기
    let currentParentId = 'root';
    const targetPath = currentPath.slice(0, pathIndex + 1);
    
    for (let i = 1; i < targetPath.length; i++) {
      const segmentName = decodeURIComponent(targetPath[i]);
      const folder = files.find(f => 
        f.name === segmentName && 
        f.type === 'folder' && 
        f.parentId === currentParentId && 
        !f.isTrashed
      );
      
      if (folder) {
        currentParentId = folder.id;
      } else {
        return null;
      }
    }
    
    return currentParentId;
  };

  // Breadcrumb 경로 클릭 핸들러
  const handlePathClick = (index: number) => {
    // Root 클릭 (index 0이거나 첫 번째 세그먼트가 'root'인 경우)
    if (index === 0 || (currentPath.length > 0 && currentPath[0] === 'root' && index === 0)) {
      router.push('/drive/root');
    } else {
      // 특정 경로 세그먼트 클릭
      const targetPath = currentPath.slice(0, index + 1);
      router.push(`/drive/${targetPath.join('/')}`);
    }
  };

  // 드래그 앤 드롭 핸들러
  const handleDragEnter = (e: React.DragEvent, pathIndex: number) => {
    if (dragState.isDragging && dragState.dragType === 'internal' && !isVirtualView) {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(`path-${pathIndex}`);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);
  };

  const handleDragOver = (e: React.DragEvent, pathIndex: number) => {
    if (dragState.isDragging && dragState.dragType === 'internal' && !isVirtualView) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      setDragOver(`path-${pathIndex}`);
    }
  };

  const handleDrop = (e: React.DragEvent, pathIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (dragState.isDragging && dragState.dragType === 'internal' && !isVirtualView) {
      const targetFolderId = getFolderIdByPathIndex(pathIndex);
      if (targetFolderId) {
        moveFiles(dragState.draggedFileIds, targetFolderId);
      }
    }
    setDragOver(null);
    endDrag();
  };

  // 가상 뷰인지 확인
  const isVirtualView = currentPath.length > 0 && ['recent', 'trash'].includes(currentPath[0]);

  return (
    <footer className="h-6 bg-finder-bg border-t border-finder-border flex items-center justify-between px-4 text-[10px] text-finder-text-secondary select-none">
      {/* Breadcrumb Path */}
      <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
        {currentPath.length === 0 || (currentPath.length === 1 && currentPath[0] === 'root') ? (
          <span className="font-semibold text-finder-text-primary">FM Drive</span>
        ) : (
          <>
            {isVirtualView ? (
              <span className="font-semibold text-finder-text-primary">
                {currentPath[0] === 'recent' && 'Recent'}
                {currentPath[0] === 'trash' && 'Trash'}
              </span>
            ) : (
              <>
                <button
                  onClick={() => handlePathClick(0)}
                  onDragEnter={(e) => handleDragEnter(e, 0)}
                  onDragLeave={handleDragLeave}
                  onDragOver={(e) => handleDragOver(e, 0)}
                  onDrop={(e) => handleDrop(e, 0)}
                  className={`hover:text-finder-text-primary transition-colors truncate ${
                    dragState.isDragging && dragState.dragType === 'internal' && dragState.dragOverFileId === 'path-0'
                      ? 'text-blue-500 font-semibold' 
                      : ''
                  }`}
                >
                  FM Drive
                </button>
                {currentPath.map((segment, index) => {
                  // 'root' 세그먼트는 건너뛰기 (이미 "FM Drive"로 표시됨)
                  if (segment === 'root') return null;
                  const isLast = index === currentPath.length - 1;
                  const pathIndex = index;
                  return (
                    <span key={index} className="flex items-center gap-1">
                      <span className="opacity-40 mx-1">/</span>
                      <button
                        onClick={() => handlePathClick(index)}
                        onDragEnter={(e) => handleDragEnter(e, pathIndex)}
                        onDragLeave={handleDragLeave}
                        onDragOver={(e) => handleDragOver(e, pathIndex)}
                        onDrop={(e) => handleDrop(e, pathIndex)}
                        className={`hover:text-finder-text-primary transition-colors truncate ${
                          isLast ? 'font-semibold text-finder-text-primary' : ''
                        } ${
                          dragState.isDragging && dragState.dragType === 'internal' && dragState.dragOverFileId === `path-${pathIndex}`
                            ? 'text-blue-500 font-semibold' 
                            : ''
                        }`}
                      >
                        {decodeURIComponent(segment)}
                      </button>
                    </span>
                  );
                })}
              </>
            )}
          </>
        )}
      </div>

      {/* Statistics */}
      <div className="flex items-center gap-3 ml-4 flex-shrink-0">
        <span>
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </span>
        <span className="opacity-50">•</span>
        <span>{formatSize(availableSpace)} available</span>
      </div>
    </footer>
  );
}

