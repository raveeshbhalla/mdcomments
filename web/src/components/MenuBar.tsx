'use client';

interface MenuBarProps {
  fileName: string;
  hasUnsavedChanges: boolean;
  onFileNameChange: (name: string) => void;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
}

export default function MenuBar({
  fileName,
  hasUnsavedChanges,
  onFileNameChange,
  onNew,
  onOpen,
  onSave,
}: MenuBarProps) {
  return (
    <div className="flex h-12 items-center border-b border-gray-200 bg-white px-4 gap-3">
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-blue-600"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        <span className="text-sm font-semibold text-gray-800">MDComments</span>
      </div>

      {/* Divider */}
      <div className="h-5 w-px bg-gray-200" />

      {/* Document title */}
      <input
        type="text"
        value={fileName.replace(/\.md$/, '')}
        onChange={(e) => {
          const val = e.target.value;
          onFileNameChange(val ? `${val}.md` : 'Untitled document.md');
        }}
        className="text-sm text-gray-700 bg-transparent border-none outline-none
          hover:bg-gray-100 focus:bg-gray-100 rounded px-2 py-1 min-w-[120px] max-w-[300px]"
        spellCheck={false}
      />
      {hasUnsavedChanges && (
        <span className="text-xs text-gray-400">Unsaved</span>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* File actions */}
      <div className="flex items-center gap-1">
        {/* GitHub */}
        <a
          href="https://github.com/raveeshbhalla/mdcomments"
          target="_blank"
          rel="noopener noreferrer"
          title="View on GitHub"
          className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700
            transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
        </a>

        {/* New */}
        <button
          onClick={onNew}
          title="New document"
          className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700
            transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
        </button>

        {/* Open */}
        <button
          onClick={onOpen}
          title="Open file"
          className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700
            transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        </button>

        {/* Save */}
        <button
          onClick={onSave}
          title="Save (Ctrl+S)"
          className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700
            transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
        </button>
      </div>
    </div>
  );
}
