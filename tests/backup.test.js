const test = require('node:test');
const assert = require('node:assert');
const {
  BACKUP_VERSION,
  createBackup,
  validateBackup,
} = require('../src/logic/backup');

function payload(overrides = {}) {
  return {
    app: 'PetPlanner',
    version: BACKUP_VERSION,
    exportedAt: '2026-11-28T00:00:00.000Z',
    pets: [{ id: 'p1', nama: 'Milo', jenis: 'Kucing' }],
    schedules: [{
      id: 's1',
      petId: 'p1',
      perawatan: 'makan',
      jam: '07:00',
      notificationId: 'old-notification',
      riwayat: ['2026-11-27'],
    }],
    perawatanKustom: [{ id: 'c1', nama: 'Grooming' }],
    ...overrides,
  };
}

test('createBackup membungkus data dengan versi dan waktu ekspor', () => {
  const backup = createBackup({
    pets: payload().pets,
    schedules: payload().schedules,
    perawatanKustom: payload().perawatanKustom,
  }, '2026-11-28T00:00:00.000Z');

  assert.equal(backup.app, 'PetPlanner');
  assert.equal(backup.version, BACKUP_VERSION);
  assert.equal(backup.exportedAt, '2026-11-28T00:00:00.000Z');
  assert.deepEqual(backup.pets, payload().pets);
});

test('validateBackup menerima data valid dan membuang notificationId', () => {
  const result = validateBackup(payload());
  assert.equal(result.valid, true);
  assert.deepEqual(result.data.schedules[0], {
    id: 's1',
    petId: 'p1',
    perawatan: 'makan',
    jam: '07:00',
    riwayat: ['2026-11-27'],
  });
});

test('validateBackup mengisi jenis dan riwayat yang tidak ada', () => {
  const result = validateBackup(payload({
    pets: [{ id: 'p1', nama: 'Milo' }],
    schedules: [{ id: 's1', petId: 'p1', perawatan: 'makan', jam: '07:00' }],
  }));

  assert.equal(result.valid, true);
  assert.equal(result.data.pets[0].jenis, 'Hewan');
  assert.deepEqual(result.data.schedules[0].riwayat, []);
});

test('validateBackup menolak versi yang tidak didukung', () => {
  assert.equal(validateBackup(payload({ version: 99 })).valid, false);
});

test('validateBackup menolak jam atau riwayat yang tidak valid', () => {
  assert.equal(validateBackup(payload({
    schedules: [{ id: 's1', petId: 'p1', perawatan: 'makan', jam: '25:00' }],
  })).valid, false);

  assert.equal(validateBackup(payload({
    schedules: [{ id: 's1', petId: 'p1', perawatan: 'makan', jam: '07:00', riwayat: ['27-11-2026'] }],
  })).valid, false);
});

test('validateBackup menolak koleksi yang bukan array dan id duplikat', () => {
  assert.equal(validateBackup(payload({ pets: {} })).valid, false);
  assert.equal(validateBackup(payload({
    pets: [{ id: 'p1', nama: 'Milo' }, { id: 'p1', nama: 'Bruno' }],
  })).valid, false);
});
