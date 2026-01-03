export type FileType = 'file' | 'folder';

export interface FileNode {
  id: string;              // 고유 식별자 (UUID or Path hash)
  parentId: string | null; // 상위 폴더 ID
  name: string;            // 파일명
  type: FileType;          // 파일/폴더 구분
  size: number;            // 바이트 단위 크기
  mimeType?: string;       // 파일 확장자/MIME (image/png, etc.)
  createdAt: Date;         // 생성일
  updatedAt: Date;         // 수정일
  children?: FileNode[];   // 하위 파일들 (ColumnView나 트리구조용)
  isTrashed?: boolean;     // 삭제된 파일인지 여부
  trashedAt?: Date;        // 삭제된 날짜
  url?: string;            // 파일 URL (미리보기/다운로드용)
  thumbnailUrl?: string;   // 썸네일 URL
}