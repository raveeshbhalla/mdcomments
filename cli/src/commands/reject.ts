import * as fs from 'node:fs';
import { Command } from 'commander';
import { rejectSuggestion } from '../parser.js';
import { readSidecar, writeSidecar } from '../sidecar.js';

export const rejectCommand = new Command('reject')
  .description('Reject a suggested edit')
  .argument('<file>', 'Markdown file')
  .requiredOption('--thread <id>', 'Thread ID of the suggestion to reject')
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

    if (thread.type !== 'suggestion') {
      console.error(`Error: Thread ${opts.thread} is not a suggestion. Use 'resolve' instead.`);
      process.exit(1);
    }

    if (thread.status === 'resolved') {
      console.error(`Error: Thread ${opts.thread} is already resolved`);
      process.exit(1);
    }

    const content = fs.readFileSync(file, 'utf-8');
    const newContent = rejectSuggestion(content, opts.thread);

    if (content === newContent) {
      console.error(`Error: Suggestion marker for thread ${opts.thread} not found in document`);
      process.exit(1);
    }

    fs.writeFileSync(file, newContent, 'utf-8');

    const now = new Date().toISOString();
    thread.status = 'resolved';
    thread.resolvedAt = now;
    thread.resolvedBy = opts.author;

    writeSidecar(file, sidecar);
    console.log(`Rejected suggestion ${opts.thread}`);
  });
