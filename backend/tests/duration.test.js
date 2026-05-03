import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDurationToMinutes, parseIsoDurationToMinutes } from '../src/utils/duration.js';

test('parses ISO recipe durations', () => {
  assert.equal(parseIsoDurationToMinutes('PT25M'), 25);
  assert.equal(parseIsoDurationToMinutes('PT1H30M'), 90);
});

test('parses human recipe durations', () => {
  assert.equal(parseDurationToMinutes('1 hour 15 minutes'), 75);
  assert.equal(parseDurationToMinutes('45 min'), 45);
  assert.equal(parseDurationToMinutes(null), null);
});
