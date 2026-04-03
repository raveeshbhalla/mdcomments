'use client';

import { useEffect, useState, useRef } from 'react';
import { Editor } from '@tiptap/react';

interface SelectionBubbleProps {
  editor: Editor | null;
  onComment: () => void;
  onSuggest: () => void;
}

export default function SelectionBubble({ editor, onComment, onSuggest }: SelectionBubbleProps) {
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      const { from, to } = editor.state.selection;
      if (from === to) {
        setCoords(null);
        return;
      }

      // Get the DOM coordinates of the selection end
      const domSelection = window.getSelection();
      if (!domSelection || domSelection.rangeCount === 0) {
        setCoords(null);
        return;
      }

      const range = domSelection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      if (rect.width === 0) {
        setCoords(null);
        return;
      }

      // Position the bubble above the selection, centered
      const editorEl = editor.view.dom.closest('.relative');
      if (!editorEl) {
        setCoords(null);
        return;
      }

      const editorRect = editorEl.getBoundingClientRect();

      setCoords({
        top: rect.top - editorRect.top - 44, // above the selection
        left: rect.left - editorRect.left + rect.width / 2 - 60, // centered
      });
    };

    editor.on('selectionUpdate', update);

    // Also handle mouseup since selectionUpdate can fire before the DOM selection is finalized
    const handleMouseUp = () => {
      setTimeout(update, 10);
    };
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      editor.off('selectionUpdate', update);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [editor]);

  if (!coords || !editor || editor.state.selection.empty) return null;

  return (
    <div
      ref={bubbleRef}
      className="absolute z-50 flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 shadow-lg"
      style={{ top: coords.top, left: coords.left }}
    >
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onComment();
        }}
        className="flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
        title="Add comment"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Comment
      </button>
      <div className="h-4 w-px bg-gray-200" />
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSuggest();
        }}
        className="flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-green-50 hover:text-green-700"
        title="Suggest edit"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
        </svg>
        Suggest
      </button>
    </div>
  );
}
