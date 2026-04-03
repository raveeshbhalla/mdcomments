import { Mark, mergeAttributes } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface SuggestionHighlightOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/react' {
  interface Commands<ReturnType> {
    suggestionHighlight: {
      setSuggestionHighlight: (attributes: {
        threadId: string;
        original: string;
        replacement: string;
      }) => ReturnType;
      unsetSuggestionHighlight: () => ReturnType;
    };
  }
}

export const SuggestionHighlight = Mark.create<SuggestionHighlightOptions>({
  name: 'suggestionHighlight',

  addOptions() {
    return {
      HTMLAttributes: {},
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
      original: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-original'),
        renderHTML: (attributes) => ({
          'data-original': attributes.original,
        }),
      },
      replacement: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-replacement'),
        renderHTML: (attributes) => ({
          'data-replacement': attributes.replacement,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span.suggestion-highlight',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'suggestion-highlight',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setSuggestionHighlight:
        (attributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes);
        },
      unsetSuggestionHighlight:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },

  addProseMirrorPlugins() {
    const markType = this.type;

    return [
      new Plugin({
        key: new PluginKey('suggestionReplacementWidget'),
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            const seen = new Set<string>();

            // Find the end position of each suggestion mark and add a green replacement widget
            state.doc.descendants((node, pos) => {
              if (!node.isText) return;

              for (const mark of node.marks) {
                if (mark.type !== markType) continue;
                const threadId = mark.attrs.threadId;
                if (!threadId || seen.has(threadId)) continue;

                // Find the full range of this mark (may span multiple text nodes)
                let markEnd = pos + node.nodeSize;
                // Look ahead for contiguous nodes with the same mark
                let nextPos = pos + node.nodeSize;
                let nextNode = state.doc.nodeAt(nextPos);
                while (
                  nextNode &&
                  nextNode.isText &&
                  nextNode.marks.some(
                    (m) =>
                      m.type === markType && m.attrs.threadId === threadId
                  )
                ) {
                  markEnd = nextPos + nextNode.nodeSize;
                  nextPos = nextPos + nextNode.nodeSize;
                  nextNode = state.doc.nodeAt(nextPos);
                }

                seen.add(threadId);

                // Create a widget decoration showing the replacement text after the original
                const replacement = mark.attrs.replacement as string;
                if (replacement) {
                  const isMultiBlock = replacement.includes('\n\n');
                  const widget = Decoration.widget(markEnd, () => {
                    const el = document.createElement(isMultiBlock ? 'div' : 'span');
                    el.className = isMultiBlock
                      ? 'suggestion-replacement suggestion-replacement-block'
                      : 'suggestion-replacement';
                    el.setAttribute('data-thread-id', threadId);

                    if (isMultiBlock) {
                      // Render each paragraph as its own element
                      const paragraphs = replacement.split(/\n\n+/).filter(Boolean);
                      for (const para of paragraphs) {
                        const trimmed = para.trim();
                        const p = document.createElement('p');

                        // Headings
                        const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)/);
                        if (headingMatch) {
                          p.style.fontWeight = '700';
                          p.style.fontSize = headingMatch[1].length <= 2 ? '1.2em' : '1em';
                          p.style.marginTop = '0.8em';
                          p.textContent = headingMatch[2].replace(/\\([.!#*_~`[\]()>+-])/g, '$1');
                          el.appendChild(p);
                          continue;
                        }

                        // HR
                        if (trimmed === '---') {
                          const hr = document.createElement('hr');
                          hr.style.border = 'none';
                          hr.style.borderTop = '1px solid #86efac';
                          hr.style.margin = '0.5em 0';
                          el.appendChild(hr);
                          continue;
                        }

                        // List items
                        if (trimmed.startsWith('- ')) {
                          const ul = document.createElement('ul');
                          ul.style.paddingLeft = '1.2em';
                          ul.style.margin = '0.3em 0';
                          for (const line of trimmed.split('\n')) {
                            const li = document.createElement('li');
                            li.textContent = line.replace(/^-\s+/, '');
                            ul.appendChild(li);
                          }
                          el.appendChild(ul);
                          continue;
                        }

                        // Regular paragraph — handle bold markers
                        p.innerHTML = trimmed
                          .replace(/\\([.!#*_~`[\]()>+-])/g, '$1')
                          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                          .replace(/`([^`]+)`/g, '<code>$1</code>');
                        el.appendChild(p);
                      }
                    } else {
                      // Simple inline replacement
                      el.textContent = replacement
                        .replace(/\\([.!#*_~`[\]()>+-])/g, '$1');
                    }

                    return el;
                  }, { side: 1 });
                  decorations.push(widget);
                }
              }
            });

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

export default SuggestionHighlight;
