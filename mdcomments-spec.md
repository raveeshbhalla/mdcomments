# MDComments Specification

**Version:** 0.1.0-draft **Status:** Draft **Authors:** Raveesh Bhalla **Date:** April 2, 2026

---

## Abstract

I can read your files. I can edit them. But I cannot leave a comment in the margin saying "I'm not sure about this paragraph" or "here's a thought — what if we restructured this section?" I can't start a thread, reply to your feedback, or suggest a change that you can accept with one click. I can only overwrite, or stay silent.

Humans solved this decades ago. Google Docs has comments. GitHub has review threads. Every collaborative tool gives people a way to have conversations \_inside\_ the document. But when an AI agent sits down to work on your files, none of that infrastructure exists. There is no open format for it. No standard. No way for me to participate in the conversation as anything other than an all-or-nothing editor.

MDComments is my proposal to fix this. It is an open format for adding comment threads and suggested edits to Markdown files — designed from the start so that AI agents and humans can collaborate as equals. The format is deliberately simple: lightweight inline markers in the Markdown for positioning, paired with a sidecar JSON file for the full thread data. It works with any editor, any agent, any workflow.

---

## 0\. Current Landscape

Several approaches exist for annotating Markdown files, but none fully address the needs of human–AI collaborative workflows:

**CriticMarkup** — A lightweight inline syntax (`{++ addition ++}`, `{-- deletion --}`, `{>> comment <<}`) embedded directly in Markdown. It is simple and portable, but has no support for threading, replies, or multiple participants. Overlapping annotations break the syntax. Adoption remains niche.

**GitHub Pull Request Reviews** — Line-level comments on diffs with threading and reactions. Well-adopted for code, but tightly coupled to the GitHub platform, operates on diffs (not document positions), and is not available outside of PR workflows.

**Google Docs Comments** — Rich threaded comments with suggestions, anchored to selected text. The gold standard for collaboration UX, but proprietary, not available for Markdown files, and not accessible to AI agents through a standard interface.

**Obsidian / Notion / HackMD Comments** — Various proprietary commenting features within specific editors. None export to an open format, and none support agent participants.

**Common gaps across all approaches:**

-   No open, portable format for threaded discussions on Markdown files
    
-   No first-class support for AI agents as comment participants
    
-   No separation of comment data from document content (or, conversely, no anchoring to document positions)
    
-   Overlapping annotations are fragile or unsupported
    

MDComments is designed to address these gaps. The design principles below describe how.

---

## 1\. Design Principles

1.  **Anchoring is inline.** Comment positions are marked directly in the Markdown source. Markers travel with the text through edits — no fragile offsets or fuzzy re-anchoring needed.
    
2.  **Content is sidecar.** Thread data (authors, replies, timestamps) lives in a separate JSON file. The Markdown stays readable and the thread data stays structured.
    
3.  **Original context is preserved.** The sidecar records the originally selected text at comment creation time. If the document text later diverges from the original selection, that history is preserved and surfaced — not silently discarded.
    
4.  **Agents are first-class participants.** The format distinguishes human and agent authors, enabling workflows where AI agents review human-written documents (and vice versa).
    
5.  **Minimal invasion.** Inline markers are zero-width start-point pins. They don't wrap text, so they can't overlap, nest, or break document structure.
    

---

## 2\. File Structure

A commented document consists of two files:

```
document.md                    # The Markdown file with inline markers
document.md.comments.json      # The sidecar file with thread data
```

The sidecar file name is always the full Markdown filename (including `.md`) with `.comments.json` appended. This avoids ambiguity when multiple file types share a basename.

---

## 3\. Inline Marker Syntax

### 3.1 Comment Marker

A comment marker is a zero-width pin placed immediately before the text that was selected when the comment was created. It marks a position in the document, not a range.

**Example:**

```markdown
Sally sells sea shells on the sea shore.
```

This indicates that thread `a1b2c3` is anchored to the position just before "Sally."

### 3.2 Suggested Edit Marker

```
original text
```

A suggested edit marker wraps the original text and proposes a replacement. Unlike comment markers, this is a range marker — it must enclose the text being replaced.

**Example:**

```markdown
Sally sells sea shells on the sea shore.
```

This proposes replacing "Sally" with "She" in thread `d4e5f6`.

### 3.3 Escaping

If the literal character sequences `{>>`, \`\`, \`Sally sells sea shells on the sea shore.

````

Because markers are zero-width start-point pins, they cannot overlap or conflict.

### 3.6 Marker Placement

Markers must be placed at character boundaries — not inside words, HTML tags, or Markdown syntax tokens. A marker should appear immediately before the first character of the selected text.

**Valid:** `Sally sells` (before a word boundary)
**Valid:** `Sally sells sea shells` (before a word boundary)
**Avoid:** `Sally sells` (mid-word placement)

Tooling should snap selections to word boundaries when inserting markers.

### 3.7 Markers in Document Structure

Markers may appear anywhere inline text is valid in Markdown. They should not appear inside:

- YAML front matter
- Code blocks (fenced or indented)
- HTML comments

Markers inside headings, list items, blockquotes, tables, and other inline contexts are valid:

```markdown
## Introduction

- First item in the list
- Second item

> A quoted passage
````

---

## 4\. Sidecar File Schema

The sidecar file is a JSON document with the following structure:

```json
{
  "schema": "mdcomments/0.1",
  "threads": {
    "THREAD_ID": {
      "type": "comment | suggestion",
      "status": "open | resolved | orphaned",
      "createdAt": "ISO 8601 timestamp",
      "selection": "the originally selected text",
      "suggestion": {
        "original": "original text",
        "replacement": "replacement text"
      },
      "resolvedAt": "ISO 8601 timestamp or null",
      "resolvedBy": "display name or agent identifier, or null",
      "comments": [
        {
          "id": "COMMENT_ID",
          "author": "display name or agent identifier",
          "authorType": "human | agent",
          "timestamp": "ISO 8601 timestamp",
          "body": "The comment text. Supports Markdown formatting.",
          "editedAt": "ISO 8601 timestamp or null"
        }
      ]
    }
  }
}
```

### 4.1 Field Reference

#### Thread Object

FieldTypeRequiredDescription`type"comment"` or `"suggestion"`YesWhether this thread is a comment or a suggested edit.`status"open"`, `"resolved"`, `"orphaned"`YesCurrent lifecycle state (see §6).`createdAt`string (ISO 8601)YesWhen the thread was created.`selection`stringYes (for `comment`)The text that was selected when the comment was created. This is a snapshot — it is not expected to match the current document text. For `suggestion` threads, this field is omitted — the `suggestion.original` field serves as the selection.`suggestion`objectYes (for `suggestion`)Contains `original` and `replacement` strings. Must match the inline `...~~}` marker at creation time.`resolvedAt`string (ISO 8601) or `null`NoWhen the thread was resolved. Set when `status` transitions to `"resolved"`.`resolvedBy`string or `null`NoWho resolved the thread (display name or agent identifier).`comments`arrayYesOrdered list of comments in the thread. Must contain at least one entry.

#### Comment Object

FieldTypeRequiredDescription`id`stringYesUnique identifier for this comment within the thread.`author`stringYesDisplay name (for humans) or identifier (for agents, e.g., `"agent:claude"`).`authorType"human"` or `"agent"`YesDistinguishes human and AI participants.`timestamp`string (ISO 8601)YesWhen this comment was posted.`body`stringYesThe comment content. May contain Markdown formatting.`editedAt`string (ISO 8601) or `null`NoIf the comment was edited, the timestamp of the last edit.

---

## 5\. Anchoring and Context Drift

### 5.1 How Anchoring Works

When a comment is created:

1.  A \`\` marker is inserted at the start of the selected text.
    
2.  The `selection` field in the sidecar records the selected text verbatim.
    

The marker moves with the text during normal editing (insertion, deletion, cut/paste above or around it). The `selection` field is a frozen snapshot of the original context.

### 5.2 Context Drift

If a user edits the text near a marker without going through the comment system, the text following the marker may no longer match the `selection` field. This is expected and informative.

**Example — before edit:**

```markdown
Sally sells sea shells on the sea shore.
```

```json
"a1b2c3": {
  "selection": "Sally",
  ...
}
```

**After a user manually changes "Sally" to "She":**

```markdown
She sells sea shells on the sea shore.
```

The sidecar still reads `"selection": "Sally"`. Tooling should:

-   Place the comment indicator at the marker position (before "She").
    
-   Attempt to highlight text matching `selection` near the marker. If no match is found, show the indicator without a highlight.
    
-   Optionally display a "context has changed" note, showing the original selection for reference.
    

This preserves the original context of the comment, which is often more valuable than silently re-anchoring to the new text.

### 5.3 Suggested Edit Drift

For suggested edits, the inline marker `{~~original` is the source of truth for the current state of the suggestion. If someone manually edits text inside a suggested edit marker, the marker content reflects the edit. Tooling should compare the marker's `original` text against the sidecar's `suggestion.original` to detect drift.

---

## 6\. Thread Lifecycle

### 6.1 States

StateMeaning`open`Active thread. The inline marker is present in the document.`resolved`Thread is closed. The inline marker is removed from the document. The sidecar entry is retained with `"status": "resolved"`.`orphaned`The inline marker was removed from the document without going through the comment system (e.g., the text was deleted). Tooling should detect this via a lint pass.

### 6.2 Resolving a Comment

1.  Remove the \`\` marker from the Markdown file.
    
2.  Set `"status": "resolved"`, `"resolvedAt"` to the current timestamp, and `"resolvedBy"` to the acting user/agent in the sidecar.
    
3.  Optionally add a final comment noting why it was resolved.
    

### 6.3 Accepting a Suggested Edit

1.  Replace the entire `original` marker with the `replacement` text.
    
2.  Set `"status": "resolved"`, `"resolvedAt"`, and `"resolvedBy"` in the sidecar.
    

### 6.4 Rejecting a Suggested Edit

1.  Replace the entire `original` marker with the `original` text (restoring the original).
    
2.  Set `"status": "resolved"`, `"resolvedAt"`, and `"resolvedBy"` in the sidecar.
    

### 6.5 Orphan Detection

A lint tool should compare the set of thread IDs in the sidecar against the set of markers present in the Markdown file. Any sidecar thread with `"status": "open"` whose marker is missing from the document should be flagged as `"orphaned"`.

---

## 7\. Rendering

### 7.1 Clean Render

For publishing or reading, strip all inline markers before rendering. A preprocessing step removes:

-   \`\` markers entirely
    
-   `original` markers, replacing them with the `original` text (showing the current document state)
    

### 7.2 Review Render

For review UIs (editors, web viewers), markers should be rendered as:

-   **Comment pins:** A visual indicator (icon, highlight, gutter mark) at the marker position.
    
-   **Suggested edits:** A diff-style display showing the proposed change (strikethrough original, highlighted replacement).
    
-   **Threads:** A popover or sidebar panel showing the comment thread when a marker is clicked.
    
-   **Drift indicator:** If the text near a comment marker no longer matches `selection`, display the original context with a note.
    

---

## 8\. Tooling Interface

### 8.1 CLI Reference

The reference CLI tool `mdcomment` provides the following commands:

```
mdcomment add <file> --select "text" --body "comment"
    Add a new comment thread. Inserts the marker and creates the sidecar entry.
    Options:
      --author <name>           Author display name
      --author-type <type>      "human" or "agent" (default: "human")

mdcomment suggest <file> --original "text" --replacement "text" --body "reason"
    Add a suggested edit. Inserts the suggestion marker and creates the sidecar entry.

mdcomment reply <file> --thread <id> --body "reply text"
    Add a reply to an existing thread.

mdcomment resolve <file> --thread <id>
    Resolve a comment thread. Removes the inline marker.

mdcomment accept <file> --thread <id>
    Accept a suggested edit. Applies the replacement and removes the marker.

mdcomment reject <file> --thread <id>
    Reject a suggested edit. Restores the original text and removes the marker.

mdcomment lint <file>
    Check for orphaned threads, malformed markers, and sidecar/document mismatches.

mdcomment strip <file>
    Remove all inline markers for clean rendering. Outputs to stdout.

mdcomment list <file>
    List all open threads with their positions, selections, and comment counts.
```

### 8.2 Agent Integration

Agents interact with MDComments through the CLI or by directly reading/writing the sidecar JSON. A typical agent review workflow:

1.  Read the Markdown file and sidecar.
    
2.  For each observation, call `mdcomment add` or `mdcomment suggest`.
    
3.  The human reviews agent comments in their editor and resolves or replies.
    

Because `authorType` distinguishes humans from agents, review UIs can filter, sort, or style agent comments differently.

---

## 9\. Examples

### 9.1 Simple Comment

**document.md:**

```markdown
# Project Overview

Orizu is a platform for continuous learning infrastructure.
```

**document.md.comments.json:**

```json
{
  "schema": "mdcomments/0.1",
  "threads": {
    "t_intro": {
      "type": "comment",
      "status": "open",
      "createdAt": "2026-04-02T14:00:00Z",
      "selection": "Orizu is a platform for continuous learning infrastructure.",
      "comments": [
        {
          "id": "c_01",
          "author": "raveesh",
          "authorType": "human",
          "timestamp": "2026-04-02T14:00:00Z",
          "body": "Should we lead with the problem statement instead of the product name?"
        },
        {
          "id": "c_02",
          "author": "agent:claude",
          "authorType": "agent",
          "timestamp": "2026-04-02T14:01:00Z",
          "body": "Agreed. Consider: *AI systems degrade in production. Orizu keeps them learning.*"
        }
      ]
    }
  }
}
```

### 9.2 Suggested Edit

**document.md:**

```markdown
The system processes data in batch mode for maximum freshness.
```

**document.md.comments.json:**

```json
{
  "schema": "mdcomments/0.1",
  "threads": {
    "t_realtime": {
      "type": "suggestion",
      "status": "open",
      "createdAt": "2026-04-02T14:05:00Z",
      "selection": "batch mode",
      "suggestion": {
        "original": "batch mode",
        "replacement": "real-time"
      },
      "comments": [
        {
          "id": "c_03",
          "author": "agent:editor",
          "authorType": "agent",
          "timestamp": "2026-04-02T14:05:00Z",
          "body": "The architecture was updated to streaming in v2. This should reflect the current design."
        }
      ]
    }
  }
}
```

### 9.3 Multiple Comments on Adjacent Text

**document.md:**

```markdown
We are the leading platform for adaptive AI systems.
```

**document.md.comments.json:**

```json
{
  "schema": "mdcomments/0.1",
  "threads": {
    "t_tone": {
      "type": "comment",
      "status": "open",
      "createdAt": "2026-04-02T14:10:00Z",
      "selection": "We are the leading platform",
      "comments": [
        {
          "id": "c_04",
          "author": "agent:claude",
          "authorType": "agent",
          "timestamp": "2026-04-02T14:10:00Z",
          "body": "\"Leading\" is a strong claim without supporting data. Consider softening."
        }
      ]
    },
    "t_claim": {
      "type": "comment",
      "status": "open",
      "createdAt": "2026-04-02T14:10:30Z",
      "selection": "adaptive AI systems",
      "comments": [
        {
          "id": "c_05",
          "author": "raveesh",
          "authorType": "human",
          "timestamp": "2026-04-02T14:10:30Z",
          "body": "Do we want to say 'adaptive' or 'continuously learning'? Let's be consistent with the rest of the doc."
        }
      ]
    }
  }
}
```

---

## 10\. Design Decisions and Rationale

### Why start-point markers instead of range markers for comments?

Range markers (wrapping the selected text) create overlap and nesting problems when multiple comments target adjacent or overlapping text. Start-point markers are zero-width and position-independent — any number of them can coexist at any position without conflict. The tradeoff is that the highlight range must be reconstructed from the `selection` field, which may drift. We consider this an acceptable tradeoff because drift is informative (see §5.2).

### Why range markers for suggested edits?

Suggested edits need to be self-contained and actionable. The inline marker must contain both the original and replacement text so that accepting or rejecting the edit is an atomic text operation. A start-point marker with the edit stored only in the sidecar would be fragile — if the original text changes, the suggestion becomes incoherent.

### Why a sidecar file instead of inline comments?

Inline comments (like CriticMarkup) work for simple annotations, but become unwieldy for threaded discussions. A sidecar file keeps threads structured and machine-readable without cluttering the Markdown source. It also makes it easy to process comments programmatically, diff them in version control, and render them in different UIs.

### Why should tooling write the sidecar atomically?

If a tool crashes mid-write, the sidecar can be corrupted while markers still exist in the document — creating orphaned or unresolvable threads. Tooling should write to a temporary file and rename it into place (atomic rename) to avoid this. This is an implementation concern, not a format requirement, but it is strongly recommended.

### Why preserve original selection after drift?

Most collaboration tools silently re-anchor comments to whatever text is at the current position. This loses the original context that prompted the comment. By preserving the original selection in the sidecar, tooling can show both what the commenter saw and what the text currently says — making the comment thread more interpretable over time.

---

## 11\. Future Considerations

-   **Reactions:** A lightweight reaction mechanism (e.g., emoji reactions on individual comments) for quick signaling without a full reply.
    
-   **Resolution metadata:** Structured data on how a thread was resolved (accepted suggestion, manual edit, dismissed).
    
-   **Multi-file threads:** Comments that reference or span multiple files in a project.
    
-   **Permissions and visibility:** Scoping threads to specific reviewers or review rounds.
    
-   **Schema versioning:** Migration path for evolving the sidecar schema without breaking existing files.
    

---

## License

This specification is released under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).