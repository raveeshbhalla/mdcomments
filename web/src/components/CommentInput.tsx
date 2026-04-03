'use client';

import { useState, useRef, useEffect } from 'react';

interface CommentInputProps {
  onSubmit: (text: string) => void;
  onCancel: () => void;
  placeholder?: string;
  submitLabel?: string;
  autoFocus?: boolean;
}

export default function CommentInput({
  onSubmit,
  onCancel,
  placeholder = 'Add a comment...',
  submitLabel = 'Comment',
  autoFocus = true,
}: CommentInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm
          focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
          resize-none"
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100
            transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white
            hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
