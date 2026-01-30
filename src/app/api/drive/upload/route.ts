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
      try {
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
      } catch (error) {
        // Clean up partial file on error
        try { await fs.unlink(filePath); } catch {}
        throw error;
      }
      return NextResponse.json({ success: true });
    }

    // 2. 분할 업로드 (Chunked Upload) - Streaming
    const chunkIndex = parseInt(chunkIndexStr);
    const totalChunks = parseInt(totalChunksStr);
    const tempFilePath = path.join(targetDir, `.${file.name}.uploading`);
    const finalFilePath = path.join(targetDir, file.name);

    try {
      if (file.stream) {
        // Stream chunk directly to disk (append mode for subsequent chunks)
        // @ts-ignore
        const nodeStream = Readable.fromWeb(file.stream());
        const writeStream = createWriteStream(tempFilePath, {
          flags: chunkIndex === 0 ? 'w' : 'a',
        });
        await pipeline(nodeStream, writeStream);
      } else {
        // Fallback for environments without streaming
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        if (chunkIndex === 0) {
          await fs.writeFile(tempFilePath, buffer);
        } else {
          await fs.appendFile(tempFilePath, buffer);
        }
      }

      // 마지막 청크인 경우: 임시 이름을 원래 이름으로 변경
      if (chunkIndex === totalChunks - 1) {
        await fs.rename(tempFilePath, finalFilePath);
      }

      return NextResponse.json({ success: true, chunkIndex });
    } catch (error) {
      // Clean up temp file on error
      try { await fs.unlink(tempFilePath); } catch {}
      throw error;
    }

  } catch (error) {
    console.error('Upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
