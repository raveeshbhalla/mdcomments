import * as fs from 'node:fs';
import { Command } from 'commander';
import { readSidecar, sidecarPath, type SidecarFile } from '../sidecar.js';

function formatThread(id: string, thread: { type: string; status: string; selection?: string; suggestion?: { original: string; replacement: string }; comments: { id: string; author: string; body: string }[] }): string {
  if (thread.type === 'suggestion') {
    const orig = thread.suggestion?.original || '(unknown)';
    const repl = thread.suggestion?.replacement || '(unknown)';
    const truncOrig = orig.length > 30 ? orig.slice(0, 30) + '...' : orig;
    const truncRepl = repl.length > 30 ? repl.slice(0, 30) + '...' : repl;
    return `  [${id}] suggestion | "${truncOrig}" -> "${truncRepl}" | ${thread.comments.length} comment(s)`;
  }
  const selection = thread.selection || '(no selection)';
  const truncated = selection.length > 50 ? selection.slice(0, 50) + '...' : selection;
  return `  [${id}] comment | "${truncated}" | ${thread.comments.length} comment(s)`;
}

export const watchCommand = new Command('watch')
  .description('Watch a document for new or updated comment threads')
  .argument('<file>', 'Markdown file')
  .action((file: string) => {
    if (!fs.existsSync(file)) {
      console.error(`Error: File not found: ${file}`);
      process.exit(1);
    }

    const scPath = sidecarPath(file);

    // Snapshot current state
    let previous = readSidecar(file);

    console.log(`Watching ${scPath} for changes... (Ctrl+C to stop)`);

    // Show current open thread count
    const openCount = Object.values(previous.threads).filter(t => t.status === 'open').length;
    console.log(`Currently ${openCount} open thread(s).\n`);

    fs.watch(scPath, { persistent: true }, (eventType) => {
      if (eventType !== 'change') return;

      let current: SidecarFile;
      try {
        const raw = fs.readFileSync(scPath, 'utf-8');
        current = JSON.parse(raw) as SidecarFile;
      } catch {
        // File may be mid-write (atomic rename); skip this event
        return;
      }

      const prevIds = new Set(Object.keys(previous.threads));
      const currIds = new Set(Object.keys(current.threads));

      // New threads
      for (const id of currIds) {
        if (!prevIds.has(id)) {
          const thread = current.threads[id];
          const lastComment = thread.comments[thread.comments.length - 1];
          console.log(`+ New ${thread.type} thread:`);
          console.log(formatThread(id, thread));
          if (lastComment) {
            console.log(`    ${lastComment.author}: ${lastComment.body}`);
          }
          console.log();
        }
      }

      // Updated threads (new replies or status changes)
      for (const id of currIds) {
        if (!prevIds.has(id)) continue;
        const prev = previous.threads[id];
        const curr = current.threads[id];

        // Status change
        if (prev.status !== curr.status) {
          console.log(`~ Thread [${id}] ${prev.status} -> ${curr.status}`);
          console.log();
        }

        // New replies
        if (curr.comments.length > prev.comments.length) {
          const newComments = curr.comments.slice(prev.comments.length);
          for (const c of newComments) {
            console.log(`> New reply on [${id}]:`);
            console.log(`    ${c.author}: ${c.body}`);
            console.log();
          }
        }
      }

      previous = current;
    });
  });
