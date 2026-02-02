import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { deleteFileTags } from './tagSystem';

const ROOT_DIR = process.env.NAS_ROOT_DIR
  ? path.resolve(process.env.NAS_ROOT_DIR)
  : path.join(process.cwd(), 'drive-root');

const SYSTEM_DIR = path.join(ROOT_DIR, '.fm_system');
const TRASH_META_FILE = path.join(SYSTEM_DIR, 'trash.json');
const TRASH_DIR = path.join(SYSTEM_DIR, 'trash');

const EXPIRY_DAYS = 30;

export interface TrashEntry {
  trashId: string;
  originalPath: string;   // relative to ROOT_DIR
  originalName: string;
  type: 'file' | 'folder';
  size: number;
  trashedAt: string;       // ISO string
}

export type TrashMap = Record<string, TrashEntry>;

async function ensureTrashDir() {
  await fs.mkdir(TRASH_DIR, { recursive: true });
}

async function readTrashMeta(): Promise<TrashMap> {
  await ensureTrashDir();
  try {
    const data = await fs.readFile(TRASH_META_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function writeTrashMeta(meta: TrashMap) {
  await ensureTrashDir();
  await fs.writeFile(TRASH_META_FILE, JSON.stringify(meta, null, 2), 'utf-8');
}

function generateTrashId(): string {
  return crypto.randomBytes(6).toString('hex'); // 12-char hex
}

/**
 * Move a file/folder to trash.
 * Physically moves to .fm_system/trash/<trashId>_<name> and records metadata.
 */
export async function moveToTrash(relativePath: string): Promise<TrashEntry> {
  const fullPath = path.resolve(ROOT_DIR, relativePath);
  if (!fullPath.startsWith(ROOT_DIR)) {
    throw new Error('Access denied: Invalid path');
  }

  const stats = await fs.stat(fullPath);
  const name = path.basename(fullPath);
  const trashId = generateTrashId();
  const trashFileName = `${trashId}_${name}`;
  const trashPath = path.join(TRASH_DIR, trashFileName);

  // Move file to trash directory
  try {
    await fs.rename(fullPath, trashPath);
  } catch (err: any) {
    // EXDEV: cross-device link - fallback to copy+delete
    if (err.code === 'EXDEV') {
      await fs.cp(fullPath, trashPath, { recursive: true });
      await fs.rm(fullPath, { recursive: true, force: true });
    } else {
      throw err;
    }
  }

  const entry: TrashEntry = {
    trashId,
    originalPath: relativePath,
    originalName: name,
    type: stats.isDirectory() ? 'folder' : 'file',
    size: stats.size,
    trashedAt: new Date().toISOString(),
  };

  const meta = await readTrashMeta();
  meta[trashId] = entry;
  await writeTrashMeta(meta);

  return entry;
}

/**
 * Restore a trashed item back to its original location.
 * Creates parent directories if needed. Handles name conflicts with (1) suffix.
 */
export async function restoreFromTrash(trashId: string): Promise<string> {
  const meta = await readTrashMeta();
  const entry = meta[trashId];
  if (!entry) {
    throw new Error(`Trash entry not found: ${trashId}`);
  }

  const trashFileName = `${trashId}_${entry.originalName}`;
  const trashPath = path.join(TRASH_DIR, trashFileName);

  // Determine restore path, handling name conflicts
  let restorePath = path.resolve(ROOT_DIR, entry.originalPath);
  if (!restorePath.startsWith(ROOT_DIR)) {
    throw new Error('Access denied: Invalid restore path');
  }

  // Ensure parent directory exists
  const parentDir = path.dirname(restorePath);
  await fs.mkdir(parentDir, { recursive: true });

  // Handle name conflicts
  restorePath = await getUniqueFilePath(restorePath);

  // Move back
  try {
    await fs.rename(trashPath, restorePath);
  } catch (err: any) {
    if (err.code === 'EXDEV') {
      await fs.cp(trashPath, restorePath, { recursive: true });
      await fs.rm(trashPath, { recursive: true, force: true });
    } else {
      throw err;
    }
  }

  // Remove from metadata
  delete meta[trashId];
  await writeTrashMeta(meta);

  return path.relative(ROOT_DIR, restorePath);
}

/**
 * Permanently delete a single trashed item.
 */
export async function permanentlyDeleteFromTrash(trashId: string): Promise<void> {
  const meta = await readTrashMeta();
  const entry = meta[trashId];
  if (!entry) {
    throw new Error(`Trash entry not found: ${trashId}`);
  }

  const trashFileName = `${trashId}_${entry.originalName}`;
  const trashPath = path.join(TRASH_DIR, trashFileName);

  // Delete physical file
  try {
    await fs.rm(trashPath, { recursive: true, force: true });
  } catch {
    // File might already be gone
  }

  // Delete associated tags
  await deleteFileTags(entry.originalPath);

  // Remove from metadata
  delete meta[trashId];
  await writeTrashMeta(meta);
}

/**
 * Empty the entire trash - permanently delete all items.
 */
export async function emptyTrash(): Promise<number> {
  const meta = await readTrashMeta();
  const entries = Object.values(meta);

  for (const entry of entries) {
    const trashFileName = `${entry.trashId}_${entry.originalName}`;
    const trashPath = path.join(TRASH_DIR, trashFileName);

    try {
      await fs.rm(trashPath, { recursive: true, force: true });
    } catch {
      // Continue even if individual delete fails
    }

    await deleteFileTags(entry.originalPath);
  }

  // Clear metadata
  await writeTrashMeta({});

  return entries.length;
}

/**
 * List all trash entries. Runs autoCleanExpired() as lazy cleanup.
 */
export async function listTrash(): Promise<TrashEntry[]> {
  await autoCleanExpired();
  const meta = await readTrashMeta();
  return Object.values(meta);
}

/**
 * Auto-clean items older than EXPIRY_DAYS.
 */
async function autoCleanExpired(): Promise<void> {
  const meta = await readTrashMeta();
  const now = Date.now();
  const expiryMs = EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  let changed = false;

  for (const [trashId, entry] of Object.entries(meta)) {
    const trashedAt = new Date(entry.trashedAt).getTime();
    if (now - trashedAt > expiryMs) {
      const trashFileName = `${trashId}_${entry.originalName}`;
      const trashPath = path.join(TRASH_DIR, trashFileName);

      try {
        await fs.rm(trashPath, { recursive: true, force: true });
      } catch {
        // Continue
      }

      await deleteFileTags(entry.originalPath);
      delete meta[trashId];
      changed = true;
    }
  }

  if (changed) {
    await writeTrashMeta(meta);
  }
}

/**
 * Get a unique file path by appending (1), (2), etc. if the path already exists.
 */
async function getUniqueFilePath(filePath: string): Promise<string> {
  try {
    await fs.access(filePath);
  } catch {
    // File doesn't exist, path is unique
    return filePath;
  }

  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const baseName = path.basename(filePath, ext);

  let counter = 1;
  let candidate: string;
  do {
    candidate = path.join(dir, `${baseName} (${counter})${ext}`);
    counter++;
    try {
      await fs.access(candidate);
    } catch {
      return candidate;
    }
  } while (counter < 1000); // safety limit

  throw new Error('Unable to find unique file name');
}
