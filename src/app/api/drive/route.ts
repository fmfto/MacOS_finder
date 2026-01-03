import { NextRequest, NextResponse } from 'next/server';
import { listDirectory, createDirectory } from '@/lib/server/fileSystem';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const pathParam = searchParams.get('path') || '';
  
  // pathParam: 'folder/subfolder' or empty
  const pathSegments = pathParam ? pathParam.split('/').filter(Boolean) : [];

  try {
    const files = await listDirectory(pathSegments);
    return NextResponse.json(files);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path: currentPath, name } = body;

    // currentPath: string[] (e.g. ['folder', 'subfolder'])
    if (!name) {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
    }

    await createDirectory(currentPath || [], name);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
  }
}
