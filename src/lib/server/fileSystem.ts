import fs from 'fs/promises';
import path from 'path';
import mime from 'mime';
import { FileNode } from '@/types/file';

// 1. NAS 루트 디렉토리 설정
// 환경 변수가 없으면 프로젝트 루트의 'drive-root' 폴더를 사용
const ROOT_DIR = process.env.NAS_ROOT_DIR 
  ? path.resolve(process.env.NAS_ROOT_DIR) 
  : path.join(process.cwd(), 'drive-root');

// 2. 경로 보안 검사 (Directory Traversal 방지)
// 요청된 경로가 ROOT_DIR 내부인지 확인
export function getSafePath(requestPath: string[]): string {
  // URL 디코딩 및 경로 조합
  const joinedPath = path.join(...requestPath.map(p => decodeURIComponent(p)));
  // 절대 경로로 변환
  const resolvedPath = path.resolve(ROOT_DIR, joinedPath);

  // ROOT_DIR로 시작하지 않으면 에러 (상위 디렉토리 접근 시도)
  if (!resolvedPath.startsWith(ROOT_DIR)) {
    throw new Error('Access denied: Invalid path');
  }

  return resolvedPath;
}

// 3. 파일 정보 매핑 (fs.Stats -> FileNode)
export async function getFileNode(filePath: string, relativePath: string): Promise<FileNode> {
  const stats = await fs.stat(filePath);
  const name = path.basename(filePath);
  const mimeType = mime.getType(filePath) || undefined;
  
  // 상대 경로에서 부모 ID 추출 (단순화를 위해 path string 사용)
  // 실제로는 DB를 쓰지 않으므로, path 자체를 ID처럼 활용하거나 해싱할 수 있음.
  // 여기서는 편의상 path string을 그대로 활용하지 않고, 클라이언트 로직에 맞춤.
  // 하지만 클라이언트가 ID 기반으로 동작하므로, path를 ID로 사용하는 것이 가장 확실함.
  
  const id = Buffer.from(relativePath).toString('base64'); // Path를 base64로 인코딩하여 ID로 사용
  const parentPath = path.dirname(relativePath);
  const parentId = parentPath === '.' ? 'root' : Buffer.from(parentPath).toString('base64');

  return {
    id: relativePath === '' ? 'root' : id, // 루트인 경우
    parentId: relativePath === '' ? null : parentId,
    name: name,
    type: stats.isDirectory() ? 'folder' : 'file',
    size: stats.size,
    mimeType: mimeType,
    createdAt: stats.birthtime,
    updatedAt: stats.mtime,
    isTrashed: false, // 휴지통 기능은 별도 구현 필요 (숨김 폴더 .trash 등)
  };
}

// 4. 디렉토리 목록 조회
export async function listDirectory(requestPath: string[]): Promise<FileNode[]> {
  const fullPath = getSafePath(requestPath);
  const relativePath = path.relative(ROOT_DIR, fullPath); // 현재 요청한 폴더의 상대 경로

  try {
    const dirents = await fs.readdir(fullPath, { withFileTypes: true });
    
    const files = await Promise.all(dirents.map(async (dirent) => {
      const childFullPath = path.join(fullPath, dirent.name);
      const childRelativePath = path.join(relativePath, dirent.name);
      
      return getFileNode(childFullPath, childRelativePath);
    }));

    return files;
  } catch (error) {
    console.error('Error listing directory:', error);
    throw new Error('Failed to list directory');
  }
}

// 5. 폴더 생성
export async function createDirectory(requestPath: string[], name: string): Promise<void> {
  const parentPath = getSafePath(requestPath);
  const newFolderPath = path.join(parentPath, name);

  try {
    await fs.mkdir(newFolderPath);
  } catch (error) {
    throw new Error('Failed to create directory');
  }
}

// 6. ID(Base64 Relative Path)를 절대 경로로 변환
function getPathFromId(id: string): string {
  if (id === 'root') return ROOT_DIR;
  const relativePath = Buffer.from(id, 'base64').toString('utf-8');
  const fullPath = path.resolve(ROOT_DIR, relativePath);
  
  if (!fullPath.startsWith(ROOT_DIR)) {
    throw new Error('Access denied: Invalid file ID');
  }
  return fullPath;
}

// 7. 이름 변경
export async function renameEntry(id: string, newName: string): Promise<void> {
  const oldPath = getPathFromId(id);
  const dir = path.dirname(oldPath);
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
  const targetPath = getPathFromId(id);
  
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
