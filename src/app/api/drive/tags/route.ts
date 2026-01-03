import { NextRequest, NextResponse } from 'next/server';
import { getTags, updateFileTags, TagMap } from '@/lib/server/tagSystem';

export async function GET() {
  const tags = await getTags();
  return NextResponse.json(tags);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, tags } = body; 
    // path: 상대 경로 (e.g., "Folder/File.txt")
    // tags: string[] (e.g., ["Red", "Blue"])

    if (!path) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    const updatedTags = await updateFileTags(path, tags || []);
    return NextResponse.json(updatedTags);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update tags' }, { status: 500 });
  }
}
