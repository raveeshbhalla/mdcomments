import { Plugin, WorkspaceLeaf, TFile } from "obsidian";
import { CommentsSidebarView, SIDEBAR_VIEW_TYPE } from "./sidebar";
import { commentsEditorPlugin, commentsGutter } from "./decorations";

export default class MDCommentsPlugin extends Plugin {
	async onload(): Promise<void> {
		// Register the sidebar view
		this.registerView(SIDEBAR_VIEW_TYPE, (leaf) => {
			return new CommentsSidebarView(leaf, this);
		});

		// Register CodeMirror 6 extensions for editor decorations
		this.registerEditorExtension([commentsEditorPlugin, commentsGutter]);

		// Command to open the comments sidebar
		this.addCommand({
			id: "open-comments-sidebar",
			name: "Open comments sidebar",
			callback: () => {
				this.activateSidebar();
			},
		});

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

		// Refresh sidebar when sidecar files are created or deleted
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

		// Open sidebar on startup if layout is ready
		this.app.workspace.onLayoutReady(() => {
			this.activateSidebar();
		});
	}

	onunload(): void {
		this.app.workspace.detachLeavesOfType(SIDEBAR_VIEW_TYPE);
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
				await leaf.setViewState({
					type: SIDEBAR_VIEW_TYPE,
					active: true,
				});
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
