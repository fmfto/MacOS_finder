'use client';

import { useEffect } from 'react';
import { useFinderStore } from '@/store/useFinderStore';
import GridView from '@/components/finder/GridView';
import ListView from '@/components/finder/ListView';
import ColumnView from '@/components/finder/ColumnView';
import { useParams } from 'next/navigation';
import { useFileFilter } from '@/hooks/useFileFilter';

export default function DrivePage() {
  const { viewMode, setPath, files, searchQuery } = useFinderStore();
  const params = useParams();
  
  // URL 경로 파싱 (URL 디코딩 적용)
  const rawPath = params?.path;
  const pathSegments = Array.isArray(rawPath)
    ? rawPath.map(segment => decodeURIComponent(segment))
    : ['root'];

  // Store 업데이트
  useEffect(() => {
    setPath(pathSegments);
  }, [JSON.stringify(pathSegments), setPath]);

  // [핵심] 필터링 및 정렬된 파일 목록 가져오기 (Hook 사용)
  const currentFiles = useFileFilter(files);

  const isSearchMode = searchQuery.length > 0;

  return (
    <div className="h-full w-full" onClick={() => useFinderStore.getState().clearSelection()}>
      {/* Column View는 계층 구조가 필요하므로 검색 결과(Flat List)에는 부적합.
        따라서 검색 중일 때는 Column View 대신 Grid/List로 강제 전환하거나 
        아래처럼 분기 처리하는 것이 좋습니다.
      */}
      {viewMode === 'columns' && !isSearchMode ? (
         <ColumnView />
      ) : (
         currentFiles.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-finder-text-secondary opacity-60">
              <span className="text-4xl mb-2">
                {isSearchMode ? '🔍' : '📂'}
              </span>
              <p>{isSearchMode ? 'No results found' : 'Folder is empty'}</p>
            </div>
         ) : (
            <>
              {viewMode === 'grid' && <GridView files={currentFiles} />}
              
              {/* Column View 상태에서 검색 중일 때도 리스트 뷰를 기본으로 보여줌 */}
              {(viewMode === 'list' || (viewMode === 'columns' && isSearchMode)) && (
                <ListView files={currentFiles} />
              )}
            </>
         )
      )}
    </div>
  );
}