'use client';

import { FileNode } from '@/types/file';
import { useFinderStore } from '@/store/useFinderStore';
import FileIcon from './FileIcon';
import { formatSize, formatDate } from '@/lib/format';
import { useRouter, usePathname } from 'next/navigation';
import { useRef, useEffect } from 'react';
import { useBoxSelection } from '@/hooks/useBoxSelection';

import { setDragGhost } from '@/lib/dragUtils';

interface ListViewProps {
  files: FileNode[];
}

export default function ListView({ files }: ListViewProps) {
  const {
    selectedFiles,
    selectFile,
    selectRange,
    openContextMenu,
    openPreview,
    startDrag,
    endDrag,
    setDragOver,
    moveFiles,
    dragState,
    boxSelection,
    uploadFiles,
    currentPath,
    files: allFiles,
    focusedFileId,
    setVisibleFiles,
  } = useFinderStore();
  const router = useRouter();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());

  const { handleMouseDown, handleContainerClick } = useBoxSelection({ containerRef, itemRefs: rowRefs });

  // 현재 뷰에 표시된 파일 목록 저장
  useEffect(() => {
    setVisibleFiles(files);
  }, [files, setVisibleFiles]);

  // 현재 폴더 ID 찾기 헬퍼
  const getCurrentFolderId = () => {
    if (currentPath.length === 0 || (currentPath.length === 1 && currentPath[0] === 'root')) return 'root';
    if (['recent', 'trash'].includes(currentPath[0])) return null;

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

  // [수정] 폴더 드롭
  const handleDrop = (e: React.DragEvent, targetFolder: FileNode) => {
    e.preventDefault();
    e.stopPropagation();
    
    // [수정] 자기 자신 또는 선택된 폴더 내부로 드롭하는 것을 방지
    if (dragState.isDragging && dragState.dragType === 'internal' && targetFolder.type === 'folder') {
      if (dragState.draggedFileIds.includes(targetFolder.id)) {
        endDrag();
        setDragOver(null);
        return;
      }
      moveFiles(dragState.draggedFileIds, targetFolder.id);
    }
    
    // 외부 파일 업로드
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesToUpload = Array.from(e.dataTransfer.files);
      uploadFiles(filesToUpload, targetFolder.id);
    }

    endDrag();
    setDragOver(null);
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
    // setDragOver(null); // 자식/부모 요소 이동 시 깜빡임 문제로 즉시 null 처리 안함
  };

  const handleDragOver = (e: React.DragEvent, file: FileNode) => {
    // [수정] 자기 자신 또는 선택된 폴더 내부로 드롭하는 것을 방지
    if (dragState.draggedFileIds.includes(file.id)) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }

    if ((dragState.isDragging && dragState.dragType === 'internal' && file.type === 'folder') || e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = e.dataTransfer.types.includes('Files') ? 'copy' : 'move';
      if (file.type === 'folder') setDragOver(file.id);
    }
  };

  // [추가] 배경 드롭
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
      const currentFolderId = getCurrentFolderId();
      if (currentFolderId) {
        const filesToUpload = Array.from(e.dataTransfer.files);
        uploadFiles(filesToUpload, currentFolderId);
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-auto"
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
      <table className="w-full text-left text-sm border-collapse">
        <thead className="sticky top-0 bg-finder-bg z-10 text-finder-text-secondary font-medium text-xs border-b border-finder-border">
          <tr>
            <th className="pl-4 py-1.5 w-[40%] font-normal">Name</th>
            <th className="py-1.5 w-[25%] font-normal">Date Modified</th>
            <th className="py-1.5 w-[15%] font-normal">Size</th>
            <th className="py-1.5 w-[20%] font-normal">Kind</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file, index) => {
            const isSelected = selectedFiles.has(file.id);
            const isFocused = focusedFileId === file.id;
            const isEven = index % 2 === 0;
            const isFirst = index === 0;
            const isLast = index === files.length - 1;
            const isDragOver = dragState.dragOverFileId === file.id && file.type === 'folder';

            return (
              <tr
                key={file.id}
                ref={(el) => {
                  if (el) rowRefs.current.set(file.id, el);
                  else rowRefs.current.delete(file.id);
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
                  cursor-pointer select-none
                  ${isSelected ? 'bg-finder-active text-white' : isEven ? 'bg-finder-bg' : 'bg-white'}
                  ${!isSelected && 'hover:bg-finder-hover'}
                  ${isFocused && !isSelected ? 'outline outline-2 outline-finder-active/50 -outline-offset-2' : ''}
                  ${isDragOver
                    ? isFirst
                      ? 'border-b-2 border-blue-500'
                      : isLast
                        ? 'border-t-2 border-blue-500'
                        : 'border-t-2 border-b-2 border-blue-500'
                    : 'border-b border-transparent'
                  }
                `}
              >
                <td className="pl-4 py-1 flex items-center gap-2 overflow-hidden">
                  <div className="flex-shrink-0"><FileIcon file={file} size={16} /></div>
                  <span className="truncate font-medium">{decodeURIComponent(file.name)}</span>
                </td>
                <td className={`py-1 whitespace-nowrap ${isSelected ? 'text-white' : 'text-finder-text-secondary'}`}>{formatDate(file.updatedAt)}</td>
                <td className={`py-1 whitespace-nowrap ${isSelected ? 'text-white' : 'text-finder-text-secondary'}`}>{formatSize(file.size)}</td>
                <td className={`py-1 whitespace-nowrap ${isSelected ? 'text-white' : 'text-finder-text-secondary'}`}>{file.type === 'folder' ? 'Folder' : (file.mimeType?.split('/')[1].toUpperCase() || 'File')}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}