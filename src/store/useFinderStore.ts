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

export interface UploadTask {
  id: string;
  name: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
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
  
  uploadTasks: UploadTask[];
  isUploadPanelOpen: boolean;
  isSidebarOpen: boolean; // 모바일 사이드바 상태
  toasts: Toast[];

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
  fetchTrashFiles: () => Promise<void>;
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
  moveFileToTrash: (fileId: string) => Promise<void>;
  restoreFromTrash: (fileId: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
  permanentlyDelete: (fileId: string) => Promise<void>;
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
  toggleUploadPanel: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  removeUploadTask: (taskId: string) => void;
  clearCompletedTasks: () => void;
  downloadItems: (fileIds: string[]) => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  
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
  
  uploadTasks: [],
  isUploadPanelOpen: false,
  isSidebarOpen: false,
  toasts: [],
  
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

  fetchTrashFiles: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/drive/trash');
      if (!res.ok) throw new Error('Failed to fetch trash');
      const trashFiles = await res.json();

      const formattedFiles = trashFiles.map((f: any) => ({
        ...f,
        createdAt: new Date(f.createdAt),
        updatedAt: new Date(f.updatedAt),
        trashedAt: f.trashedAt ? new Date(f.trashedAt) : undefined,
      }));

      set((state) => ({
        files: [
          ...state.files.filter(f => !f.isTrashed),
          ...formattedFiles
        ],
        isLoading: false,
      }));
    } catch (error) {
      console.error(error);
      set({ isLoading: false });
    }
  },

  fetchFiles: async (pathSegments) => {
    // Delegate to trash-specific fetch when in trash view
    if (pathSegments.length > 0 && pathSegments[0] === 'trash') {
      get().fetchTrashFiles();
      return;
    }

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
        searchQuery: '',
      });
      return;
    }

    if (JSON.stringify(history.paths[history.currentIndex]) === JSON.stringify(path)) {
      set({
        currentPath: path,
        selectedFiles: new Set(),
        focusedFileId: null,
        searchQuery: '',
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
      searchQuery: '',
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

  moveFileToTrash: async (fileId) => {
    try {
      const res = await fetch('/api/drive/item', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: fileId })
      });
      if (!res.ok) throw new Error('Move to trash failed');

      // Remove from favorites if present
      const { favorites } = get();
      if (favorites.includes(fileId)) {
        set({ favorites: favorites.filter(id => id !== fileId) });
      }

      get().fetchFiles(get().currentPath);
      set({ selectedFiles: new Set() });
      get().addToast('Moved to Trash', 'success');
    } catch (e) {
      console.error(e);
      get().addToast('Failed to move to trash', 'error');
    }
  },

  restoreFromTrash: async (fileId) => {
    try {
      const res = await fetch('/api/drive/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trashIds: [fileId] })
      });
      if (!res.ok) throw new Error('Restore failed');

      get().fetchFiles(get().currentPath);
      set({ selectedFiles: new Set() });
      get().addToast('Restored from Trash', 'success');
    } catch (e) {
      console.error(e);
      get().addToast('Failed to restore item', 'error');
    }
  },

  emptyTrash: async () => {
    try {
      const res = await fetch('/api/drive/trash', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true })
      });
      if (!res.ok) throw new Error('Empty trash failed');

      get().fetchFiles(get().currentPath);
      set({ selectedFiles: new Set() });
      get().addToast('Trash emptied', 'success');
    } catch (e) {
      console.error(e);
      get().addToast('Failed to empty trash', 'error');
    }
  },

  permanentlyDelete: async (fileId) => {
    const { currentPath } = get();
    const isTrashView = currentPath.length > 0 && currentPath[0] === 'trash';

    try {
      if (isTrashView) {
        // In trash view, permanently delete from trash
        const res = await fetch('/api/drive/trash', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trashIds: [fileId] })
        });
        if (!res.ok) throw new Error('Permanent delete failed');
      } else {
        // Outside trash view, use soft delete (move to trash)
        const res = await fetch('/api/drive/item', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: fileId })
        });
        if (!res.ok) throw new Error('Delete failed');
      }

      get().fetchFiles(currentPath);
      set({ selectedFiles: new Set() });
      get().addToast('Deleted successfully', 'success');
    } catch (e) {
      console.error(e);
      get().addToast('Failed to delete item', 'error');
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
      get().addToast('Renamed successfully', 'success');
    } catch (e) {
      console.error(e);
      get().addToast('Failed to rename item', 'error');
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
      get().addToast('Folder created', 'success');
    } catch (e) {
      console.error(e);
      get().addToast('Failed to create folder', 'error');
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
  moveFiles: async (fileIds, targetParentId) => {
    try {
      const res = await fetch('/api/drive/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds, targetParentId })
      });
      if (!res.ok) throw new Error('Move failed');
      get().fetchFiles(get().currentPath);
      get().addToast('Moved successfully', 'success');
    } catch (e) {
      console.error(e);
      get().addToast('Failed to move items', 'error');
    }
  },

  uploadFiles: async (uploadedFiles, targetParentId) => {
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

    // Create tasks
    const newTasks: UploadTask[] = uploadedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      progress: 0,
      status: 'pending',
    }));

    set(state => ({
      uploadTasks: [...state.uploadTasks, ...newTasks],
      isUploadPanelOpen: true
    }));

    // XHR helper with timeout and retry
    const MAX_RETRIES = 3;
    const XHR_TIMEOUT = 300_000; // 5 minutes

    const xhrUpload = (formData: FormData, headers: Record<string, string> = {}): Promise<void> => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/drive/upload', true);
        xhr.timeout = XHR_TIMEOUT;

        for (const [key, value] of Object.entries(headers)) {
          xhr.setRequestHeader(key, value);
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(xhr.statusText || `HTTP ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error('Network Error'));
        xhr.ontimeout = () => reject(new Error('Upload timed out'));
        xhr.send(formData);
      });
    };

    const xhrUploadWithRetry = async (
      formData: FormData,
      headers: Record<string, string> = {},
    ): Promise<void> => {
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          await xhrUpload(formData, headers);
          return;
        } catch (err) {
          if (attempt === MAX_RETRIES) throw err;
          // Exponential backoff: 1s, 2s, 4s
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
      }
    };

    // Function to process a single file upload
    const processUpload = async (task: UploadTask, file: File) => {
      const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB per chunk

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

      // Small file (< 10MB) -> Direct Upload with progress
      if (file.size <= CHUNK_SIZE) {
        const uploadWithProgress = (attempt: number): Promise<void> => {
          return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('path', finalPath);

            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/drive/upload', true);
            xhr.timeout = XHR_TIMEOUT;

            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                set(state => ({
                  uploadTasks: state.uploadTasks.map(t =>
                    t.id === task.id ? { ...t, progress: percent, status: 'uploading' } : t
                  )
                }));
              }
            };

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) resolve();
              else reject(new Error(xhr.statusText || `HTTP ${xhr.status}`));
            };
            xhr.onerror = () => reject(new Error('Network Error'));
            xhr.ontimeout = () => reject(new Error('Upload timed out'));
            xhr.send(formData);
          });
        };

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          try {
            await uploadWithProgress(attempt);
            set(state => ({
              uploadTasks: state.uploadTasks.map(t =>
                t.id === task.id ? { ...t, progress: 100, status: 'completed' } : t
              )
            }));
            return;
          } catch (err) {
            if (attempt === MAX_RETRIES) throw err;
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
          }
        }
        return;
      }

      // Large file -> Chunked Upload with retry per chunk
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        // Use retry wrapper for each chunk (no per-chunk progress to keep it simple with retry)
        const formData = new FormData();
        formData.append('file', chunk, file.name);
        formData.append('path', finalPath);

        // Update progress before sending chunk
        const chunkStartPercent = Math.round((start / file.size) * 100);
        set(state => ({
          uploadTasks: state.uploadTasks.map(t =>
            t.id === task.id ? { ...t, progress: chunkStartPercent, status: 'uploading' } : t
          )
        }));

        await xhrUploadWithRetry(formData, {
          'x-chunk-index': i.toString(),
          'x-total-chunks': totalChunks.toString(),
        });

        // Update progress after chunk complete
        const chunkEndPercent = Math.min(100, Math.round((end / file.size) * 100));
        set(state => ({
          uploadTasks: state.uploadTasks.map(t =>
            t.id === task.id ? { ...t, progress: chunkEndPercent } : t
          )
        }));
      }

      // All chunks finished
      set(state => ({
        uploadTasks: state.uploadTasks.map(t =>
          t.id === task.id ? { ...t, progress: 100, status: 'completed' } : t
        )
      }));
    };

    // Concurrency-limited upload queue (max 3 concurrent)
    const MAX_CONCURRENT = 3;
    const queue = newTasks.map((task, index) => ({ task, file: uploadedFiles[index] }));
    const results: PromiseSettledResult<void>[] = [];
    let queueIndex = 0;

    const runNext = async (): Promise<void> => {
      while (queueIndex < queue.length) {
        const idx = queueIndex++;
        const { task, file } = queue[idx];
        try {
          await processUpload(task, file);
          results[idx] = { status: 'fulfilled', value: undefined };
        } catch (e: any) {
          set(state => ({
            uploadTasks: state.uploadTasks.map(t =>
              t.id === task.id ? { ...t, status: 'error', error: e?.message || 'Upload Failed' } : t
            )
          }));
          results[idx] = { status: 'rejected', reason: e };
        }
      }
    };

    // Start up to MAX_CONCURRENT workers
    const workers = Array.from(
      { length: Math.min(MAX_CONCURRENT, queue.length) },
      () => runNext()
    );
    await Promise.all(workers);

    // Count successes and failures
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failCount = results.filter(r => r.status === 'rejected').length;

    // Show toast notification
    if (failCount === 0) {
      get().addToast(`${successCount} file(s) uploaded successfully`, 'success');
    } else if (successCount === 0) {
      get().addToast(`Failed to upload ${failCount} file(s)`, 'error');
    } else {
      get().addToast(`${successCount} uploaded, ${failCount} failed`, 'info');
    }

    get().fetchFiles(get().currentPath);
  },

  toggleUploadPanel: () => set(state => ({ isUploadPanelOpen: !state.isUploadPanelOpen })),
  
  toggleSidebar: () => set(state => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),

  removeUploadTask: (taskId) => set(state => ({
    uploadTasks: state.uploadTasks.filter(t => t.id !== taskId)
  })),

  clearCompletedTasks: () => set(state => ({
    uploadTasks: state.uploadTasks.filter(t => t.status !== 'completed')
  })),

  addToast: (message, type = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    set(state => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => get().removeToast(id), 3000);
  },

  removeToast: (id) => set(state => ({
    toasts: state.toasts.filter(t => t.id !== id)
  })),

  downloadItems: (fileIds) => {
    const { files } = get();
    if (fileIds.length === 0) return;

    let useZip = false;
    if (fileIds.length > 1) {
      useZip = true;
    } else {
      const file = files.find(f => f.id === fileIds[0]);
      if (file && file.type === 'folder') {
        useZip = true;
      }
    }

    let url = '';
    if (!useZip) {
      url = `/api/drive/download?id=${encodeURIComponent(fileIds[0])}`;
    } else {
      const params = new URLSearchParams();
      params.set('ids', fileIds.join(','));
      url = `/api/drive/zip?${params.toString()}`;
    }
    
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
