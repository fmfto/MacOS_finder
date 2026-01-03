'use client';

import { useFinderStore } from '@/store/useFinderStore';
import { X, Link, Mail, MessageSquare, Copy, Check } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function ShareModal() {
  const { modal, closeModal, selectedFiles, files, currentPath } = useFinderStore();
  const [copied, setCopied] = useState(false);

  // 모달이 닫힐 때 상태 초기화
  useEffect(() => {
    if (!modal.isOpen) setCopied(false);
  }, [modal.isOpen]);

  if (modal.type !== 'share' || !modal.isOpen) return null;

  // 공유 대상 정보 계산
  const getShareInfo = () => {
    if (selectedFiles.size === 1) {
      const fileId = Array.from(selectedFiles)[0];
      const file = files.find(f => f.id === fileId);
      return {
        title: file?.name || 'Unknown File',
        subtitle: file?.type === 'folder' ? 'Folder' : (file?.mimeType || 'File'),
        icon: '📄'
      };
    } else if (selectedFiles.size > 1) {
      return {
        title: `${selectedFiles.size} Items`,
        subtitle: 'Multiple selection',
        icon: 'hz'
      };
    } else {
      // 선택된 게 없으면 현재 폴더 공유
      const folderName = currentPath.length > 0 ? decodeURIComponent(currentPath[currentPath.length - 1]) : 'FM Drive';
      return {
        title: folderName,
        subtitle: 'Current Folder',
        icon: '📂'
      };
    }
  };

  const info = getShareInfo();

  // 가짜 링크 복사 동작
  const handleCopyLink = () => {
    const fakeUrl = `https://fm.pe.kr/share/${Math.random().toString(36).substr(2, 9)}`;
    navigator.clipboard.writeText(fakeUrl);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      closeModal();
    }, 1000);
  };

  const shareOptions = [
    { name: 'Copy Link', icon: Link, action: handleCopyLink, color: 'bg-blue-500' },
    { name: 'Mail', icon: Mail, action: () => alert('Open Mail App...'), color: 'bg-blue-400' },
    { name: 'Messages', icon: MessageSquare, action: () => alert('Open Messages...'), color: 'bg-green-500' },
    { name: 'AirDrop', icon: Copy, action: () => alert('Scanning for AirDrop...'), color: 'bg-gray-400' },
  ];

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-[1px] animate-in fade-in duration-200"
      onClick={closeModal}
    >
      <div 
        className="relative bg-white/90 backdrop-blur-xl rounded-xl shadow-2xl w-80 overflow-hidden border border-white/40 scale-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center p-4 border-b border-gray-200/50 gap-3">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl shadow-sm border border-gray-200">
            {info.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{info.title}</h3>
            <p className="text-xs text-gray-500 truncate">{info.subtitle}</p>
          </div>
          <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* 옵션 그리드 */}
        <div className="p-4 grid grid-cols-2 gap-3">
          {shareOptions.map((opt) => (
            <button
              key={opt.name}
              onClick={opt.action}
              className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg hover:bg-black/5 transition-colors group"
            >
              <div className={`w-10 h-10 rounded-full ${opt.color} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                {opt.name === 'Copy Link' && copied ? <Check size={20} /> : <opt.icon size={20} />}
              </div>
              <span className="text-xs font-medium text-gray-700">
                {opt.name === 'Copy Link' && copied ? 'Copied!' : opt.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}