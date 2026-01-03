'use client';

import Sidebar from '@/components/layout/Sidebar';
import Toolbar from '@/components/layout/Toolbar';
import Footer from '@/components/layout/Footer';
import ContextMenu from '@/components/layout/ContextMenu';
import ActionModal from '@/components/layout/ActionModal';
import PreviewModal from '@/components/layout/PreviewModal';
import ShareModal from '@/components/layout/ShareModal';
import InfoModal from '@/components/layout/InfoModal';
import { useFinderStore } from '@/store/useFinderStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export default function DriveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { openContextMenu } = useFinderStore();

  // 키보드 단축키 훅 활성화
  useKeyboardShortcuts();

  const handleBackgroundContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    openContextMenu(e.clientX, e.clientY, null);
  };

  return (
    <div 
      className="flex h-screen w-full bg-finder-bg"
      onContextMenu={handleBackgroundContextMenu}
    >
      <Sidebar />
      
      <div className="flex flex-col flex-1 h-full min-w-0">
        <Toolbar />
        <main className="flex-1 overflow-auto p-4">
          {children}
        </main>
        
        {/* 동적 상태 표시줄 */}
        <Footer />
      </div>

      {/* 전역 오버레이 컴포넌트들 */}
      <ContextMenu />
      <ActionModal />
      <PreviewModal />
      <ShareModal />
      <InfoModal />
    </div>
  );
}