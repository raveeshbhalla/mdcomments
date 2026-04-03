import * as fs from 'node:fs';
import { Command } from 'commander';
import { removeCommentMarker } from '../parser.js';
import { readSidecar, writeSidecar } from '../sidecar.js';

export const resolveCommand = new Command('resolve')
  .description('Resolve a comment thread')
  .argument('<file>', 'Markdown file')
  .requiredOption('--thread <id>', 'Thread ID to resolve')
  .option('--author <name>', 'Author display name', 'anonymous')
  .action((file: string, opts: { thread: string; author: string }) => {
    if (!fs.existsSync(file)) {
      console.error(`Error: File not found: ${file}`);
      process.exit(1);
    }

    const sidecar = readSidecar(file);
    const thread = sidecar.threads[opts.thread];

    if (!thread) {
      console.error(`Error: Thread ${opts.thread} not found`);
      process.exit(1);
    }

    if (thread.type !== 'comment') {
      console.error(`Error: Thread ${opts.thread} is a suggestion. Use 'accept' or 'reject' instead.`);
      process.exit(1);
    }

    if (thread.status === 'resolved') {
      console.error(`Error: Thread ${opts.thread} is already resolved`);
      process.exit(1);
    }

    const content = fs.readFileSync(file, 'utf-8');
    const newContent = removeCommentMarker(content, opts.thread);
    fs.writeFileSync(file, newContent, 'utf-8');

    const now = new Date().toISOString();
    thread.status = 'resolved';
    thread.resolvedAt = now;
    thread.resolvedBy = opts.author;

    writeSidecar(file, sidecar);
    console.log(`Resolved thread ${opts.thread}`);
  });
