import * as fs from 'node:fs';
import { Command } from 'commander';
import { readSidecar, writeSidecar } from '../sidecar.js';
import { generateCommentId } from '../id.js';

export const replyCommand = new Command('reply')
  .description('Add a reply to an existing thread')
  .argument('<file>', 'Markdown file')
  .requiredOption('--thread <id>', 'Thread ID to reply to')
  .requiredOption('--body <text>', 'Reply text')
  .option('--author <name>', 'Author display name', 'anonymous')
  .option('--author-type <type>', 'Author type: human or agent', 'human')
  .action((file: string, opts: { thread: string; body: string; author: string; authorType: string }) => {
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

    const commentId = generateCommentId();
    const now = new Date().toISOString();

    thread.comments.push({
      id: commentId,
      author: opts.author,
      authorType: opts.authorType as 'human' | 'agent',
      timestamp: now,
      body: opts.body,
    });

    writeSidecar(file, sidecar);
    console.log(`Added reply ${commentId} to thread ${opts.thread}`);
  });
