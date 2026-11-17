import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {detectFormat, parseTranscript, toOkfMarkdown} from '../src/index.mjs';

test('migrates Otter.ai .txt export and strips footer cleanly', () => {
  const sample = [
    ' Maya Lin  0:04',
    'Let us review the Q4 hardware margin and local AI roadmap.',
    '',
    'David Park  1:15',
    'Agreed, zero cloud upload keeps legal review fast.',
    '',
    'Transcribed by https://otter.ai',
  ].join('\n');

  assert.equal(detectFormat(sample), 'otter');
  const out = toOkfMarkdown(sample, {title: 'Q4 Roadmap Sync', date: '2026-11-17', topics: ['Q4-Roadmap']});
  assert.equal(out.format, 'otter');
  assert.deepEqual(out.speakers, ['Maya Lin', 'David Park']);
  assert.equal(out.durationSeconds, 75);
  assert.ok(out.markdown.includes('okf_version: "0.2"'));
  assert.ok(out.markdown.includes('[[People/Maya Lin|Maya Lin]]'));
  assert.ok(out.markdown.includes('[[Topics/Q4-Roadmap|Q4-Roadmap]]'));
  assert.ok(!out.markdown.includes('otter.ai'));
});

test('migrates Plaud bracketed timestamp exports', () => {
  const sample = '[00:00:08] Speaker 1: Welcome everyone.\n[00:02:30] Speaker 2: Shipping starts Monday.';
  assert.equal(detectFormat(sample), 'plaud');
  const parsed = parseTranscript(sample);
  assert.equal(parsed.segments.length, 2);
  assert.equal(parsed.durationSeconds, 150);
});

test('migrates HiNotes / Notta speaker-parenthesis exports', () => {
  const sample = 'Elena (00:12): First agenda item.\nMarco (03:40): Confirmed EU delivery window.';
  assert.equal(detectFormat(sample), 'hinotes');
  const parsed = parseTranscript(sample);
  assert.deepEqual(parsed.speakers, ['Elena', 'Marco']);
  assert.equal(parsed.durationSeconds, 220);
});

test('migrates Microsoft Teams / Zoom WebVTT (<v Speaker>) and SRT', () => {
  const vtt = 'WEBVTT\n\n00:00:02.000 --> 00:00:06.000\n<v Claire>Budget approved.</v>\n\n00:01:05.000 --> 00:01:09.000\n<v Sam>Next step is QA.</v>';
  const resVtt = toOkfMarkdown(vtt, {title: 'Teams Call', date: '2026-11-17'});
  assert.equal(resVtt.format, 'vtt');
  assert.deepEqual(resVtt.speakers, ['Claire', 'Sam']);

  const srt = '1\n00:00:03,000 --> 00:00:07,500\n[Dr. Weber]: Clinical intake note.\n\n2\n00:00:45,000 --> 00:00:50,000\n[Patient]: Understood.';
  const resSrt = toOkfMarkdown(srt, {title: 'SRT Session', date: '2026-11-17'});
  assert.equal(resSrt.format, 'srt');
  assert.deepEqual(resSrt.speakers, ['Dr. Weber', 'Patient']);
});

test('CLI migrates directory batch offline with zero errors', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'okf-mig-'));
  fs.writeFileSync(path.join(tmp, 'call.vtt'), 'WEBVTT\n\n00:00:01.000 --> 00:00:04.000\n<v Alex>Hello local OKF.</v>\n');
  const stdout = execFileSync(process.execPath, ['./bin/transcript-to-okf.mjs', '--in', tmp, '--date', '2026-11-17'], {
    cwd: path.resolve('.'),
    encoding: 'utf8',
  });
  const report = JSON.parse(stdout);
  assert.equal(report.migratedCount, 1);
  assert.ok(fs.existsSync(path.join(tmp, 'okf-out', 'call.okf.md')));
  fs.rmSync(tmp, {recursive: true, force: true});
});
