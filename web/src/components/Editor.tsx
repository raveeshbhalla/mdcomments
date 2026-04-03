'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Placeholder from '@tiptap/extension-placeholder';

import { marked } from 'marked';
import TurndownService from 'turndown';
import CommentHighlight from '@/extensions/commentHighlight';
import SuggestionHighlight from '@/extensions/suggestionHighlight';
import { useComments } from '@/lib/useComments';
import { parseMarkdown } from '@/lib/mdcomments';
import {
  isFileSystemAccessSupported,
  openFile,
  saveFile,
  saveSidecar,
  loadFromHandles,
} from '@/lib/fileHandler';
import {
  storeFileHandles,
  getStoredFileHandles,
  clearStoredFileHandles,
  verifyPermission,
} from '@/lib/fileStore';
import { FileState, MarkerInfo } from '@/lib/types';

import MenuBar from './MenuBar';
import Toolbar from './Toolbar';
import DocumentPage from './DocumentPage';
import CommentSidebar from './CommentSidebar';
import CommentInput from './CommentInput';
import SelectionBubble from './SelectionBubble';
import HeadingsOutline from './HeadingsOutline';

export default function Editor() {
  const [fileState, setFileState] = useState<FileState>({
    handle: null,
    dirHandle: null,
    name: 'Untitled document.md',
    absolutePath: null,
    hasUnsavedChanges: false,
  });

  const [markers, setMarkers] = useState<MarkerInfo[]>([]);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [showSuggestionInput, setShowSuggestionInput] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<{
    from: number;
    to: number;
    text: string;
  } | null>(null);
  const [fsSupported] = useState(() =>
    typeof window !== 'undefined' ? isFileSystemAccessSupported() : true
  );

  const {
    threads,
    activeThreadId,
    setActiveThreadId,
    loadFromSidecar,
    toSidecar,
    addComment,
    addSuggestion,
    reply,
    resolve,
    acceptSuggestion,
    rejectSuggestion,
  } = useComments();

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Typography,
      Color,
      TextStyle,
      Placeholder.configure({
        placeholder: 'Start typing or open a file...',
      }),
      CommentHighlight,
      SuggestionHighlight,
    ],
    editorProps: {
      attributes: {
        class: 'tiptap',
      },
      handleClick: (_view, _pos, event) => {
        // Check if clicked on a comment highlight
        const target = event.target as HTMLElement;
        const highlightEl = target.closest('[data-thread-id]');
        if (highlightEl) {
          const threadId = highlightEl.getAttribute('data-thread-id');
          if (threadId) {
            setActiveThreadId(threadId);
          }
        }
        return false;
      },
    },
    onUpdate: () => {
      setFileState((prev) => ({ ...prev, hasUnsavedChanges: true }));
    },
  });

  // Expose editor for debugging
  useEffect(() => {
    if (editor && typeof window !== 'undefined') {
      (window as any).__tiptapEditor = editor;
    }
  }, [editor]);

  // Find text in the ProseMirror document by building a char→position map.
  // This works across mark boundaries where ProseMirror splits text into separate nodes.
  const findTextInDoc = useCallback(
    (editorInstance: typeof editor, searchText: string): { from: number; to: number } | null => {
      if (!editorInstance || !searchText) return null;
      const doc = editorInstance.state.doc;

      // Build array of {char, docPos} for every character in the document
      const charMap: { char: string; pos: number }[] = [];
      doc.descendants((node, pos) => {
        if (node.isText && node.text) {
          for (let i = 0; i < node.text.length; i++) {
            charMap.push({ char: node.text[i], pos: pos + i });
          }
        }
      });

      const fullText = charMap.map((c) => c.char).join('');
      const idx = fullText.indexOf(searchText);
      if (idx === -1) return null;

      return {
        from: charMap[idx].pos,
        to: charMap[idx + searchText.length - 1].pos + 1,
      };
    },
    []
  );

  // Find a range spanning multiple block nodes (paragraphs, headings, etc.)
  // Searches for the first and last paragraph of a multi-paragraph text,
  // returning the full range from start of first match to end of last.
  const findMultiBlockRange = useCallback(
    (editorInstance: typeof editor, searchText: string): { from: number; to: number } | null => {
      if (!editorInstance || !searchText) return null;

      // Strip markdown syntax that won't appear in the rendered editor
      const cleanMarkdown = (text: string) =>
        text
          .replace(/^#{1,6}\s+/gm, '') // heading markers
          .replace(/\\\\/g, '\\')       // double-escaped backslashes
          .replace(/\\([.!#*_~`[\]()>+-])/g, '$1') // escaped punctuation
          .trim();

      const cleaned = cleanMarkdown(searchText);

      // First try as single text (handles simple cleaning like escaped chars)
      const simple = findTextInDoc(editorInstance, cleaned);
      if (simple) return simple;

      // For multi-paragraph content, split and find first + last paragraphs
      const paragraphs = cleaned
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter(Boolean);

      if (paragraphs.length < 2) return null;

      const firstPara = paragraphs[0];
      const lastPara = paragraphs[paragraphs.length - 1];

      const firstRange = findTextInDoc(editorInstance, firstPara);
      const lastRange = findTextInDoc(editorInstance, lastPara);

      if (firstRange && lastRange && firstRange.from <= lastRange.to) {
        return { from: firstRange.from, to: lastRange.to };
      }

      return null;
    },
    [findTextInDoc]
  );

  // Apply markers from loaded file to the editor by searching for selection text
  const applyMarkersToEditor = useCallback(
    (editorInstance: typeof editor, markerList: MarkerInfo[], sidecarThreads: Map<string, import('@/lib/types').Thread>) => {
      if (!editorInstance) return;

      const appliedThreadIds = new Set<string>();

      // 1. Apply markers found in the markdown file
      for (const marker of markerList) {
        // Skip markers for resolved/non-open threads
        const markerThread = sidecarThreads.get(marker.threadId);
        if (markerThread && markerThread.status !== 'open') continue;

        if (marker.type === 'comment') {
          const thread = markerThread;
          const searchText = thread?.selection;
          if (!searchText) continue;

          const range = findTextInDoc(editorInstance, searchText);
          if (range) {
            editorInstance
              .chain()
              .setTextSelection(range)
              .setCommentHighlight({ threadId: marker.threadId })
              .run();
            appliedThreadIds.add(marker.threadId);
          }
        } else if (marker.type === 'suggestion' && marker.original) {
          const searchText = marker.original;
          const range = findTextInDoc(editorInstance, searchText) || findMultiBlockRange(editorInstance, searchText);
          if (range) {
            editorInstance
              .chain()
              .setTextSelection(range)
              .setSuggestionHighlight({
                threadId: marker.threadId,
                original: marker.original,
                replacement: marker.replacement || '',
              })
              .run();
            appliedThreadIds.add(marker.threadId);
          }
        }
      }

      // 2. For any open sidecar threads that didn't have markers in the file,
      //    try to find and highlight their selection text anyway.
      //    This handles the case where comments were made in-browser but the
      //    markdown file wasn't saved with markers.
      for (const [threadId, thread] of sidecarThreads) {
        if (appliedThreadIds.has(threadId)) continue;
        if (thread.status !== 'open') continue;

        if (thread.type === 'comment' && thread.selection) {
          const range = findTextInDoc(editorInstance, thread.selection);
          if (range) {
            editorInstance
              .chain()
              .setTextSelection(range)
              .setCommentHighlight({ threadId })
              .run();
          }
        } else if (thread.type === 'suggestion' && thread.suggestion) {
          const range = findTextInDoc(editorInstance, thread.suggestion.original) || findMultiBlockRange(editorInstance, thread.suggestion.original);
          if (range) {
            editorInstance
              .chain()
              .setTextSelection(range)
              .setSuggestionHighlight({
                threadId,
                original: thread.suggestion.original,
                replacement: thread.suggestion.replacement,
              })
              .run();
          }
        }
      }

      // Deselect after applying markers
      editorInstance.commands.setTextSelection(0);
    },
    [findTextInDoc, findMultiBlockRange]
  );

  // Shared function to load file content into the editor
  const loadFileContent = useCallback(
    async (
      content: string,
      sidecar: import('@/lib/types').SidecarFile | null,
      fileHandle: FileSystemFileHandle,
      dirHandle: FileSystemDirectoryHandle,
      fileName: string,
      filePath: string
    ) => {
      const { cleanContent, markers: parsedMarkers } = parseMarkdown(content);

      if (editor) {
        const html = await marked.parse(cleanContent);
        editor.commands.setContent(html);
      }

      setFileState({
        handle: fileHandle,
        dirHandle,
        name: fileName,
        absolutePath: null,
        hasUnsavedChanges: false,
      });

      setMarkers(parsedMarkers);

      if (sidecar) {
        loadFromSidecar(sidecar);
        const threadMap = new Map<string, import('@/lib/types').Thread>();
        for (const [id, thread] of Object.entries(sidecar.threads)) {
          threadMap.set(id, { ...thread, id });
        }
        // Wait for the editor to fully process setContent before applying highlights.
        // We need to wait for: React re-render + ProseMirror transaction + DOM update.
        // Use a combination of requestAnimationFrame and setTimeout for reliability.
        const editorRef = editor;
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            setTimeout(() => {
              resolve();
            }, 50);
          });
        });
        if (editorRef) {
          applyMarkersToEditor(editorRef, parsedMarkers, threadMap);
        }
      }

      // Persist handles for auto-reload
      await storeFileHandles(filePath, fileHandle, dirHandle);

      // Update URL with full path
      const url = new URL(window.location.href);
      url.searchParams.set('file', filePath);
      window.history.replaceState({}, '', url.toString());
    },
    [editor, loadFromSidecar, applyMarkersToEditor]
  );

  // Handle new document
  const handleNew = useCallback(() => {
    if (editor) {
      editor.commands.clearContent();
    }
    setFileState({
      handle: null,
      dirHandle: null,
      name: 'Untitled document.md',
      absolutePath: null,
      hasUnsavedChanges: false,
    });
    setMarkers([]);
    loadFromSidecar({ schema: 'mdcomments/0.1', threads: {} });
    clearStoredFileHandles();

    const url = new URL(window.location.href);
    url.searchParams.delete('file');
    window.history.replaceState({}, '', url.toString());
  }, [editor, loadFromSidecar]);

  // Handle open file
  const handleOpen = useCallback(async () => {
    if (!fsSupported) return;

    const result = await openFile();
    if (!result) return;

    const { content, sidecar, fileHandle, dirHandle, fileName } = result;
    // Construct full path from directory name + file name
    const filePath = `${dirHandle.name}/${fileName}`;
    await loadFileContent(content, sidecar, fileHandle, dirHandle, fileName, filePath);
  }, [fsSupported, loadFileContent]);

  // Load file from the server API by absolute path
  const loadFileFromAPI = useCallback(
    async (absolutePath: string) => {
      if (!editor) return;
      try {
        const res = await fetch(`/api/file?path=${encodeURIComponent(absolutePath)}`);
        if (!res.ok) {
          const err = await res.json();
          console.error('API load failed:', err.error);
          return;
        }
        const { content, sidecar, fileName, filePath } = await res.json();
        const { cleanContent, markers: parsedMarkers } = parseMarkdown(content);

        const html = await marked.parse(cleanContent);
        editor.commands.setContent(html);

        setFileState({
          handle: null,
          dirHandle: null,
          name: fileName,
          absolutePath: filePath,
          hasUnsavedChanges: false,
        });

        setMarkers(parsedMarkers);

        if (sidecar) {
          loadFromSidecar(sidecar);
          const threadMap = new Map<string, import('@/lib/types').Thread>();
          for (const [id, thread] of Object.entries(sidecar.threads)) {
            threadMap.set(id, { ...(thread as import('@/lib/types').Thread), id });
          }
          await new Promise<void>((resolve) => {
            requestAnimationFrame(() => setTimeout(resolve, 50));
          });
          applyMarkersToEditor(editor, parsedMarkers, threadMap);
        }

        // Update URL
        const url = new URL(window.location.href);
        url.searchParams.set('file', filePath);
        window.history.replaceState({}, '', url.toString());
      } catch (err) {
        console.error('Failed to load file from API:', err);
      }
    },
    [editor, loadFromSidecar, applyMarkersToEditor]
  );

  // Load bundled demo content (spec file + sidecar)
  const loadDemoContent = useCallback(
    async () => {
      if (!editor) return;
      try {
        const [mdRes, sidecarRes] = await Promise.all([
          fetch('/demo/README.md'),
          fetch('/demo/README.md.comments.json'),
        ]);
        if (!mdRes.ok) return;

        const content = await mdRes.text();
        const sidecar = sidecarRes.ok ? await sidecarRes.json() : null;

        const { cleanContent, markers: parsedMarkers } = parseMarkdown(content);
        const html = await marked.parse(cleanContent);
        editor.commands.setContent(html);

        setFileState({
          handle: null,
          dirHandle: null,
          name: 'README.md',
          absolutePath: null,
          hasUnsavedChanges: false,
        });

        setMarkers(parsedMarkers);

        if (sidecar) {
          loadFromSidecar(sidecar);
          const threadMap = new Map<string, import('@/lib/types').Thread>();
          for (const [id, thread] of Object.entries(sidecar.threads)) {
            threadMap.set(id, { ...(thread as import('@/lib/types').Thread), id });
          }
          await new Promise<void>((resolve) => {
            requestAnimationFrame(() => setTimeout(resolve, 50));
          });
          applyMarkersToEditor(editor, parsedMarkers, threadMap);
        }
      } catch (err) {
        console.error('Failed to load demo content:', err);
      }
    },
    [editor, loadFromSidecar, applyMarkersToEditor]
  );

  // Auto-load file from URL on mount (when URL has ?file=)
  // Falls back to demo content if no file specified
  const [autoLoadAttempted, setAutoLoadAttempted] = useState(false);
  useEffect(() => {
    if (autoLoadAttempted || !editor) return;
    setAutoLoadAttempted(true);

    const params = new URLSearchParams(window.location.search);
    const fileParam = params.get('file');

    // No file param — load the bundled demo
    if (!fileParam) {
      loadDemoContent();
      return;
    }

    // If it's an absolute path (starts with /), use the server API
    if (fileParam.startsWith('/')) {
      loadFileFromAPI(fileParam);
      return;
    }

    // Otherwise try IndexedDB stored handles (for picker-opened files)
    if (!fsSupported) return;
    (async () => {
      const stored = await getStoredFileHandles();
      if (!stored) return;

      const hasPermission = await verifyPermission(stored.fileHandle, stored.dirHandle);
      if (!hasPermission) return;

      try {
        const { content, sidecar, fileName } = await loadFromHandles(
          stored.fileHandle,
          stored.dirHandle
        );
        const filePath = `${stored.dirHandle.name}/${fileName}`;
        await loadFileContent(content, sidecar, stored.fileHandle, stored.dirHandle, fileName, filePath);
      } catch (err) {
        console.error('Auto-reload failed:', err);
      }
    })();
  }, [editor, fsSupported, autoLoadAttempted, loadFileContent, loadFileFromAPI, loadDemoContent]);

  // Poll for external file changes (e.g. agent adding comments via CLI)
  const lastMtimeRef = useRef<{ fileMtime: number; sidecarMtime: number | null } | null>(null);
  const pollPausedRef = useRef(false);

  useEffect(() => {
    // Only poll for server API-loaded files
    if (!fileState.absolutePath) {
      lastMtimeRef.current = null;
      return;
    }

    const abspath = fileState.absolutePath;

    const poll = async () => {
      // Pause polling while we're saving to avoid false reloads
      if (pollPausedRef.current) return;

      try {
        const res = await fetch(`/api/file/poll?path=${encodeURIComponent(abspath)}`);
        if (!res.ok) return;

        const { fileMtime, sidecarMtime } = await res.json();

        if (lastMtimeRef.current === null) {
          // First poll — just record the baseline
          lastMtimeRef.current = { fileMtime, sidecarMtime };
          return;
        }

        const prev = lastMtimeRef.current;
        const fileChanged = fileMtime !== prev.fileMtime;
        const sidecarChanged = sidecarMtime !== prev.sidecarMtime;

        if (fileChanged || sidecarChanged) {
          lastMtimeRef.current = { fileMtime, sidecarMtime };
          // Reload the file
          await loadFileFromAPI(abspath);
        }
      } catch {
        // Network error — skip this tick
      }
    };

    const intervalId = setInterval(poll, 2000);
    // Run first poll immediately to set baseline
    poll();

    return () => clearInterval(intervalId);
  }, [fileState.absolutePath, loadFileFromAPI]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!editor) return;

    const turndown = new TurndownService({
      headingStyle: 'atx',
      hr: '---',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
    });
    const html = editor.getHTML();
    const content = turndown.turndown(html);

    try {
      if (fileState.absolutePath) {
        // Save via server API
        pollPausedRef.current = true;
        const sidecar = threads.size > 0 ? toSidecar() : undefined;
        await fetch('/api/file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: fileState.absolutePath,
            content,
            sidecar,
          }),
        });
        // Update baseline mtime after our own write
        try {
          const pollRes = await fetch(`/api/file/poll?path=${encodeURIComponent(fileState.absolutePath)}`);
          if (pollRes.ok) {
            lastMtimeRef.current = await pollRes.json();
          }
        } catch { /* ignore */ }
        pollPausedRef.current = false;
        setFileState((prev) => ({ ...prev, hasUnsavedChanges: false }));
      } else {
        // Save via File System Access API
        const { handle: newHandle } = await saveFile(
          fileState.handle,
          content,
          fileState.name
        );

        setFileState((prev) => ({
          ...prev,
          handle: newHandle,
          hasUnsavedChanges: false,
        }));

        if (fileState.dirHandle && threads.size > 0) {
          const sidecar = toSidecar();
          await saveSidecar(fileState.dirHandle, fileState.name, sidecar);
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Save failed:', err);
      }
    }
  }, [editor, fileState, threads, toSidecar]);

  // Auto-save sidecar whenever threads change
  useEffect(() => {
    if (threads.size === 0) return;
    if (!fileState.dirHandle && !fileState.absolutePath) return;

    const timer = setTimeout(async () => {
      try {
        const sidecar = toSidecar();
        if (fileState.absolutePath) {
          // Save via server API
          pollPausedRef.current = true;
          await fetch('/api/file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              path: fileState.absolutePath,
              sidecar,
            }),
          });
          // Update baseline mtime after our own write
          try {
            const pollRes = await fetch(`/api/file/poll?path=${encodeURIComponent(fileState.absolutePath)}`);
            if (pollRes.ok) {
              lastMtimeRef.current = await pollRes.json();
            }
          } catch { /* ignore */ }
          pollPausedRef.current = false;
        } else if (fileState.dirHandle) {
          await saveSidecar(fileState.dirHandle, fileState.name, sidecar);
        }
      } catch (err) {
        console.error('Auto-save sidecar failed:', err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [threads, fileState.dirHandle, fileState.absolutePath, fileState.name, toSidecar]);

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // Handle adding a comment
  const handleStartComment = useCallback(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;

    const text = editor.state.doc.textBetween(from, to);
    setPendingSelection({ from, to, text });
    setShowCommentInput(true);
    setShowSuggestionInput(false);
  }, [editor]);

  const handleSubmitComment = useCallback(
    (body: string) => {
      if (!editor || !pendingSelection) return;

      const { from, to, text } = pendingSelection;
      const { threadId } = addComment(text, body);

      // Apply highlight mark
      editor
        .chain()
        .focus()
        .setTextSelection({ from, to })
        .setCommentHighlight({ threadId })
        .run();

      setShowCommentInput(false);
      setPendingSelection(null);
      setFileState((prev) => ({ ...prev, hasUnsavedChanges: true }));
    },
    [editor, pendingSelection, addComment]
  );

  // Handle adding a suggestion
  const handleStartSuggestion = useCallback(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;

    const text = editor.state.doc.textBetween(from, to);
    setPendingSelection({ from, to, text });
    setShowSuggestionInput(true);
    setShowCommentInput(false);
  }, [editor]);

  const handleSubmitSuggestion = useCallback(
    (replacement: string) => {
      if (!editor || !pendingSelection) return;

      const { from, to, text } = pendingSelection;

      // The body is the reason for the suggestion
      const body = `Suggesting: "${text}" -> "${replacement}"`;
      const { threadId } = addSuggestion(text, replacement, body);

      // Apply suggestion highlight mark
      editor
        .chain()
        .focus()
        .setTextSelection({ from, to })
        .setSuggestionHighlight({
          threadId,
          original: text,
          replacement,
        })
        .run();

      setShowSuggestionInput(false);
      setPendingSelection(null);
      setFileState((prev) => ({ ...prev, hasUnsavedChanges: true }));
    },
    [editor, pendingSelection, addSuggestion]
  );

  // Helper: find the full range of a mark (across multiple text nodes) by threadId
  const findFullMarkRange = useCallback(
    (markTypeName: string, threadId: string): { from: number; to: number } | null => {
      if (!editor) return null;
      const { doc } = editor.state;
      let markFrom = -1;
      let markTo = -1;

      doc.descendants((node, pos) => {
        if (!node.isText) return;
        for (const mark of node.marks) {
          if (mark.type.name === markTypeName && mark.attrs.threadId === threadId) {
            if (markFrom === -1) markFrom = pos;
            markTo = pos + node.nodeSize;
          }
        }
      });

      return markFrom >= 0 ? { from: markFrom, to: markTo } : null;
    },
    [editor]
  );

  // Handle resolving a thread (remove highlight)
  const handleResolve = useCallback(
    (threadId: string) => {
      if (!editor) return;

      // Try both mark types to find the full range
      const range =
        findFullMarkRange('commentHighlight', threadId) ||
        findFullMarkRange('suggestionHighlight', threadId);

      if (range) {
        editor
          .chain()
          .setTextSelection(range)
          .unsetMark('commentHighlight')
          .unsetMark('suggestionHighlight')
          .run();
        editor.commands.setTextSelection(0);
      }

      resolve(threadId);
      setFileState((prev) => ({ ...prev, hasUnsavedChanges: true }));
    },
    [editor, resolve, findFullMarkRange]
  );

  // Handle accepting a suggestion
  const handleAcceptSuggestion = useCallback(
    (threadId: string) => {
      if (!editor) return;

      const thread = threads.get(threadId);
      if (!thread || !thread.suggestion) return;

      // Find the full range of marked text - check inline marks first,
      // then fall back to block-level range for multi-paragraph suggestions
      let range = findFullMarkRange('suggestionHighlight', threadId);

      // For multi-block suggestions, the mark may span block nodes.
      // findFullMarkRange walks text nodes, but we need to capture the
      // full block range including the block nodes themselves.
      if (!range) {
        // Try finding by text content as fallback
        range = findMultiBlockRange(editor, thread.suggestion.original);
      }

      if (range) {
        // For multi-paragraph replacements, convert to HTML first
        const replacement = thread.suggestion.replacement;
        if (replacement.includes('\n\n')) {
          // Multi-paragraph: convert to HTML paragraphs
          const htmlParts = replacement
            .split(/\n\n+/)
            .filter(Boolean)
            .map((p) => {
              const trimmed = p.trim();
              // Check if it's a heading
              const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)/);
              if (headingMatch) {
                const level = headingMatch[1].length;
                return `<h${level}>${headingMatch[2]}</h${level}>`;
              }
              // Check if it's a list
              if (trimmed.startsWith('- ')) {
                const items = trimmed.split('\n').map((line) => `<li>${line.replace(/^-\s+/, '')}</li>`).join('');
                return `<ul>${items}</ul>`;
              }
              // Check if it's an HR
              if (trimmed === '---') return '<hr>';
              // Regular paragraph - handle bold
              const processed = trimmed
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/`([^`]+)`/g, '<code>$1</code>')
                .replace(/\\([.!#*_~`[\]()>+-])/g, '$1');
              return `<p>${processed}</p>`;
            })
            .join('');

          editor
            .chain()
            .setTextSelection(range)
            .deleteSelection()
            .insertContent(htmlParts)
            .run();
        } else {
          // Simple single-line replacement
          const cleanReplacement = replacement.replace(/\\([.!#*_~`[\]()>+-])/g, '$1');
          editor
            .chain()
            .setTextSelection(range)
            .insertContent(cleanReplacement)
            .run();
        }
      }

      acceptSuggestion(threadId);
      setFileState((prev) => ({ ...prev, hasUnsavedChanges: true }));
    },
    [editor, threads, acceptSuggestion, findFullMarkRange, findMultiBlockRange]
  );

  // Handle rejecting a suggestion
  const handleRejectSuggestion = useCallback(
    (threadId: string) => {
      if (!editor) return;

      const thread = threads.get(threadId);
      let range = findFullMarkRange('suggestionHighlight', threadId);

      if (!range && thread?.suggestion) {
        range = findMultiBlockRange(editor, thread.suggestion.original);
      }

      if (range) {
        editor
          .chain()
          .setTextSelection(range)
          .unsetMark('suggestionHighlight')
          .run();
        editor.commands.setTextSelection(0);
      }

      rejectSuggestion(threadId);
      setFileState((prev) => ({ ...prev, hasUnsavedChanges: true }));
    },
    [editor, threads, rejectSuggestion, findFullMarkRange, findMultiBlockRange]
  );

  return (
    <div className="flex h-full flex-col">
      <MenuBar
        fileName={fileState.name}
        hasUnsavedChanges={fileState.hasUnsavedChanges}
        onFileNameChange={(name) =>
          setFileState((prev) => ({ ...prev, name }))
        }
        onNew={handleNew}
        onOpen={handleOpen}
        onSave={handleSave}
      />
      <Toolbar
        editor={editor}
        onComment={handleStartComment}
        onSuggest={handleStartSuggestion}
      />

      {!fsSupported && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800">
          Your browser does not support the File System Access API. File
          open/save features will not work. Try Chrome or Edge.
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <HeadingsOutline editor={editor} />
        <div className="relative flex-1 overflow-y-auto">
          <DocumentPage editor={editor} />

          {/* Selection bubble - appears when text is selected */}
          <SelectionBubble
            editor={editor}
            onComment={handleStartComment}
            onSuggest={handleStartSuggestion}
          />

          {/* Floating comment input */}
          {showCommentInput && pendingSelection && (
            <div className="absolute top-4 right-4 z-50 w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
              <div className="mb-2 text-xs text-gray-500">
                Commenting on:{' '}
                <span className="font-medium text-gray-700">
                  &ldquo;{pendingSelection.text.slice(0, 50)}
                  {pendingSelection.text.length > 50 ? '...' : ''}&rdquo;
                </span>
              </div>
              <CommentInput
                onSubmit={handleSubmitComment}
                onCancel={() => {
                  setShowCommentInput(false);
                  setPendingSelection(null);
                }}
                placeholder="Add your comment..."
                submitLabel="Comment"
              />
            </div>
          )}

          {/* Floating suggestion input */}
          {showSuggestionInput && pendingSelection && (
            <div className="absolute top-4 right-4 z-50 w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
              <div className="mb-2 text-xs text-gray-500">
                Suggesting replacement for:{' '}
                <span className="font-medium text-gray-700">
                  &ldquo;{pendingSelection.text.slice(0, 50)}
                  {pendingSelection.text.length > 50 ? '...' : ''}&rdquo;
                </span>
              </div>
              <CommentInput
                onSubmit={handleSubmitSuggestion}
                onCancel={() => {
                  setShowSuggestionInput(false);
                  setPendingSelection(null);
                }}
                placeholder="Type replacement text..."
                submitLabel="Suggest"
              />
            </div>
          )}
        </div>

        <CommentSidebar
          threads={threads}
          activeThreadId={activeThreadId}
          onClickThread={setActiveThreadId}
          onReply={reply}
          onResolve={handleResolve}
          onAccept={handleAcceptSuggestion}
          onReject={handleRejectSuggestion}
        />
      </div>
    </div>
  );
}
