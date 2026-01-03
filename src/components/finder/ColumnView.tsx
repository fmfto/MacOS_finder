'use client';

import { useEffect, useRef, useMemo } from 'react';
import { FileNode } from '@/types/file';
import { useFinderStore } from '@/store/useFinderStore';
import { useRouter } from 'next/navigation';
import FileIcon from './FileIcon';
import { ChevronRight } from 'lucide-react';
import { useBoxSelection } from '@/hooks/useBoxSelection';
import { setDragGhost } from '@/lib/dragUtils';
import { toBase64 } from '@/lib/utils';

export default function ColumnView() {
  const {
    currentPath,
    selectedFiles,
    openContextMenu,
    openPreview,
    files,
    startDrag,
    endDrag,
    setDragOver,
    moveFiles,
    dragState,
    boxSelection,
    uploadFiles,
    files: allFiles,
    sortBy,
    sortDirection,
    focusedFileId,
    setVisibleFiles,
  } = useFinderStore();
  
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Box Selection 훅
  const { handleMouseDown, handleContainerClick } = useBoxSelection({ containerRef, itemRefs });

  // --- 1. 컬럼 데이터 생성 (정렬 적용) ---
  const columns = useMemo(() => {
    const cols = [];
    const activeFiles = files.filter(f => !f.isTrashed);

    // [정렬 헬퍼 함수]
    const sortFiles = (nodes: FileNode[]) => {
      return [...nodes].sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'size':
            comparison = a.size - b.size;
            break;
          case 'date':
            // Date 객체 또는 문자열일 수 있으므로 new Date()로 통일
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
    };
    
    // Root 컬럼
    const rootFiles = activeFiles.filter(f => f.parentId === 'root');
    cols.push({
      level: 0,
      parentId: 'root',
      files: sortFiles(rootFiles)
    });

    // 하위 컬럼들
    let currentPathStr = '';
    // Start from 1 because 0 is 'root' which is handled above
    for (let i = 1; i < currentPath.length; i++) {
      const folderName = currentPath[i];
      currentPathStr = currentPathStr ? `${currentPathStr}/${folderName}` : folderName;
      
      const folderId = toBase64(currentPathStr);
      
      // 해당 폴더의 내용물 찾기
      const children = activeFiles.filter(f => f.parentId === folderId);
      
      // 폴더가 실제로는 존재하지 않아도(로딩 전 등) 
      // 경로상에 있다면 빈 컬럼이라도 보여주는 것이 UX상 나을 수 있음.
      // 하지만 여기서는 children이 있을 때만 추가하거나, 
      // 항상 추가하되 내용이 없을 수 있음.
      // 기존 로직은 folderId(폴더 객체)가 있어야 추가했음.
      // 여기서는 ID를 무조건 계산하므로 항상 컬럼을 추가할 수 있음.
      
      cols.push({ 
        level: i, 
        parentId: folderId, 
        files: sortFiles(children)
      });
    }
    return cols;
  }, [currentPath, files, sortBy, sortDirection]); 

  // 자동 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [columns.length]);

  // 마지막 컬럼의 파일들을 visibleFiles로 설정
  useEffect(() => {
    if (columns.length > 0) {
      const lastColumn = columns[columns.length - 1];
      setVisibleFiles(lastColumn.files);
    }
  }, [columns, setVisibleFiles]);

  // --- 핸들러들 ---
  const handleItemClick = (file: FileNode, level: number, index: number) => {
    // toggle 대신 항상 선택 (Column View 전용)
    useFinderStore.setState({
      selectedFiles: new Set([file.id]),
      focusedFileId: file.id,
      lastSelectedIndex: index
    });

    if (file.type === 'folder') {
      const newPath = currentPath.slice(0, level + 1);
      newPath.push(file.name);
      const nextUrl = `/drive/${newPath.join('/')}`;
      router.push(nextUrl);
    }
  };

  const handleDoubleClick = (file: FileNode, level: number, index: number) => {
    if (file.type === 'folder') {
      handleItemClick(file, level, index);
    } else {
      openPreview(file.id);
    }
  };

  const handleDragStart = (e: React.DragEvent, file: FileNode) => {
    e.stopPropagation();
    const isSelected = selectedFiles.has(file.id);
    const fileIds = isSelected ? Array.from(selectedFiles) : [file.id];
    const dragCount = fileIds.length;

    startDrag(fileIds, 'internal');
    
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', JSON.stringify(fileIds));
      setDragGhost(e, file.name, dragCount);
    }
  };

  // 폴더 아이템 위에 드롭
  const handleDrop = (e: React.DragEvent, targetFolder: FileNode) => {
    e.preventDefault();
    e.stopPropagation();

    if (dragState.isDragging && dragState.dragType === 'internal' && targetFolder.type === 'folder') {
      if (dragState.draggedFileIds.includes(targetFolder.id)) {
        endDrag();
        setDragOver(null);
        return;
      }
      moveFiles(dragState.draggedFileIds, targetFolder.id);
    }
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesToUpload = Array.from(e.dataTransfer.files);
      // @ts-ignore
      uploadFiles(filesToUpload, targetFolder.id);
    }
    endDrag();
    setDragOver(null);
  };

  // 컬럼 배경 드롭
  const handleColumnDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation(); 
    if (!['recent', 'trash'].includes(currentPath[0])) {
      const isInternal = dragState.isDragging && dragState.dragType === 'internal';
      e.dataTransfer.dropEffect = e.dataTransfer.types.includes('Files') ? 'copy' : (isInternal ? 'move' : 'none');
    }
  };

  const handleColumnDrop = (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (dragState.isDragging && dragState.dragType === 'internal') {
      if (dragState.draggedFileIds.includes(targetFolderId)) {
        endDrag();
        setDragOver(null);
        return;
      }
      moveFiles(dragState.draggedFileIds, targetFolderId);
    }
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesToUpload = Array.from(e.dataTransfer.files);
      uploadFiles(filesToUpload, targetFolderId);
    }

    endDrag();
    setDragOver(null);
  };

  // 빈 공간 드롭
  const handleContainerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!['recent', 'trash'].includes(currentPath[0])) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleContainerDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Calculate current folder ID
      let currentFolderId = 'root';
      if (currentPath.length > 1) {
        const relativeSegments = currentPath.slice(1);
        const relativePath = relativeSegments.join('/');
        currentFolderId = toBase64(relativePath);
      }

      if (currentFolderId) {
        const filesToUpload = Array.from(e.dataTransfer.files);
        uploadFiles(filesToUpload, currentFolderId);
      }
    }
  };

  const handleDragEnter = (e: React.DragEvent, file: FileNode) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragState.isDragging && dragState.dragType === 'internal' && file.type === 'folder') {
      if (dragState.draggedFileIds.includes(file.id)) {
        setDragOver(null);
        return;
      }
      setDragOver(file.id);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragOver = (e: React.DragEvent, file: FileNode) => {
    if (dragState.draggedFileIds.includes(file.id)) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }

    if ((dragState.isDragging && dragState.dragType === 'internal' && file.type === 'folder') || e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = e.dataTransfer.types.includes('Files') ? 'copy' : 'move';
      setDragOver(file.id);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative flex h-full w-full overflow-x-auto overflow-y-hidden bg-finder-bg border-t border-finder-border"
      onMouseDown={handleMouseDown}
      onClick={handleContainerClick}
      onDragOver={handleContainerDragOver}
      onDrop={handleContainerDrop}
    >
      {boxSelection.isActive && (
        <div
          className="absolute border-2 border-blue-500 bg-blue-200/20 pointer-events-none z-10"
          style={{
            left: Math.min(boxSelection.startX, boxSelection.endX),
            top: Math.min(boxSelection.startY, boxSelection.endY),
            width: Math.abs(boxSelection.endX - boxSelection.startX),
            height: Math.abs(boxSelection.endY - boxSelection.startY),
          }}
        />
      )}
      
      <div ref={scrollRef} className="flex h-full w-full overflow-x-auto overflow-y-hidden">
        {columns.map((col, index) => (
          <div 
            key={col.parentId} 
            className="w-60 min-w-[15rem] h-full border-r border-finder-border bg-white/50 backdrop-blur-sm flex flex-col overflow-y-auto"
            onDragOver={handleColumnDragOver}
            onDrop={(e) => handleColumnDrop(e, col.parentId)}
          >
            {col.files.length === 0 ? (
               <div className="text-xs text-center text-gray-400 mt-10 pointer-events-none">Empty Folder</div>
            ) : (
               col.files.map((file, fileIndex) => {
                 const isSelected = selectedFiles.has(file.id);
                 const isFocused = focusedFileId === file.id;
                 const isActivePath = currentPath[index + 1] === file.name;
                 const isHighlighted = isSelected || isActivePath;
                 const isDragOver = dragState.dragOverFileId === file.id && file.type === 'folder';

                 return (
                  <div
                    key={file.id}
                    ref={(el) => {
                      if (el) itemRefs.current.set(file.id, el);
                      else itemRefs.current.delete(file.id);
                    }}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, file)}
                    onDragEnd={endDrag}
                    onDrop={(e) => {
                      if (file.type === 'folder') {
                        handleDrop(e, file);
                      }
                    }}
                    onDragEnter={(e) => handleDragEnter(e, file)}
                    onDragLeave={handleDragLeave}
                    onDragOver={(e) => handleDragOver(e, file)}
                    onClick={() => handleItemClick(file, index, fileIndex)}
                    onDoubleClick={() => handleDoubleClick(file, index, fileIndex)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      useFinderStore.setState({
                        selectedFiles: new Set([file.id]),
                        focusedFileId: file.id
                      });
                      openContextMenu(e.clientX, e.clientY, file.id);
                    }}
                    className={`
                      flex items-center justify-between px-3 py-1.5 text-xs cursor-default transition-colors select-none
                      ${isHighlighted
                        ? isSelected
                          ? 'bg-finder-active text-white'
                          : 'bg-[#DCDCDC] text-black'
                        : 'hover:bg-finder-hover text-finder-text-primary'
                      }
                      ${isFocused && !isHighlighted ? 'ring-2 ring-finder-active/50 ring-inset' : ''}
                      ${isDragOver
                        ? 'border-2 border-blue-500'
                        : ''
                      }
                    `}
                  >
                    <div className="flex items-center gap-2 truncate pointer-events-none">
                      <FileIcon file={file} size={14} />
                      <span className="truncate">{file.name}</span>
                    </div>
                    
                    {file.type === 'folder' && (
                      <ChevronRight 
                        size={12} 
                        className={isHighlighted ? (isSelected ? 'text-white' : 'text-black') : 'text-finder-text-secondary/50'} 
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        ))}
        
        <div className="flex-1 min-w-[200px] bg-finder-bg" />
      </div>
    </div>
  );
}