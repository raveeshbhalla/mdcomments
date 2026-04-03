'use client';

import { Thread } from '@/lib/types';
import { useState } from 'react';
import CommentInput from './CommentInput';

interface ThreadCardProps {
  thread: Thread;
  isActive: boolean;
  onReply: (threadId: string, body: string) => void;
  onResolve: (threadId: string) => void;
  onAccept: (threadId: string) => void;
  onReject: (threadId: string) => void;
  onClick: (threadId: string) => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

export default function ThreadCard({
  thread,
  isActive,
  onReply,
  onResolve,
  onAccept,
  onReject,
  onClick,
}: ThreadCardProps) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const selectionText =
    thread.type === 'suggestion'
      ? thread.suggestion?.original
      : thread.selection;
  const firstComment = thread.comments[0];

  return (
    <div
      onClick={() => onClick(thread.id)}
      className={`rounded-lg border bg-white cursor-pointer transition-all ${
        isActive
          ? 'border-blue-400 shadow-md ring-1 ring-blue-100'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Selection context */}
      {selectionText && (
        <div className="px-3 pt-3">
          <div
            className={`rounded px-2 py-1 text-xs leading-relaxed truncate ${
              thread.type === 'suggestion'
                ? 'bg-red-50 text-red-700 border border-red-100'
                : 'bg-yellow-50 text-yellow-800 border border-yellow-100'
            }`}
          >
            &ldquo;{selectionText}&rdquo;
          </div>
        </div>
      )}

      {/* Suggestion replacement preview */}
      {thread.type === 'suggestion' && thread.suggestion && (
        <div className="px-3 pt-1">
          <div className={`rounded px-2 py-1 text-xs leading-relaxed bg-green-50 text-green-700 border border-green-100 ${isActive ? '' : 'truncate'}`}>
            &rarr; &ldquo;{thread.suggestion.replacement}&rdquo;
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="px-3 py-2">
        {/* First comment always shown */}
        <div className="flex items-start gap-2">
          <div
            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white ${
              firstComment.authorType === 'agent'
                ? 'bg-purple-500'
                : 'bg-blue-500'
            }`}
          >
            {firstComment.author.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-medium text-gray-900 truncate">
                {firstComment.author}
              </span>
              <span className="text-xs text-gray-400 shrink-0">
                {formatTime(firstComment.timestamp)}
              </span>
            </div>
            <p
              className={`text-sm text-gray-700 ${
                isActive ? '' : 'line-clamp-2'
              }`}
            >
              {firstComment.body}
            </p>
          </div>
        </div>

        {/* Additional comments (shown when active) */}
        {isActive &&
          thread.comments.slice(1).map((comment) => (
            <div
              key={comment.id}
              className="mt-3 flex items-start gap-2 border-t border-gray-100 pt-3"
            >
              <div
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white ${
                  comment.authorType === 'agent'
                    ? 'bg-purple-500'
                    : 'bg-blue-500'
                }`}
              >
                {comment.author.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {comment.author}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0">
                    {formatTime(comment.timestamp)}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{comment.body}</p>
              </div>
            </div>
          ))}

        {/* Inactive thread with more comments indicator */}
        {!isActive && thread.comments.length > 1 && (
          <div className="mt-1 text-xs text-gray-400">
            {thread.comments.length - 1} more{' '}
            {thread.comments.length - 1 === 1 ? 'reply' : 'replies'}
          </div>
        )}
      </div>

      {/* Actions (shown when active) */}
      {isActive && (
        <div className="border-t border-gray-100 px-3 py-2">
          {showReplyInput ? (
            <CommentInput
              onSubmit={(body) => {
                onReply(thread.id, body);
                setShowReplyInput(false);
              }}
              onCancel={() => setShowReplyInput(false)}
              placeholder="Reply..."
              submitLabel="Reply"
            />
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReplyInput(true);
                }}
                className="rounded px-2.5 py-1 text-xs font-medium text-gray-600
                  hover:bg-gray-100 transition-colors"
              >
                Reply
              </button>

              {thread.type === 'suggestion' ? (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAccept(thread.id);
                    }}
                    className="rounded px-2.5 py-1 text-xs font-medium text-green-700
                      hover:bg-green-50 transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onReject(thread.id);
                    }}
                    className="rounded px-2.5 py-1 text-xs font-medium text-red-700
                      hover:bg-red-50 transition-colors"
                  >
                    Reject
                  </button>
                </>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onResolve(thread.id);
                  }}
                  className="ml-auto rounded px-2.5 py-1 text-xs font-medium text-gray-600
                    hover:bg-gray-100 transition-colors"
                >
                  Resolve
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
