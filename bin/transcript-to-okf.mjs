#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {toOkfMarkdown} from '../src/index.mjs';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`transcript-to-okf v1.0.0 — Offline Transcript Migrator to Google OKF v0.2 Markdown
Usage:
  transcript-to-okf --in <file-or-dir> [--out <file-or-dir>] [--vendor auto|otter|plaud|hinotes|vtt|srt]
                    [--title "Session Title"] [--date YYYY-MM-DD] [--topic "Topic"] [--no-wiki-links] [--json]`);
  process.exit(0);
}
if (args.includes('--version') || args.includes('-v')) {
  console.log('1.0.0');
  process.exit(0);
}

function getArg(flag, fallback = null) {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : fallback;
}

const topics = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--topic' && args[i + 1]) topics.push(args[i + 1]);
}

const inputPath = getArg('--in') || args.find((a) => !a.startsWith('-'));
if (!inputPath) {
  console.error('Error: missing --in <file-or-dir>. Run with --help for usage.');
  process.exit(1);
}

const outPath = getArg('--out');
const vendor = getArg('--vendor', 'auto');
const date = getArg('--date', new Date().toISOString().slice(0, 10));
const wikiLinks = !args.includes('--no-wiki-links');
const asJson = args.includes('--json');

const stat = fs.statSync(inputPath);
if (stat.isDirectory()) {
  const outDir = outPath || path.join(inputPath, 'okf-out');
  fs.mkdirSync(outDir, {recursive: true});
  const files = fs.readdirSync(inputPath).filter((f) => /\.(txt|vtt|srt|md)$/i.test(f));
  const summary = [];
  for (const file of files) {
    const raw = fs.readFileSync(path.join(inputPath, file), 'utf8');
    const base = path.basename(file, path.extname(file));
    const res = toOkfMarkdown(raw, {vendor, title: base, date, topics, wikiLinks});
    const dest = path.join(outDir, `${base}.okf.md`);
    fs.writeFileSync(dest, res.markdown, 'utf8');
    summary.push({file, dest, sessionId: res.sessionId, format: res.format, speakers: res.speakers, segments: res.segmentCount});
  }
  console.log(JSON.stringify({migratedCount: summary.length, files: summary}, null, 2));
} else {
  const raw = fs.readFileSync(inputPath, 'utf8');
  const defaultTitle = path.basename(inputPath, path.extname(inputPath));
  const title = getArg('--title', defaultTitle);
  const res = toOkfMarkdown(raw, {vendor, title, date, topics, wikiLinks});
  if (outPath) {
    fs.mkdirSync(path.dirname(path.resolve(outPath)), {recursive: true});
    fs.writeFileSync(outPath, res.markdown, 'utf8');
  }
  if (asJson) {
    console.log(JSON.stringify(res, null, 2));
  } else if (!outPath) {
    process.stdout.write(res.markdown);
  } else {
    console.log(`Wrote ${outPath} (${res.segmentCount} segments, format=${res.format})`);
  }
}
