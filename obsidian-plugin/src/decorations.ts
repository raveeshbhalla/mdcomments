import {
	Decoration,
	DecorationSet,
	EditorView,
	ViewPlugin,
	ViewUpdate,
	WidgetType,
} from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { findCommentMarkers, findSuggestionMarkers } from "./parser";

/**
 * Widget shown inline at comment marker positions: a small comment icon.
 */
class CommentIconWidget extends WidgetType {
	constructor(readonly threadId: string) {
		super();
	}

	toDOM(): HTMLElement {
		const span = document.createElement("span");
		span.className = "mdcomments-marker-icon mdcomments-comment-icon";
		span.setAttribute("data-thread-id", this.threadId);
		span.textContent = "💬";
		span.title = `Comment thread: ${this.threadId}`;
		return span;
	}

	eq(other: CommentIconWidget): boolean {
		return this.threadId === other.threadId;
	}
}

/**
 * Build decorations from the document text.
 * - Comment markers `{>>ID}` get:
 *   1. The marker text itself hidden/dimmed
 *   2. A small icon widget
 *   3. A highlight on surrounding text (using selection from sidecar if available)
 * - Suggestion markers `{~~orig~>repl~~ID}` get:
 *   1. The whole marker range highlighted with a diff-style decoration
 */
function buildDecorations(view: EditorView): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();
	const doc = view.state.doc;
	const text = doc.toString();

	// Gather all decoration ranges, then sort by from position
	const ranges: { from: number; to: number; decoration: Decoration }[] = [];

	// --- Comment markers ---
	const comments = findCommentMarkers(text);
	for (const marker of comments) {
		const from = marker.position;
		const to = marker.position + marker.markerLength;

		// Dim the marker syntax itself
		ranges.push({
			from,
			to,
			decoration: Decoration.mark({ class: "mdcomments-marker-syntax" }),
		});

		// Add widget after marker
		ranges.push({
			from: to,
			to: to,
			decoration: Decoration.widget({
				widget: new CommentIconWidget(marker.id),
				side: 1,
			}),
		});

		// Highlight some text after the marker as "commented" region.
		// We highlight from marker end to end-of-line or next 200 chars,
		// whichever comes first, as a visual hint.
		const lineEnd = doc.lineAt(to).to;
		const highlightEnd = Math.min(lineEnd, to + 200);
		if (highlightEnd > to) {
			ranges.push({
				from: to,
				to: highlightEnd,
				decoration: Decoration.mark({
					class: "mdcomments-highlight-comment",
					attributes: { "data-thread-id": marker.id },
				}),
			});
		}
	}

	// --- Suggestion markers ---
	const suggestions = findSuggestionMarkers(text);
	for (const marker of suggestions) {
		const from = marker.position;
		const to = marker.position + marker.markerLength;

		// Mark the entire suggestion marker with a special class
		ranges.push({
			from,
			to,
			decoration: Decoration.mark({
				class: "mdcomments-highlight-suggestion",
				attributes: { "data-thread-id": marker.id },
			}),
		});
	}

	// Sort by from position (required by RangeSetBuilder)
	ranges.sort((a, b) => a.from - b.from || a.to - b.to);

	for (const r of ranges) {
		builder.add(r.from, r.to, r.decoration);
	}

	return builder.finish();
}

/**
 * CodeMirror 6 ViewPlugin that provides editor decorations for mdcomments markers.
 */
export const commentsEditorPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = buildDecorations(view);
		}

		update(update: ViewUpdate): void {
			if (update.docChanged || update.viewportChanged) {
				this.decorations = buildDecorations(update.view);
			}
		}
	},
	{
		decorations: (v) => v.decorations,
	}
);

/**
 * Gutter marker support: add line-level indicators for lines containing markers.
 */
import { gutter, GutterMarker } from "@codemirror/view";

class CommentGutterMarker extends GutterMarker {
	toDOM(): Text {
		return document.createTextNode("◆");
	}
}

const commentGutterMarker = new CommentGutterMarker();

export const commentsGutter = gutter({
	class: "mdcomments-gutter",
	lineMarker(view, line) {
		const doc = view.state.doc;
		const lineText = doc.sliceString(line.from, line.to);
		// Check if this line contains any comment or suggestion markers
		const hasComment = /(?<!\\)\{>>([a-zA-Z0-9_-]+)\}/.test(lineText);
		const hasSuggestion =
			/(?<!\\)\{~~/.test(lineText);
		if (hasComment || hasSuggestion) {
			return commentGutterMarker;
		}
		return null;
	},
});
