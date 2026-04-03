import { ItemView, WorkspaceLeaf, MarkdownView, setIcon } from "obsidian";
import type MDCommentsPlugin from "./main";
import type { Thread, Comment } from "./types";

export const SIDEBAR_VIEW_TYPE = "mdcomments-sidebar";

export class CommentsSidebarView extends ItemView {
	plugin: MDCommentsPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: MDCommentsPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return SIDEBAR_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Comments";
	}

	getIcon(): string {
		return "message-square";
	}

	async onOpen(): Promise<void> {
		this.render();
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
	}

	public render(): void {
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

		// Read sidecar async and render
		this.app.vault.cachedRead(sidecarFile as any).then((raw) => {
			let sidecar;
			try {
				sidecar = JSON.parse(raw);
			} catch {
				const err = container.createDiv({ cls: "mdcomments-empty" });
				err.setText("Failed to parse comments file.");
				return;
			}

			const threads = sidecar.threads as Record<string, Thread>;
			const entries = Object.entries(threads);

			if (entries.length === 0) {
				const empty = container.createDiv({ cls: "mdcomments-empty" });
				empty.setText("No comment threads.");
				return;
			}

			// Header
			const header = container.createDiv({ cls: "mdcomments-header" });
			header.createEl("h4", { text: `Comments (${entries.length})` });

			// Filter buttons
			const filters = header.createDiv({ cls: "mdcomments-filters" });
			const showAll = filters.createEl("button", {
				text: "All",
				cls: "mdcomments-filter-btn active",
			});
			const showOpen = filters.createEl("button", {
				text: "Open",
				cls: "mdcomments-filter-btn",
			});
			const showResolved = filters.createEl("button", {
				text: "Resolved",
				cls: "mdcomments-filter-btn",
			});

			const threadContainer = container.createDiv({
				cls: "mdcomments-threads",
			});

			const renderThreads = (filter: "all" | "open" | "resolved") => {
				threadContainer.empty();
				const filtered = entries.filter(([, t]) => {
					if (filter === "all") return true;
					if (filter === "open") return t.status === "open";
					return t.status === "resolved";
				});

				if (filtered.length === 0) {
					threadContainer.createDiv({
						cls: "mdcomments-empty",
						text: `No ${filter} threads.`,
					});
					return;
				}

				for (const [id, thread] of filtered) {
					this.renderThread(threadContainer, id, thread);
				}
			};

			const setActive = (btn: HTMLElement) => {
				[showAll, showOpen, showResolved].forEach((b) =>
					b.removeClass("active")
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

	private renderThread(
		parent: HTMLElement,
		threadId: string,
		thread: Thread
	): void {
		const card = parent.createDiv({ cls: "mdcomments-thread-card" });

		// Status badge
		const headerRow = card.createDiv({ cls: "mdcomments-thread-header" });

		const badge = headerRow.createSpan({
			cls: `mdcomments-badge mdcomments-badge-${thread.status}`,
			text: thread.status,
		});

		const typeLabel = headerRow.createSpan({
			cls: "mdcomments-type-label",
			text: thread.type,
		});

		const idLabel = headerRow.createSpan({
			cls: "mdcomments-thread-id",
			text: threadId,
		});

		// Selection / suggestion context
		if (thread.type === "comment" && thread.selection) {
			const selBlock = card.createDiv({ cls: "mdcomments-selection" });
			const quoteIcon = selBlock.createSpan({ cls: "mdcomments-quote-icon" });
			setIcon(quoteIcon, "quote");
			selBlock.createSpan({
				cls: "mdcomments-selection-text",
				text:
					thread.selection.length > 120
						? thread.selection.slice(0, 120) + "..."
						: thread.selection,
			});
		}

		if (thread.type === "suggestion" && thread.suggestion) {
			const sugBlock = card.createDiv({ cls: "mdcomments-suggestion-block" });
			const delLine = sugBlock.createDiv({ cls: "mdcomments-diff-del" });
			delLine.createSpan({ text: "- " });
			delLine.createSpan({
				text:
					thread.suggestion.original.length > 100
						? thread.suggestion.original.slice(0, 100) + "..."
						: thread.suggestion.original,
			});
			const addLine = sugBlock.createDiv({ cls: "mdcomments-diff-add" });
			addLine.createSpan({ text: "+ " });
			addLine.createSpan({
				text:
					thread.suggestion.replacement.length > 100
						? thread.suggestion.replacement.slice(0, 100) + "..."
						: thread.suggestion.replacement,
			});
		}

		// Comments
		for (const comment of thread.comments) {
			this.renderComment(card, comment);
		}

		// Click to scroll to marker in editor
		card.addEventListener("click", () => {
			this.scrollToMarker(threadId);
		});
	}

	private renderComment(parent: HTMLElement, comment: Comment): void {
		const el = parent.createDiv({ cls: "mdcomments-comment" });

		const meta = el.createDiv({ cls: "mdcomments-comment-meta" });
		const authorEl = meta.createSpan({
			cls: `mdcomments-author mdcomments-author-${comment.authorType}`,
			text: comment.author,
		});

		const date = new Date(comment.timestamp);
		meta.createSpan({
			cls: "mdcomments-timestamp",
			text: date.toLocaleDateString(undefined, {
				month: "short",
				day: "numeric",
				year: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			}),
		});

		el.createDiv({
			cls: "mdcomments-comment-body",
			text: comment.body,
		});
	}

	private scrollToMarker(threadId: string): void {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) return;

		const editor = view.editor;
		const content = editor.getValue();

		// Search for comment marker {>>threadId}
		const commentPattern = `{>>${threadId}}`;
		let idx = content.indexOf(commentPattern);

		if (idx === -1) {
			// Search for suggestion marker containing threadId
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
}
