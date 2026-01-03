import { useState, useEffect, useCallback } from 'react';

export interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  targetId: string | null; // 파일 ID (null이면 빈 공간)
}

export const useContextMenu = () => {
  const [menuState, setMenuState] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    targetId: null,
  });

  // 메뉴 닫기 핸들러
  const closeMenu = useCallback(() => {
    setMenuState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // 우클릭 핸들러 (트리거)
  const handleContextMenu = useCallback((e: React.MouseEvent, targetId: string | null = null) => {
    e.preventDefault(); // 브라우저 기본 메뉴 방지
    e.stopPropagation(); // 이벤트 전파 방지

    setMenuState({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      targetId,
    });
  }, []);

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClick = () => closeMenu();
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [closeMenu]);

  return { menuState, handleContextMenu, closeMenu };
};