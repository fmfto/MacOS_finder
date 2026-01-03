'use client';

import { FileNode } from '@/types/file';
import { useFinderStore } from '@/store/useFinderStore';
import FileIcon from './FileIcon';
import { useRouter, usePathname } from 'next/navigation';
import { useRef, useEffect, useCallback } from 'react';
import { useBoxSelection } from '@/hooks/useBoxSelection';
import { setDragGhost } from '@/lib/dragUtils';

interface GridViewProps {
  files: FileNode[];
}

export default function GridView({ files }: GridViewProps) {
  const {
    selectedFiles,
    selectFile,
    selectRange,
    openPreview,
    startDrag,
    endDrag,
    setDragOver,
    moveFiles,
    dragState,
    boxSelection,
    openContextMenu,
    uploadFiles,
    currentPath,
    files: allFiles,
    focusedFileId,
    setVisibleFiles,
    setGridColumns,
  } = useFinderStore();
  
  const router = useRouter();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const { handleMouseDown, handleContainerClick: boxSelectionClick } = useBoxSelection({ containerRef, itemRefs });

  // 컨테이너 클릭 핸들러 - 빈 영역 클릭 시 선택 해제
  const handleContainerClick = (e: React.MouseEvent) => {
    // 파일 아이템 위 클릭이면 무시 (파일 onClick에서 처리됨)
    if ((e.target as HTMLElement).closest('[data-file-item]')) {
      return;
    }
    // 박스 선택 후 클릭 처리
    boxSelectionClick(e);
    // 명시적으로 focusedFileId도 클리어
    useFinderStore.setState({ focusedFileId: null });
  };

  // 현재 뷰에 표시된 파일 목록 저장
  useEffect(() => {
    setVisibleFiles(files);
  }, [files, setVisibleFiles]);

  // Grid 컬럼 수 계산 (Tailwind 브레이크포인트는 viewport 기준)
  const updateGridColumns = useCallback(() => {
    const width = window.innerWidth;
    // tailwind 기준: sm:640, md:768, lg:1024, xl:1280
    // grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8
    let cols = 3;
    if (width >= 1280) cols = 8;
    else if (width >= 1024) cols = 6;
    else if (width >= 768) cols = 5;
    else if (width >= 640) cols = 4;
    setGridColumns(cols);
  }, [setGridColumns]);

  useEffect(() => {
    // 초기 계산 및 리사이즈 이벤트 등록
    updateGridColumns();
    window.addEventListener('resize', updateGridColumns);
    return () => window.removeEventListener('resize', updateGridColumns);
  }, [updateGridColumns]);

  // 현재 폴더 ID 찾기 헬퍼
  const getCurrentFolderId = () => {
    if (currentPath.length === 0 || (currentPath.length === 1 && currentPath[0] === 'root')) return 'root';
    if (['recent', 'trash'].includes(currentPath[0])) return null; // 가상 뷰에선 업로드 불가

    let currentId = 'root';
    for (let i = 1; i < currentPath.length; i++) {
      const folderName = decodeURIComponent(currentPath[i]);
      const folder = allFiles.find(f => f.parentId === currentId && f.name === folderName && f.type === 'folder' && !f.isTrashed);
      if (folder) currentId = folder.id;
      else return null;
    }
    return currentId;
  };

  const handleDoubleClick = (file: FileNode) => {
    if (file.type === 'folder') {
      const nextPath = `${pathname}/${file.name}`;
      router.push(nextPath);
    } else {
      openPreview(file.id);
    }
  };

  const handleDragStart = (e: React.DragEvent, file: FileNode) => {
    e.stopPropagation();
    const fileIds = selectedFiles.has(file.id) ? Array.from(selectedFiles) : [file.id];
    startDrag(fileIds, 'internal');

    // 드래그 고스트 이미지 설정
    const dragCount = fileIds.length;
    setDragGhost(e, file.name, dragCount);

    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', '');
    }
  };

  // [수정] 폴더 위에 드롭 핸들러 (내부 이동 + 외부 업로드)
  const handleDrop = (e: React.DragEvent, targetFolder: FileNode) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 1. 내부 파일 이동
    if (dragState.isDragging && dragState.dragType === 'internal' && targetFolder.type === 'folder') {
      // [수정] 자기 자신 또는 선택된 폴더 내부로 드롭하는 것을 방지
      if (dragState.draggedFileIds.includes(targetFolder.id)) {
        endDrag();
        setDragOver(null);
        return;
      }
      moveFiles(dragState.draggedFileIds, targetFolder.id);
    }
    
    // 2. 외부 파일 업로드
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesToUpload = Array.from(e.dataTransfer.files);
      uploadFiles(filesToUpload, targetFolder.id);
    }

    endDrag();
    setDragOver(null);
  };

  // [추가] 배경(빈 공간) 드래그 오버 핸들러
  const handleContainerDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // 필수: Drop 허용
    // 가상 뷰가 아닐 때만
    if (!['recent', 'trash'].includes(currentPath[0])) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  // [추가] 배경(빈 공간) 드롭 핸들러
  const handleContainerDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 외부 파일 업로드 -> 현재 폴더로
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const currentFolderId = getCurrentFolderId();
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
      // [수정] 자기 자신 또는 선택된 폴더 내부로 드롭하는 것을 방지
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
    // setDragOver(null); // 즉시 null로 만들면 자식 요소에서 부모로 넘어갈 때 깜빡임
  };

  const handleDragOver = (e: React.DragEvent, file: FileNode) => {
    // [수정] 자기 자신 또는 선택된 폴더 내부로 드롭하는 것을 방지
    if (dragState.draggedFileIds.includes(file.id)) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }

    // 내부 드래그이거나 외부 파일 드래그일 때 모두 허용
    if ((dragState.isDragging && dragState.dragType === 'internal' && file.type === 'folder') || e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = e.dataTransfer.types.includes('Files') ? 'copy' : 'move';
      if (file.type === 'folder') setDragOver(file.id);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4 p-2 h-full content-start"
      onMouseDown={handleMouseDown}
      onClick={handleContainerClick}
      onDragOver={handleContainerDragOver} // [연결]
      onDrop={handleContainerDrop}         // [연결]
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
      {files.map((file, index) => {
        const isSelected = selectedFiles.has(file.id);
        const isFocused = focusedFileId === file.id;
        const isDragOver = dragState.dragOverFileId === file.id && file.type === 'folder';

        return (
          <div
            key={file.id}
            data-file-item
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
            onClick={(e) => {
              e.stopPropagation();
              if (e.shiftKey) selectRange(files.map(f => f.id), index);
              else {
                selectFile(file.id, e.metaKey || e.ctrlKey);
                useFinderStore.setState({ lastSelectedIndex: index, focusedFileId: file.id });
              }
            }}
            onDoubleClick={() => handleDoubleClick(file)}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              selectFile(file.id);
              openContextMenu(e.clientX, e.clientY, file.id);
            }}

            className={`
              group flex flex-col items-center justify-start p-3 rounded-md cursor-pointer transition-all
              ${isSelected ? 'bg-finder-active/10 ring-1 ring-finder-active/30' : 'hover:bg-finder-hover'}
              ${isFocused && !isSelected ? 'ring-2 ring-finder-active/50' : ''}
              ${isDragOver ? 'ring-2 ring-blue-400 ring-offset-2 bg-blue-50' : ''}
            `}
          >
            <div className="mb-2 transition-transform group-hover:scale-105 pointer-events-none">
              <FileIcon file={file} size={48} />
            </div>

            <span className={`text-sm text-center px-1.5 py-0.5 rounded truncate w-full max-w-[120px] select-none ${isSelected ? 'bg-finder-active text-white font-medium' : 'text-finder-text-primary group-hover:text-black'}`}>
              {file.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}