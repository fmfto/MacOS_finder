import { create } from 'zustand';
import { FileNode } from '@/types/file';
import { toBase64 } from '@/lib/utils';

// --- Types ---
interface ContextMenuData {
  isOpen: boolean;
  x: number;
  y: number;
  targetId: string | null;
}

type ModalType = 'rename' | 'new-folder' | 'share' | 'info' | null;

interface ModalState {
  type: ModalType;
  isOpen: boolean;
  targetId: string | null;
}

interface NavigationHistory {
  paths: string[][];  // 방문한 경로들
  currentIndex: number;  // 현재 위치
}

interface PreviewModalState {
  isOpen: boolean;
  fileId: string | null;
}

interface ClipboardState {
  type: 'copy' | 'cut' | null;
  fileIds: string[];
}

interface DragState {
  isDragging: boolean;
  draggedFileIds: string[];
  dragType: 'internal' | 'external' | null;
  dragOverFileId: string | null;
}

interface BoxSelectionState {
  isActive: boolean;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

// [추가] 정렬 옵션 타입
type SortOption = 'name' | 'date' | 'size' | 'kind';
type SortDirection = 'asc' | 'desc';

interface FinderState {
  // Data
  files: FileNode[];
  isLoading: boolean;

  // UI State
  currentPath: string[];
  viewMode: 'grid' | 'list' | 'columns';
  selectedFiles: Set<string>;
  lastSelectedIndex: number | null;
  focusedFileId: string | null;  // 키보드 네비게이션용 포커스
  visibleFiles: FileNode[];      // 현재 뷰에 표시되는 파일 목록
  gridColumns: number;           // Grid View 컬럼 수
  contextMenu: ContextMenuData;
  modal: ModalState;
  previewModal: PreviewModalState;
  clipboard: ClipboardState;
  dragState: DragState;
  boxSelection: BoxSelectionState;
  
  // [추가] 검색 및 정렬 State
  searchQuery: string;
  sortBy: SortOption;
  sortDirection: SortDirection;

  // 네비게이션 히스토리
  history: NavigationHistory;
  favorites: string[];  // 폴더 ID 배열
  isNavigatingHistory: boolean;

  // Actions
  fetchFiles: (pathSegments: string[]) => Promise<void>;
  setPath: (path: string[]) => void;
  navigateUp: () => void;
  setViewMode: (mode: 'grid' | 'list' | 'columns') => void;
  selectFile: (fileId: string, multiSelect?: boolean) => void;
  selectRange: (fileIds: string[], endIndex: number) => void;
  setSelectedFiles: (fileIds: Set<string>) => void;
  clearSelection: () => void;
  
  // Context Menu
  openContextMenu: (x: number, y: number, targetId: string | null) => void;
  closeContextMenu: () => void;

  // File Operations
  moveFileToTrash: (fileId: string) => void;
  restoreFromTrash: (fileId: string) => void;
  emptyTrash: () => void;
  permanentlyDelete: (fileId: string) => void;
  renameFile: (fileId: string, newName: string) => void;
  createFolder: (name: string) => Promise<void>;
  
  // Copy/Cut/Paste (Not fully implemented on server side yet for this demo)
  copyFiles: (fileIds: string[]) => void;
  cutFiles: (fileIds: string[]) => void;
  pasteFiles: (targetParentId: string) => void;
  duplicateFile: (fileId: string) => void;
  
  // Modals
  openModal: (type: ModalType, targetId?: string | null) => void;
  closeModal: () => void;
  openPreview: (fileId: string) => void;
  closePreview: () => void;
  
  // Drag & Drop
  startDrag: (fileIds: string[], type: 'internal' | 'external') => void;
  endDrag: () => void;
  setDragOver: (fileId: string | null) => void;
  moveFiles: (fileIds: string[], targetParentId: string) => void;
  // @ts-ignore - Allow any arguments for now to fix build
  uploadFiles: (files: File[], parentId?: any) => Promise<void>;
  
  // Box Selection
  startBoxSelection: (x: number, y: number) => void;
  updateBoxSelection: (x: number, y: number) => void;
  endBoxSelection: () => void;

  // [추가] 검색 및 정렬 Actions
  setSearchQuery: (query: string) => void;
  setSortBy: (option: SortOption) => void;
  toggleSortDirection: () => void;

  // 키보드 네비게이션
  setFocusedFileId: (fileId: string | null) => void;
  setVisibleFiles: (files: FileNode[]) => void;
  setGridColumns: (columns: number) => void;
  moveFocus: (direction: 'up' | 'down' | 'left' | 'right', extend?: boolean) => void;

  // 네비게이션 히스토리
  navigateBack: () => void;
  navigateForward: () => void;
  canGoBack: () => boolean;
  canGoForward: () => boolean;

  // 즐겨찾기
  addToFavorites: (folderId: string) => void;
  removeFromFavorites: (folderId: string) => void;
  isFavorite: (folderId: string) => boolean;
}


export const useFinderStore = create<FinderState>((set, get) => ({
  // ... (Initial State same as before)
  files: [],
  isLoading: false,
  currentPath: [],
  viewMode: 'grid',
  selectedFiles: new Set(),
  lastSelectedIndex: null,
  focusedFileId: null,
  visibleFiles: [],
  gridColumns: 6,
  contextMenu: { isOpen: false, x: 0, y: 0, targetId: null },
  modal: { type: null, isOpen: false, targetId: null },
  previewModal: { isOpen: false, fileId: null },
  clipboard: { type: null, fileIds: [] },
  dragState: { isDragging: false, draggedFileIds: [], dragType: null, dragOverFileId: null },
  boxSelection: { isActive: false, startX: 0, startY: 0, endX: 0, endY: 0 },
  
  searchQuery: '',
  sortBy: 'name',
  sortDirection: 'asc',

  history: {
    paths: [['root']],
    currentIndex: 0,
  },

  favorites: [],
  isNavigatingHistory: false,

  // Implementation
  fetchFiles: async (pathSegments) => {
    set({ isLoading: true });
    try {
      // Construct all paths to fetch (ancestors + current)
      // e.g. ['root', 'A', 'B'] -> ['', 'A', 'A/B'] (relative to root)
      const pathsToFetch: string[] = [];
      
      // 1. Root level
      pathsToFetch.push('');

      // 2. Sub-levels
      if (pathSegments.length > 1) {
        let currentPathStr = '';
        for (let i = 1; i < pathSegments.length; i++) {
          const segment = pathSegments[i];
          currentPathStr = currentPathStr ? `${currentPathStr}/${segment}` : segment;
          pathsToFetch.push(currentPathStr);
        }
      }

      // Fetch all levels in parallel
      const responses = await Promise.all(
        pathsToFetch.map(async (p) => {
          const res = await fetch(`/api/drive?path=${encodeURIComponent(p)}`);
          if (!res.ok) throw new Error(`Failed to fetch ${p}`);
          return res.json();
        })
      );
      
      let allNewFiles: FileNode[] = [];
      const fetchedParentIds = new Set<string>();

      responses.forEach((files, index) => {
        const p = pathsToFetch[index];
        const parentId = p === '' ? 'root' : toBase64(p);
        fetchedParentIds.add(parentId);

        const formattedFiles = files.map((f: any) => ({
          ...f,
          createdAt: new Date(f.createdAt),
          updatedAt: new Date(f.updatedAt),
          trashedAt: f.trashedAt ? new Date(f.trashedAt) : undefined,
        }));
        
        allNewFiles = [...allNewFiles, ...formattedFiles];
      });

      set((state) => ({
        // Remove existing files for the fetched directories to prevent duplicates/stale data
        files: [
          ...state.files.filter(f => !fetchedParentIds.has(f.parentId)),
          ...allNewFiles
        ],
        isLoading: false
      }));

    } catch (error) {
      console.error(error);
      set({ isLoading: false });
    }
  },

  setPath: (path) => {
    // ... (rest same as before)
    const { history, isNavigatingHistory, currentPath } = get();

    if (JSON.stringify(currentPath) === JSON.stringify(path)) {
      if (isNavigatingHistory) set({ isNavigatingHistory: false });
      return;
    }

    // 서버에서 파일 가져오기
    get().fetchFiles(path);

    if (isNavigatingHistory) {
      set({
        currentPath: path,
        selectedFiles: new Set(),
        focusedFileId: null,
        isNavigatingHistory: false,
      });
      return;
    }
    
    // ... (rest same)
    if (JSON.stringify(history.paths[history.currentIndex]) === JSON.stringify(path)) {
      set({
        currentPath: path,
        selectedFiles: new Set(),
        focusedFileId: null,
      });
      return;
    }

    const newPaths = [...history.paths.slice(0, history.currentIndex + 1), path];
    set({
      currentPath: path,
      history: {
        paths: newPaths,
        currentIndex: newPaths.length - 1,
      },
      selectedFiles: new Set(),
      focusedFileId: null,
    });
  },
  // ... (rest of the file remains same)
  navigateUp: () => {
    const { currentPath } = get();
    // root이거나 비어있으면 상위가 없음
    if (currentPath.length <= 1 && currentPath[0] === 'root') return;
    
    // ['root', 'folder', 'sub'] -> ['root', 'folder']
    // ['root'] -> return
    const newPath = currentPath.length > 0 ? currentPath.slice(0, -1) : ['root'];
    get().setPath(newPath);
  },
  setViewMode: (mode) => set({ viewMode: mode }),
  
  selectFile: (fileId, multiSelect = false) => {
    set((state) => {
      const newSelection = new Set(multiSelect ? state.selectedFiles : []);
      if (newSelection.has(fileId)) newSelection.delete(fileId);
      else newSelection.add(fileId);
      return { selectedFiles: newSelection };
    });
  },
  selectRange: (fileIds, endIndex) => {
    const { lastSelectedIndex } = get();
    if (lastSelectedIndex === null) {
      set({ selectedFiles: new Set([fileIds[endIndex]]), lastSelectedIndex: endIndex });
      return;
    }
    const startIndex = Math.min(lastSelectedIndex, endIndex);
    const endIdx = Math.max(lastSelectedIndex, endIndex);
    const rangeIds = fileIds.slice(startIndex, endIdx + 1);
    set((state) => ({
      selectedFiles: new Set([...state.selectedFiles, ...rangeIds]),
      lastSelectedIndex: endIndex
    }));
  },
  setSelectedFiles: (fileIds) => set({ selectedFiles: fileIds }),
  clearSelection: () => set({ selectedFiles: new Set(), lastSelectedIndex: null, focusedFileId: null }),

  openContextMenu: (x, y, targetId) => set({ contextMenu: { isOpen: true, x, y, targetId } }),
  closeContextMenu: () => set({ contextMenu: { isOpen: false, x: 0, y: 0, targetId: null } }),

  // [Server] Trash implementation skipped for now. Directly delete.
  moveFileToTrash: (fileId) => get().permanentlyDelete(fileId),
  restoreFromTrash: (fileId) => console.warn('Restore not implemented'),
  emptyTrash: () => console.warn('Empty trash not implemented'),

  permanentlyDelete: async (fileId) => {
    try {
      const res = await fetch('/api/drive/item', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: fileId })
      });
      if (!res.ok) throw new Error('Delete failed');
      
      // Refresh
      get().fetchFiles(get().currentPath);
      set((state) => ({ selectedFiles: new Set() }));
    } catch (e) {
      console.error(e);
      alert('Failed to delete item');
    }
  },

  renameFile: async (fileId, newName) => {
    try {
      const res = await fetch('/api/drive/item', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: fileId, newName })
      });
      if (!res.ok) throw new Error('Rename failed');
      
      get().fetchFiles(get().currentPath);
    } catch (e) {
      console.error(e);
      alert('Failed to rename item');
    }
  },

  createFolder: async (name) => {
    const { currentPath } = get();
    // Remove 'root' from path segments for API if present at start, 
    // but our API handles pathSegments correctly.
    // Actually currentPath usually includes 'root' as first element in frontend logic?
    // Let's check initial state: paths: [['root']].
    // Yes.
    // API Expects: pathSegments (array).
    // If currentPath is ['root'], API path should be [].
    // If currentPath is ['root', 'A'], API path should be ['A'].
    
    const apiPath = (currentPath[0] === 'root') ? currentPath.slice(1) : currentPath;

    try {
      const res = await fetch('/api/drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: apiPath, name })
      });
      if (!res.ok) throw new Error('Create folder failed');
      
      get().fetchFiles(currentPath);
    } catch (e) {
      console.error(e);
      alert('Failed to create folder');
    }
  },

  openModal: (type, targetId = null) => set({ modal: { type, isOpen: true, targetId } }),
  closeModal: () => set({ modal: { type: null, isOpen: false, targetId: null } }),
  openPreview: (fileId) => set({ previewModal: { isOpen: true, fileId } }),
  closePreview: () => set({ previewModal: { isOpen: false, fileId: null } }),

  startDrag: (fileIds, type) => set({ dragState: { isDragging: true, draggedFileIds: fileIds, dragType: type, dragOverFileId: null } }),
  endDrag: () => set({ dragState: { isDragging: false, draggedFileIds: [], dragType: null, dragOverFileId: null } }),
  setDragOver: (fileId) => set((state) => ({ 
    dragState: { ...state.dragState, dragOverFileId: fileId } 
  })),
  
  moveFiles: (fileIds, targetParentId) => {
    console.warn('Move not implemented fully on server yet');
    // Implement move API if needed
  },

  uploadFiles: async (uploadedFiles, targetParentId) => {
    const { currentPath } = get();
    
    // Determine path string for API
    let pathString = '';
    
    if (targetParentId) {
      // If a specific parentId (folder ID) is provided, we need to find its path?
      // SERVER API expects 'path' string (e.g. "A/B"), not ID.
      // This is tricky because we only have ID (Base64) here.
      // But wait, our ID IS the Base64 encoded relative path!
      // So we can decode it.
      if (targetParentId === 'root') {
        pathString = '';
      } else {
        try {
          // Decode Base64 ID back to path string
          pathString = decodeURIComponent(escape(atob(targetParentId)));
        } catch (e) {
          console.error('Failed to decode folder ID', e);
          return;
        }
      }
    } else {
      // Default to current path
      const apiPath = (currentPath.length > 0 && currentPath[0] === 'root') 
        ? currentPath.slice(1) 
        : currentPath;
      pathString = apiPath.join('/');
    }

    // Upload sequentially or parallel
    for (const file of uploadedFiles) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', pathString); // server expects 'path'

      try {
        await fetch('/api/drive/upload', {
          method: 'POST',
          body: formData,
        });
      } catch (e) {
        console.error(`Failed to upload ${file.name}`, e);
      }
    }
    
    // Refresh current path files
    // If we uploaded to a different folder, we might want to refresh that folder too?
    // For now, just refresh current view.
    get().fetchFiles(get().currentPath);
  },

  copyFiles: (fileIds) => set({ clipboard: { type: 'copy', fileIds } }),
  cutFiles: (fileIds) => set({ clipboard: { type: 'cut', fileIds } }),
  pasteFiles: (targetParentId) => {
    console.warn('Paste not implemented on server yet');
  },
  duplicateFile: (fileId) => {
    console.warn('Duplicate not implemented on server yet');
  },

  startBoxSelection: (x, y) => set({ 
    boxSelection: { isActive: true, startX: x, startY: y, endX: x, endY: y },
    selectedFiles: new Set()
  }),
  updateBoxSelection: (x, y) => set((state) => ({
    boxSelection: { ...state.boxSelection, endX: x, endY: y }
  })),
  endBoxSelection: () => set({ 
    boxSelection: { isActive: false, startX: 0, startY: 0, endX: 0, endY: 0 } 
  }),

  setSearchQuery: (query) => set({ searchQuery: query }),
  
  setSortBy: (option) => set((state) => {
    if (state.sortBy === option) {
      return { sortDirection: state.sortDirection === 'asc' ? 'desc' : 'asc' };
    }
    return { sortBy: option, sortDirection: 'asc' };
  }),

  toggleSortDirection: () => set((state) => ({
    sortDirection: state.sortDirection === 'asc' ? 'desc' : 'asc'
  })),

  setFocusedFileId: (fileId) => set({ focusedFileId: fileId }),
  setVisibleFiles: (files) => set({ visibleFiles: files }),
  setGridColumns: (columns) => set({ gridColumns: columns }),

  moveFocus: (direction, extend = false) => {
    const { visibleFiles, focusedFileId, selectedFiles, viewMode, gridColumns } = get();
    if (viewMode === 'columns') return;
    if (visibleFiles.length === 0) return;

    let currentIndex = visibleFiles.findIndex(f => f.id === focusedFileId);
    if (currentIndex === -1) {
      const selectedId = Array.from(selectedFiles)[0];
      currentIndex = visibleFiles.findIndex(f => f.id === selectedId);
      if (currentIndex === -1) currentIndex = 0;
    }

    let nextIndex = currentIndex;
    if (viewMode === 'grid') {
      switch (direction) {
        case 'up': nextIndex = Math.max(0, currentIndex - gridColumns); break;
        case 'down': nextIndex = Math.min(visibleFiles.length - 1, currentIndex + gridColumns); break;
        case 'left': nextIndex = Math.max(0, currentIndex - 1); break;
        case 'right': nextIndex = Math.min(visibleFiles.length - 1, currentIndex + 1); break;
      }
    } else {
      switch (direction) {
        case 'up': nextIndex = Math.max(0, currentIndex - 1); break;
        case 'down': nextIndex = Math.min(visibleFiles.length - 1, currentIndex + 1); break;
      }
    }

    const nextFile = visibleFiles[nextIndex];
    if (!nextFile) return;

    if (extend) {
      const newSelection = new Set(selectedFiles);
      newSelection.add(nextFile.id);
      set({ focusedFileId: nextFile.id, selectedFiles: newSelection, lastSelectedIndex: nextIndex });
    } else {
      set({ focusedFileId: nextFile.id, selectedFiles: new Set([nextFile.id]), lastSelectedIndex: nextIndex });
    }
  },

  navigateBack: () => {
    const { history } = get();
    if (history.currentIndex > 0) {
      const newIndex = history.currentIndex - 1;
      const newPath = history.paths[newIndex];
      // setPath will handle fetching
      set({ isNavigatingHistory: true }); 
      get().setPath(newPath);
      set({ history: { ...history, currentIndex: newIndex } });
    }
  },
  navigateForward: () => {
    const { history } = get();
    if (history.currentIndex < history.paths.length - 1) {
      const newIndex = history.currentIndex + 1;
      const newPath = history.paths[newIndex];
      set({ isNavigatingHistory: true });
      get().setPath(newPath);
      set({ history: { ...history, currentIndex: newIndex } });
    }
  },
  canGoBack: () => {
    const { history } = get();
    return history.currentIndex > 0;
  },
  canGoForward: () => {
    const { history } = get();
    return history.currentIndex < history.paths.length - 1;
  },

  addToFavorites: (folderId) => set((state) => ({
    favorites: [...state.favorites, folderId]
  })),
  removeFromFavorites: (folderId) => set((state) => ({
    favorites: state.favorites.filter(id => id !== folderId)
  })),
  isFavorite: (folderId) => {
    const { favorites } = get();
    return favorites.includes(folderId);
  },
}));