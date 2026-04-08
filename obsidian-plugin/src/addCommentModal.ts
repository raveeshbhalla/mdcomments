import { App, Modal } from "obsidian";

export class AddCommentModal extends Modal {
	private onSubmit: (comment: string) => void;

	constructor(app: App, onSubmit: (comment: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.addClass("mdcomments-modal");

		contentEl.createEl("h3", { text: "Add comment" });

		const textarea = contentEl.createEl("textarea", {
			cls: "mdcomments-modal-input",
			attr: { placeholder: "Write your comment...", rows: "4" },
		});

		const btnRow = contentEl.createDiv({ cls: "mdcomments-modal-buttons" });
		const cancelBtn = btnRow.createEl("button", { text: "Cancel" });
		const submitBtn = btnRow.createEl("button", {
			text: "Add comment",
			cls: "mod-cta",
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

		// Focus the textarea
		setTimeout(() => textarea.focus(), 10);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
