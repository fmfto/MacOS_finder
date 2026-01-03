import fs from 'fs/promises';
import path from 'path';
import mime from 'mime';
import { FileNode } from '@/types/file';

// 1. NAS 루트 디렉토리 설정
// 환경 변수가 없으면 프로젝트 루트의 'drive-root' 폴더를 사용
export const ROOT_DIR = process.env.NAS_ROOT_DIR 
  ? path.resolve(process.env.NAS_ROOT_DIR) 
  : path.join(process.cwd(), 'drive-root');

// ...

// 6. ID(Base64 Relative Path)를 절대 경로로 변환
export function getFullPathFromId(id: string): string {
  if (id === 'root') return ROOT_DIR;
  // Base64 decode (URL safe handles needed?)
  // 클라이언트에서 encodeURIComponent -> btoa 했으므로, 역순으로 품
  // 하지만 여기선 간단하게 Buffer.from(id, 'base64')로 함.
  // 클라이언트와 서버의 인코딩/디코딩 방식이 일치해야 함.
  // 클라이언트: btoa(unescape(encodeURIComponent(str)))
  // 서버(Node): Buffer.from(str, 'utf-8').toString('base64') 와 다를 수 있음!
  // 클라이언트 방식을 따라가려면: Buffer.from(id, 'base64').toString('utf-8') 가 맞음.
  // unescape(encodeURIComponent(str))은 UTF-8 문자열을 바이너리 스트링으로 만드는 과정.
  
  // 안전하게 클라이언트가 보낸 ID를 해독:
  const relativePath = Buffer.from(id, 'base64').toString('utf-8');
  const fullPath = path.resolve(ROOT_DIR, relativePath);
  
  if (!fullPath.startsWith(ROOT_DIR)) {
    throw new Error('Access denied: Invalid file ID');
  }
  return fullPath;
}

// 7. 이름 변경
export async function renameEntry(id: string, newName: string): Promise<void> {
  const oldPath = getFullPathFromId(id);
// ...  const dir = path.dirname(oldPath);
  const newPath = path.join(dir, newName);

  // 새 경로도 안전한지 체크 (이론상 dir이 안전하면 안전하지만, ../ 같은게 newName에 들어갈 수 있음)
  if (!path.resolve(newPath).startsWith(ROOT_DIR)) {
    throw new Error('Access denied: Invalid new name');
  }

  try {
    await fs.rename(oldPath, newPath);
  } catch (error) {
    throw new Error('Failed to rename entry');
  }
}

// 8. 삭제 (휴지통 기능 미구현으로 영구 삭제)
export async function deleteEntry(id: string): Promise<void> {
  const targetPath = getFullPathFromId(id);
  
  // 루트 삭제 방지
  if (targetPath === ROOT_DIR) {
    throw new Error('Cannot delete root directory');
  }

  try {
    // recursive: true (폴더일 경우 내용물까지 삭제)
    await fs.rm(targetPath, { recursive: true, force: true });
  } catch (error) {
    throw new Error('Failed to delete entry');
  }
}
