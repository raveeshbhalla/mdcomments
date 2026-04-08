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
var import_obsidian3 = require("obsidian");

// src/sidebar.ts
var import_obsidian = require("obsidian");

// src/ids.ts
var ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
function randomId(length) {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return result;
}
function generateThreadId() {
  return randomId(8);
}
function generateCommentId() {
  return `c_${randomId(8)}`;
}

// src/sidebar.ts
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
  /** Get the active md file and its sidecar path */
  getActivePaths() {
    const mdFile = this.app.workspace.getActiveFile();
    if (!mdFile || mdFile.extension !== "md")
      return null;
    return { mdFile, sidecarPath: mdFile.path + ".comments.json" };
  }
  /** Read + parse the sidecar, returning null on failure */
  async readSidecar() {
    const paths = this.getActivePaths();
    if (!paths)
      return null;
    const file = this.app.vault.getAbstractFileByPath(paths.sidecarPath);
    if (!file || !(file instanceof import_obsidian.TFile))
      return null;
    try {
      const raw = await this.app.vault.read(file);
      const sidecar = JSON.parse(raw);
      return { sidecar, sidecarPath: paths.sidecarPath, mdFile: paths.mdFile };
    } catch (e) {
      return null;
    }
  }
  /** Write the sidecar back to disk */
  async writeSidecar(sidecarPath, sidecar) {
    const file = this.app.vault.getAbstractFileByPath(sidecarPath);
    if (file && file instanceof import_obsidian.TFile) {
      await this.app.vault.modify(file, JSON.stringify(sidecar, null, 2) + "\n");
    }
  }
  render() {
    const container = this.contentEl;
    container.empty();
    container.addClass("mdcomments-sidebar");
    const paths = this.getActivePaths();
    if (!paths) {
      container.createDiv({ cls: "mdcomments-empty", text: "Open a markdown file to see comments." });
      return;
    }
    const sidecarFile = this.app.vault.getAbstractFileByPath(paths.sidecarPath);
    if (!sidecarFile) {
      container.createDiv({ cls: "mdcomments-empty", text: "No comments found for this file." });
      return;
    }
    this.app.vault.cachedRead(sidecarFile).then((raw) => {
      let sidecar;
      try {
        sidecar = JSON.parse(raw);
      } catch (e) {
        container.createDiv({ cls: "mdcomments-empty", text: "Failed to parse comments file." });
        return;
      }
      const entries = Object.entries(sidecar.threads);
      if (entries.length === 0) {
        container.createDiv({ cls: "mdcomments-empty", text: "No comment threads." });
        return;
      }
      const header = container.createDiv({ cls: "mdcomments-header" });
      header.createEl("h4", { text: `Comments (${entries.length})` });
      const filters = header.createDiv({ cls: "mdcomments-filters" });
      const showAll = filters.createEl("button", { text: "All", cls: "mdcomments-filter-btn active" });
      const showOpen = filters.createEl("button", { text: "Open", cls: "mdcomments-filter-btn" });
      const showResolved = filters.createEl("button", { text: "Resolved", cls: "mdcomments-filter-btn" });
      const threadContainer = container.createDiv({ cls: "mdcomments-threads" });
      let currentFilter = "all";
      const renderThreads = (filter) => {
        currentFilter = filter;
        threadContainer.empty();
        const filtered = entries.filter(([, t]) => {
          if (filter === "all")
            return true;
          if (filter === "open")
            return t.status === "open";
          return t.status === "resolved";
        });
        if (filtered.length === 0) {
          threadContainer.createDiv({ cls: "mdcomments-empty", text: `No ${filter} threads.` });
          return;
        }
        for (const [id, thread] of filtered) {
          this.renderThread(threadContainer, id, thread);
        }
      };
      const setActive = (btn) => {
        [showAll, showOpen, showResolved].forEach((b) => b.removeClass("active"));
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
    headerRow.createSpan({ cls: `mdcomments-badge mdcomments-badge-${thread.status}`, text: thread.status });
    headerRow.createSpan({ cls: "mdcomments-type-label", text: thread.type });
    headerRow.createSpan({ cls: "mdcomments-thread-id", text: threadId });
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
    const actions = card.createDiv({ cls: "mdcomments-actions" });
    if (thread.status === "open") {
      const resolveBtn = actions.createEl("button", {
        cls: "mdcomments-action-btn mdcomments-resolve-btn",
        text: "Resolve"
      });
      const checkIcon = resolveBtn.createSpan({ cls: "mdcomments-btn-icon" });
      (0, import_obsidian.setIcon)(checkIcon, "check");
      resolveBtn.prepend(checkIcon);
      resolveBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.resolveThread(threadId);
      });
    }
    if (thread.status === "open") {
      const replyArea = card.createDiv({ cls: "mdcomments-reply-area" });
      const replyInput = replyArea.createEl("textarea", {
        cls: "mdcomments-reply-input",
        attr: { placeholder: "Write a reply...", rows: "2" }
      });
      const replyBtn = replyArea.createEl("button", {
        cls: "mdcomments-action-btn mdcomments-reply-btn",
        text: "Reply"
      });
      replyInput.addEventListener("click", (e) => e.stopPropagation());
      replyBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const body = replyInput.value.trim();
        if (body) {
          this.addReply(threadId, body);
        }
      });
      replyInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          e.stopPropagation();
          const body = replyInput.value.trim();
          if (body) {
            this.addReply(threadId, body);
          }
        }
      });
    }
    card.addEventListener("click", () => {
      this.scrollToMarker(threadId);
    });
  }
  renderComment(parent, comment) {
    const el = parent.createDiv({ cls: "mdcomments-comment" });
    const meta = el.createDiv({ cls: "mdcomments-comment-meta" });
    meta.createSpan({
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
    el.createDiv({ cls: "mdcomments-comment-body", text: comment.body });
  }
  /** Add a reply to a thread and persist to sidecar */
  async addReply(threadId, body) {
    const data = await this.readSidecar();
    if (!data)
      return;
    const thread = data.sidecar.threads[threadId];
    if (!thread)
      return;
    const newComment = {
      id: generateCommentId(),
      author: "Vault User",
      authorType: "human",
      timestamp: new Date().toISOString(),
      body
    };
    thread.comments.push(newComment);
    await this.writeSidecar(data.sidecarPath, data.sidecar);
    this.render();
  }
  /** Resolve a thread: update sidecar status + remove marker from md file */
  async resolveThread(threadId) {
    const data = await this.readSidecar();
    if (!data)
      return;
    const thread = data.sidecar.threads[threadId];
    if (!thread)
      return;
    thread.status = "resolved";
    thread.resolvedAt = new Date().toISOString();
    thread.resolvedBy = "Vault User";
    await this.writeSidecar(data.sidecarPath, data.sidecar);
    const mdContent = await this.app.vault.read(data.mdFile);
    let newContent = mdContent;
    if (thread.type === "comment") {
      newContent = newContent.replace(`{>>${threadId}}`, "");
    } else if (thread.type === "suggestion") {
      const escapedId = threadId.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      const re = new RegExp(
        `(?<!\\\\)\\{~~((?:[^~]|~(?!>)|\\\\~>)*?)~>((?:[^~]|~(?!~\\})|~(?!~${escapedId}\\}))*?)~~${escapedId}\\}`,
        "g"
      );
      newContent = newContent.replace(re, (_match, orig) => {
        return orig.replace(/\\{>>/g, "{>>").replace(/\\{~~/g, "{~~").replace(/\\~>/g, "~>").replace(/\\~~\}/g, "~~}");
      });
    }
    if (newContent !== mdContent) {
      await this.app.vault.modify(data.mdFile, newContent);
    }
    this.render();
  }
  scrollToMarker(threadId) {
    const view = this.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView);
    if (!view)
      return;
    const editor = view.editor;
    const content = editor.getValue();
    let idx = content.indexOf(`{>>${threadId}}`);
    if (idx === -1) {
      idx = content.indexOf(`~~${threadId}}`);
    }
    if (idx >= 0) {
      const pos = editor.offsetToPos(idx);
      editor.setCursor(pos);
      editor.scrollIntoView({ from: pos, to: pos }, true);
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

// src/addCommentModal.ts
var import_obsidian2 = require("obsidian");
var AddCommentModal = class extends import_obsidian2.Modal {
  constructor(app, onSubmit) {
    super(app);
    this.onSubmit = onSubmit;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("mdcomments-modal");
    contentEl.createEl("h3", { text: "Add comment" });
    const textarea = contentEl.createEl("textarea", {
      cls: "mdcomments-modal-input",
      attr: { placeholder: "Write your comment...", rows: "4" }
    });
    const btnRow = contentEl.createDiv({ cls: "mdcomments-modal-buttons" });
    const cancelBtn = btnRow.createEl("button", { text: "Cancel" });
    const submitBtn = btnRow.createEl("button", {
      text: "Add comment",
      cls: "mod-cta"
    });
    cancelBtn.addEventListener("click", () => this.close());
    submitBtn.addEventListener("click", () => {
      const body = textarea.value.trim();
      if (body) {
        this.onSubmit(body);
        this.close();
      }
    });
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const body = textarea.value.trim();
        if (body) {
          this.onSubmit(body);
          this.close();
        }
      }
    });
    setTimeout(() => textarea.focus(), 10);
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/main.ts
var MDCommentsPlugin = class extends import_obsidian3.Plugin {
  async onload() {
    this.registerView(SIDEBAR_VIEW_TYPE, (leaf) => {
      return new CommentsSidebarView(leaf, this);
    });
    this.registerEditorExtension([commentsEditorPlugin, commentsGutter]);
    this.registerMarkdownPostProcessor(this.stripMarkersPostProcessor.bind(this));
    this.addCommand({
      id: "open-comments-sidebar",
      name: "Open comments sidebar",
      callback: () => {
        this.activateSidebar();
      }
    });
    this.addCommand({
      id: "add-comment",
      name: "Add comment on selection",
      editorCallback: (editor, view) => {
        this.promptAddComment(editor, view);
      }
    });
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor, view) => {
        const selection = editor.getSelection();
        if (selection && selection.length > 0) {
          menu.addItem((item) => {
            item.setTitle("Add comment").setIcon("message-square").onClick(() => {
              this.promptAddComment(editor, view);
            });
          });
        }
      })
    );
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
        if (file instanceof import_obsidian3.TFile && file.path.endsWith(".comments.json")) {
          this.refreshSidebar();
        }
      })
    );
    this.registerEvent(
      this.app.vault.on("create", (file) => {
        if (file instanceof import_obsidian3.TFile && file.path.endsWith(".comments.json")) {
          this.refreshSidebar();
        }
      })
    );
    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        if (file instanceof import_obsidian3.TFile && file.path.endsWith(".comments.json")) {
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
  /**
   * Markdown post-processor: strips mdcomments markers from rendered
   * (reading / live-preview) output so readers see clean text.
   */
  stripMarkersPostProcessor(el, _ctx) {
    var _a;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodesToReplace = [];
    let node;
    while (node = walker.nextNode()) {
      const text = (_a = node.textContent) != null ? _a : "";
      let cleaned = text.replace(/\{>>([a-zA-Z0-9_-]+)\}/g, "");
      cleaned = cleaned.replace(
        /\{~~((?:[^~]|~(?!>))*?)~>((?:[^~]|~(?!~[a-zA-Z0-9_-]+\}))*?)~~([a-zA-Z0-9_-]+)\}/g,
        (_m, orig) => orig
      );
      if (cleaned !== text) {
        nodesToReplace.push({ node, newText: cleaned });
      }
    }
    for (const { node: node2, newText } of nodesToReplace) {
      node2.textContent = newText;
    }
  }
  /**
   * Show a modal to type a comment, then insert the marker and sidecar entry.
   */
  promptAddComment(editor, view) {
    const selection = editor.getSelection();
    if (!selection || selection.length === 0)
      return;
    new AddCommentModal(this.app, async (commentBody) => {
      await this.insertComment(editor, view, selection, commentBody);
    }).open();
  }
  /**
   * Insert a comment marker into the document and create the sidecar entry.
   */
  async insertComment(editor, view, selection, commentBody) {
    const file = view.file;
    if (!file)
      return;
    const threadId = generateThreadId();
    const commentId = generateCommentId();
    const from = editor.getCursor("from");
    const marker = `{>>${threadId}}`;
    editor.replaceRange(marker, from);
    const sidecarPath = file.path + ".comments.json";
    let sidecar;
    const sidecarFile = this.app.vault.getAbstractFileByPath(sidecarPath);
    if (sidecarFile && sidecarFile instanceof import_obsidian3.TFile) {
      try {
        const raw = await this.app.vault.read(sidecarFile);
        sidecar = JSON.parse(raw);
      } catch (e) {
        sidecar = { schema: "mdcomments/0.1", threads: {} };
      }
    } else {
      sidecar = { schema: "mdcomments/0.1", threads: {} };
    }
    const newComment = {
      id: commentId,
      author: "Vault User",
      authorType: "human",
      timestamp: new Date().toISOString(),
      body: commentBody
    };
    sidecar.threads[threadId] = {
      type: "comment",
      status: "open",
      createdAt: new Date().toISOString(),
      selection,
      resolvedAt: null,
      resolvedBy: null,
      comments: [newComment]
    };
    const sidecarContent = JSON.stringify(sidecar, null, 2) + "\n";
    if (sidecarFile && sidecarFile instanceof import_obsidian3.TFile) {
      await this.app.vault.modify(sidecarFile, sidecarContent);
    } else {
      await this.app.vault.create(sidecarPath, sidecarContent);
    }
    this.refreshSidebar();
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
        await leaf.setViewState({ type: SIDEBAR_VIEW_TYPE, active: true });
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
