const test = require('node:test');
const assert = require('node:assert');
const { parseStoredArray } = require('../src/storage/db');

test('parseStoredArray mengembalikan array kosong untuk data yang belum ada', () => {
  assert.deepEqual(parseStoredArray(null), []);
  assert.deepEqual(parseStoredArray(''), []);
});

test('parseStoredArray mengembalikan array yang tersimpan', () => {
  assert.deepEqual(parseStoredArray('[{"id":"p1"}]'), [{ id: 'p1' }]);
});

test('parseStoredArray melempar error untuk JSON rusak', () => {
  assert.throws(() => parseStoredArray('{rusak'), /tidak valid/i);
});

test('parseStoredArray melempar error untuk nilai yang bukan array', () => {
  assert.throws(() => parseStoredArray('{"id":"p1"}'), /tidak valid/i);
});
