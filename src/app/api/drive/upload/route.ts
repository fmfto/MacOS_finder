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

    if (!file || !pathParam) {
      return NextResponse.json({ error: 'Missing file or path' }, { status: 400 });
    }

    const currentPath = pathParam.split('/').filter(Boolean);
    const targetDir = getSafePath(currentPath);
    
    // 폴더가 없으면 생성 (recursive)
    await fs.mkdir(targetDir, { recursive: true });

    const filePath = path.join(targetDir, file.name);
    
    // Stream implementation to avoid high memory usage
    if (file.stream) {
      // @ts-ignore - Readable.fromWeb matches WebStream types in Node 20+
      const nodeStream = Readable.fromWeb(file.stream());
      const writeStream = createWriteStream(filePath);
      await pipeline(nodeStream, writeStream);
    } else {
      // Fallback
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await fs.writeFile(filePath, buffer);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}