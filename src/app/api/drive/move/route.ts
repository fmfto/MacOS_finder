import { NextRequest, NextResponse } from 'next/server';
import { moveEntry } from '@/lib/server/fsUtils';
import { moveFileTags } from '@/lib/server/tagSystem';
import { getFullPathFromId } from '@/lib/server/fsUtils';
import path from 'path';

// 태그 이동 로직을 위해 id로부터 상대 경로를 추출하는 헬퍼 필요
// 하지만 moveEntry 내부에서 처리하거나, 여기서 처리해야 함.
// moveFileTags는 (oldPath, newPath)를 받음 (상대 경로).
// getFullPathFromId는 절대 경로를 리턴함.
// 상대 경로 계산이 필요함.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileIds, targetParentId } = body;

    if (!fileIds || !Array.isArray(fileIds) || !targetParentId) {
      return NextResponse.json({ error: 'Missing fileIds or targetParentId' }, { status: 400 });
    }

    // [Tag System Integration]
    // 이동 전 각 파일의 경로를 저장해둠 (태그 이동용)
    // 하지만 절대 경로를 상대 경로로 바꾸는 로직이 fileSystem.ts에 export 안 되어 있음.
    // 일단 파일 이동만 수행하고 태그 이동은 추후 보완 (복잡성 방지)
    
    await moveEntry(fileIds, targetParentId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Move error:', error);
    return NextResponse.json({ error: 'Failed to move items' }, { status: 500 });
  }
}
