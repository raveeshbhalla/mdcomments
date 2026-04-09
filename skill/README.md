# MDComments Agent Skill

A [Claude Code agent skill](https://docs.anthropic.com/en/docs/claude-code/skills) that enables Claude to review Markdown documents using the MDComments format — adding threaded comments and suggested edits just like a human reviewer.

## Install

The skill automatically installs the `mdcomment` CLI on first use if it isn't already available — no manual setup required.

### Add the Skill to Claude Code

1. Copy `mdcomments-review.md` into your project's `.claude/skills/` directory:

```bash
mkdir -p .claude/skills
cp mdcomments-review.md .claude/skills/
```

2. Or reference it directly from this repo by adding to your project's `.claude/settings.json`:

```json
{
  "skills": ["path/to/mdcomments/skill/mdcomments-review.md"]
}
```

## What It Does

When installed, Claude Code can:

- **Review documents** — Read a Markdown file and leave targeted comments and suggested edits
- **Add comments** — Anchor feedback to specific text selections
- **Suggest edits** — Propose concrete text replacements with explanations
- **Reply to threads** — Continue existing comment discussions
- **Resolve threads** — Close threads when feedback is addressed
- **Accept/reject suggestions** — Apply or dismiss proposed edits
- **Lint** — Check for orphaned threads and marker issues

## Usage

Once the skill is installed, ask Claude to review any Markdown file:

> "Review this document and give me feedback"
>
> "Suggest edits to improve clarity in README.md"
>
> "Add a comment about the intro section of proposal.md"

Claude will use the `mdcomment` CLI to add properly attributed comments (`agent:claude`) that you can review in any MDComments-compatible viewer or directly in the sidecar JSON file.

## Skill File Reference

See [`mdcomments-review.md`](./mdcomments-review.md) for the full skill definition, including command reference, workflow guidance, and best practices.
