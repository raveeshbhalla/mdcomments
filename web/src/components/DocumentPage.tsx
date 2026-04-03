'use client';

import { EditorContent, Editor } from '@tiptap/react';

interface DocumentPageProps {
  editor: Editor | null;
}

export default function DocumentPage({ editor }: DocumentPageProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-[#f8f9fa]">
      <div className="mx-auto my-8 max-w-[816px] min-h-[1056px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.08)] rounded-sm">
        <div className="px-[72px] py-[72px]">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
