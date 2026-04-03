'use client';

import { Thread } from '@/lib/types';
import ThreadCard from './ThreadCard';

interface CommentSidebarProps {
  threads: Map<string, Thread>;
  activeThreadId: string | null;
  onClickThread: (threadId: string) => void;
  onReply: (threadId: string, body: string) => void;
  onResolve: (threadId: string) => void;
  onAccept: (threadId: string) => void;
  onReject: (threadId: string) => void;
}

export default function CommentSidebar({
  threads,
  activeThreadId,
  onClickThread,
  onReply,
  onResolve,
  onAccept,
  onReject,
}: CommentSidebarProps) {
  const openThreads = Array.from(threads.values()).filter(
    (t) => t.status === 'open'
  );

  return (
    <div className="w-80 shrink-0 border-l border-gray-200 bg-gray-50 overflow-y-auto">
      <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Comments</h2>
          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
            {openThreads.length}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 p-3">
        {openThreads.length === 0 ? (
          <div className="py-8 text-center">
            <div className="text-sm text-gray-400">No comments yet</div>
            <div className="mt-1 text-xs text-gray-400">
              Select text and click the comment button to start
            </div>
          </div>
        ) : (
          openThreads.map((thread) => (
            <ThreadCard
              key={thread.id}
              thread={thread}
              isActive={activeThreadId === thread.id}
              onReply={onReply}
              onResolve={onResolve}
              onAccept={onAccept}
              onReject={onReject}
              onClick={onClickThread}
            />
          ))
        )}
      </div>
    </div>
  );
}
