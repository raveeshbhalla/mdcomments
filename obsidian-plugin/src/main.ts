import {
	Plugin, WorkspaceLeaf, TFile, MarkdownView,
	Menu, Editor, MarkdownPostProcessorContext,
} from "obsidian";
import { CommentsSidebarView, SIDEBAR_VIEW_TYPE } from "./sidebar";
import { commentsEditorPlugin, commentsGutter } from "./decorations";
import { generateThreadId, generateCommentId } from "./ids";
import type { SidecarFile, Comment as MdComment } from "./types";
import { AddCommentModal } from "./addCommentModal";

export default class MDCommentsPlugin extends Plugin {
	async onload(): Promise<void> {
		// Register the sidebar view
		this.registerView(SIDEBAR_VIEW_TYPE, (leaf) => {
			return new CommentsSidebarView(leaf, this);
		});

		// Register CodeMirror 6 extensions for editor decorations
		this.registerEditorExtension([commentsEditorPlugin, commentsGutter]);

		// Register reading-mode post-processor to hide markers
		this.registerMarkdownPostProcessor(this.stripMarkersPostProcessor.bind(this));

		// Command to open the comments sidebar
		this.addCommand({
			id: "open-comments-sidebar",
			name: "Open comments sidebar",
			callback: () => {
				this.activateSidebar();
			},
		});

		// Command to add a comment on selected text
		this.addCommand({
			id: "add-comment",
			name: "Add comment on selection",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.promptAddComment(editor, view);
			},
		});

		// Right-click context menu
		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor, view: MarkdownView) => {
				const selection = editor.getSelection();
				if (selection && selection.length > 0) {
					menu.addItem((item) => {
						item.setTitle("Add comment")
							.setIcon("message-square")
							.onClick(() => {
								this.promptAddComment(editor, view);
							});
					});
				}
			})
		);

		// Ribbon icon
		this.addRibbonIcon("message-square", "MDComments", () => {
			this.activateSidebar();
		});

		// Refresh sidebar when the active file changes
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				this.refreshSidebar();
			})
		);

		// Refresh sidebar when files are modified (catches sidecar file changes)
		this.registerEvent(
			this.app.vault.on("modify", (file) => {
				if (file instanceof TFile && file.path.endsWith(".comments.json")) {
					this.refreshSidebar();
				}
			})
		);

		this.registerEvent(
			this.app.vault.on("create", (file) => {
				if (file instanceof TFile && file.path.endsWith(".comments.json")) {
					this.refreshSidebar();
				}
			})
		);
		this.registerEvent(
			this.app.vault.on("delete", (file) => {
				if (file instanceof TFile && file.path.endsWith(".comments.json")) {
					this.refreshSidebar();
				}
			})
		);

		// Open sidebar on startup
		this.app.workspace.onLayoutReady(() => {
			this.activateSidebar();
		});
	}

	onunload(): void {
		this.app.workspace.detachLeavesOfType(SIDEBAR_VIEW_TYPE);
	}

	/**
	 * Markdown post-processor: strips mdcomments markers from rendered
	 * (reading / live-preview) output so readers see clean text.
	 */
	private stripMarkersPostProcessor(
		el: HTMLElement,
		_ctx: MarkdownPostProcessorContext
	): void {
		// Walk all text nodes and strip marker syntax
		const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
		const nodesToReplace: { node: Text; newText: string }[] = [];

		let node: Text | null;
		while ((node = walker.nextNode() as Text | null)) {
			const text = node.textContent ?? "";
			// Strip comment markers {>>ID}
			let cleaned = text.replace(/\{>>([a-zA-Z0-9_-]+)\}/g, "");
			// Strip suggestion markers - replace with original text
			cleaned = cleaned.replace(
				/\{~~((?:[^~]|~(?!>))*?)~>((?:[^~]|~(?!~[a-zA-Z0-9_-]+\}))*?)~~([a-zA-Z0-9_-]+)\}/g,
				(_m, orig) => orig
			);
			if (cleaned !== text) {
				nodesToReplace.push({ node, newText: cleaned });
			}
		}

		for (const { node, newText } of nodesToReplace) {
			node.textContent = newText;
		}
	}

	/**
	 * Show a modal to type a comment, then insert the marker and sidecar entry.
	 */
	promptAddComment(editor: Editor, view: MarkdownView): void {
		const selection = editor.getSelection();
		if (!selection || selection.length === 0) return;

		new AddCommentModal(this.app, async (commentBody) => {
			await this.insertComment(editor, view, selection, commentBody);
		}).open();
	}

	/**
	 * Insert a comment marker into the document and create the sidecar entry.
	 */
	private async insertComment(
		editor: Editor,
		view: MarkdownView,
		selection: string,
		commentBody: string,
	): Promise<void> {
		const file = view.file;
		if (!file) return;

		const threadId = generateThreadId();
		const commentId = generateCommentId();

		// Insert marker before the selection in the document
		const from = editor.getCursor("from");
		const marker = `{>>${threadId}}`;
		editor.replaceRange(marker, from);

		// Read or create sidecar
		const sidecarPath = file.path + ".comments.json";
		let sidecar: SidecarFile;
		const sidecarFile = this.app.vault.getAbstractFileByPath(sidecarPath);
		if (sidecarFile && sidecarFile instanceof TFile) {
			try {
				const raw = await this.app.vault.read(sidecarFile);
				sidecar = JSON.parse(raw);
			} catch {
				sidecar = { schema: "mdcomments/0.1", threads: {} };
			}
		} else {
			sidecar = { schema: "mdcomments/0.1", threads: {} };
		}

		// Add the new thread
		const newComment: MdComment = {
			id: commentId,
			author: "Vault User",
			authorType: "human",
			timestamp: new Date().toISOString(),
			body: commentBody,
		};

		sidecar.threads[threadId] = {
			type: "comment",
			status: "open",
			createdAt: new Date().toISOString(),
			selection,
			resolvedAt: null,
			resolvedBy: null,
			comments: [newComment],
		};

		// Write sidecar
		const sidecarContent = JSON.stringify(sidecar, null, 2) + "\n";
		if (sidecarFile && sidecarFile instanceof TFile) {
			await this.app.vault.modify(sidecarFile, sidecarContent);
		} else {
			await this.app.vault.create(sidecarPath, sidecarContent);
		}

		this.refreshSidebar();
	}

	async activateSidebar(): Promise<void> {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null = null;
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

	refreshSidebar(): void {
		const leaves = this.app.workspace.getLeavesOfType(SIDEBAR_VIEW_TYPE);
		for (const leaf of leaves) {
			const view = leaf.view;
			if (view instanceof CommentsSidebarView) {
				view.render();
			}
		}
	}
}
