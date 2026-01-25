import fs from 'fs/promises';
import path from 'path';
import mime from 'mime';
import { FileNode } from '@/types/file';

// 1. NAS 루트 디렉토리 설정
// 환경 변수가 없으면 프로젝트 루트의 'drive-root' 폴더를 사용
export const ROOT_DIR = process.env.NAS_ROOT_DIR 
  ? path.resolve(process.env.NAS_ROOT_DIR) 
  : path.join(process.cwd(), 'drive-root');

// 2. 경로 보안 검사 (Directory Traversal 방지)
// 요청된 경로가 ROOT_DIR 내부인지 확인
export function getSafePath(requestPath: string[]): string {
  // Handle empty array (root directory)
  if (requestPath.length === 0) {
    return ROOT_DIR;
  }

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
  
  // 상대 경로에서 부모 ID 추출
  // relativePath가 비어있으면(루트) parentId는 null
  // relativePath가 'A'이면 parentId는 'root' (A의 부모는 루트)
  // relativePath가 'A/B'이면 parentId는 'A' (base64)
  
  // ID 생성 (Base64 Relative Path)
  const id = relativePath === '' ? 'root' : Buffer.from(relativePath).toString('base64');
  
  let parentId: string | null = null;
  if (relativePath !== '') {
    const parentPath = path.dirname(relativePath);
    parentId = parentPath === '.' ? 'root' : Buffer.from(parentPath).toString('base64');
  }

  return {
    id,
    parentId,
    name: name,
    type: stats.isDirectory() ? 'folder' : 'file',
    size: stats.size,
    mimeType: mimeType,
    createdAt: stats.birthtime,
    updatedAt: stats.mtime,
    isTrashed: false, 
  };
}

// 4. 디렉토리 목록 조회
export async function listDirectory(requestPath: string[]): Promise<FileNode[]> {
  const fullPath = getSafePath(requestPath);
  const relativePath = path.relative(ROOT_DIR, fullPath); // 현재 요청한 폴더의 상대 경로

  try {
    const dirents = await fs.readdir(fullPath, { withFileTypes: true });
    
    // 숨김 파일 제외 (.으로 시작하는 파일)
    const visibleDirents = dirents.filter(d => !d.name.startsWith('.'));

    const files = await Promise.all(visibleDirents.map(async (dirent) => {
      const childFullPath = path.join(fullPath, dirent.name);
      // 상대 경로도 정확하게 계산 (root 기준)
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
export function getFullPathFromId(id: string): string {
  if (id === 'root') return ROOT_DIR;
  
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
  const dir = path.dirname(oldPath);
  const newPath = path.join(dir, newName);

  // 새 경로도 안전한지 체크
  if (!path.resolve(newPath).startsWith(ROOT_DIR)) {
    throw new Error('Access denied: Invalid new name');
  }

  try {
    await fs.rename(oldPath, newPath);
  } catch (error) {
    throw new Error('Failed to rename entry');
  }
}

// 9. 이동

export async function moveEntry(ids: string[], destinationId: string): Promise<void> {

  const destPath = getFullPathFromId(destinationId);

  

  // 목적지 체크

  if (!destPath.startsWith(ROOT_DIR)) {

    throw new Error('Access denied: Invalid destination');

  }



  for (const id of ids) {

    const sourcePath = getFullPathFromId(id);

    const fileName = path.basename(sourcePath);

    const newPath = path.join(destPath, fileName);



    // 소스와 목적지가 같으면 스킵

    if (sourcePath === newPath) continue;

    

    // 경로 보안 체크

    if (!sourcePath.startsWith(ROOT_DIR) || !path.resolve(newPath).startsWith(ROOT_DIR)) {

      throw new Error(`Access denied for file: ${fileName}`);

    }



    try {
      await fs.rename(sourcePath, newPath);
    } catch (error) {
      console.error(`Failed to move ${fileName}`, error);
      // 하나 실패해도 나머지는 계속 진행? 일단 에러 던짐
      throw new Error(`Failed to move ${fileName}`);
    }
  }
}

// 10. 삭제
export async function deleteEntry(id: string): Promise<void> {
  const fullPath = getFullPathFromId(id);

  try {
    const stats = await fs.stat(fullPath);
    if (stats.isDirectory()) {
      await fs.rm(fullPath, { recursive: true, force: true });
    } else {
      await fs.unlink(fullPath);
    }
  } catch (error) {
    console.error(`Failed to delete entry: ${fullPath}`, error);
    throw new Error('Failed to delete entry');
  }
}

// End of file system utilities
