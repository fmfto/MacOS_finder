import { NextRequest, NextResponse } from 'next/server';
import { getFullPathFromId } from '@/lib/server/fsUtils';
import archiver from 'archiver';
import { PassThrough } from 'stream';
import path from 'path';
import fs from 'fs';

export async function GET(request: NextRequest) {
  const idsParam = request.nextUrl.searchParams.get('ids');
  const ids = idsParam ? idsParam.split(',') : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: 'No files selected' }, { status: 400 });
  }

  const stream = new PassThrough();
  const archive = archiver('zip', { zlib: { level: 5 } });

  archive.pipe(stream);

  // Add files to archive
  for (const id of ids) {
    try {
      const fullPath = getFullPathFromId(id);
      const stats = fs.statSync(fullPath); // Sync for simplicity inside loop
      const name = path.basename(fullPath);

      if (stats.isDirectory()) {
        archive.directory(fullPath, name);
      } else {
        archive.file(fullPath, { name });
      }
    } catch (e) {
      console.error(`Failed to add ${id} to zip`, e);
    }
  }

  archive.finalize();

  // Create ReadableStream from Node Stream
  const readableStream = new ReadableStream({
    start(controller) {
      stream.on('data', (chunk) => controller.enqueue(chunk));
      stream.on('end', () => controller.close());
      stream.on('error', (err) => controller.error(err));
    },
  });

  return new NextResponse(readableStream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="files.zip"',
    },
  });
}
