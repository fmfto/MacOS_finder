import { NextRequest, NextResponse } from 'next/server';
import { getFullPathFromId } from '@/lib/server/fileSystem';
import fs from 'fs/promises';
import path from 'path';
import mime from 'mime';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing file ID' }, { status: 400 });
  }

  try {
    const filePath = getFullPathFromId(id);
    const stats = await fs.stat(filePath);

    if (stats.isDirectory()) {
      return NextResponse.json({ error: 'Cannot download a folder directly' }, { status: 400 });
    }

    // 파일 읽기
    const fileBuffer = await fs.readFile(filePath);
    
    // MIME 타입 설정
    const mimeType = mime.getType(filePath) || 'application/octet-stream';
    const filename = path.basename(filePath);
    
    // 헤더 설정 (한글 파일명 처리를 위해 encodeURIComponent 사용 권장)
    const headers = new Headers();
    headers.set('Content-Type', mimeType);
    headers.set('Content-Length', stats.size.toString());
    headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
  }
}
