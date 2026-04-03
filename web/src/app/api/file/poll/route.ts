import { NextRequest, NextResponse } from 'next/server';
import { stat } from 'fs/promises';
import path from 'path';

/**
 * GET /api/file/poll?path=/absolute/path/to/file.md
 *
 * Returns the last-modified timestamps of the markdown file and its sidecar.
 * Used by the client to detect external changes (e.g. agent adding comments).
 */
export async function GET(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get('path');

  if (!filePath) {
    return NextResponse.json({ error: 'Missing "path" query parameter' }, { status: 400 });
  }

  if (!path.isAbsolute(filePath)) {
    return NextResponse.json({ error: 'Path must be absolute' }, { status: 400 });
  }

  try {
    const fileStat = await stat(filePath);
    const sidecarPath = `${filePath}.comments.json`;

    let sidecarMtime: number | null = null;
    try {
      const sidecarStat = await stat(sidecarPath);
      sidecarMtime = sidecarStat.mtimeMs;
    } catch {
      // No sidecar yet
    }

    return NextResponse.json({
      fileMtime: fileStat.mtimeMs,
      sidecarMtime,
    });
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
