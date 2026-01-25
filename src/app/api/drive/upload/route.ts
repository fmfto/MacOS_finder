import { NextRequest, NextResponse } from 'next/server';
import { getSafePath } from '@/lib/server/fsUtils';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const pathParam = formData.get('path') as string | null;

    if (!file || pathParam === null) {
      return NextResponse.json({ error: 'Missing file or path' }, { status: 400 });
    }

    // Handle empty path (root directory upload)
    const currentPath = pathParam ? pathParam.split('/').filter(Boolean) : [];
    const targetDir = currentPath.length > 0 ? getSafePath(currentPath) : getSafePath([]);

    await fs.mkdir(targetDir, { recursive: true });

    const chunkIndexStr = request.headers.get('x-chunk-index');
    const totalChunksStr = request.headers.get('x-total-chunks');

    // 1. 일반 업로드 (Chunk 헤더 없음)
    if (!chunkIndexStr || !totalChunksStr) {
      const filePath = path.join(targetDir, file.name);
      if (file.stream) {
        // @ts-ignore
        const nodeStream = Readable.fromWeb(file.stream());
        const writeStream = createWriteStream(filePath);
        await pipeline(nodeStream, writeStream);
      } else {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await fs.writeFile(filePath, buffer);
      }
      return NextResponse.json({ success: true });
    }

    // 2. 분할 업로드 (Chunked Upload)
    const chunkIndex = parseInt(chunkIndexStr);
    const totalChunks = parseInt(totalChunksStr);
    const tempFilePath = path.join(targetDir, `.${file.name}.uploading`);
    const finalFilePath = path.join(targetDir, file.name);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (chunkIndex === 0) {
      // 첫 번째 청크: 파일 생성 (기존 파일 덮어쓰기)
      await fs.writeFile(tempFilePath, buffer);
    } else {
      // 이후 청크: 파일 끝에 추가
      await fs.appendFile(tempFilePath, buffer);
    }

    // 마지막 청크인 경우: 임시 이름을 원래 이름으로 변경
    if (chunkIndex === totalChunks - 1) {
      await fs.rename(tempFilePath, finalFilePath);
    }

    return NextResponse.json({ success: true, chunkIndex });

  } catch (error) {
    console.error('Upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
