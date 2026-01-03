// src/lib/dragUtils.ts

export const setDragGhost = (e: React.DragEvent, fileName: string, count: number) => {
    // 1. 고스트 이미지가 될 컨테이너 생성
    const ghost = document.createElement('div');
    
    // 2. 스타일링 (macOS Finder 느낌)
    ghost.style.position = 'absolute';
    ghost.style.top = '-1000px'; // 화면 밖에서 생성
    ghost.style.left = '-1000px';
    ghost.style.width = '160px';
    ghost.style.padding = '8px';
    ghost.style.background = 'white';
    ghost.style.borderRadius = '8px';
    ghost.style.boxShadow = '0 10px 20px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.1)';
    ghost.style.zIndex = '9999';
    ghost.style.display = 'flex';
    ghost.style.alignItems = 'center';
    ghost.style.gap = '8px';
    ghost.style.pointerEvents = 'none'; // 마우스 이벤트 방해 금지
  
    // 3. 내부 콘텐츠 (아이콘 + 파일명)
    // SVG 아이콘 문자열 (Lucide 'File' 아이콘 유사)
    const iconSvg = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
    `;
  
    // 파일명 (너무 길면 자르기)
    const displayName = fileName.length > 15 ? fileName.substring(0, 15) + '...' : fileName;
  
    ghost.innerHTML = `
      ${iconSvg}
      <span style="font-size: 13px; font-weight: 500; color: #374151;">${displayName}</span>
    `;
  
    // 4. [핵심] 여러 개 선택 시 '빨간 뱃지' 추가
    if (count > 1) {
      const badge = document.createElement('div');
      badge.style.position = 'absolute';
      badge.style.top = '-8px';
      badge.style.right = '-8px';
      badge.style.background = '#EF4444'; // Tailwind Red-500
      badge.style.color = 'white';
      badge.style.fontSize = '12px';
      badge.style.fontWeight = 'bold';
      badge.style.borderRadius = '9999px';
      badge.style.width = '24px';
      badge.style.height = '24px';
      badge.style.display = 'flex';
      badge.style.alignItems = 'center';
      badge.style.justifyContent = 'center';
      badge.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
      badge.innerText = String(count);
      
      ghost.appendChild(badge);
    }
  
    // 5. DOM에 추가 (브라우저가 캡처하기 위해선 잠시 DOM에 존재해야 함)
    document.body.appendChild(ghost);
  
    // 6. 드래그 이미지 설정
    if (e.dataTransfer) {
      // 마우스 커서가 카드의 중앙에 오도록 설정
      e.dataTransfer.setDragImage(ghost, 80, 20);
    }
  
    // 7. 캡처가 끝난 후 즉시 제거 (약간의 딜레이를 주어 안정성 확보)
    requestAnimationFrame(() => {
      document.body.removeChild(ghost);
    });
  };