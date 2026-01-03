import fs from 'fs/promises';
import path from 'path';

// 환경변수 또는 기본 경로 사용 (fileSystem.ts와 동일한 로직 필요하지만 여기선 중복 방지 위해 env 읽음)
const ROOT_DIR = process.env.NAS_ROOT_DIR 
  ? path.resolve(process.env.NAS_ROOT_DIR) 
  : path.join(process.cwd(), 'drive-root');

const SYSTEM_DIR = path.join(ROOT_DIR, '.fm_system');
const TAGS_FILE = path.join(SYSTEM_DIR, 'tags.json');

// 태그 데이터 타입: { "relative/path/to/file": ["Red", "Blue"] }
export type TagMap = Record<string, string[]>;

async function ensureSystemDir() {
  try {
    await fs.mkdir(SYSTEM_DIR, { recursive: true });
  } catch {}
}

export async function getTags(): Promise<TagMap> {
  await ensureSystemDir();
  try {
    const data = await fs.readFile(TAGS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // 파일이 없으면 빈 객체 리턴
    return {};
  }
}

export async function saveTags(tags: TagMap) {
  await ensureSystemDir();
  await fs.writeFile(TAGS_FILE, JSON.stringify(tags, null, 2), 'utf-8');
}

export async function updateFileTags(filePath: string, tags: string[]) {
  const allTags = await getTags();
  
  if (tags.length === 0) {
    delete allTags[filePath];
  } else {
    allTags[filePath] = tags;
  }
  
  await saveTags(allTags);
  return allTags;
}

// 파일 이동/이름 변경 시 태그도 같이 이동
export async function moveFileTags(oldPath: string, newPath: string) {
  const allTags = await getTags();
  
  // 1. 해당 파일 태그 이동
  if (allTags[oldPath]) {
    allTags[newPath] = allTags[oldPath];
    delete allTags[oldPath];
  }
  
  // 2. 폴더일 경우 하위 파일들 태그도 이동 (단순 문자열 치환)
  // 예: "OldFolder/Child" -> "NewFolder/Child"
  const oldPrefix = oldPath + '/';
  const newPrefix = newPath + '/';
  
  for (const key of Object.keys(allTags)) {
    if (key.startsWith(oldPrefix)) {
      const suffix = key.substring(oldPrefix.length);
      const newKey = newPrefix + suffix;
      allTags[newKey] = allTags[key];
      delete allTags[key];
    }
  }
  
  await saveTags(allTags);
}

// 파일 삭제 시 태그 삭제
export async function deleteFileTags(targetPath: string) {
  const allTags = await getTags();
  
  // 1. 해당 파일
  delete allTags[targetPath];
  
  // 2. 하위 파일들
  const prefix = targetPath + '/';
  for (const key of Object.keys(allTags)) {
    if (key.startsWith(prefix)) {
      delete allTags[key];
    }
  }
  
  await saveTags(allTags);
}
