'use client';

import { useEffect } from 'react';
import { useFinderStore } from '@/store/useFinderStore';
import { useRouter, usePathname } from 'next/navigation';
import { FileNode } from '@/types/file';

export function useKeyboardShortcuts() {
  const {
    selectedFiles,
    files,
    currentPath,
    viewMode,
    setViewMode,
    clearSelection,
    moveFileToTrash,
    copyFiles,
    cutFiles,
    pasteFiles,
    duplicateFile,
    openModal,
    navigateUp,
    moveFocus,
    focusedFileId,
    visibleFiles,
  } = useFinderStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에 포커스가 있으면 단축키 무시
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      const shift = e.shiftKey;
      const alt = e.altKey;

      // Cmd/Ctrl + A: 전체 선택
      if (cmdOrCtrl && e.key === 'a') {
        e.preventDefault();
        const store = useFinderStore.getState();
        const { files, currentPath } = store;
        
        // 현재 폴더의 파일들만 선택
        const rootSegment = currentPath.length > 0 ? currentPath[0] : 'root';
        let currentFiles: FileNode[] = [];
        
        if (rootSegment === 'recent') {
          currentFiles = files.filter(f => !f.isTrashed);
        } else if (rootSegment === 'trash') {
          currentFiles = files.filter(f => f.isTrashed);
        } else {
          let currentParentId = 'root';
          for (let i = 1; i < currentPath.length; i++) {
            const segmentName = decodeURIComponent(currentPath[i]);
            const folder = files.find(f => 
              f.name === segmentName && f.type === 'folder' && f.parentId === currentParentId && !f.isTrashed
            );
            if (folder) currentParentId = folder.id;
            else return;
          }
          currentFiles = files.filter(f => f.parentId === currentParentId && !f.isTrashed);
        }
        
        const allIds = new Set(currentFiles.map(f => f.id));
        useFinderStore.setState({ selectedFiles: allIds });
        return;
      }

      // Cmd/Ctrl + C: 복사
      if (cmdOrCtrl && e.key === 'c') {
        e.preventDefault();
        if (selectedFiles.size > 0) {
          copyFiles(Array.from(selectedFiles));
        }
        return;
      }

      // Cmd/Ctrl + X: 잘라내기
      if (cmdOrCtrl && e.key === 'x') {
        e.preventDefault();
        if (selectedFiles.size > 0) {
          cutFiles(Array.from(selectedFiles));
        }
        return;
      }

      // Cmd/Ctrl + V: 붙여넣기
      if (cmdOrCtrl && e.key === 'v') {
        e.preventDefault();
        const { clipboard, currentPath, files } = useFinderStore.getState();
        if (!clipboard.type || clipboard.fileIds.length === 0) return;

        // 현재 폴더의 parentId 찾기
        let targetParentId = 'root';
        if (currentPath.length > 0 && currentPath[0] !== 'recent' && currentPath[0] !== 'trash') {
          let currentParentId = 'root';
          for (let i = 1; i < currentPath.length; i++) {
            const segmentName = decodeURIComponent(currentPath[i]);
            const folder = files.find(f => 
              f.name === segmentName && f.type === 'folder' && f.parentId === currentParentId && !f.isTrashed
            );
            if (folder) currentParentId = folder.id;
            else return;
          }
          targetParentId = currentParentId;
        }
        
        pasteFiles(targetParentId);
        return;
      }

      // Delete / Backspace: 삭제
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (selectedFiles.size > 0) {
          selectedFiles.forEach(fileId => moveFileToTrash(fileId));
          clearSelection();
        }
        return;
      }

      // Space: 미리보기
      if (e.key === ' ' && !cmdOrCtrl && !shift && !alt) {
        e.preventDefault();
        if (selectedFiles.size === 1) {
          const fileId = Array.from(selectedFiles)[0];
          const file = files.find(f => f.id === fileId);
          if (file && file.type === 'file') {
            useFinderStore.getState().openPreview(fileId);
          }
        }
        return;
      }

      // Enter: 폴더 열기 / 파일 미리보기
      if (e.key === 'Enter' && !cmdOrCtrl && !shift && !alt) {
        e.preventDefault();
        if (selectedFiles.size === 1) {
          const fileId = Array.from(selectedFiles)[0];
          const file = files.find(f => f.id === fileId);
          if (file) {
            if (file.type === 'folder') {
              const nextPath = `${pathname}/${file.name}`;
              router.push(nextPath);
            } else {
              useFinderStore.getState().openPreview(fileId);
            }
          }
        }
        return;
      }

      // Escape: 선택 해제
      if (e.key === 'Escape') {
        e.preventDefault();
        clearSelection();
        useFinderStore.getState().closeContextMenu();
        useFinderStore.getState().closeModal();
        return;
      }

      // Cmd/Ctrl + D: 복제
      if (cmdOrCtrl && e.key === 'd') {
        e.preventDefault();
        if (selectedFiles.size === 1) {
          const fileId = Array.from(selectedFiles)[0];
          duplicateFile(fileId);
        }
        return;
      }

      // Cmd/Ctrl + Up: 상위 폴더로 이동 (화살표 키보다 먼저 체크)
      if (cmdOrCtrl && e.key === 'ArrowUp') {
        e.preventDefault();
        navigateUp();
        return;
      }

      // Cmd/Ctrl + Down: 선택한 폴더 열기 (화살표 키보다 먼저 체크)
      if (cmdOrCtrl && e.key === 'ArrowDown') {
        e.preventDefault();
        if (selectedFiles.size === 1) {
          const fileId = Array.from(selectedFiles)[0];
          const file = files.find(f => f.id === fileId);
          if (file && file.type === 'folder') {
            const nextPath = `${pathname}/${file.name}`;
            router.push(nextPath);
          }
        }
        return;
      }

      // Arrow keys: 파일 간 이동 (Grid/List만, Column View 제외)
      if (!cmdOrCtrl && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();

        const direction = e.key === 'ArrowUp' ? 'up'
          : e.key === 'ArrowDown' ? 'down'
          : e.key === 'ArrowLeft' ? 'left'
          : 'right';

        moveFocus(direction, shift);
        return;
      }

      // Home: 첫 번째 파일로 이동
      if (e.key === 'Home' && !cmdOrCtrl && !shift && !alt) {
        e.preventDefault();
        const { visibleFiles } = useFinderStore.getState();
        if (visibleFiles.length > 0) {
          const firstFile = visibleFiles[0];
          useFinderStore.setState({
            focusedFileId: firstFile.id,
            selectedFiles: new Set([firstFile.id]),
            lastSelectedIndex: 0
          });
        }
        return;
      }

      // End: 마지막 파일로 이동
      if (e.key === 'End' && !cmdOrCtrl && !shift && !alt) {
        e.preventDefault();
        const { visibleFiles } = useFinderStore.getState();
        if (visibleFiles.length > 0) {
          const lastFile = visibleFiles[visibleFiles.length - 1];
          useFinderStore.setState({
            focusedFileId: lastFile.id,
            selectedFiles: new Set([lastFile.id]),
            lastSelectedIndex: visibleFiles.length - 1
          });
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFiles, files, currentPath, pathname, router, copyFiles, cutFiles, pasteFiles, moveFileToTrash, duplicateFile, clearSelection, setViewMode, moveFocus, navigateUp]);
}

