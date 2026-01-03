import { useEffect, useRef } from 'react';
import { useFinderStore } from '@/store/useFinderStore';

interface UseBoxSelectionProps {
  containerRef: React.RefObject<HTMLElement | null>;
  itemRefs: React.MutableRefObject<Map<string, HTMLElement>>;
}

export const useBoxSelection = ({ containerRef, itemRefs }: UseBoxSelectionProps) => {
  const { 
    boxSelection, 
    startBoxSelection, 
    updateBoxSelection, 
    endBoxSelection, 
    setSelectedFiles,
    clearSelection
  } = useFinderStore();

  // "방금 드래그를 했는가?"를 판단하는 플래그
  const isDraggingRef = useRef(false);

  // 1. 마우스 다운 핸들러 (드래그 시작 준비)
  const handleMouseDown = (e: React.MouseEvent) => {
    // 왼쪽 클릭만 허용 & 드래그 가능한 요소(파일) 위에서는 무시
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('[draggable="true"]')) return;
    
    // 중요: 컨테이너의 스크롤 위치를 포함한 상대 좌표 계산
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const relativeX = e.clientX - rect.left + container.scrollLeft;
      const relativeY = e.clientY - rect.top + container.scrollTop;
      
      startBoxSelection(relativeX, relativeY);
      isDraggingRef.current = false; // 아직은 드래그 아님 (클릭일 수도 있음)
    }
  };

  // 2. 컨테이너 클릭 핸들러 (선택 해제 방지 로직)
  const handleContainerClick = (e: React.MouseEvent) => {
    // 이 클릭 이벤트가 상위(page.tsx)로 퍼지지 않게 막음
    e.stopPropagation();

    // 만약 방금 "박스 드래그"를 했다면? -> 선택을 유지해야 함 (Clear 금지)
    if (isDraggingRef.current) {
      isDraggingRef.current = false; // 플래그 초기화
      return; 
    }

    // 드래그가 아니라 단순 클릭이었다면? -> 선택 해제
    clearSelection();
  };

  // 3. 전역 마우스 이벤트 (드래그 중 & 드래그 끝)
  useEffect(() => {
    if (!boxSelection.isActive) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      // 마우스가 조금이라도 움직였으면 "드래그 중"으로 표시
      isDraggingRef.current = true;

      const rect = container.getBoundingClientRect();
      
      // 스크롤을 고려한 상대 좌표 업데이트 (파란 박스 그리기용)
      const relativeX = e.clientX - rect.left + container.scrollLeft;
      const relativeY = e.clientY - rect.top + container.scrollTop;

      updateBoxSelection(relativeX, relativeY);

      // --- 충돌 판정 (화면 절대 좌표 기준) ---
      // 화면에 보이는 그대로 판정하기 위해, 박스 좌표를 화면 기준으로 변환합니다.
      
      // 1. 박스의 현재 컨텐츠 좌표 범위
      const boxLeft = Math.min(boxSelection.startX, relativeX);
      const boxTop = Math.min(boxSelection.startY, relativeY);
      const boxRight = Math.max(boxSelection.startX, relativeX);
      const boxBottom = Math.max(boxSelection.startY, relativeY);

      // 2. 이를 다시 화면(Viewport) 좌표로 변환
      // (컨텐츠좌표 - 스크롤 + 컨테이너화면위치)
      const screenRect = {
        left: boxLeft - container.scrollLeft + rect.left,
        top: boxTop - container.scrollTop + rect.top,
        right: boxRight - container.scrollLeft + rect.left,
        bottom: boxBottom - container.scrollTop + rect.top,
      };

      const newSelectedIds = new Set<string>();

      itemRefs.current.forEach((element, id) => {
        // 아이템의 화면 좌표
        const itemRect = element.getBoundingClientRect();

        // 교차 판정 (Intersection): 살짝만 닿아도 True
        const isIntersecting = 
          screenRect.left < itemRect.right &&
          screenRect.right > itemRect.left &&
          screenRect.top < itemRect.bottom &&
          screenRect.bottom > itemRect.top;

        if (isIntersecting) {
          newSelectedIds.add(id);
        }
      });

      setSelectedFiles(newSelectedIds);
    };

    const handleGlobalMouseUp = () => {
      endBoxSelection();
      // 주의: 여기서 isDraggingRef를 바로 false로 만들면 안됨 (Click 이벤트가 뒤따라오므로)
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [boxSelection.isActive, boxSelection.startX, boxSelection.startY, itemRefs, containerRef, updateBoxSelection, endBoxSelection, setSelectedFiles]);

  return { handleMouseDown, handleContainerClick };
};