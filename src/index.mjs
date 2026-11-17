import crypto from 'node:crypto';

export function parseClockToSeconds(clock) {
  const clean = String(clock || '').trim().replace(',', '.');
  const parts = clean.split(':').map((p) => Number.parseFloat(p));
  if (parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 3) return Math.round(parts[0] * 3600 + parts[1] * 60 + parts[2]);
  if (parts.length === 2) return Math.round(parts[0] * 60 + parts[1]);
  return 0;
}

export function formatSeconds(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return hh > 0 ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
}

export function detectFormat(rawText) {
  const txt = String(rawText || '').replace(/\r\n/g, '\n').trim();
  if (/^WEBVTT\b/i.test(txt)) return 'vtt';
  if (/^\d+\s*\n\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->/m.test(txt)) return 'srt';
  if (/Transcribed by https?:\/\/otter\.ai/i.test(txt) || /^[^\n]{1,48}  \d{1,2}:\d{2}(?::\d{2})?\s*$/m.test(txt)) {
    return 'otter';
  }
  if (/^\[\d{2}:\d{2}(?::\d{2})?\]\s+[^:\n]{1,48}:/m.test(txt)) return 'plaud';
  if (/^[^\n:(]{1,48}\s+\(?\d{2}:\d{2}(?::\d{2})?\)?:?\s*$/m.test(txt) || /^[^\n:(]{1,48}\s*\(\d{2}:\d{2}(?::\d{2})?\):/m.test(txt)) {
    return 'hinotes';
  }
  return 'plain';
}

export function parseTranscript(rawText, explicitVendor = 'auto') {
  const normalized = String(rawText || '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n*Transcribed by https?:\/\/otter\.ai\s*$/i, '')
    .trim();

  const format = explicitVendor === 'auto' ? detectFormat(normalized) : explicitVendor;
  const segments = [];

  if (format === 'vtt') {
    const blocks = normalized.replace(/^WEBVTT[^\n]*\n+/i, '').split(/\n{2,}/);
    for (const block of blocks) {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      const timeIdx = lines.findIndex((l) => l.includes('-->'));
      if (timeIdx === -1) continue;
      const startClock = lines[timeIdx].split('-->')[0].trim().split(/\s+/)[0];
      const body = lines.slice(timeIdx + 1).join(' ');
      let speaker = 'Speaker 1';
      let text = body;
      const vMatch = body.match(/^<v\s+([^>]+)>([\s\S]*?)(?:<\/v>)?$/i);
      if (vMatch) {
        speaker = vMatch[1].trim();
        text = vMatch[2].trim();
      } else {
        const colonMatch = body.match(/^([^:]{1,40}):\s+(.+)$/);
        if (colonMatch) {
          speaker = colonMatch[1].trim();
          text = colonMatch[2].trim();
        }
      }
      if (text) {
        const sec = parseClockToSeconds(startClock);
        segments.push({speaker, startSeconds: sec, timestamp: formatSeconds(sec), text});
      }
    }
  } else if (format === 'srt') {
    const blocks = normalized.split(/\n{2,}/);
    for (const block of blocks) {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      const timeIdx = lines.findIndex((l) => l.includes('-->'));
      if (timeIdx === -1) continue;
      const startClock = lines[timeIdx].split('-->')[0].trim();
      const body = lines.slice(timeIdx + 1).join(' ');
      let speaker = 'Speaker 1';
      let text = body;
      const spMatch = body.match(/^(?:\[([^\]]{1,40})\]|([^:]{1,40})):\s*(.+)$/);
      if (spMatch) {
        speaker = (spMatch[1] || spMatch[2]).trim();
        text = spMatch[3].trim();
      }
      if (text) {
        const sec = parseClockToSeconds(startClock);
        segments.push({speaker, startSeconds: sec, timestamp: formatSeconds(sec), text});
      }
    }
  } else if (format === 'plaud') {
    for (const line of normalized.split('\n')) {
      const m = line.trim().match(/^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s+([^:]{1,48}):\s*(.+)$/);
      if (m) {
        const sec = parseClockToSeconds(m[1]);
        segments.push({speaker: m[2].trim(), startSeconds: sec, timestamp: formatSeconds(sec), text: m[3].trim()});
      } else if (line.trim() && segments.length > 0) {
        segments[segments.length - 1].text += ` ${line.trim()}`;
      }
    }
  } else if (format === 'otter' || format === 'hinotes' || format === 'notta') {
    const lines = normalized.split('\n');
    let current = null;
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      const inlineMatch = line.match(/^([^:(]{1,48})\s*\((\d{1,2}:\d{2}(?::\d{2})?)\):\s*(.+)$/);
      if (inlineMatch) {
        const sec = parseClockToSeconds(inlineMatch[2]);
        current = {speaker: inlineMatch[1].trim(), startSeconds: sec, timestamp: formatSeconds(sec), text: inlineMatch[3].trim()};
        segments.push(current);
        continue;
      }
      const headerMatch =
        rawLine.match(/^([^\n]{1,48}?)\s{2,}(\d{1,2}:\d{2}(?::\d{2})?)\s*$/) ||
        line.match(/^([^:(]{1,48}?)\s+\(?(\d{1,2}:\d{2}(?::\d{2})?)\)?:?$/);
      if (headerMatch) {
        const sec = parseClockToSeconds(headerMatch[2]);
        current = {speaker: headerMatch[1].trim(), startSeconds: sec, timestamp: formatSeconds(sec), text: ''};
        segments.push(current);
      } else if (current) {
        current.text = current.text ? `${current.text} ${line}` : line;
      }
    }
  } else {
    for (const line of normalized.split('\n').map((l) => l.trim()).filter(Boolean)) {
      const m = line.match(/^([^:]{1,40}):\s+(.+)$/);
      if (m) {
        segments.push({speaker: m[1].trim(), startSeconds: 0, timestamp: '00:00', text: m[2].trim()});
      } else {
        segments.push({speaker: 'Speaker 1', startSeconds: 0, timestamp: '00:00', text: line});
      }
    }
  }

  const cleanSegments = segments.filter((s) => s.text && s.text.trim().length > 0);
  const speakers = [...new Set(cleanSegments.map((s) => s.speaker))];
  const durationSeconds = cleanSegments.reduce((max, s) => Math.max(max, s.startSeconds), 0);

  return {format, segments: cleanSegments, speakers, durationSeconds};
}

function yamlEscape(value) {
  const s = String(value ?? '');
  return /[:#\[\]{}&*!|>'"%@`]/.test(s) ? JSON.stringify(s) : s;
}

export function toOkfMarkdown(rawText, options = {}) {
  const {
    vendor = 'auto',
    title = 'Imported Meeting Transcript',
    date = new Date().toISOString().slice(0, 10),
    topics = [],
    wikiLinks = true,
  } = options;

  const parsed = parseTranscript(rawText, vendor);
  const digest = crypto
    .createHash('sha256')
    .update(`${date}:${title}:${parsed.segments.length}:${parsed.durationSeconds}`)
    .digest('hex')
    .slice(0, 8);
  const sessionId = `s_${date.replace(/-/g, '')}_${digest}`;

  const frontmatterLines = [
    '---',
    'okf_version: "0.2"',
    'kind: session',
    `session_id: ${sessionId}`,
    `title: ${yamlEscape(title)}`,
    `date: "${date}"`,
    `source_format: ${parsed.format}`,
    `duration_seconds: ${parsed.durationSeconds}`,
    'speakers:',
    ...(parsed.speakers.length > 0
      ? parsed.speakers.map((sp) => `  - ${yamlEscape(sp)}`)
      : ['  - "Speaker 1"']),
    ...(topics.length > 0
      ? ['topics:', ...topics.map((tp) => `  - ${yamlEscape(tp)}`)]
      : []),
    '---',
  ];

  const participantLine =
    wikiLinks && parsed.speakers.length > 0
      ? `**Participants:** ${parsed.speakers.map((sp) => `[[People/${sp}|${sp}]]`).join(', ')}`
      : `**Participants:** ${parsed.speakers.join(', ') || 'Speaker 1'}`;

  const topicLine =
    topics.length > 0
      ? `**Topics:** ${topics.map((tp) => (wikiLinks ? `[[Topics/${tp}|${tp}]]` : tp)).join(', ')}`
      : null;

  const transcriptLines = parsed.segments.map(
    (seg) => `- **[${seg.timestamp}] ${seg.speaker}:** ${seg.text}`,
  );

  const markdown = [
    ...frontmatterLines,
    '',
    `# ${title}`,
    '',
    participantLine,
    ...(topicLine ? [topicLine] : []),
    '',
    '## Transcript',
    '',
    ...transcriptLines,
    '',
  ].join('\n');

  return {
    sessionId,
    format: parsed.format,
    speakers: parsed.speakers,
    segmentCount: parsed.segments.length,
    durationSeconds: parsed.durationSeconds,
    markdown,
  };
}
