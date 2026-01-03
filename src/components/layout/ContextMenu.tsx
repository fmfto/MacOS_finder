'use client';

import { useFinderStore } from '@/store/useFinderStore';
import { useEffect, useRef } from 'react';

export default function ContextMenu() {
  const {
    contextMenu,
    closeContextMenu,
    moveFileToTrash,
    restoreFromTrash,
    permanentlyDelete,
    emptyTrash,
    openModal,
    openPreview,
    copyFiles,
    cutFiles,
    pasteFiles,
    duplicateFile,
    selectedFiles,
    clipboard,
    currentPath,
    files,
    addToFavorites,
    removeFromFavorites,
    favorites
  } = useFinderStore();
  const menuRef = useRef<HTMLDivElement>(null);

  // ... 외부 클릭 감지 로직 유지 ...
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [closeContextMenu]);

  if (!contextMenu.isOpen) return null;

  const { x, y, targetId } = contextMenu;

  // 현재 폴더의 parentId 찾기 (붙여넣기용)
  const getCurrentParentId = () => {
    if (currentPath.length === 0 || currentPath[0] === 'root') return 'root';
    if (currentPath[0] === 'recent' || currentPath[0] === 'trash') return null; // 가상 뷰에서는 붙여넣기 불가
    
    let currentParentId = 'root';
    for (let i = 1; i < currentPath.length; i++) {
      const segmentName = decodeURIComponent(currentPath[i]);
      const folder = files.find(f => 
        f.name === segmentName && f.type === 'folder' && f.parentId === currentParentId && !f.isTrashed
      );
      if (folder) currentParentId = folder.id;
      else return null;
    }
    return currentParentId;
  };

  // 현재 휴지통 뷰인지 확인
  const isTrashView = currentPath.length > 0 && currentPath[0] === 'trash';

  // 다중 선택된 파일들에 대한 메뉴
  const getMenuItems = () => {
    // targetId가 없어도 선택된 파일이 있으면 다중 선택으로 처리
    const hasMultipleSelection = selectedFiles.size > 1;
    const hasSelection = selectedFiles.size > 0;
    const fileIds = hasSelection ? Array.from(selectedFiles) : (targetId ? [targetId] : []);
    const targetFile = targetId ? files.find(f => f.id === targetId) : null;
    const isFolder = targetFile?.type === 'folder';
    const isFavorited = targetFile && favorites.includes(targetFile.id);

    // 휴지통 뷰에서의 메뉴
    if (isTrashView) {
      if (targetId || hasSelection) {
        return [
          {
            label: hasMultipleSelection ? `Restore ${selectedFiles.size} Items` : 'Put Back',
            action: () => {
              fileIds.forEach(id => restoreFromTrash(id));
            }
          },
          { label: 'Get Info', action: () => openModal('info', targetId) },
          { label: 'separator', action: () => {}, separator: true },
          {
            label: hasMultipleSelection ? `Delete ${selectedFiles.size} Items Permanently` : 'Delete Immediately',
            action: () => {
              fileIds.forEach(id => permanentlyDelete(id));
            },
            danger: true
          },
        ];
      } else {
        // 휴지통 배경 메뉴
        return [
          {
            label: 'Empty Trash',
            action: () => {
              if (confirm('Are you sure you want to permanently delete all items in the Trash?')) {
                emptyTrash();
              }
            },
            danger: true,
            disabled: files.filter(f => f.isTrashed).length === 0
          },
        ];
      }
    }

    // 일반 파일/폴더 메뉴
    if (targetId || hasSelection) {
      return [
        ...(hasMultipleSelection || !targetId ? [] : [
          { label: 'Open', action: () => {
            const file = files.find(f => f.id === targetId);
            if (file && file.type === 'folder') {
              // 폴더 열기는 라우터로 처리해야 함
            } else if (file && file.type === 'file') {
              openPreview(targetId);
            }
          }},
          { label: 'Quick Look', action: () => {
            if (targetId) {
              const file = files.find(f => f.id === targetId);
              if (file && file.type === 'file') {
                openPreview(targetId);
              }
            }
          }},
        ]),
        { label: 'Get Info', action: () => openModal('info', targetId || fileIds[0]) },
        // 폴더인 경우 즐겨찾기 추가/제거
        ...(isFolder && !hasMultipleSelection ? [
          {
            label: isFavorited ? 'Remove from Favorites' : 'Add to Favorites',
            action: () => {
              if (isFavorited) {
                removeFromFavorites(targetId!);
              } else {
                addToFavorites(targetId!);
              }
            },
            separator: true
          }
        ] : [{ label: 'separator', action: () => {}, separator: true }]),
        ...(hasMultipleSelection || !targetId ? [] : [
          { label: 'Duplicate', action: () => targetId && duplicateFile(targetId) }
        ]),
        { label: 'Copy', action: () => copyFiles(fileIds) },
        { label: 'Cut', action: () => cutFiles(fileIds) },
        {
          label: 'Paste',
          action: () => {
            const parentId = getCurrentParentId();
            if (parentId) pasteFiles(parentId);
          },
          disabled: !clipboard.type || clipboard.fileIds.length === 0,
          separator: true
        },
        ...(hasMultipleSelection ? [] : [
          { label: 'Rename', action: () => openModal('rename', targetId), separator: true }
        ]),
        {
          label: hasMultipleSelection ? `Move ${selectedFiles.size} Items to Trash` : 'Move to Trash',
          action: () => {
            fileIds.forEach(id => moveFileToTrash(id));
          },
          danger: true
        },
      ];
    } else {
      // 배경 메뉴
      return [
        { label: 'New Folder', action: () => openModal('new-folder') },
        {
          label: 'Paste',
          action: () => {
            const parentId = getCurrentParentId();
            if (parentId) pasteFiles(parentId);
          },
          disabled: !clipboard.type || clipboard.fileIds.length === 0,
          separator: true
        },
        { label: 'Get Info', action: () => openModal('info') },
      ];
    }
  };

  const menuItems = getMenuItems();

  return (
    // ... JSX 구조 유지 (div, map 등) ...
    <div 
      ref={menuRef}
      className="fixed z-50 w-48 bg-white/95 backdrop-blur-xl rounded-lg shadow-xl border border-black/10 py-1.5 select-none text-[13px] overflow-hidden"
      style={{ top: y, left: x }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {menuItems.map((item, index) => {
        // separator 아이템 처리
        if (item.label === 'separator') {
          return <div key={index} className="h-[1px] bg-gray-200 my-1 mx-3" />;
        }
        return (
          <div key={index}>
            <button
              onClick={() => {
                // @ts-ignore
                if (item.disabled) return;
                item.action();
                closeContextMenu();
              }}
              disabled={item.disabled}
              className={`
                w-full text-left px-3 py-1.5 flex items-center gap-2
                hover:bg-blue-500 hover:text-white transition-colors
                ${item.danger ? 'text-red-500' : 'text-gray-800'}
                ${item.disabled ? 'opacity-50 cursor-not-allowed hover:bg-transparent hover:text-gray-800' : ''}
              `}
            >
              <span>{item.label}</span>
            </button>
            {/* @ts-ignore */}
            {item.separator && <div className="h-[1px] bg-gray-200 my-1 mx-3" />}
          </div>
        );
      })}
    </div>
  );
}