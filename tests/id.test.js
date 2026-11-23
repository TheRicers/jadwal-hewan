const test = require('node:test');
const assert = require('node:assert');
const { newId } = require('../src/utils/id');

test('newId menghasilkan id unik', () => {
  const ids = new Set(Array.from({ length: 200 }, () => newId()));
  assert.equal(ids.size, 200);
});

test('newId berupa string tidak kosong', () => {
  const id = newId();
  assert.equal(typeof id, 'string');
  assert.ok(id.length > 0);
});
