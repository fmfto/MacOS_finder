'use client';

import {
  Clock, Cloud, FileText, Download,
  Trash2, HardDrive, Folder, Star, X
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFinderStore } from '@/store/useFinderStore';

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
      { name: 'Trash', icon: Trash2, path: '/drive/trash' },
    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { favorites, files, removeFromFavorites, setSearchQuery } = useFinderStore();

  // 즐겨찾기된 폴더들
// ... (중략) ...
        {/* 태그 섹션 (유지) */}
        <div>
          <h3 className="px-3 text-[11px] font-bold text-finder-text-secondary mb-1 opacity-70">
            Tags
          </h3>
          <ul className="space-y-[1px]">
            {['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple', 'Gray'].map((color) => (
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
  );
}