import { MarkerInfo, SidecarFile } from './types';

// Regex patterns for markers
const COMMENT_MARKER_RE = /(?<!\\)\{>>([a-zA-Z0-9_-]+)\}/g;
const SUGGESTION_MARKER_RE = /(?<!\\)\{~~((?:[^~]|~(?!>))*)~>((?:[^~]|~(?!~[a-zA-Z0-9_-]+\}))*)~~([a-zA-Z0-9_-]+)\}/g;

/**
 * Parse markdown content, extracting markers and returning clean text.
 */
export function parseMarkdown(content: string): {
  cleanContent: string;
  markers: MarkerInfo[];
} {
  const markers: MarkerInfo[] = [];

  // First pass: find all suggestion markers with their positions in the raw text
  // We need to process suggestions first because they wrap text
  type RawMarker = {
    type: 'comment' | 'suggestion';
    start: number;
    end: number;
    threadId: string;
    original?: string;
    replacement?: string;
    replacementText?: string; // text that replaces the marker in clean output
  };

  const rawMarkers: RawMarker[] = [];

  // Find suggestion markers
  let match: RegExpExecArray | null;
  const sugRe = new RegExp(SUGGESTION_MARKER_RE.source, 'g');
  while ((match = sugRe.exec(content)) !== null) {
    const original = unescapeMarkerText(match[1]);
    const replacement = unescapeMarkerText(match[2]);
    rawMarkers.push({
      type: 'suggestion',
      start: match.index,
      end: match.index + match[0].length,
      threadId: match[3],
      original,
      replacement,
      replacementText: original, // in clean render, show original text
    });
  }

  // Find comment markers
  const cmtRe = new RegExp(COMMENT_MARKER_RE.source, 'g');
  while ((match = cmtRe.exec(content)) !== null) {
    rawMarkers.push({
      type: 'comment',
      start: match.index,
      end: match.index + match[0].length,
      threadId: match[1],
      replacementText: '', // zero-width
    });
  }

  // Sort by position in original text
  rawMarkers.sort((a, b) => a.start - b.start);

  // Build clean content and compute marker positions in clean text
  let cleanContent = '';
  let rawPos = 0;

  for (const rm of rawMarkers) {
    // Add text before this marker
    cleanContent += content.slice(rawPos, rm.start);

    const cleanPos = cleanContent.length;

    if (rm.type === 'comment') {
      markers.push({
        type: 'comment',
        threadId: rm.threadId,
        position: cleanPos,
      });
    } else {
      markers.push({
        type: 'suggestion',
        threadId: rm.threadId,
        position: cleanPos,
        original: rm.original,
        replacement: rm.replacement,
      });
      // Add the original text to clean content
      cleanContent += rm.original!;
    }

    rawPos = rm.end;
  }

  // Add remaining text
  cleanContent += content.slice(rawPos);

  // Unescape any escaped marker sequences in clean content
  cleanContent = unescapeContent(cleanContent);

  return { cleanContent, markers };
}

/**
 * Re-insert markers into clean content at their recorded positions.
 */
export function serializeMarkdown(
  content: string,
  markers: MarkerInfo[]
): string {
  // Escape any literal marker-like sequences in the content first
  let escaped = escapeContent(content);

  // Sort markers by position descending so insertions don't shift positions
  const sorted = [...markers].sort((a, b) => b.position - a.position);

  for (const marker of sorted) {
    if (marker.type === 'comment') {
      const tag = `{>>${marker.threadId}}`;
      escaped =
        escaped.slice(0, marker.position) +
        tag +
        escaped.slice(marker.position);
    } else if (marker.type === 'suggestion') {
      const origEscaped = escapeMarkerText(marker.original || '');
      const replEscaped = escapeMarkerText(marker.replacement || '');
      const tag = `{~~${origEscaped}~>${replEscaped}~~${marker.threadId}}`;
      // Replace the original text at this position with the suggestion marker
      const origLen = (marker.original || '').length;
      escaped =
        escaped.slice(0, marker.position) +
        tag +
        escaped.slice(marker.position + origLen);
    }
  }

  return escaped;
}

/**
 * Parse sidecar JSON content.
 */
export function parseSidecar(json: string): SidecarFile {
  const data = JSON.parse(json);
  return data as SidecarFile;
}

/**
 * Serialize sidecar data to pretty JSON.
 */
export function serializeSidecar(data: SidecarFile): string {
  return JSON.stringify(data, null, 2);
}

// --- Escaping helpers ---

function unescapeMarkerText(text: string): string {
  return text.replace(/\\~>/g, '~>').replace(/\\~~/g, '~~');
}

function escapeMarkerText(text: string): string {
  return text.replace(/~>/g, '\\~>').replace(/~~/g, '\\~~');
}

function unescapeContent(text: string): string {
  return text
    .replace(/\\\{>>/g, '{>>')
    .replace(/\\\{~~/g, '{~~')
    .replace(/\\~>/g, '~>')
    .replace(/\\~~\}/g, '~~}');
}

function escapeContent(text: string): string {
  return text
    .replace(/\{>>/g, '\\{>>')
    .replace(/\{~~/g, '\\{~~')
    .replace(/~>/g, '\\~>')
    .replace(/~~\}/g, '\\~~}');
}
