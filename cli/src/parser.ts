export interface CommentMarker {
  id: string;
  position: number;
}

export interface SuggestionMarker {
  id: string;
  original: string;
  replacement: string;
  position: number;
}

// Regex for comment markers: {>>THREAD_ID} but not escaped \{>>
const COMMENT_MARKER_RE = /(?<!\\)\{>>([a-zA-Z0-9_-]+)\}/g;

// Regex for suggestion markers: {~~original~>replacement~~THREAD_ID} but not escaped
const SUGGESTION_MARKER_RE = /(?<!\\)\{~~((?:[^~]|~(?!>)|\\\~>)*?)~>((?:[^~]|~(?!~\})|~(?!~[a-zA-Z0-9_-]+\}))*?)~~([a-zA-Z0-9_-]+)\}/g;

function unescapeMarkerText(text: string): string {
  return text
    .replace(/\\{>>/g, '{>>')
    .replace(/\\{~~/g, '{~~')
    .replace(/\\~>/g, '~>')
    .replace(/\\~~\}/g, '~~}');
}

function escapeMarkerText(text: string): string {
  return text
    .replace(/\{>>/g, '\\{>>')
    .replace(/\{~~/g, '\\{~~')
    .replace(/~>/g, '\\~>')
    .replace(/~~\}/g, '\\~~}');
}

export function findCommentMarkers(content: string): CommentMarker[] {
  const markers: CommentMarker[] = [];
  const re = new RegExp(COMMENT_MARKER_RE.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    markers.push({
      id: match[1],
      position: match.index,
    });
  }
  return markers;
}

export function findSuggestionMarkers(content: string): SuggestionMarker[] {
  const markers: SuggestionMarker[] = [];
  const re = new RegExp(SUGGESTION_MARKER_RE.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    markers.push({
      id: match[3],
      original: unescapeMarkerText(match[1]),
      replacement: unescapeMarkerText(match[2]),
      position: match.index,
    });
  }
  return markers;
}

export function insertCommentMarker(content: string, selection: string, threadId: string): string {
  const idx = content.indexOf(selection);
  if (idx === -1) {
    throw new Error(`Selection "${selection}" not found in document`);
  }
  const marker = `{>>${threadId}}`;
  return content.slice(0, idx) + marker + content.slice(idx);
}

export function insertSuggestionMarker(
  content: string,
  original: string,
  replacement: string,
  threadId: string
): string {
  const idx = content.indexOf(original);
  if (idx === -1) {
    throw new Error(`Original text "${original}" not found in document`);
  }
  const escapedOriginal = escapeMarkerText(original);
  const escapedReplacement = escapeMarkerText(replacement);
  const marker = `{~~${escapedOriginal}~>${escapedReplacement}~~${threadId}}`;
  return content.slice(0, idx) + marker + content.slice(idx + original.length);
}

export function removeCommentMarker(content: string, threadId: string): string {
  const escapedId = threadId.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  const re = new RegExp(`\\{>>${escapedId}\\}`, 'g');
  return content.replace(re, '');
}

export function acceptSuggestion(content: string, threadId: string): string {
  const escapedId = threadId.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  const re = new RegExp(
    `(?<!\\\\)\\{~~((?:[^~]|~(?!>)|\\\\~>)*?)~>((?:[^~]|~(?!~\\})|~(?!~${escapedId}\\}))*?)~~${escapedId}\\}`,
    'g'
  );
  return content.replace(re, (_match, _orig, repl) => unescapeMarkerText(repl));
}

export function rejectSuggestion(content: string, threadId: string): string {
  const escapedId = threadId.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  const re = new RegExp(
    `(?<!\\\\)\\{~~((?:[^~]|~(?!>)|\\\\~>)*?)~>((?:[^~]|~(?!~\\})|~(?!~${escapedId}\\}))*?)~~${escapedId}\\}`,
    'g'
  );
  return content.replace(re, (_match, orig) => unescapeMarkerText(orig));
}

export function stripAllMarkers(content: string): string {
  // First replace suggestion markers with original text
  let result = content.replace(
    new RegExp(SUGGESTION_MARKER_RE.source, 'g'),
    (_match, orig) => unescapeMarkerText(orig)
  );
  // Then remove comment markers
  result = result.replace(new RegExp(COMMENT_MARKER_RE.source, 'g'), '');
  // Unescape any escaped marker sequences in the remaining text
  result = unescapeMarkerText(result);
  return result;
}
