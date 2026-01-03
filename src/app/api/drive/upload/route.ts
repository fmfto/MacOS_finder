import { NextRequest, NextResponse } from 'next/server';
import { getSafePath } from '@/lib/server/fileSystem';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const pathParam = formData.get('path') as string | null;

    if (!file || !pathParam) {
      return NextResponse.json({ error: 'Missing file or path' }, { status: 400 });
    }

    const currentPath = pathParam.split('/').filter(Boolean);
    const targetDir = getSafePath(currentPath);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // 파일명 충돌 방지 로직은 생략 (덮어쓰기)
    const filePath = path.join(targetDir, file.name);
    
    await fs.writeFile(filePath, buffer);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
