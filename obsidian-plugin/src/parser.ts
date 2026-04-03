import type {
	CommentMarker,
	SuggestionMarker,
	MappedCommentMarker,
	MappedSuggestionMarker,
	SidecarFile,
	Thread,
} from "./types";

// Regex for comment markers: {>>THREAD_ID} (not escaped)
const COMMENT_MARKER_RE =
	/(?<!\\)\{>>([a-zA-Z0-9_-]+)\}/g;

// Regex for suggestion markers: {~~original~>replacement~~THREAD_ID} (not escaped)
const SUGGESTION_MARKER_RE =
	/(?<!\\)\{~~((?:[^~]|~(?!>)|\\\~>)*?)~>((?:[^~]|~(?!~\})|~(?!~[a-zA-Z0-9_-]+\}))*?)~~([a-zA-Z0-9_-]+)\}/g;

function unescapeMarkerText(text: string): string {
	return text
		.replace(/\\{>>/g, "{>>")
		.replace(/\\{~~/g, "{~~")
		.replace(/\\~>/g, "~>")
		.replace(/\\~~\}/g, "~~}");
}

export function findCommentMarkers(content: string): CommentMarker[] {
	const markers: CommentMarker[] = [];
	const re = new RegExp(COMMENT_MARKER_RE.source, "g");
	let match: RegExpExecArray | null;
	while ((match = re.exec(content)) !== null) {
		markers.push({
			id: match[1],
			position: match.index,
			markerLength: match[0].length,
		});
	}
	return markers;
}

export function findSuggestionMarkers(content: string): SuggestionMarker[] {
	const markers: SuggestionMarker[] = [];
	const re = new RegExp(SUGGESTION_MARKER_RE.source, "g");
	let match: RegExpExecArray | null;
	while ((match = re.exec(content)) !== null) {
		markers.push({
			id: match[3],
			original: unescapeMarkerText(match[1]),
			replacement: unescapeMarkerText(match[2]),
			position: match.index,
			markerLength: match[0].length,
		});
	}
	return markers;
}

/**
 * Collect all marker regions (to strip), sorted by position.
 * Each entry: [startInRaw, lengthInRaw, type, id, originalTextLength?]
 */
interface RawMarkerRegion {
	rawStart: number;
	rawLength: number;
	kind: "comment" | "suggestion";
	id: string;
	/** For suggestions: the length of original text inside the marker */
	originalLength?: number;
}

/**
 * Given the raw file content, compute where each marker falls in
 * Obsidian's "clean" view (i.e. the text the editor actually shows).
 *
 * Obsidian in source mode shows the raw text including markers, so
 * positions equal the raw positions. But if we ever need to support
 * live-preview / reading mode, this function maps raw → clean.
 */
export function mapMarkersToRawPositions(content: string): {
	commentMarkers: MappedCommentMarker[];
	suggestionMarkers: MappedSuggestionMarker[];
} {
	const comments = findCommentMarkers(content);
	const suggestions = findSuggestionMarkers(content);

	// In source mode, Obsidian shows raw text. Markers sit in the raw text,
	// so we just return raw positions directly.
	const mappedComments: MappedCommentMarker[] = comments.map((m) => ({
		id: m.id,
		cleanPos: m.position,
	}));

	const mappedSuggestions: MappedSuggestionMarker[] = suggestions.map((m) => ({
		id: m.id,
		original: m.original,
		replacement: m.replacement,
		cleanFrom: m.position,
		cleanTo: m.position + m.markerLength,
	}));

	return { commentMarkers: mappedComments, suggestionMarkers: mappedSuggestions };
}

export function parseSidecar(json: string): SidecarFile {
	return JSON.parse(json) as SidecarFile;
}

export function getOpenThreads(sidecar: SidecarFile): [string, Thread][] {
	return Object.entries(sidecar.threads).filter(
		([, t]) => t.status === "open"
	);
}

export function getAllThreads(sidecar: SidecarFile): [string, Thread][] {
	return Object.entries(sidecar.threads);
}
