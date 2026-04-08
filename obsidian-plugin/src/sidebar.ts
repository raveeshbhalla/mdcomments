import { ItemView, WorkspaceLeaf, MarkdownView, TFile, setIcon } from "obsidian";
import type MDCommentsPlugin from "./main";
import type { Thread, Comment, SidecarFile } from "./types";
import { generateCommentId } from "./ids";

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

	/** Get the active md file and its sidecar path */
	private getActivePaths(): { mdFile: TFile; sidecarPath: string } | null {
		const mdFile = this.app.workspace.getActiveFile();
		if (!mdFile || mdFile.extension !== "md") return null;
		return { mdFile, sidecarPath: mdFile.path + ".comments.json" };
	}

	/** Read + parse the sidecar, returning null on failure */
	private async readSidecar(): Promise<{ sidecar: SidecarFile; sidecarPath: string; mdFile: TFile } | null> {
		const paths = this.getActivePaths();
		if (!paths) return null;
		const file = this.app.vault.getAbstractFileByPath(paths.sidecarPath);
		if (!file || !(file instanceof TFile)) return null;
		try {
			const raw = await this.app.vault.read(file);
			const sidecar = JSON.parse(raw) as SidecarFile;
			return { sidecar, sidecarPath: paths.sidecarPath, mdFile: paths.mdFile };
		} catch {
			return null;
		}
	}

	/** Write the sidecar back to disk */
	private async writeSidecar(sidecarPath: string, sidecar: SidecarFile): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(sidecarPath);
		if (file && file instanceof TFile) {
			await this.app.vault.modify(file, JSON.stringify(sidecar, null, 2) + "\n");
		}
	}

	public render(): void {
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

		this.app.vault.cachedRead(sidecarFile as TFile).then((raw) => {
			let sidecar: SidecarFile;
			try {
				sidecar = JSON.parse(raw);
			} catch {
				container.createDiv({ cls: "mdcomments-empty", text: "Failed to parse comments file." });
				return;
			}

			const entries = Object.entries(sidecar.threads);
			if (entries.length === 0) {
				container.createDiv({ cls: "mdcomments-empty", text: "No comment threads." });
				return;
			}

			// Header
			const header = container.createDiv({ cls: "mdcomments-header" });
			header.createEl("h4", { text: `Comments (${entries.length})` });

			// Filter buttons
			const filters = header.createDiv({ cls: "mdcomments-filters" });
			const showAll = filters.createEl("button", { text: "All", cls: "mdcomments-filter-btn active" });
			const showOpen = filters.createEl("button", { text: "Open", cls: "mdcomments-filter-btn" });
			const showResolved = filters.createEl("button", { text: "Resolved", cls: "mdcomments-filter-btn" });

			const threadContainer = container.createDiv({ cls: "mdcomments-threads" });

			let currentFilter: "all" | "open" | "resolved" = "all";

			const renderThreads = (filter: "all" | "open" | "resolved") => {
				currentFilter = filter;
				threadContainer.empty();
				const filtered = entries.filter(([, t]) => {
					if (filter === "all") return true;
					if (filter === "open") return t.status === "open";
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

			const setActive = (btn: HTMLElement) => {
				[showAll, showOpen, showResolved].forEach((b) => b.removeClass("active"));
				btn.addClass("active");
			};

			showAll.addEventListener("click", () => { setActive(showAll); renderThreads("all"); });
			showOpen.addEventListener("click", () => { setActive(showOpen); renderThreads("open"); });
			showResolved.addEventListener("click", () => { setActive(showResolved); renderThreads("resolved"); });

			renderThreads("all");
		});
	}

	private renderThread(parent: HTMLElement, threadId: string, thread: Thread): void {
		const card = parent.createDiv({ cls: "mdcomments-thread-card" });

		// Header row with status badge
		const headerRow = card.createDiv({ cls: "mdcomments-thread-header" });
		headerRow.createSpan({ cls: `mdcomments-badge mdcomments-badge-${thread.status}`, text: thread.status });
		headerRow.createSpan({ cls: "mdcomments-type-label", text: thread.type });
		headerRow.createSpan({ cls: "mdcomments-thread-id", text: threadId });

		// Selection / suggestion context
		if (thread.type === "comment" && thread.selection) {
			const selBlock = card.createDiv({ cls: "mdcomments-selection" });
			const quoteIcon = selBlock.createSpan({ cls: "mdcomments-quote-icon" });
			setIcon(quoteIcon, "quote");
			selBlock.createSpan({
				cls: "mdcomments-selection-text",
				text: thread.selection.length > 120 ? thread.selection.slice(0, 120) + "..." : thread.selection,
			});
		}

		if (thread.type === "suggestion" && thread.suggestion) {
			const sugBlock = card.createDiv({ cls: "mdcomments-suggestion-block" });
			const delLine = sugBlock.createDiv({ cls: "mdcomments-diff-del" });
			delLine.createSpan({ text: "- " });
			delLine.createSpan({
				text: thread.suggestion.original.length > 100 ? thread.suggestion.original.slice(0, 100) + "..." : thread.suggestion.original,
			});
			const addLine = sugBlock.createDiv({ cls: "mdcomments-diff-add" });
			addLine.createSpan({ text: "+ " });
			addLine.createSpan({
				text: thread.suggestion.replacement.length > 100 ? thread.suggestion.replacement.slice(0, 100) + "..." : thread.suggestion.replacement,
			});
		}

		// Comments
		for (const comment of thread.comments) {
			this.renderComment(card, comment);
		}

		// --- Action buttons row ---
		const actions = card.createDiv({ cls: "mdcomments-actions" });

		// Resolve button (only for open threads)
		if (thread.status === "open") {
			const resolveBtn = actions.createEl("button", {
				cls: "mdcomments-action-btn mdcomments-resolve-btn",
				text: "Resolve",
			});
			const checkIcon = resolveBtn.createSpan({ cls: "mdcomments-btn-icon" });
			setIcon(checkIcon, "check");
			resolveBtn.prepend(checkIcon);
			resolveBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				this.resolveThread(threadId);
			});
		}

		// --- Reply input (only for open threads) ---
		if (thread.status === "open") {
			const replyArea = card.createDiv({ cls: "mdcomments-reply-area" });
			const replyInput = replyArea.createEl("textarea", {
				cls: "mdcomments-reply-input",
				attr: { placeholder: "Write a reply...", rows: "2" },
			});
			const replyBtn = replyArea.createEl("button", {
				cls: "mdcomments-action-btn mdcomments-reply-btn",
				text: "Reply",
			});

			// Prevent card click-to-scroll when interacting with reply area
			replyInput.addEventListener("click", (e) => e.stopPropagation());
			replyBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				const body = replyInput.value.trim();
				if (body) {
					this.addReply(threadId, body);
				}
			});
			// Ctrl/Cmd+Enter to submit
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

		// Click card to scroll to marker
		card.addEventListener("click", () => {
			this.scrollToMarker(threadId);
		});
	}

	private renderComment(parent: HTMLElement, comment: Comment): void {
		const el = parent.createDiv({ cls: "mdcomments-comment" });
		const meta = el.createDiv({ cls: "mdcomments-comment-meta" });
		meta.createSpan({
			cls: `mdcomments-author mdcomments-author-${comment.authorType}`,
			text: comment.author,
		});

		const date = new Date(comment.timestamp);
		meta.createSpan({
			cls: "mdcomments-timestamp",
			text: date.toLocaleDateString(undefined, {
				month: "short", day: "numeric", year: "numeric",
				hour: "2-digit", minute: "2-digit",
			}),
		});

		el.createDiv({ cls: "mdcomments-comment-body", text: comment.body });
	}

	/** Add a reply to a thread and persist to sidecar */
	private async addReply(threadId: string, body: string): Promise<void> {
		const data = await this.readSidecar();
		if (!data) return;

		const thread = data.sidecar.threads[threadId];
		if (!thread) return;

		const newComment: Comment = {
			id: generateCommentId(),
			author: "Vault User",
			authorType: "human",
			timestamp: new Date().toISOString(),
			body,
		};
		thread.comments.push(newComment);

		await this.writeSidecar(data.sidecarPath, data.sidecar);
		this.render();
	}

	/** Resolve a thread: update sidecar status + remove marker from md file */
	private async resolveThread(threadId: string): Promise<void> {
		const data = await this.readSidecar();
		if (!data) return;

		const thread = data.sidecar.threads[threadId];
		if (!thread) return;

		// Update sidecar
		thread.status = "resolved";
		thread.resolvedAt = new Date().toISOString();
		thread.resolvedBy = "Vault User";
		await this.writeSidecar(data.sidecarPath, data.sidecar);

		// Remove the inline marker from the markdown file
		const mdContent = await this.app.vault.read(data.mdFile);
		let newContent = mdContent;

		if (thread.type === "comment") {
			// Remove {>>threadId}
			newContent = newContent.replace(`{>>${threadId}}`, "");
		} else if (thread.type === "suggestion") {
			// Reject suggestion by default on resolve: replace marker with original text
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

	private scrollToMarker(threadId: string): void {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) return;

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
}
