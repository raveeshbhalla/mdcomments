# mdcomment

CLI tool for [MDComments](https://github.com/raveeshbhalla/mdcomments) — an open format for adding comment threads and suggested edits to Markdown files.

MDComments uses lightweight inline markers in your `.md` files paired with a sidecar `.comments.json` file, so humans and AI agents can collaborate on documents with threaded discussions, just like Google Docs or GitHub PR reviews.

## Install

```bash
npm install -g mdcomment
```

Or use it directly with `npx`:

```bash
npx mdcomment list document.md
```

## Commands

### `add` — Add a comment

```bash
mdcomment add document.md \
  --select "text to comment on" \
  --body "Your feedback here" \
  --author "raveesh"
```

### `suggest` — Suggest an edit

```bash
mdcomment suggest document.md \
  --original "current text" \
  --replacement "proposed text" \
  --body "Reason for the change" \
  --author "raveesh"
```

### `reply` — Reply to a thread

```bash
mdcomment reply document.md \
  --thread <thread-id> \
  --body "Your reply"
```

### `resolve` — Resolve a thread

```bash
mdcomment resolve document.md --thread <thread-id>
```

### `accept` / `reject` — Handle suggested edits

```bash
mdcomment accept document.md --thread <thread-id>
mdcomment reject document.md --thread <thread-id>
```

### `list` — List open threads

```bash
mdcomment list document.md
```

### `lint` — Check for issues

Detects orphaned threads, malformed markers, and sidecar/document mismatches.

```bash
mdcomment lint document.md
```

### `strip` — Clean output

Removes all inline markers and outputs clean Markdown to stdout.

```bash
mdcomment strip document.md
```

### `watch` — Watch for changes

Watches the sidecar file and prints new threads, replies, and status changes as they happen.

```bash
mdcomment watch document.md
```

## AI Agent Usage

MDComments has first-class support for AI agents. Use `--author-type agent` to distinguish agent comments from human ones:

```bash
mdcomment add document.md \
  --select "text to review" \
  --body "Consider rephrasing for clarity" \
  --author "agent:claude" \
  --author-type agent
```

A [Claude Code agent skill](https://github.com/raveeshbhalla/mdcomments/tree/main/skill) is available for integrating MDComments into Claude Code review workflows.

## How It Works

MDComments uses two files per document:

- **`document.md`** — your Markdown file with lightweight inline markers (`{>>THREAD_ID}` for comments, `{~~original~>replacement~~THREAD_ID}` for suggestions)
- **`document.md.comments.json`** — a sidecar JSON file containing thread data (authors, timestamps, replies, status)

Markers travel with the text through edits. The sidecar preserves the original context so comments stay meaningful even when the document changes.

See the [full specification](https://github.com/raveeshbhalla/mdcomments) for details.

## License

MIT
