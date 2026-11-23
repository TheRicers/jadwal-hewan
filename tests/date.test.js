const test = require('node:test');
const assert = require('node:assert');
const { todayKey, isValidJam, formatJam } = require('../src/utils/date');

test('todayKey memakai tanggal lokal', () => {
  assert.equal(todayKey(new Date(2026, 10, 23, 23, 30)), '2026-11-23');
});

test('todayKey memberi nol di depan', () => {
  assert.equal(todayKey(new Date(2026, 0, 5, 8, 0)), '2026-01-05');
});

test('isValidJam menerima jam valid', () => {
  assert.equal(isValidJam('00:00'), true);
  assert.equal(isValidJam('23:59'), true);
  assert.equal(isValidJam('07:00'), true);
});

test('isValidJam menolak jam tidak valid', () => {
  assert.equal(isValidJam('7:5'), false);
  assert.equal(isValidJam('25:00'), false);
  assert.equal(isValidJam(''), false);
  assert.equal(isValidJam('07:60'), false);
});

test('formatJam mengembalikan jam valid dan melempar untuk jam invalid', () => {
  assert.equal(formatJam('07:00'), '07:00');
  assert.throws(() => formatJam('25:00'), /Jam tidak valid/);
});
