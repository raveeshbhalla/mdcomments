export interface Comment {
	id: string;
	author: string;
	authorType: "human" | "agent";
	timestamp: string;
	body: string;
	editedAt?: string | null;
}

export interface Thread {
	type: "comment" | "suggestion";
	status: "open" | "resolved" | "orphaned";
	createdAt: string;
	selection?: string;
	suggestion?: {
		original: string;
		replacement: string;
	};
	resolvedAt?: string | null;
	resolvedBy?: string | null;
	comments: Comment[];
}

export interface SidecarFile {
	schema: string;
	threads: Record<string, Thread>;
}

export interface CommentMarker {
	id: string;
	/** Position in the raw (marker-containing) text */
	position: number;
	/** Length of the full marker string in the raw text */
	markerLength: number;
}

export interface SuggestionMarker {
	id: string;
	original: string;
	replacement: string;
	/** Position in the raw (marker-containing) text */
	position: number;
	/** Length of the full marker string in the raw text */
	markerLength: number;
}

/** Marker mapped to clean-text positions */
export interface MappedCommentMarker {
	id: string;
	/** Position in the clean (marker-stripped) text where the comment is anchored */
	cleanPos: number;
}

export interface MappedSuggestionMarker {
	id: string;
	original: string;
	replacement: string;
	/** Start position in clean text */
	cleanFrom: number;
	/** End position in clean text (cleanFrom + original.length) */
	cleanTo: number;
}
