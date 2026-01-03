'use client';

import { useFinderStore } from '@/store/useFinderStore';
import { useState, useEffect, useRef } from 'react';

export default function ActionModal() {
  const { modal, closeModal, renameFile, createFolder, files, currentPath } = useFinderStore();
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 현재 경로의 마지막 폴더 ID 찾기 (새 폴더 생성용)
  // (실제로는 Store에서 currentFolderId를 관리하는 게 좋지만, 여기서는 간편하게 계산)
  const getCurrentFolderId = () => {
    if (currentPath.length === 0 || currentPath[0] === 'root') return 'root';
    // 마지막 경로 이름으로 ID 찾기 (MockData 방식 의존)
    const folderName = currentPath[currentPath.length - 1];
    const folder = files.find(f => f.name === decodeURIComponent(folderName) && f.type === 'folder');
    return folder ? folder.id : 'root';
  };

  useEffect(() => {
    if (modal.isOpen) {
      if (modal.type === 'rename' && modal.targetId) {
        const targetFile = files.find(f => f.id === modal.targetId);
        setInputValue(targetFile ? targetFile.name : '');
      } else {
        setInputValue('Untitled Folder');
      }
      // 모달 열리면 자동 포커스
      setTimeout(() => inputRef.current?.select(), 100);
    }
  }, [modal.isOpen, modal.type, modal.targetId, files]);

  if (!modal.isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    if (modal.type === 'rename' && modal.targetId) {
      renameFile(modal.targetId, inputValue);
    } else if (modal.type === 'new-folder') {
      // 현재 경로의 ID를 찾아서 그 아래에 생성
      const parentId = getCurrentFolderId();
      createFolder(inputValue, parentId);
    }
    closeModal();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-80 p-4 animate-in fade-in zoom-in duration-200">
        <h3 className="text-sm font-semibold mb-3 text-center">
          {modal.type === 'rename' ? 'Rename File' : 'New Folder'}
        </h3>
        
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full px-3 py-2 bg-gray-100 rounded-md border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          />
          
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeModal}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-medium bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors shadow-sm"
            >
              {modal.type === 'rename' ? 'Rename' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}