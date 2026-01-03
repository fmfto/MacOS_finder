'use client';

import { useFinderStore } from '@/store/useFinderStore';
import { X, File as FileIcon, Download, ExternalLink, ChevronLeft, ChevronRight, Image, Video, FileText } from 'lucide-react';
import { formatSize, formatDate } from '@/lib/format';
import { useEffect, useState, useCallback } from 'react';

export default function PreviewModal() {
  const { previewModal, closePreview, files, openPreview, visibleFiles } = useFinderStore();
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const file = files.find(f => f.id === previewModal.fileId);

  // 미리보기 가능한 파일 목록 (현재 뷰에서)
  const previewableFiles = visibleFiles.filter(f =>
    f.type === 'file' && !f.isTrashed
  );
  const currentIndex = previewableFiles.findIndex(f => f.id === previewModal.fileId);

  // 이전/다음 파일로 이동
  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      openPreview(previewableFiles[currentIndex - 1].id);
      setImageLoading(true);
      setImageError(false);
    }
  }, [currentIndex, previewableFiles, openPreview]);

  const goToNext = useCallback(() => {
    if (currentIndex < previewableFiles.length - 1) {
      openPreview(previewableFiles[currentIndex + 1].id);
      setImageLoading(true);
      setImageError(false);
    }
  }, [currentIndex, previewableFiles, openPreview]);

  // 키보드 단축키 - 모달이 열려있을 때만 동작
  useEffect(() => {
    if (!previewModal.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePreview();
      if (e.key === 'ArrowLeft') { e.preventDefault(); goToPrev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goToNext(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewModal.isOpen, closePreview, goToPrev, goToNext]);

  // 이미지 로딩 상태 리셋
  useEffect(() => {
    setImageLoading(true);
    setImageError(false);
  }, [previewModal.fileId]);

  if (!previewModal.isOpen || !previewModal.fileId) return null;
  if (!file) return null;

  const handleDownload = () => {
    if (file.url) {
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleOpenNewTab = () => {
    if (file.url) {
      window.open(file.url, '_blank');
    }
  };

  // 파일 타입에 따른 렌더링
  const renderContent = () => {
    const mime = file.mimeType || '';

    // 1. 이미지
    if (mime.startsWith('image/')) {
      if (file.url) {
        return (
          <div className="relative w-full h-full flex items-center justify-center">
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-md">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-finder-active" />
              </div>
            )}
            {imageError ? (
              <div className="flex flex-col items-center justify-center gap-3 text-gray-400">
                <Image size={48} />
                <span className="text-sm">Failed to load image</span>
              </div>
            ) : (
              <img
                src={file.url}
                alt={file.name}
                className={`max-w-full max-h-full object-contain rounded-md transition-opacity duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setImageLoading(false);
                  setImageError(true);
                }}
              />
            )}
          </div>
        );
      }
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
          <Image size={48} />
          <span className="text-sm">No preview URL available</span>
        </div>
      );
    }

    // 2. 비디오
    if (mime.startsWith('video/')) {
      if (file.url) {
        return (
          <div className="w-full h-full flex items-center justify-center bg-black rounded-md overflow-hidden">
            <video
              src={file.url}
              controls
              autoPlay
              className="max-w-full max-h-full"
              controlsList="nodownload"
            >
              Your browser does not support video playback.
            </video>
          </div>
        );
      }
      return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-900 rounded-md text-gray-400 gap-3">
          <Video size={48} />
          <span className="text-sm">No video URL available</span>
        </div>
      );
    }

    // 3. PDF
    if (mime === 'application/pdf') {
      if (file.url) {
        return (
          <iframe
            src={file.url}
            className="w-full h-full rounded-md border-0"
            title={file.name}
          />
        );
      }
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
          <FileText size={48} />
          <span className="text-sm">PDF preview not available</span>
        </div>
      );
    }

    // 4. 텍스트 파일
    if (mime.startsWith('text/')) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
          <FileText size={48} className="text-gray-300" />
          <p className="text-sm">Text file preview</p>
          <p className="text-xs text-gray-400">{file.name}</p>
        </div>
      );
    }

    // 5. 그 외 (문서 등)
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
        <FileIcon size={64} className="text-gray-300" />
        <p className="text-lg font-medium text-gray-700">No preview available</p>
        <p className="text-sm text-gray-400">This file type cannot be previewed.</p>
        <p className="text-xs text-gray-400">{file.mimeType || 'Unknown type'}</p>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={closePreview}
    >
      {/* 이전 버튼 */}
      {currentIndex > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); goToPrev(); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all hover:scale-105"
        >
          <ChevronLeft size={24} className="text-gray-700" />
        </button>
      )}

      {/* 다음 버튼 */}
      {currentIndex < previewableFiles.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goToNext(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all hover:scale-105"
        >
          <ChevronRight size={24} className="text-gray-700" />
        </button>
      )}

      <div
        className="relative bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl w-[85vw] max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-white/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/50 bg-white/80 flex-shrink-0">
          <div className="flex flex-col min-w-0 flex-1">
            <h3 className="font-semibold text-gray-800 truncate">{file.name}</h3>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{formatSize(file.size)}</span>
              <span>•</span>
              <span>{formatDate(file.updatedAt)}</span>
              {previewableFiles.length > 1 && (
                <>
                  <span>•</span>
                  <span>{currentIndex + 1} / {previewableFiles.length}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={handleDownload}
              disabled={!file.url}
              className="p-2 hover:bg-black/5 rounded-full transition-colors text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Download"
            >
              <Download size={18} />
            </button>
            <button
              onClick={handleOpenNewTab}
              disabled={!file.url}
              className="p-2 hover:bg-black/5 rounded-full transition-colors text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Open in new tab"
            >
              <ExternalLink size={18} />
            </button>
            <div className="w-px h-4 bg-gray-300 mx-1" />
            <button
              onClick={closePreview}
              className="p-2 hover:bg-red-100 hover:text-red-600 rounded-full transition-colors text-gray-500"
              title="Close (Esc)"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 바디 (컨텐츠) */}
        <div className="flex-1 p-6 bg-[#1a1a1a] overflow-hidden flex items-center justify-center">
          <div className="w-full h-full flex items-center justify-center">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}