# MDComments Review Skill

Use this skill when the user asks you to review, comment on, or suggest edits to a Markdown file using the MDComments format. This includes requests like "review this document", "add comments to this file", "suggest edits", or "give feedback on this markdown".

## What is MDComments?

MDComments is an open format for adding comment threads and suggested edits to Markdown files. It uses:
- **Inline markers** in the `.md` file for positioning (`{>>THREAD_ID}` for comments, `{~~original~>replacement~~THREAD_ID}` for suggestions)
- **A sidecar JSON file** (`<filename>.md.comments.json`) for thread data (authors, replies, timestamps)

## Setup

Before using any commands, verify the `mdcomment` CLI is available:

```bash
which mdcomment || npm install -g mdcomment
```

Run this check once at the start of any review task. If the install fails, try with `npx mdcomment` as a prefix instead.

## Reading Comments

To see what comments already exist on a document:

```bash
mdcomment list <file>
```

This shows all open threads with their positions, selections, and comment counts. Always check for existing comments before adding your own to avoid duplicating feedback.

To check for issues like orphaned threads or malformed markers:

```bash
mdcomment lint <file>
```

## Writing Comments

Use the `mdcomment` CLI to add comments and suggestions to Markdown files.

### Adding a Comment

When you want to comment on specific text in a document:

```bash
mdcomment add <file> --select "the exact text you're commenting on" --body "Your comment here" --author "agent:claude" --author-type agent
```

- `--select` must be an exact substring match from the document
- Keep selections reasonably short (a sentence or key phrase, not entire paragraphs)
- Your comment body can use Markdown formatting

### Suggesting an Edit

When you want to propose a text change:

```bash
mdcomment suggest <file> --original "current text" --replacement "proposed text" --body "Reason for the change" --author "agent:claude" --author-type agent
```

- `--original` must be an exact substring match from the document
- `--replacement` is what you propose it should be changed to
- `--body` explains why you're suggesting the change

### Replying to a Thread

To reply to an existing comment thread:

```bash
mdcomment reply <file> --thread <thread-id> --body "Your reply" --author "agent:claude" --author-type agent
```

### Resolving a Thread

To resolve a thread (only do this if the user asks you to):

```bash
mdcomment resolve <file> --thread <thread-id> --author "agent:claude"
```

### Accepting/Rejecting Suggestions

```bash
mdcomment accept <file> --thread <thread-id> --author "agent:claude"
mdcomment reject <file> --thread <thread-id> --author "agent:claude"
```

## Review Workflow

When asked to review a Markdown document:

1. **Read the file** to understand its content and purpose.
2. **Check for existing comments** using `mdcomment list <file>` to see if there are already threads you should be aware of.
3. **Add comments** for observations, questions, or issues. Focus on:
   - Clarity and readability
   - Factual accuracy
   - Structural improvements
   - Tone and audience fit
   - Missing information
4. **Suggest edits** for concrete text changes you'd recommend. Use suggestions (not comments) when you have a specific replacement in mind.
5. **Be selective** — don't comment on everything. Focus on the most impactful feedback. Aim for 3-7 comments on a typical document.

## Important Guidelines

- Always use `--author "agent:claude" --author-type agent` so your comments are properly attributed as coming from an AI agent.
- The `--select` and `--original` text must be an **exact match** of text in the document. Read the file first to ensure accuracy.
- Don't resolve or accept/reject threads unless the user explicitly asks you to.
- If the file already has comments from others, read them before adding your own to avoid duplicating feedback.
- Keep comment bodies concise and actionable.
