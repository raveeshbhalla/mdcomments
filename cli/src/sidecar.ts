import * as fs from 'node:fs';
import * as path from 'node:path';

export interface Comment {
  id: string;
  author: string;
  authorType: 'human' | 'agent';
  timestamp: string;
  body: string;
  editedAt?: string | null;
}

export interface Thread {
  type: 'comment' | 'suggestion';
  status: 'open' | 'resolved' | 'orphaned';
  createdAt: string;
  selection?: string;
  suggestion?: {
    original: string;
    replacement: string;
  };
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  comments: Comment[];
}

export interface SidecarFile {
  schema: string;
  threads: Record<string, Thread>;
}

export function sidecarPath(mdFile: string): string {
  return `${mdFile}.comments.json`;
}

export function readSidecar(mdFile: string): SidecarFile {
  const scPath = sidecarPath(mdFile);
  if (!fs.existsSync(scPath)) {
    return {
      schema: 'mdcomments/0.1',
      threads: {},
    };
  }
  const raw = fs.readFileSync(scPath, 'utf-8');
  return JSON.parse(raw) as SidecarFile;
}

export function writeSidecar(mdFile: string, data: SidecarFile): void {
  const scPath = sidecarPath(mdFile);
  const tmpPath = scPath + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  fs.renameSync(tmpPath, scPath);
}
