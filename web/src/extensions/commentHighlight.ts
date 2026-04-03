import { Mark, mergeAttributes } from '@tiptap/react';

export interface CommentHighlightOptions {
  HTMLAttributes: Record<string, unknown>;
  onClickThread?: (threadId: string) => void;
}

declare module '@tiptap/react' {
  interface Commands<ReturnType> {
    commentHighlight: {
      setCommentHighlight: (attributes: { threadId: string }) => ReturnType;
      unsetCommentHighlight: (threadId: string) => ReturnType;
    };
  }
}

export const CommentHighlight = Mark.create<CommentHighlightOptions>({
  name: 'commentHighlight',

  addOptions() {
    return {
      HTMLAttributes: {},
      onClickThread: undefined,
    };
  },

  addAttributes() {
    return {
      threadId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-thread-id'),
        renderHTML: (attributes) => ({
          'data-thread-id': attributes.threadId,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-thread-id]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'comment-highlight',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setCommentHighlight:
        (attributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes);
        },
      unsetCommentHighlight:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },
});

export default CommentHighlight;
