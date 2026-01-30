'use client';

import {
  Clock, Trash2, HardDrive, Folder, FolderOpen, X, Grid
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFinderStore } from '@/store/useFinderStore';
import { cn } from '@/lib/utils';

// NAS 환경에 맞게 메뉴를 실용적으로 정리했습니다.
const SIDEBAR_ITEMS = [
  {
    category: 'Favorites',
    items: [
      { name: 'Recent', icon: Clock, path: '/drive/recent' },
    ]
  },
  {
    category: 'Locations',
    items: [
      { name: 'Root Storage', icon: HardDrive, path: '/drive/root' },
      { name: 'File Browser', icon: FolderOpen, path: '/drive/filebrowser' },
      { name: 'Trash', icon: Trash2, path: '/drive/trash' },
    ]
  }
];

const TAG_COLORS = ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple', 'Gray'];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { 
    favorites, files, removeFromFavorites, setSearchQuery,
    isSidebarOpen, setSidebarOpen 
  } = useFinderStore();

  const handleNav = () => setSidebarOpen(false);

  // 즐겨찾기된 폴더들
  const favoriteFolders = favorites
    .map(id => files.find(f => f.id === id))
    .filter(f => f && !f.isTrashed);

  // 폴더 경로 찾기 (클릭 시 이동용)
  const getFolderPath = (folderId: string): string => {
    const folder = files.find(f => f.id === folderId);
    if (!folder) return '/drive/root';

    const path: string[] = ['root'];
    let current = folder;

    // 상위 경로 추적
    const ancestors: string[] = [];
    while (current.parentId && current.parentId !== 'root') {
      const parent = files.find(f => f.id === current.parentId);
      if (parent) {
        ancestors.unshift(parent.name);
        current = parent;
      } else break;
    }

    path.push(...ancestors, folder.name);
    return `/drive/${path.join('/')}`;
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={cn(
        "bg-finder-sidebar backdrop-blur-xl border-r border-finder-border flex-shrink-0 pt-4 pb-4 overflow-y-auto transition-transform duration-300 ease-in-out z-50",
        // Desktop
        "md:relative md:translate-x-0 md:w-56 md:h-full",
        // Mobile
        "fixed top-0 left-0 h-full w-64 shadow-2xl",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
      
      {/* Portal Link Header */}
      <div className="px-4 pt-2 pb-4 mb-2 border-b border-finder-border">
        <a 
          href="https://fm.pe.kr" 
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-finder-hover transition-colors text-finder-text-primary group"
        >
          <div className="p-1.5 bg-gray-200 rounded-md group-hover:bg-gray-300 transition-colors">
            <Grid size={18} className="text-gray-600" />
          </div>
          <span className="font-semibold text-sm">FM Portal</span>
        </a>
      </div>

      <div className="px-2 space-y-6">
        {SIDEBAR_ITEMS.map((section, sectionIndex) => (
          <div key={section.category}>
            <h3 className="px-3 text-[11px] font-bold text-finder-text-secondary mb-1 opacity-70">
              {section.category}
            </h3>
            <ul className="space-y-[1px]">
              {section.items.map((item) => {
                const isActive = pathname.startsWith(item.path);
                return (
                  <li key={item.name}>
                    <Link
                      onClick={handleNav}
                      href={item.path}
                      className={`
                        flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors
                        ${isActive
                          ? 'bg-finder-active/10 text-finder-active font-medium'
                          : 'text-finder-text-primary/90 hover:bg-finder-hover'
                        }
                      `}
                    >
                      <item.icon
                        size={16}
                        className={isActive ? 'text-finder-active' : 'text-finder-text-secondary'}
                        strokeWidth={2}
                      />
                      <span>{item.name}</span>
                    </Link>
                  </li>
                );
              })}

              {/* Favorites 섹션에 즐겨찾기 폴더 추가 */}
              {sectionIndex === 0 && favoriteFolders.length > 0 && (
                <>
                  {favoriteFolders.map((folder) => {
                    if (!folder) return null;
                    const folderPath = getFolderPath(folder.id);
                    const isActive = pathname === folderPath;
                    return (
                      <li key={folder.id} className="group">
                        <div className="flex items-center">
                          <Link
                            onClick={handleNav}
                            href={folderPath}
                            className={`
                              flex-1 flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors
                              ${isActive
                                ? 'bg-finder-active/10 text-finder-active font-medium'
                                : 'text-finder-text-primary/90 hover:bg-finder-hover'
                              }
                            `}
                          >
                            <Folder
                              size={16}
                              className={isActive ? 'text-finder-active' : 'text-finder-text-secondary'}
                              strokeWidth={2}
                            />
                            <span className="truncate">{folder.name}</span>
                          </Link>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              removeFromFavorites(folder.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 mr-1 hover:bg-gray-200 rounded transition-all"
                            title="Remove from Favorites"
                          >
                            <X size={12} className="text-gray-500" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </>
              )}
            </ul>
          </div>
        ))}
        
        {/* 태그 섹션 */}
        <div>
          <h3 className="px-3 text-[11px] font-bold text-finder-text-secondary mb-1 opacity-70">
            Tags
          </h3>
          <ul className="space-y-[1px]">
            {TAG_COLORS.map((color) => (
              <li key={color}>
                 <button 
                   onClick={() => setSearchQuery(`tag:${color}`)}
                   className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm hover:bg-finder-hover text-left"
                 >
                  <div 
                    className="w-2.5 h-2.5 rounded-full border border-black/5" 
                    style={{ backgroundColor: color.toLowerCase() }} 
                  />
                  <span className="text-finder-text-primary/90">{color}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
    </>
  );
}
