#!/usr/bin/env node
'use strict';

const fs = require('fs');

/**
 * Parse task notes in the format:
 * YYYY-MM-DD | 狀態: <status> | 驗證: <verification> | 變更: <changes> | 阻塞: <blockers>
 *
 * Returns an array of event records.
 */
function parseNotesLog(notesText) {
  if (!notesText || typeof notesText !== 'string') {
    return [];
  }

  const events = [];
  const lines = notesText.split('\n').filter(line => line.trim().length > 0);

  for (const line of lines) {
    const parts = line.split('|').map(s => s.trim());
    if (parts.length < 2) continue;

    const timestamp = parts[0];
    const event = {
      timestamp: timestamp,
      status: null,
      verification: null,
      changes: null,
      blockers: null,
    };

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      const match = part.match(/^([^:]+):\s*(.*)$/);
      if (!match) continue;
      const [, key, value] = match;
      const normalizedKey = key.trim().toLowerCase();

      if (normalizedKey === '狀態' || normalizedKey === 'status') {
        event.status = value.trim();
      } else if (normalizedKey === '驗證' || normalizedKey === 'verification' || normalizedKey === 'verify') {
        event.verification = value.trim();
      } else if (normalizedKey === '變更' || normalizedKey === 'changes') {
        event.changes = value.trim();
      } else if (normalizedKey === '阻塞' || normalizedKey === 'blockers' || normalizedKey === 'blocking') {
        event.blockers = value.trim();
      }
    }

    events.push(event);
  }

  return events;
}

/**
 * Converts parsed events back to notes log format.
 */
function formatNotesLog(events) {
  if (!Array.isArray(events) || events.length === 0) {
    return '';
  }

  return events
    .map(evt => {
      const parts = [evt.timestamp];
      if (evt.status) parts.push(`狀態: ${evt.status}`);
      if (evt.verification) parts.push(`驗證: ${evt.verification}`);
      if (evt.changes) parts.push(`變更: ${evt.changes}`);
      if (evt.blockers) parts.push(`阻塞: ${evt.blockers}`);
      return parts.join(' | ');
    })
    .join('\n');
}

/**
 * Merge new event into existing notes, appending to the end.
 */
function appendNotesEvent(existingNotes, newEvent) {
  const events = parseNotesLog(existingNotes || '');
  events.push(newEvent);
  return formatNotesLog(events);
}

/**
 * Replace the most recent event or append if none exists.
 */
function updateLatestNotesEvent(existingNotes, newEvent) {
  const events = parseNotesLog(existingNotes || '');
  if (events.length > 0) {
    events[events.length - 1] = { ...events[events.length - 1], ...newEvent };
  } else {
    events.push(newEvent);
  }
  return formatNotesLog(events);
}

function main() {
  const cmd = process.argv[2];
  const arg = process.argv[3];

  if (cmd === 'parse') {
    if (!arg) {
      console.error('parse requires a notes text argument or stdin');
      process.exit(1);
    }
    try {
      const notesText = arg === '-' ? fs.readFileSync(0, 'utf8') : arg;
      const events = parseNotesLog(notesText);
      console.log(JSON.stringify(events, null, 2));
    } catch (error) {
      console.error('[notes-protocol-converter] Error parsing notes:', error.message);
      process.exit(1);
    }
  } else if (cmd === 'format') {
    try {
      const stdinData = fs.readFileSync(0, 'utf8');
      const events = JSON.parse(stdinData);
      const formatted = formatNotesLog(events);
      console.log(formatted);
    } catch (error) {
      console.error('[notes-protocol-converter] Error formatting notes:', error.message);
      process.exit(1);
    }
  } else if (cmd === 'append') {
    try {
      const existingNotes = arg || '';
      const stdinData = fs.readFileSync(0, 'utf8');
      const newEvent = JSON.parse(stdinData);
      const result = appendNotesEvent(existingNotes, newEvent);
      console.log(result);
    } catch (error) {
      console.error('[notes-protocol-converter] Error appending notes:', error.message);
      process.exit(1);
    }
  } else if (cmd === 'update-latest') {
    try {
      const existingNotes = arg || '';
      const stdinData = fs.readFileSync(0, 'utf8');
      const newEvent = JSON.parse(stdinData);
      const result = updateLatestNotesEvent(existingNotes, newEvent);
      console.log(result);
    } catch (error) {
      console.error('[notes-protocol-converter] Error updating notes:', error.message);
      process.exit(1);
    }
  } else {
    console.error('Usage: notes-protocol-converter <parse|format|append|update-latest> [arg]');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  parseNotesLog,
  formatNotesLog,
  appendNotesEvent,
  updateLatestNotesEvent,
};
