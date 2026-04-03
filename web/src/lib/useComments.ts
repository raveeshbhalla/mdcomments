'use client';

import { useCallback, useState } from 'react';
import { nanoid } from 'nanoid';
import { Thread, Comment, SidecarFile } from './types';

export function useComments() {
  const [threads, setThreads] = useState<Map<string, Thread>>(new Map());
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  const loadFromSidecar = useCallback((sidecar: SidecarFile) => {
    const map = new Map<string, Thread>();
    for (const [id, thread] of Object.entries(sidecar.threads)) {
      map.set(id, { ...thread, id });
    }
    setThreads(map);
  }, []);

  const toSidecar = useCallback((): SidecarFile => {
    const threadsObj: Record<string, Thread> = {};
    threads.forEach((thread, id) => {
      threadsObj[id] = thread;
    });
    return {
      schema: 'mdcomments/0.1',
      threads: threadsObj,
    };
  }, [threads]);

  const addComment = useCallback(
    (
      selection: string,
      body: string
    ): { threadId: string } => {
      const threadId = nanoid(8);
      const commentId = nanoid(8);
      const now = new Date().toISOString();

      const comment: Comment = {
        id: commentId,
        author: 'You',
        authorType: 'human',
        timestamp: now,
        body,
      };

      const thread: Thread = {
        id: threadId,
        type: 'comment',
        status: 'open',
        createdAt: now,
        selection,
        comments: [comment],
      };

      setThreads((prev) => {
        const next = new Map(prev);
        next.set(threadId, thread);
        return next;
      });

      setActiveThreadId(threadId);
      return { threadId };
    },
    []
  );

  const addSuggestion = useCallback(
    (
      original: string,
      replacement: string,
      body: string
    ): { threadId: string } => {
      const threadId = nanoid(8);
      const commentId = nanoid(8);
      const now = new Date().toISOString();

      const comment: Comment = {
        id: commentId,
        author: 'You',
        authorType: 'human',
        timestamp: now,
        body,
      };

      const thread: Thread = {
        id: threadId,
        type: 'suggestion',
        status: 'open',
        createdAt: now,
        suggestion: { original, replacement },
        comments: [comment],
      };

      setThreads((prev) => {
        const next = new Map(prev);
        next.set(threadId, thread);
        return next;
      });

      setActiveThreadId(threadId);
      return { threadId };
    },
    []
  );

  const reply = useCallback((threadId: string, body: string) => {
    const commentId = nanoid(8);
    const now = new Date().toISOString();

    const comment: Comment = {
      id: commentId,
      author: 'You',
      authorType: 'human',
      timestamp: now,
      body,
    };

    setThreads((prev) => {
      const next = new Map(prev);
      const thread = next.get(threadId);
      if (thread) {
        next.set(threadId, {
          ...thread,
          comments: [...thread.comments, comment],
        });
      }
      return next;
    });
  }, []);

  const resolve = useCallback(
    (threadId: string) => {
      const now = new Date().toISOString();

      setThreads((prev) => {
        const next = new Map(prev);
        const thread = next.get(threadId);
        if (thread) {
          next.set(threadId, {
            ...thread,
            status: 'resolved',
            resolvedAt: now,
            resolvedBy: 'You',
          });
        }
        return next;
      });

      if (activeThreadId === threadId) {
        setActiveThreadId(null);
      }
    },
    [activeThreadId]
  );

  const acceptSuggestion = useCallback(
    (threadId: string) => {
      const now = new Date().toISOString();

      setThreads((prev) => {
        const next = new Map(prev);
        const thread = next.get(threadId);
        if (thread) {
          next.set(threadId, {
            ...thread,
            status: 'resolved',
            resolvedAt: now,
            resolvedBy: 'You',
          });
        }
        return next;
      });

      if (activeThreadId === threadId) {
        setActiveThreadId(null);
      }

      return threads.get(threadId);
    },
    [activeThreadId, threads]
  );

  const rejectSuggestion = useCallback(
    (threadId: string) => {
      const now = new Date().toISOString();

      setThreads((prev) => {
        const next = new Map(prev);
        const thread = next.get(threadId);
        if (thread) {
          next.set(threadId, {
            ...thread,
            status: 'resolved',
            resolvedAt: now,
            resolvedBy: 'You',
          });
        }
        return next;
      });

      if (activeThreadId === threadId) {
        setActiveThreadId(null);
      }

      return threads.get(threadId);
    },
    [activeThreadId, threads]
  );

  return {
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
  };
}
