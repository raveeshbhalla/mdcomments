export interface Comment {
  id: string;
  author: string;
  authorType: 'human' | 'agent';
  timestamp: string;
  body: string;
  editedAt?: string | null;
}

export interface Thread {
  id: string;
  type: 'comment' | 'suggestion';
  status: 'open' | 'resolved' | 'orphaned';
  createdAt: string;
  selection?: string;
  suggestion?: { original: string; replacement: string };
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  comments: Comment[];
}

export interface SidecarFile {
  schema: string;
  threads: Record<string, Thread>;
}

export interface FileState {
  handle: FileSystemFileHandle | null;
  dirHandle: FileSystemDirectoryHandle | null;
  name: string;
  /** Absolute filesystem path (when known from API or user input) */
  absolutePath: string | null;
  hasUnsavedChanges: boolean;
}

export interface MarkerInfo {
  type: 'comment' | 'suggestion';
  threadId: string;
  position: number;
  original?: string;
  replacement?: string;
}
