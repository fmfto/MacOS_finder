import { NextRequest, NextResponse } from 'next/server';
import {
  listTrash,
  restoreFromTrash,
  permanentlyDeleteFromTrash,
  emptyTrash,
} from '@/lib/server/trashSystem';

/**
 * GET /api/drive/trash - List all trash entries as FileNode-compatible objects
 */
export async function GET() {
  try {
    const entries = await listTrash();

    // Convert TrashEntry[] to FileNode-compatible format
    const fileNodes = entries.map((entry) => ({
      id: entry.trashId,
      parentId: null,
      name: entry.originalName,
      type: entry.type,
      size: entry.size,
      mimeType: undefined,
      createdAt: entry.trashedAt,
      updatedAt: entry.trashedAt,
      isTrashed: true,
      trashedAt: entry.trashedAt,
      originalPath: entry.originalPath,
    }));

    return NextResponse.json(fileNodes);
  } catch (error) {
    console.error('List trash error:', error);
    return NextResponse.json({ error: 'Failed to list trash' }, { status: 500 });
  }
}

/**
 * POST /api/drive/trash - Restore items from trash
 * Body: { trashIds: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trashIds } = body;

    if (!trashIds || !Array.isArray(trashIds) || trashIds.length === 0) {
      return NextResponse.json({ error: 'Missing trashIds' }, { status: 400 });
    }

    const results: { trashId: string; restoredPath: string }[] = [];
    const errors: { trashId: string; error: string }[] = [];

    for (const trashId of trashIds) {
      try {
        const restoredPath = await restoreFromTrash(trashId);
        results.push({ trashId, restoredPath });
      } catch (err: any) {
        errors.push({ trashId, error: err.message });
      }
    }

    return NextResponse.json({ restored: results, errors });
  } catch (error) {
    console.error('Restore from trash error:', error);
    return NextResponse.json({ error: 'Failed to restore from trash' }, { status: 500 });
  }
}

/**
 * DELETE /api/drive/trash - Permanently delete items or empty trash
 * Body: { trashIds: string[] } or { all: true }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    // Empty entire trash
    if (body.all === true) {
      const count = await emptyTrash();
      return NextResponse.json({ success: true, deletedCount: count });
    }

    // Delete specific items
    const { trashIds } = body;
    if (!trashIds || !Array.isArray(trashIds) || trashIds.length === 0) {
      return NextResponse.json({ error: 'Missing trashIds or all flag' }, { status: 400 });
    }

    const errors: { trashId: string; error: string }[] = [];

    for (const trashId of trashIds) {
      try {
        await permanentlyDeleteFromTrash(trashId);
      } catch (err: any) {
        errors.push({ trashId, error: err.message });
      }
    }

    return NextResponse.json({ success: true, errors });
  } catch (error) {
    console.error('Delete from trash error:', error);
    return NextResponse.json({ error: 'Failed to delete from trash' }, { status: 500 });
  }
}
