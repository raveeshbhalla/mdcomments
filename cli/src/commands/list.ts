import * as fs from 'node:fs';
import { Command } from 'commander';
import { findCommentMarkers, findSuggestionMarkers } from '../parser.js';
import { readSidecar } from '../sidecar.js';

export const listCommand = new Command('list')
  .description('List all open threads')
  .argument('<file>', 'Markdown file')
  .action((file: string) => {
    if (!fs.existsSync(file)) {
      console.error(`Error: File not found: ${file}`);
      process.exit(1);
    }

    const content = fs.readFileSync(file, 'utf-8');
    const sidecar = readSidecar(file);

    const commentMarkers = findCommentMarkers(content);
    const suggestionMarkers = findSuggestionMarkers(content);

    const markerIds = new Set<string>();
    for (const m of commentMarkers) markerIds.add(m.id);
    for (const m of suggestionMarkers) markerIds.add(m.id);

    let count = 0;

    for (const [id, thread] of Object.entries(sidecar.threads)) {
      if (thread.status !== 'open') continue;
      count++;

      const inDoc = markerIds.has(id);
      const commentCount = thread.comments.length;

      if (thread.type === 'comment') {
        const selection = thread.selection || '(no selection)';
        const truncated = selection.length > 50 ? selection.slice(0, 50) + '...' : selection;
        console.log(
          `[${id}] comment | status: ${thread.status} | selection: "${truncated}" | comments: ${commentCount}${!inDoc ? ' | WARNING: marker missing' : ''}`
        );
      } else if (thread.type === 'suggestion') {
        const orig = thread.suggestion?.original || '(unknown)';
        const repl = thread.suggestion?.replacement || '(unknown)';
        const truncOrig = orig.length > 30 ? orig.slice(0, 30) + '...' : orig;
        const truncRepl = repl.length > 30 ? repl.slice(0, 30) + '...' : repl;
        console.log(
          `[${id}] suggestion | status: ${thread.status} | "${truncOrig}" -> "${truncRepl}" | comments: ${commentCount}${!inDoc ? ' | WARNING: marker missing' : ''}`
        );
      }
    }

    if (count === 0) {
      console.log('No open threads.');
    }
  });
