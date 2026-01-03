import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { FileNode } from '@/types/file';
import { toBase64, fromBase64 } from '@/lib/utils';

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
  tags: Record<string, string[]>;

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
  fetchTags: () => Promise<void>;
  updateTags: (path: string, newTags: string[]) => Promise<void>;
  
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
  
  // Copy/Cut/Paste
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
  downloadFile: (fileId: string) => void;
  
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

export const useFinderStore = create<FinderState>()(persist((set, get) => ({
  // Initial State
  files: [],
  isLoading: false,
  tags: {},
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
  fetchTags: async () => {
    try {
      const res = await fetch('/api/drive/tags');
      if (res.ok) {
        const tags = await res.json();
        set({ tags });
      }
    } catch (e) {
      console.error(e);
    }
  },

  updateTags: async (path, newTags) => {
    // Optimistic Update
    set((state) => ({
      tags: { ...state.tags, [path]: newTags }
    }));

    try {
      await fetch('/api/drive/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, tags: newTags })
      });
    } catch (e) {
      console.error(e);
      get().fetchTags();
    }
  },

  fetchFiles: async (pathSegments) => {
    get().fetchTags();
    set({ isLoading: true });
    try {
      const pathsToFetch: string[] = [];
      pathsToFetch.push('');

      if (pathSegments.length > 1) {
        let currentPathStr = '';
        for (let i = 1; i < pathSegments.length; i++) {
          const segment = pathSegments[i];
          currentPathStr = currentPathStr ? `${currentPathStr}/${segment}` : segment;
          pathsToFetch.push(currentPathStr);
        }
      }

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
    const { history, isNavigatingHistory, currentPath } = get();

    if (JSON.stringify(currentPath) === JSON.stringify(path)) {
      if (isNavigatingHistory) set({ isNavigatingHistory: false });
      return;
    }

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
  navigateUp: () => {
    const { currentPath } = get();
    if (currentPath.length <= 1 && currentPath[0] === 'root') return;
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
      
      // Update Favorites Logic
      const { favorites } = get();
      const oldPath = fileId === 'root' ? '' : fromBase64(fileId);
      
      const parts = oldPath.split('/');
      const parentPath = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
      const newPath = parentPath ? `${parentPath}/${newName}` : newName;
      
      const newFavorites = favorites.map(favId => {
        if (favId === fileId) {
          return toBase64(newPath);
        }
        
        const favPath = fromBase64(favId);
        if (favPath.startsWith(`${oldPath}/`)) {
          const suffix = favPath.substring(oldPath.length);
          return toBase64(`${newPath}${suffix}`);
        }
        
        return favId;
      });

      set({ favorites: newFavorites });
      get().fetchFiles(get().currentPath);
    } catch (e) {
      console.error(e);
      alert('Failed to rename item');
    }
  },

  createFolder: async (name) => {
    const { currentPath } = get();
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
  },

  uploadFiles: async (uploadedFiles, targetParentId) => {
    console.log('Upload started:', uploadedFiles.length, 'files', 'Target:', targetParentId);
    const { currentPath } = get();
    
    let pathString = '';
    
    if (targetParentId) {
      if (targetParentId === 'root') {
        pathString = '';
      } else {
        try {
          pathString = decodeURIComponent(escape(atob(targetParentId)));
        } catch (e) {
          console.error('Failed to decode folder ID', e);
          return;
        }
      }
    } else {
      const apiPath = (currentPath.length > 0 && currentPath[0] === 'root') 
        ? currentPath.slice(1) 
        : currentPath;
      pathString = apiPath.join('/');
    }

    console.log('Base upload path:', pathString);

    for (const file of uploadedFiles) {
      const formData = new FormData();
      formData.append('file', file);
      
      let finalPath = pathString;
      
      // @ts-ignore
      const relativePath = file.webkitRelativePath;
      if (relativePath) {
        const parts = relativePath.split('/');
        if (parts.length > 1) {
           const dirPart = parts.slice(0, -1).join('/');
           finalPath = pathString ? `${pathString}/${dirPart}` : dirPart;
        }
      }
      
      console.log('Uploading file:', file.name, 'to', finalPath);
      formData.append('path', finalPath);

      try {
        const res = await fetch('/api/drive/upload', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) throw new Error(await res.text());
      } catch (e) {
        console.error(`Failed to upload ${file.name}`, e);
      }
    }
    
    get().fetchFiles(get().currentPath);
  },

  downloadFile: (fileId) => {
    const url = `/api/drive/download?id=${encodeURIComponent(fileId)}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
}),
{
  name: 'finder-storage',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    favorites: state.favorites,
    viewMode: state.viewMode,
    sortBy: state.sortBy,
    sortDirection: state.sortDirection,
    tags: state.tags,
  }),
}
));
