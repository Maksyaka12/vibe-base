// The admin-published schedule decides when rounds open, so a bad one must be refused.
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSchedule } from '../src/data/scheduleSchema.js';
import { DEFAULT_SCHEDULE } from '../src/data/rewardsSchedule.js';

const copy = () => structuredClone(DEFAULT_SCHEDULE);

test('the built-in schedule is valid', () => {
  assert.doesNotThrow(() => validateSchedule(copy()));
});

test('an empty schedule is refused', () => {
  assert.throws(() => validateSchedule(null));
  assert.throws(() => validateSchedule({}));
});

test('a staking round with a bad date is refused', () => {
  const s = copy();
  s.staking[0].start = 'soon';
  assert.throws(() => validateSchedule(s), /invalid date/);
});

test('a staking round ending before it starts is refused', () => {
  const s = copy();
  s.staking[0].end = '2020-01-01T00:00:00Z';
  assert.throws(() => validateSchedule(s), /end must be after start/);
});

test('a pool that is not a number is refused', () => {
  const s = copy();
  s.staking[0].pool = 'a lot';
  assert.throws(() => validateSchedule(s), /pool/);
});
