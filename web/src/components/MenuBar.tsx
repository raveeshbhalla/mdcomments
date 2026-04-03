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
