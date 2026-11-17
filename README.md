# transcript-to-okf

Zero-dependency, 100% offline CLI and Node.js ESM library to migrate existing voice and meeting transcripts from **Otter.ai (`.txt`), Plaud Note / Plaud Desktop (`.txt`/`.md`), HiNotes / HiDock (`.txt`), Notta (`.txt`), Microsoft Teams / Zoom (`.vtt`), and Sony / Philips / Whisper (`.srt`)** into deterministic **Google Open Knowledge Format (`OKF v0.2`)** Markdown files for **Obsidian**, **Claude Desktop / Claude Code MCP**, **Cursor**, and **OneMira Desktop**.

## Why This Exists

Switching away from per-minute or monthly cloud recorder subscriptions often leaves years of transcripts scattered across incompatible export formats (`Speaker 1  0:04`, `[00:01:12] Speaker:`, `WEBVTT`, `.srt`). `transcript-to-okf` normalizes speaker turns, timestamps, YAML frontmatter (`kind: session`, `speakers`, `duration_seconds`), and relational `[[People/...]]` / `[[Topics/...]]` wiki-links locally on your machine with zero network requests.

## Quick Start

```bash
# Run directly via npx (Node.js >= 18)
npx github:onemira-space/transcript-to-okf --in ./otter-exports --out ./ObsidianVault/Meetings

# Or install on macOS / Linux via Homebrew
brew tap onemira-space/tap
brew install transcript-to-okf
transcript-to-okf --in ./meeting.vtt --title "Q4 Architecture Review" --topic "Platform"
```

## Supported Export Formats (Auto-Detected)

| Source / Vendor | Typical Export | Auto-Detected Pattern |
| :--- | :--- | :--- |
| **Otter.ai** | `.txt` | `Speaker Name  0:04` blocks + Otter footer stripping |
| **Plaud Note / Plaud Desktop** | `.txt` / `.md` | `[00:01:12] Speaker 1: ...` timestamped lines |
| **HiNotes (HiDock P1 / H1) & Notta** | `.txt` | `Speaker (00:14): ...` or `Speaker 00:14` headers |
| **Microsoft Teams / Zoom** | `.vtt` | `WEBVTT` cues with `<v Speaker>...</v>` tags |
| **Sony / Philips / Whisper / MacWhisper** | `.srt` | SubRip cues with `[Speaker]:` or `Speaker:` prefixes |

## Related Open-Source Tools & Documentation

- **Obsidian & Local Markdown Voice Workflow**: <https://onemira.com/blogs/ai-voice-recorder-for-obsidian-and-local-markdown>
- **Google OKF Local Wiki Architecture**: <https://onemira.com/docs/daily-use/local-wiki>
- **Subscription-Free AI Voice Recorder Guide ($0/Mo Local AI)**: <https://onemira.com/ai-voice-recorder-without-subscription>
- **OneMira C1 Standalone AI Voice Recorder**: <https://onemira.com/products/c1>
- **Companion Tools**: [`okf-markdown`](https://github.com/onemira-space/okf-markdown) · [`meeting-minutes-md`](https://github.com/onemira-space/meeting-minutes-md) · [`ai-voice-recorder-tco-dataset`](https://github.com/onemira-space/ai-voice-recorder-tco-dataset) · [`homebrew-tap`](https://github.com/onemira-space/homebrew-tap)

## License

MIT © OneMira Builders

- **[okf-wiki-mcp](https://github.com/onemira-space/okf-wiki-mcp)** — Zero-dependency offline Model Context Protocol (`MCP`) server & CLI for local Google OKF v0.2 and Obsidian Markdown meeting vaults (`brew install onemira-space/tap/okf-wiki-mcp` · [Docs](https://onemira-space.github.io/okf-wiki-mcp/) · [OneMira MCP Guide](https://onemira.com/docs/mcp-integration)).
