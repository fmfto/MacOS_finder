'use client';

import { 
  ChevronLeft, ChevronRight, LayoutGrid, List, Columns, 
  Search, Share, ArrowDownAZ, ArrowUpZA, X,
  Home, ArrowUp, FileUp, FolderUp, Plus, Download, Menu
} from 'lucide-react';
import { useFinderStore } from '@/store/useFinderStore';
import { useRouter } from 'next/navigation';
import { useRef, useState, useEffect } from 'react';

export default function Toolbar() {
  const {
    viewMode, setViewMode, currentPath,
    searchQuery, setSearchQuery,
    sortBy, setSortBy, sortDirection, toggleSortDirection,
    selectedFiles, files, openModal,
    history, uploadFiles, downloadFile, toggleSidebar
  } = useFinderStore();

  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 메뉴 외부 클릭 감지
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsUploadMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, []);

  // 히스토리 상태 기반으로 계산
  const canGoBack = history.currentIndex > 0;
  const canGoForward = history.currentIndex < history.paths.length - 1;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(Array.from(e.target.files));
    }
    e.target.value = '';
    setIsUploadMenuOpen(false);
  };

  const handleFolderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(Array.from(e.target.files));
    }
    e.target.value = '';
    setIsUploadMenuOpen(false);
  };

  const handleDownload = () => {
    if (selectedFiles.size === 0) return;
    const fileId = Array.from(selectedFiles)[0];
    const file = files.find(f => f.id === fileId);
    
    if (file && file.type === 'file') {
      downloadFile(fileId);
    } else {
      alert('Downloading folders is not supported yet.');
    }
  };

  const handleBack = () => {
    if (!canGoBack) return;

    // 최신 히스토리 상태 가져오기
    const currentHistory = useFinderStore.getState().history;
    const newIndex = currentHistory.currentIndex - 1;
    const prevPath = currentHistory.paths[newIndex];

    // 모든 상태를 한 번에 업데이트
    useFinderStore.setState({
      currentPath: prevPath,
      isNavigatingHistory: true,
      history: {
        paths: currentHistory.paths,
        currentIndex: newIndex,
      },
      selectedFiles: new Set(),
      focusedFileId: null,
    });

    // URL 업데이트 (replace 사용)
    const url = prevPath.length <= 1 && prevPath[0] === 'root'
      ? '/drive/root'
      : `/drive/${prevPath.map(s => encodeURIComponent(s)).join('/')}`;
    router.replace(url);
  };

  const handleForward = () => {
    if (!canGoForward) return;

    // 최신 히스토리 상태 가져오기
    const currentHistory = useFinderStore.getState().history;
    const newIndex = currentHistory.currentIndex + 1;
    const nextPath = currentHistory.paths[newIndex];

    // 모든 상태를 한 번에 업데이트
    useFinderStore.setState({
      currentPath: nextPath,
      isNavigatingHistory: true,
      history: {
        paths: currentHistory.paths,
        currentIndex: newIndex,
      },
      selectedFiles: new Set(),
      focusedFileId: null,
    });

    // URL 업데이트 (replace 사용)
    const url = nextPath.length <= 1 && nextPath[0] === 'root'
      ? '/drive/root'
      : `/drive/${nextPath.map(s => encodeURIComponent(s)).join('/')}`;
    router.replace(url);
  };

  // 1. 현재 상태 체크
  const isVirtualView = currentPath.length > 0 && ['recent', 'trash'].includes(currentPath[0]);
  const isRoot = currentPath.length === 0 || (currentPath.length === 1 && currentPath[0] === 'root');
  
  // 상위 폴더 이동 불가 조건: 루트이거나, 가상 뷰(Recent/Trash)일 때
  const isUpDisabled = isRoot || isVirtualView;

  // 2. 홈으로 이동 핸들러
  const handleGoHome = () => {
    if (isRoot) return;
    router.push('/drive/root');
  };

  // 3. 상위 폴더 이동 핸들러
  const handleGoUp = () => {
    if (isUpDisabled) return;
    
    // 현재 경로 배열에서 마지막 요소 제거
    const parentPath = currentPath.slice(0, -1);
    
    // 부모 경로가 비어있다면 root로 간주
    if (parentPath.length === 0) {
      router.push('/drive/root');
    } else {
      router.push(`/drive/${parentPath.join('/')}`);
    }
  };

  // 4. 공유 버튼 활성화 조건: 파일만 선택된 경우 (폴더 선택 또는 미선택 시 비활성화)
  const isShareDisabled = selectedFiles.size === 0 ||
    Array.from(selectedFiles).some(id => {
      const file = files.find(f => f.id === id);
      return file?.type === 'folder';
    });

  // 5. 공유 핸들러
  const handleShare = async () => {
    if (isShareDisabled) return;
    // 1. 공유할 데이터 구성
    let title = 'FM Drive';
    let text = 'Sharing files from FM Drive';
    let url = window.location.href; 

    if (selectedFiles.size === 1) {
      const fileId = Array.from(selectedFiles)[0];
      const file = files.find(f => f.id === fileId);
      if (file) {
        title = file.name;
        text = `Check out ${file.name} on FM Drive`;
      }
    } else if (selectedFiles.size > 1) {
      title = `${selectedFiles.size} items`;
    }

    // 2. Web Share API 지원 여부 확인
    if (navigator.share) {
      // 지원하면 OS 기본 공유 사용 (취소해도 추가 동작 없음)
      try {
        await navigator.share({ title, text, url });
      } catch (error) {
        // 사용자가 취소한 경우 - 아무것도 안 함
      }
    } else {
      // 3. 미지원 브라우저(Windows 등)에서는 커스텀 모달 오픈
      openModal('share');
    }
  };

  return (
    <header className="h-14 bg-finder-bg border-b border-finder-border flex-shrink-0 overflow-x-auto no-scrollbar">
      <div className="flex items-center justify-between px-4 gap-4 h-full min-w-max">
        {/* Mobile Sidebar Toggle */}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md hover:bg-finder-hover md:hidden text-finder-text-primary"
        >
          <Menu size={20} />
        </button>

      {/* 1. Navigation Group */}
      <div className="flex items-center gap-2">
        {/* 뒤로가기/앞으로가기 */}
        <div className="flex items-center gap-1 mr-2">
          <button
            onClick={handleBack}
            disabled={!canGoBack}
            className="p-1 rounded hover:bg-finder-hover disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Go Back"
          >
            <ChevronLeft size={20} className="text-finder-text-primary" />
          </button>
          <button
            onClick={handleForward}
            disabled={!canGoForward}
            className="p-1 rounded hover:bg-finder-hover disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Go Forward"
          >
            <ChevronRight size={20} className="text-finder-text-primary" />
          </button>
        </div>
        
        {/* Home Button */}
        <button
          onClick={handleGoHome}
          disabled={isRoot}
          title="Go to Home"
          className={`p-1.5 rounded-md transition-colors ${
            isRoot 
              ? 'opacity-30 cursor-default text-finder-text-secondary' 
              : 'hover:bg-finder-hover text-finder-text-primary'
          }`}
        >
          <Home size={18} />
        </button>

        {/* Current Folder Breadcrumbs */}
        <div className="flex items-center px-2 text-sm font-semibold text-finder-text-primary">
          {isRoot ? (
            <span>FM Drive</span>
          ) : isVirtualView ? (
            <span>
              {currentPath[0] === 'recent' && 'Recent'}
              {currentPath[0] === 'trash' && 'Trash'}
            </span>
          ) : (
            <span>{decodeURIComponent(currentPath[currentPath.length - 1])}</span>
          )}
        </div>

        {/* Up Button */}
        <button
          onClick={handleGoUp}
          disabled={isUpDisabled}
          title="Go to Parent Folder"
          className={`p-1.5 rounded-md transition-colors ${
            isUpDisabled 
              ? 'opacity-30 cursor-default text-finder-text-secondary' 
              : 'hover:bg-finder-hover text-finder-text-primary'
          }`}
        >
          <ArrowUp size={18} />
        </button>
      </div>

      {/* 2. View Toggle Group */}
      <div className="flex items-center bg-gray-200/50 p-0.5 rounded-lg border border-finder-border shadow-sm">
        <button
          onClick={() => setViewMode('grid')}
          className={`p-1.5 rounded-md transition-all ${
            viewMode === 'grid' 
            ? 'bg-white shadow-sm text-finder-text-primary' 
            : 'text-finder-text-secondary hover:text-finder-text-primary'
          }`}
        >
          <LayoutGrid size={16} />
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`p-1.5 rounded-md transition-all ${
            viewMode === 'list' 
            ? 'bg-white shadow-sm text-finder-text-primary' 
            : 'text-finder-text-secondary hover:text-finder-text-primary'
          }`}
        >
          <List size={16} />
        </button>
        
        <button
          onClick={() => setViewMode('columns')}
          disabled={isVirtualView}
          className={`p-1.5 rounded-md transition-all ${
            viewMode === 'columns' 
            ? 'bg-white shadow-sm text-finder-text-primary' 
            : 'text-finder-text-secondary hover:text-finder-text-primary'
          } ${isVirtualView ? 'opacity-30 cursor-not-allowed' : ''}`}
        >
          <Columns size={16} />
        </button>
      </div>

      {/* 3. Action Group */}
      <div className="flex items-center gap-2">
        {/* Sort Group */}
        <div className="flex items-center bg-gray-200/50 p-0.5 rounded-lg border border-finder-border shadow-sm">
           <button 
             onClick={() => setSortBy('name')}
             className={`px-2 py-1 text-xs font-medium rounded transition-colors ${sortBy === 'name' ? 'bg-white shadow-sm' : 'text-finder-text-secondary hover:text-finder-text-primary'}`}
           >
             Name
           </button>
           <button 
             onClick={() => setSortBy('date')}
             className={`px-2 py-1 text-xs font-medium rounded transition-colors ${sortBy === 'date' ? 'bg-white shadow-sm' : 'text-finder-text-secondary hover:text-finder-text-primary'}`}
           >
             Date
           </button>
           
           <div className="w-px h-3 bg-gray-300 mx-1" />
           
           <button 
             onClick={toggleSortDirection}
             className="p-1 text-finder-text-secondary hover:bg-white/50 rounded"
             title={`Sort ${sortDirection === 'asc' ? 'Descending' : 'Ascending'}`}
           >
             {sortDirection === 'asc' ? <ArrowDownAZ size={14} /> : <ArrowUpZA size={14} />}
           </button>
        </div>

        {/* Upload & Download Group */}
        <div className="flex items-center gap-1 mr-2 border-r border-gray-300 pr-2">
           {/* Upload Menu */}
           <div className="relative" ref={menuRef}>
             <button 
               onClick={() => setIsUploadMenuOpen(!isUploadMenuOpen)}
               className={`p-1.5 rounded-md transition-colors ${isUploadMenuOpen ? 'bg-gray-200 text-finder-text-primary' : 'text-finder-text-secondary hover:bg-gray-200/50 hover:text-finder-text-primary'}`}
               title="New"
             >
               <Plus size={18} />
             </button>
             
             {isUploadMenuOpen && (
               <div className="absolute top-full left-0 mt-1 w-32 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 overflow-hidden flex flex-col">
                 <button 
                   onClick={() => fileInputRef.current?.click()}
                   className="px-3 py-2 text-left text-sm hover:bg-finder-hover flex items-center gap-2 text-gray-700"
                 >
                   <FileUp size={14} /> File
                 </button>
                 <button 
                   onClick={() => folderInputRef.current?.click()}
                   className="px-3 py-2 text-left text-sm hover:bg-finder-hover flex items-center gap-2 text-gray-700"
                 >
                   <FolderUp size={14} /> Folder
                 </button>
               </div>
             )}
           </div>

           {/* Download Button */}
           <button 
             onClick={handleDownload}
             disabled={selectedFiles.size === 0}
             className={`p-1.5 rounded-md transition-colors ${selectedFiles.size === 0 ? 'opacity-30 cursor-default text-finder-text-secondary' : 'text-finder-text-secondary hover:bg-gray-200/50 hover:text-finder-text-primary'}`}
             title="Download"
           >
             <Download size={18} />
           </button>
        </div>

        {/* Share Button */}
        <button
          onClick={handleShare}
          disabled={isShareDisabled}
          className={`p-1.5 rounded-md transition-colors border border-transparent ${
            isShareDisabled
              ? 'opacity-30 cursor-default text-finder-text-secondary'
              : 'text-finder-text-secondary hover:bg-gray-200/50 hover:border-finder-border'
          }`}
          title="Share"
        >
          <Share size={18} />
        </button>

        {/* Search Input */}
        <div className="relative group">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-finder-text-secondary" />
          <input 
            type="text" 
            placeholder="Search" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-8 py-1 bg-gray-200/50 border border-transparent focus:bg-white focus:border-finder-active focus:ring-2 focus:ring-finder-active/20 rounded-md text-sm outline-none transition-all w-32 focus:w-48 placeholder:text-gray-400"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-200"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>
      
      {/* Hidden Inputs */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        multiple 
        className="hidden" 
      />
      <input 
        type="file" 
        ref={folderInputRef} 
        onChange={handleFolderUpload} 
        // @ts-ignore
        webkitdirectory=""
        directory=""
        multiple 
        className="hidden" 
      />
      </div>
    </header>
  );
}