import { SidecarFile } from './types';
import { parseSidecar, serializeSidecar } from './mdcomments';

export function isFileSystemAccessSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'showOpenFilePicker' in window &&
    'showSaveFilePicker' in window
  );
}

export async function openFile(): Promise<{
  content: string;
  sidecar: SidecarFile | null;
  fileHandle: FileSystemFileHandle;
  dirHandle: FileSystemDirectoryHandle;
  fileName: string;
} | null> {
  try {
    // 1. Pick the markdown file
    const [fileHandle] = await window.showOpenFilePicker({
      types: [
        {
          description: 'Markdown files',
          accept: {
            'text/markdown': ['.md', '.markdown', '.mdown', '.mkd'],
            'text/plain': ['.md', '.txt'],
          },
        },
      ],
      multiple: false,
    });

    const file = await fileHandle.getFile();
    const content = await file.text();
    const fileName = file.name;

    // 2. Ask for the containing directory so we can read/write the sidecar file.
    //    Show a prompt so the user knows why we're asking.
    let dirHandle: FileSystemDirectoryHandle;
    try {
      dirHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
        startIn: fileHandle,
      });
    } catch (dirErr) {
      if ((dirErr as Error).name === 'AbortError') {
        // User cancelled directory picker — still open the file, just no sidecar support
        return {
          content,
          sidecar: null,
          fileHandle,
          dirHandle: null as unknown as FileSystemDirectoryHandle,
          fileName,
        };
      }
      throw dirErr;
    }

    // 3. Try to find sidecar file in the directory
    let sidecar: SidecarFile | null = null;
    try {
      const sidecarName = `${fileName}.comments.json`;
      const sidecarHandle = await dirHandle.getFileHandle(sidecarName);
      const sidecarFile = await sidecarHandle.getFile();
      const sidecarContent = await sidecarFile.text();
      sidecar = parseSidecar(sidecarContent);
    } catch {
      // Sidecar doesn't exist yet - that's fine
    }

    return {
      content,
      sidecar,
      fileHandle,
      dirHandle,
      fileName,
    };
  } catch (err) {
    if ((err as Error).name === 'AbortError') return null;
    throw err;
  }
}

export async function saveFile(
  handle: FileSystemFileHandle | null,
  content: string,
  fileName: string
): Promise<{
  handle: FileSystemFileHandle;
  dirHandle: FileSystemDirectoryHandle | null;
}> {
  if (handle) {
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
    return { handle, dirHandle: null };
  }

  // No handle - use save picker
  const newHandle = await window.showSaveFilePicker({
    suggestedName: fileName,
    types: [
      {
        description: 'Markdown files',
        accept: { 'text/markdown': ['.md'] },
      },
    ],
  });

  const writable = await newHandle.createWritable();
  await writable.write(content);
  await writable.close();

  return { handle: newHandle, dirHandle: null };
}

export async function saveSidecar(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string,
  sidecar: SidecarFile
): Promise<void> {
  const sidecarName = `${fileName}.comments.json`;
  const sidecarHandle = await dirHandle.getFileHandle(sidecarName, {
    create: true,
  });
  const writable = await sidecarHandle.createWritable();
  await writable.write(serializeSidecar(sidecar));
  await writable.close();
}

/**
 * Load a file directly from existing handles (for auto-reload).
 */
export async function loadFromHandles(
  fileHandle: FileSystemFileHandle,
  dirHandle: FileSystemDirectoryHandle
): Promise<{
  content: string;
  sidecar: SidecarFile | null;
  fileName: string;
}> {
  const file = await fileHandle.getFile();
  const content = await file.text();
  const fileName = file.name;

  let sidecar: SidecarFile | null = null;
  try {
    const sidecarName = `${fileName}.comments.json`;
    const sidecarHandle = await dirHandle.getFileHandle(sidecarName);
    const sidecarFile = await sidecarHandle.getFile();
    const sidecarContent = await sidecarFile.text();
    sidecar = parseSidecar(sidecarContent);
  } catch {
    // No sidecar
  }

  return { content, sidecar, fileName };
}
