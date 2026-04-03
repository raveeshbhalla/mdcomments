#!/usr/bin/env node

import { Command } from 'commander';
import { addCommand } from './commands/add.js';
import { suggestCommand } from './commands/suggest.js';
import { replyCommand } from './commands/reply.js';
import { resolveCommand } from './commands/resolve.js';
import { acceptCommand } from './commands/accept.js';
import { rejectCommand } from './commands/reject.js';
import { lintCommand } from './commands/lint.js';
import { stripCommand } from './commands/strip.js';
import { listCommand } from './commands/list.js';

const program = new Command();

program
  .name('mdcomment')
  .description('CLI tool for MDComments - comment threads and suggested edits for Markdown files')
  .version('0.1.0');

program.addCommand(addCommand);
program.addCommand(suggestCommand);
program.addCommand(replyCommand);
program.addCommand(resolveCommand);
program.addCommand(acceptCommand);
program.addCommand(rejectCommand);
program.addCommand(lintCommand);
program.addCommand(stripCommand);
program.addCommand(listCommand);

program.parse();
