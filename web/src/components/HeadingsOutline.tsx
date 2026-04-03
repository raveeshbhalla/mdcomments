'use client';

import { useEffect, useState } from 'react';
import { Editor } from '@tiptap/react';

interface HeadingItem {
  level: number;
  text: string;
  pos: number;
}

interface HeadingsOutlineProps {
  editor: Editor | null;
}

export default function HeadingsOutline({ editor }: HeadingsOutlineProps) {
  const [headings, setHeadings] = useState<HeadingItem[]>([]);

  useEffect(() => {
    if (!editor) return;

    const extractHeadings = () => {
      const items: HeadingItem[] = [];
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'heading') {
          items.push({
            level: node.attrs.level as number,
            text: node.textContent,
            pos,
          });
        }
      });
      setHeadings(items);
    };

    extractHeadings();
    editor.on('update', extractHeadings);
    return () => {
      editor.off('update', extractHeadings);
    };
  }, [editor]);

  if (headings.length === 0) return null;

  const handleClick = (pos: number) => {
    if (!editor) return;
    editor.chain().focus().setTextSelection(pos).run();

    // Scroll the heading into view
    const domAtPos = editor.view.domAtPos(pos);
    const node = domAtPos.node as HTMLElement;
    const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="w-56 shrink-0 overflow-y-auto border-r border-gray-200 bg-white">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Outline
        </h2>
      </div>
      <nav className="px-2 py-2">
        {headings.map((h, i) => (
          <button
            key={`${h.pos}-${i}`}
            onClick={() => handleClick(h.pos)}
            className="block w-full truncate rounded px-2 py-1.5 text-left text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
            style={{ paddingLeft: `${(h.level - 1) * 12 + 8}px` }}
            title={h.text}
          >
            <span
              className={
                h.level === 1
                  ? 'font-semibold'
                  : h.level === 2
                  ? 'font-medium'
                  : 'font-normal text-gray-500'
              }
            >
              {h.text}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}
