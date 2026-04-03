import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, access } from 'fs/promises';
import { constants } from 'fs';
import path from 'path';

/**
 * GET /api/file?path=/absolute/path/to/file.md
 *
 * Reads a markdown file and its sidecar (.comments.json) from the local filesystem.
 * Returns { content, sidecar, fileName, filePath }.
 */
export async function GET(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get('path');

  if (!filePath) {
    return NextResponse.json({ error: 'Missing "path" query parameter' }, { status: 400 });
  }

  // Must be an absolute path
  if (!path.isAbsolute(filePath)) {
    return NextResponse.json({ error: 'Path must be absolute' }, { status: 400 });
  }

  try {
    await access(filePath, constants.R_OK);
  } catch {
    return NextResponse.json({ error: `File not found: ${filePath}` }, { status: 404 });
  }

  try {
    const content = await readFile(filePath, 'utf-8');
    const fileName = path.basename(filePath);

    // Try to read sidecar
    const sidecarPath = `${filePath}.comments.json`;
    let sidecar = null;
    try {
      const sidecarContent = await readFile(sidecarPath, 'utf-8');
      sidecar = JSON.parse(sidecarContent);
    } catch {
      // No sidecar — fine
    }

    return NextResponse.json({ content, sidecar, fileName, filePath });
  } catch (err) {
    return NextResponse.json({ error: `Failed to read file: ${(err as Error).message}` }, { status: 500 });
  }
}

/**
 * POST /api/file
 * Body: { path, content?, sidecar? }
 *
 * Writes the markdown file and/or sidecar to disk.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { path: filePath, content, sidecar } = body;

  if (!filePath) {
    return NextResponse.json({ error: 'Missing "path" in body' }, { status: 400 });
  }

  if (!path.isAbsolute(filePath)) {
    return NextResponse.json({ error: 'Path must be absolute' }, { status: 400 });
  }

  try {
    if (content !== undefined) {
      await writeFile(filePath, content, 'utf-8');
    }

    if (sidecar !== undefined) {
      const sidecarPath = `${filePath}.comments.json`;
      await writeFile(sidecarPath, JSON.stringify(sidecar, null, 2), 'utf-8');
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: `Failed to write: ${(err as Error).message}` }, { status: 500 });
  }
}
