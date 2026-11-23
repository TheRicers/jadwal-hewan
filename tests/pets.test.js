const test = require('node:test');
const assert = require('node:assert');
const { deletePet } = require('../src/logic/pets');

test('deletePet menghapus hewan beserta jadwalnya', () => {
  const pets = [
    { id: 'p1', nama: 'Milo', jenis: 'Kucing' },
    { id: 'p2', nama: 'Bruno', jenis: 'Anjing' },
  ];
  const schedules = [
    { id: 's1', petId: 'p1' },
    { id: 's2', petId: 'p1' },
    { id: 's3', petId: 'p2' },
  ];
  const result = deletePet(pets, schedules, 'p1');
  assert.deepEqual(result.pets.map((p) => p.id), ['p2']);
  assert.deepEqual(result.schedules.map((s) => s.id), ['s3']);
  assert.deepEqual(result.removed.map((s) => s.id), ['s1', 's2']);
});

test('deletePet tidak memutasi input', () => {
  const pets = [{ id: 'p1', nama: 'Milo', jenis: 'Kucing' }];
  const schedules = [{ id: 's1', petId: 'p1' }];
  deletePet(pets, schedules, 'p1');
  assert.equal(pets.length, 1);
  assert.equal(schedules.length, 1);
});
