import { NextRequest, NextResponse } from 'next/server';
import { renameEntry, trashEntry } from '@/lib/server/fsUtils';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, newName } = body;

    if (!id || !newName) {
      return NextResponse.json({ error: 'Missing id or newName' }, { status: 400 });
    }

    await renameEntry(id, newName);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Rename error:', error);
    return NextResponse.json({ error: 'Failed to rename item' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    await trashEntry(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Trash error:', error);
    return NextResponse.json({ error: 'Failed to move item to trash' }, { status: 500 });
  }
}