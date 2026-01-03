'use client';

import { useFinderStore } from '@/store/useFinderStore';
import { X, Folder, File, Image, Video, FileText, Music, Archive, Code } from 'lucide-react';
import { formatSize, formatDate } from '@/lib/format';
import { useEffect } from 'react';

export default function InfoModal() {
  const { modal, closeModal, files, currentPath } = useFinderStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modal.type === 'info') {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeModal, modal.type]);

  if (!modal.isOpen || modal.type !== 'info') return null;

  const file = modal.targetId ? files.find(f => f.id === modal.targetId) : null;

  // 현재 폴더 정보 (파일이 없을 때)
  const getCurrentFolderInfo = () => {
    if (currentPath.length === 0 || currentPath[0] === 'root') {
      return { name: 'FM Drive', type: 'folder' as const, isRoot: true };
    }
    if (currentPath[0] === 'trash') {
      const trashedFiles = files.filter(f => f.isTrashed);
      return {
        name: 'Trash',
        type: 'folder' as const,
        itemCount: trashedFiles.length,
        totalSize: trashedFiles.reduce((acc, f) => acc + f.size, 0)
      };
    }
    if (currentPath[0] === 'recent') {
      return { name: 'Recent', type: 'folder' as const, isVirtual: true };
    }
    // 일반 폴더
    const folderName = decodeURIComponent(currentPath[currentPath.length - 1]);
    return { name: folderName, type: 'folder' as const };
  };

  const getFileIcon = () => {
    if (!file) {
      return <Folder size={64} className="text-blue-500" />;
    }

    if (file.type === 'folder') {
      return <Folder size={64} className="text-blue-500" />;
    }

    const mime = file.mimeType || '';
    if (mime.startsWith('image/')) return <Image size={64} className="text-purple-500" />;
    if (mime.startsWith('video/')) return <Video size={64} className="text-blue-500" />;
    if (mime.startsWith('audio/')) return <Music size={64} className="text-red-500" />;
    if (mime.startsWith('text/')) return <FileText size={64} className="text-gray-500" />;
    if (mime.includes('zip') || mime.includes('tar') || mime.includes('rar')) {
      return <Archive size={64} className="text-yellow-600" />;
    }
    if (mime.includes('javascript') || mime.includes('typescript') || mime.includes('json')) {
      return <Code size={64} className="text-green-500" />;
    }
    return <File size={64} className="text-gray-400" />;
  };

  const getFileKind = () => {
    if (!file) return 'Folder';
    if (file.type === 'folder') return 'Folder';

    const mime = file.mimeType || '';
    if (mime.startsWith('image/')) return 'Image';
    if (mime.startsWith('video/')) return 'Video';
    if (mime.startsWith('audio/')) return 'Audio';
    if (mime.startsWith('text/')) return 'Text Document';
    if (mime.includes('pdf')) return 'PDF Document';
    if (mime.includes('word') || mime.includes('docx')) return 'Word Document';
    if (mime.includes('excel') || mime.includes('xlsx')) return 'Spreadsheet';
    if (mime.includes('powerpoint') || mime.includes('pptx')) return 'Presentation';
    if (mime.includes('zip')) return 'ZIP Archive';
    return 'Document';
  };

  const folderInfo = !file ? getCurrentFolderInfo() : null;
  const displayName = file?.name || folderInfo?.name || 'Unknown';

  // 폴더인 경우 하위 항목 수 계산
  const getChildCount = () => {
    if (!file || file.type !== 'folder') return null;
    return files.filter(f => f.parentId === file.id && !f.isTrashed).length;
  };

  const childCount = getChildCount();

  // 폴더 전체 크기 계산 (재귀)
  const calculateFolderSize = (folderId: string): number => {
    const children = files.filter(f => f.parentId === folderId && !f.isTrashed);
    return children.reduce((acc, child) => {
      if (child.type === 'folder') {
        return acc + calculateFolderSize(child.id);
      }
      return acc + child.size;
    }, 0);
  };

  const folderSize = file?.type === 'folder' ? calculateFolderSize(file.id) : null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={closeModal}
    >
      <div
        className="relative bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl w-[320px] overflow-hidden border border-white/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/50 bg-gray-50/80">
          <h3 className="font-semibold text-gray-800 text-sm">{displayName} Info</h3>
          <button
            onClick={closeModal}
            className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
          >
            <X size={16} />
          </button>
        </div>

        {/* 바디 */}
        <div className="p-6">
          {/* 아이콘과 이름 */}
          <div className="flex flex-col items-center mb-6">
            <div className="mb-3">
              {file?.thumbnailUrl ? (
                <img
                  src={file.thumbnailUrl}
                  alt={file.name}
                  className="w-16 h-16 object-cover rounded-lg shadow-sm"
                />
              ) : (
                getFileIcon()
              )}
            </div>
            <h4 className="font-medium text-gray-900 text-center break-all">{displayName}</h4>
            <span className="text-xs text-gray-500 mt-1">{getFileKind()}</span>
          </div>

          {/* 정보 테이블 */}
          <div className="space-y-3 text-sm">
            {/* 크기 */}
            {(file?.type === 'file' || folderSize !== null) && (
              <div className="flex justify-between">
                <span className="text-gray-500">Size:</span>
                <span className="text-gray-900 font-medium">
                  {formatSize(file?.type === 'file' ? file.size : folderSize || 0)}
                </span>
              </div>
            )}

            {/* 항목 수 (폴더) */}
            {childCount !== null && (
              <div className="flex justify-between">
                <span className="text-gray-500">Contains:</span>
                <span className="text-gray-900 font-medium">
                  {childCount} {childCount === 1 ? 'item' : 'items'}
                </span>
              </div>
            )}

            {/* 위치 */}
            {file && (
              <div className="flex justify-between">
                <span className="text-gray-500">Location:</span>
                <span className="text-gray-900 font-medium truncate max-w-[150px]">
                  {file.parentId === 'root' ? 'FM Drive' :
                    files.find(f => f.id === file.parentId)?.name || 'Unknown'}
                </span>
              </div>
            )}

            <div className="h-px bg-gray-200 my-2" />

            {/* 생성일 */}
            {file && (
              <div className="flex justify-between">
                <span className="text-gray-500">Created:</span>
                <span className="text-gray-900 text-xs">{formatDate(file.createdAt)}</span>
              </div>
            )}

            {/* 수정일 */}
            {file && (
              <div className="flex justify-between">
                <span className="text-gray-500">Modified:</span>
                <span className="text-gray-900 text-xs">{formatDate(file.updatedAt)}</span>
              </div>
            )}

            {/* 삭제일 (휴지통) */}
            {file?.isTrashed && file.trashedAt && (
              <div className="flex justify-between">
                <span className="text-gray-500">Trashed:</span>
                <span className="text-gray-900 text-xs">{formatDate(file.trashedAt)}</span>
              </div>
            )}

            {/* MIME 타입 */}
            {file?.mimeType && (
              <>
                <div className="h-px bg-gray-200 my-2" />
                <div className="flex justify-between">
                  <span className="text-gray-500">Type:</span>
                  <span className="text-gray-900 text-xs truncate max-w-[150px]">{file.mimeType}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
