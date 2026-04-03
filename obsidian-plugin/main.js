var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => MDCommentsPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");

// src/sidebar.ts
var import_obsidian = require("obsidian");
var SIDEBAR_VIEW_TYPE = "mdcomments-sidebar";
var CommentsSidebarView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }
  getViewType() {
    return SIDEBAR_VIEW_TYPE;
  }
  getDisplayText() {
    return "Comments";
  }
  getIcon() {
    return "message-square";
  }
  async onOpen() {
    this.render();
  }
  async onClose() {
    this.contentEl.empty();
  }
  render() {
    const container = this.contentEl;
    container.empty();
    container.addClass("mdcomments-sidebar");
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile || activeFile.extension !== "md") {
      const empty = container.createDiv({ cls: "mdcomments-empty" });
      empty.setText("Open a markdown file to see comments.");
      return;
    }
    const sidecarPath = activeFile.path + ".comments.json";
    const sidecarFile = this.app.vault.getAbstractFileByPath(sidecarPath);
    if (!sidecarFile) {
      const empty = container.createDiv({ cls: "mdcomments-empty" });
      empty.setText("No comments found for this file.");
      return;
    }
    this.app.vault.cachedRead(sidecarFile).then((raw) => {
      let sidecar;
      try {
        sidecar = JSON.parse(raw);
      } catch (e) {
        const err = container.createDiv({ cls: "mdcomments-empty" });
        err.setText("Failed to parse comments file.");
        return;
      }
      const threads = sidecar.threads;
      const entries = Object.entries(threads);
      if (entries.length === 0) {
        const empty = container.createDiv({ cls: "mdcomments-empty" });
        empty.setText("No comment threads.");
        return;
      }
      const header = container.createDiv({ cls: "mdcomments-header" });
      header.createEl("h4", { text: `Comments (${entries.length})` });
      const filters = header.createDiv({ cls: "mdcomments-filters" });
      const showAll = filters.createEl("button", {
        text: "All",
        cls: "mdcomments-filter-btn active"
      });
      const showOpen = filters.createEl("button", {
        text: "Open",
        cls: "mdcomments-filter-btn"
      });
      const showResolved = filters.createEl("button", {
        text: "Resolved",
        cls: "mdcomments-filter-btn"
      });
      const threadContainer = container.createDiv({
        cls: "mdcomments-threads"
      });
      const renderThreads = (filter) => {
        threadContainer.empty();
        const filtered = entries.filter(([, t]) => {
          if (filter === "all")
            return true;
          if (filter === "open")
            return t.status === "open";
          return t.status === "resolved";
        });
        if (filtered.length === 0) {
          threadContainer.createDiv({
            cls: "mdcomments-empty",
            text: `No ${filter} threads.`
          });
          return;
        }
        for (const [id, thread] of filtered) {
          this.renderThread(threadContainer, id, thread);
        }
      };
      const setActive = (btn) => {
        [showAll, showOpen, showResolved].forEach(
          (b) => b.removeClass("active")
        );
        btn.addClass("active");
      };
      showAll.addEventListener("click", () => {
        setActive(showAll);
        renderThreads("all");
      });
      showOpen.addEventListener("click", () => {
        setActive(showOpen);
        renderThreads("open");
      });
      showResolved.addEventListener("click", () => {
        setActive(showResolved);
        renderThreads("resolved");
      });
      renderThreads("all");
    });
  }
  renderThread(parent, threadId, thread) {
    const card = parent.createDiv({ cls: "mdcomments-thread-card" });
    const headerRow = card.createDiv({ cls: "mdcomments-thread-header" });
    const badge = headerRow.createSpan({
      cls: `mdcomments-badge mdcomments-badge-${thread.status}`,
      text: thread.status
    });
    const typeLabel = headerRow.createSpan({
      cls: "mdcomments-type-label",
      text: thread.type
    });
    const idLabel = headerRow.createSpan({
      cls: "mdcomments-thread-id",
      text: threadId
    });
    if (thread.type === "comment" && thread.selection) {
      const selBlock = card.createDiv({ cls: "mdcomments-selection" });
      const quoteIcon = selBlock.createSpan({ cls: "mdcomments-quote-icon" });
      (0, import_obsidian.setIcon)(quoteIcon, "quote");
      selBlock.createSpan({
        cls: "mdcomments-selection-text",
        text: thread.selection.length > 120 ? thread.selection.slice(0, 120) + "..." : thread.selection
      });
    }
    if (thread.type === "suggestion" && thread.suggestion) {
      const sugBlock = card.createDiv({ cls: "mdcomments-suggestion-block" });
      const delLine = sugBlock.createDiv({ cls: "mdcomments-diff-del" });
      delLine.createSpan({ text: "- " });
      delLine.createSpan({
        text: thread.suggestion.original.length > 100 ? thread.suggestion.original.slice(0, 100) + "..." : thread.suggestion.original
      });
      const addLine = sugBlock.createDiv({ cls: "mdcomments-diff-add" });
      addLine.createSpan({ text: "+ " });
      addLine.createSpan({
        text: thread.suggestion.replacement.length > 100 ? thread.suggestion.replacement.slice(0, 100) + "..." : thread.suggestion.replacement
      });
    }
    for (const comment of thread.comments) {
      this.renderComment(card, comment);
    }
    card.addEventListener("click", () => {
      this.scrollToMarker(threadId);
    });
  }
  renderComment(parent, comment) {
    const el = parent.createDiv({ cls: "mdcomments-comment" });
    const meta = el.createDiv({ cls: "mdcomments-comment-meta" });
    const authorEl = meta.createSpan({
      cls: `mdcomments-author mdcomments-author-${comment.authorType}`,
      text: comment.author
    });
    const date = new Date(comment.timestamp);
    meta.createSpan({
      cls: "mdcomments-timestamp",
      text: date.toLocaleDateString(void 0, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    });
    el.createDiv({
      cls: "mdcomments-comment-body",
      text: comment.body
    });
  }
  scrollToMarker(threadId) {
    const view = this.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView);
    if (!view)
      return;
    const editor = view.editor;
    const content = editor.getValue();
    const commentPattern = `{>>${threadId}}`;
    let idx = content.indexOf(commentPattern);
    if (idx === -1) {
      const suggestionEndPattern = `~~${threadId}}`;
      idx = content.indexOf(suggestionEndPattern);
    }
    if (idx >= 0) {
      const pos = editor.offsetToPos(idx);
      editor.setCursor(pos);
      editor.scrollIntoView(
        { from: pos, to: pos },
        true
      );
    }
  }
};

// src/decorations.ts
var import_view = require("@codemirror/view");
var import_state = require("@codemirror/state");

// src/parser.ts
var COMMENT_MARKER_RE = /(?<!\\)\{>>([a-zA-Z0-9_-]+)\}/g;
var SUGGESTION_MARKER_RE = /(?<!\\)\{~~((?:[^~]|~(?!>)|\\\~>)*?)~>((?:[^~]|~(?!~\})|~(?!~[a-zA-Z0-9_-]+\}))*?)~~([a-zA-Z0-9_-]+)\}/g;
function unescapeMarkerText(text) {
  return text.replace(/\\{>>/g, "{>>").replace(/\\{~~/g, "{~~").replace(/\\~>/g, "~>").replace(/\\~~\}/g, "~~}");
}
function findCommentMarkers(content) {
  const markers = [];
  const re = new RegExp(COMMENT_MARKER_RE.source, "g");
  let match;
  while ((match = re.exec(content)) !== null) {
    markers.push({
      id: match[1],
      position: match.index,
      markerLength: match[0].length
    });
  }
  return markers;
}
function findSuggestionMarkers(content) {
  const markers = [];
  const re = new RegExp(SUGGESTION_MARKER_RE.source, "g");
  let match;
  while ((match = re.exec(content)) !== null) {
    markers.push({
      id: match[3],
      original: unescapeMarkerText(match[1]),
      replacement: unescapeMarkerText(match[2]),
      position: match.index,
      markerLength: match[0].length
    });
  }
  return markers;
}

// src/decorations.ts
var import_view2 = require("@codemirror/view");
var CommentIconWidget = class extends import_view.WidgetType {
  constructor(threadId) {
    super();
    this.threadId = threadId;
  }
  toDOM() {
    const span = document.createElement("span");
    span.className = "mdcomments-marker-icon mdcomments-comment-icon";
    span.setAttribute("data-thread-id", this.threadId);
    span.textContent = "\u{1F4AC}";
    span.title = `Comment thread: ${this.threadId}`;
    return span;
  }
  eq(other) {
    return this.threadId === other.threadId;
  }
};
function buildDecorations(view) {
  const builder = new import_state.RangeSetBuilder();
  const doc = view.state.doc;
  const text = doc.toString();
  const ranges = [];
  const comments = findCommentMarkers(text);
  for (const marker of comments) {
    const from = marker.position;
    const to = marker.position + marker.markerLength;
    ranges.push({
      from,
      to,
      decoration: import_view.Decoration.mark({ class: "mdcomments-marker-syntax" })
    });
    ranges.push({
      from: to,
      to,
      decoration: import_view.Decoration.widget({
        widget: new CommentIconWidget(marker.id),
        side: 1
      })
    });
    const lineEnd = doc.lineAt(to).to;
    const highlightEnd = Math.min(lineEnd, to + 200);
    if (highlightEnd > to) {
      ranges.push({
        from: to,
        to: highlightEnd,
        decoration: import_view.Decoration.mark({
          class: "mdcomments-highlight-comment",
          attributes: { "data-thread-id": marker.id }
        })
      });
    }
  }
  const suggestions = findSuggestionMarkers(text);
  for (const marker of suggestions) {
    const from = marker.position;
    const to = marker.position + marker.markerLength;
    ranges.push({
      from,
      to,
      decoration: import_view.Decoration.mark({
        class: "mdcomments-highlight-suggestion",
        attributes: { "data-thread-id": marker.id }
      })
    });
  }
  ranges.sort((a, b) => a.from - b.from || a.to - b.to);
  for (const r of ranges) {
    builder.add(r.from, r.to, r.decoration);
  }
  return builder.finish();
}
var commentsEditorPlugin = import_view.ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.decorations = buildDecorations(view);
    }
    update(update) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations
  }
);
var CommentGutterMarker = class extends import_view2.GutterMarker {
  toDOM() {
    return document.createTextNode("\u25C6");
  }
};
var commentGutterMarker = new CommentGutterMarker();
var commentsGutter = (0, import_view2.gutter)({
  class: "mdcomments-gutter",
  lineMarker(view, line) {
    const doc = view.state.doc;
    const lineText = doc.sliceString(line.from, line.to);
    const hasComment = /(?<!\\)\{>>([a-zA-Z0-9_-]+)\}/.test(lineText);
    const hasSuggestion = /(?<!\\)\{~~/.test(lineText);
    if (hasComment || hasSuggestion) {
      return commentGutterMarker;
    }
    return null;
  }
});

// src/main.ts
var MDCommentsPlugin = class extends import_obsidian2.Plugin {
  async onload() {
    this.registerView(SIDEBAR_VIEW_TYPE, (leaf) => {
      return new CommentsSidebarView(leaf, this);
    });
    this.registerEditorExtension([commentsEditorPlugin, commentsGutter]);
    this.addCommand({
      id: "open-comments-sidebar",
      name: "Open comments sidebar",
      callback: () => {
        this.activateSidebar();
      }
    });
    this.addRibbonIcon("message-square", "MDComments", () => {
      this.activateSidebar();
    });
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        this.refreshSidebar();
      })
    );
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (file instanceof import_obsidian2.TFile && file.path.endsWith(".comments.json")) {
          this.refreshSidebar();
        }
      })
    );
    this.registerEvent(
      this.app.vault.on("create", (file) => {
        if (file instanceof import_obsidian2.TFile && file.path.endsWith(".comments.json")) {
          this.refreshSidebar();
        }
      })
    );
    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        if (file instanceof import_obsidian2.TFile && file.path.endsWith(".comments.json")) {
          this.refreshSidebar();
        }
      })
    );
    this.app.workspace.onLayoutReady(() => {
      this.activateSidebar();
    });
  }
  onunload() {
    this.app.workspace.detachLeavesOfType(SIDEBAR_VIEW_TYPE);
  }
  async activateSidebar() {
    const { workspace } = this.app;
    let leaf = null;
    const leaves = workspace.getLeavesOfType(SIDEBAR_VIEW_TYPE);
    if (leaves.length > 0) {
      leaf = leaves[0];
    } else {
      leaf = workspace.getRightLeaf(false);
      if (leaf) {
        await leaf.setViewState({
          type: SIDEBAR_VIEW_TYPE,
          active: true
        });
      }
    }
    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }
  refreshSidebar() {
    const leaves = this.app.workspace.getLeavesOfType(SIDEBAR_VIEW_TYPE);
    for (const leaf of leaves) {
      const view = leaf.view;
      if (view instanceof CommentsSidebarView) {
        view.render();
      }
    }
  }
};
