import * as fs from 'node:fs';
import { Command } from 'commander';
import { insertSuggestionMarker } from '../parser.js';
import { readSidecar, writeSidecar } from '../sidecar.js';
import { generateThreadId, generateCommentId } from '../id.js';

export const suggestCommand = new Command('suggest')
  .description('Add a suggested edit')
  .argument('<file>', 'Markdown file to add suggestion to')
  .requiredOption('--original <text>', 'Original text to replace')
  .requiredOption('--replacement <text>', 'Replacement text')
  .requiredOption('--body <text>', 'Reason for the suggestion')
  .option('--author <name>', 'Author display name', 'anonymous')
  .option('--author-type <type>', 'Author type: human or agent', 'human')
  .action((file: string, opts: { original: string; replacement: string; body: string; author: string; authorType: string }) => {
    if (!fs.existsSync(file)) {
      console.error(`Error: File not found: ${file}`);
      process.exit(1);
    }

    const content = fs.readFileSync(file, 'utf-8');
    const threadId = generateThreadId();
    const commentId = generateCommentId();

    let newContent: string;
    try {
      newContent = insertSuggestionMarker(content, opts.original, opts.replacement, threadId);
    } catch (e: any) {
      console.error(`Error: ${e.message}`);
      process.exit(1);
    }

    fs.writeFileSync(file, newContent, 'utf-8');

    const sidecar = readSidecar(file);
    const now = new Date().toISOString();
    sidecar.threads[threadId] = {
      type: 'suggestion',
      status: 'open',
      createdAt: now,
      suggestion: {
        original: opts.original,
        replacement: opts.replacement,
      },
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
    console.log(`Added suggestion thread ${threadId}`);
  });
