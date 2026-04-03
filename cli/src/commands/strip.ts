import * as fs from 'node:fs';
import { Command } from 'commander';
import { stripAllMarkers } from '../parser.js';

export const stripCommand = new Command('strip')
  .description('Remove all inline markers for clean rendering')
  .argument('<file>', 'Markdown file to strip')
  .action((file: string) => {
    if (!fs.existsSync(file)) {
      console.error(`Error: File not found: ${file}`);
      process.exit(1);
    }

    const content = fs.readFileSync(file, 'utf-8');
    const clean = stripAllMarkers(content);
    process.stdout.write(clean);
  });
