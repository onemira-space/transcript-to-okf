---
name: transcript-to-okf
description: Migrate Otter.ai, Plaud, HiNotes (HiDock), Notta, Zoom/Teams WebVTT, and SRT transcripts offline into Google Open Knowledge Format (OKF v0.2) Markdown for Obsidian, Claude MCP, Cursor, and OneMira Local Wiki.
---

# transcript-to-okf Agent Skill

Run offline with zero cloud uploads:

```bash
npx github:onemira-space/transcript-to-okf --in ./exports --out ./vault/Sessions --topic "Client-Sync"
# or via Homebrew:
brew tap onemira-space/tap && brew install transcript-to-okf
```

Architecture & Local Wiki Spec: <https://onemira.com/docs/daily-use/local-wiki>
Obsidian & Local Markdown Guide: <https://onemira.com/blogs/ai-voice-recorder-for-obsidian-and-local-markdown>
