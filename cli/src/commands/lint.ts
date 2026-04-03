import * as fs from 'node:fs';
import { Command } from 'commander';
import { findCommentMarkers, findSuggestionMarkers } from '../parser.js';
import { readSidecar, writeSidecar } from '../sidecar.js';

export const lintCommand = new Command('lint')
  .description('Check for orphaned threads, missing sidecar entries, and malformed markers')
  .argument('<file>', 'Markdown file to lint')
  .action((file: string) => {
    if (!fs.existsSync(file)) {
      console.error(`Error: File not found: ${file}`);
      process.exit(1);
    }

    const content = fs.readFileSync(file, 'utf-8');
    const sidecar = readSidecar(file);
    let issues = 0;

    // Collect all marker IDs from the document
    const commentMarkers = findCommentMarkers(content);
    const suggestionMarkers = findSuggestionMarkers(content);
    const markerIds = new Set<string>();

    for (const m of commentMarkers) {
      markerIds.add(m.id);
    }
    for (const m of suggestionMarkers) {
      markerIds.add(m.id);
    }

    // Check for markers without sidecar entries
    for (const id of markerIds) {
      if (!sidecar.threads[id]) {
        console.log(`MISSING_SIDECAR: Marker {>>${id}} found in document but no sidecar entry exists`);
        issues++;
      }
    }

    // Check for orphaned threads (sidecar entry with status "open" but no marker in document)
    for (const [id, thread] of Object.entries(sidecar.threads)) {
      if (thread.status === 'open' && !markerIds.has(id)) {
        console.log(`ORPHANED: Thread ${id} has status "open" but no marker found in document`);
        issues++;
      }
    }

    // Check for malformed markers - look for partial/broken marker syntax
    const malformedComment = /\{>>[^}]*$/gm;
    let match: RegExpExecArray | null;
    const re1 = new RegExp(malformedComment.source, 'gm');
    while ((match = re1.exec(content)) !== null) {
      console.log(`MALFORMED: Possible unclosed comment marker at position ${match.index}`);
      issues++;
    }

    // Check for duplicate thread IDs in markers
    const seenIds = new Map<string, number>();
    for (const m of commentMarkers) {
      seenIds.set(m.id, (seenIds.get(m.id) || 0) + 1);
    }
    for (const m of suggestionMarkers) {
      seenIds.set(m.id, (seenIds.get(m.id) || 0) + 1);
    }
    for (const [id, count] of seenIds) {
      if (count > 1) {
        // Duplicate comment markers at the same position are valid per spec,
        // but duplicate suggestion markers or mixed duplicates are not
        const suggCount = suggestionMarkers.filter(m => m.id === id).length;
        if (suggCount > 1) {
          console.log(`DUPLICATE: Suggestion marker for thread ${id} appears ${suggCount} times`);
          issues++;
        }
      }
    }

    if (issues === 0) {
      console.log('No issues found.');
    } else {
      console.log(`\n${issues} issue(s) found.`);
      process.exit(1);
    }
  });
