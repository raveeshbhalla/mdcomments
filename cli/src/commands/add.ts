import * as fs from 'node:fs';
import { Command } from 'commander';
import { insertCommentMarker } from '../parser.js';
import { readSidecar, writeSidecar } from '../sidecar.js';
import { generateThreadId, generateCommentId } from '../id.js';

export const addCommand = new Command('add')
  .description('Add a new comment thread')
  .argument('<file>', 'Markdown file to comment on')
  .requiredOption('--select <text>', 'Text to select for the comment')
  .requiredOption('--body <text>', 'Comment body')
  .option('--author <name>', 'Author display name', 'anonymous')
  .option('--author-type <type>', 'Author type: human or agent', 'human')
  .action((file: string, opts: { select: string; body: string; author: string; authorType: string }) => {
    if (!fs.existsSync(file)) {
      console.error(`Error: File not found: ${file}`);
      process.exit(1);
    }

    const content = fs.readFileSync(file, 'utf-8');
    const threadId = generateThreadId();
    const commentId = generateCommentId();

    let newContent: string;
    try {
      newContent = insertCommentMarker(content, opts.select, threadId);
    } catch (e: any) {
      console.error(`Error: ${e.message}`);
      process.exit(1);
    }

    fs.writeFileSync(file, newContent, 'utf-8');

    const sidecar = readSidecar(file);
    const now = new Date().toISOString();
    sidecar.threads[threadId] = {
      type: 'comment',
      status: 'open',
      createdAt: now,
      selection: opts.select,
      comments: [
        {
          id: commentId,
          author: opts.author,
          authorType: opts.authorType as 'human' | 'agent',
          timestamp: now,
          body: opts.body,
        },
      ],
    };

    writeSidecar(file, sidecar);
    console.log(`Added comment thread ${threadId}`);
  });
