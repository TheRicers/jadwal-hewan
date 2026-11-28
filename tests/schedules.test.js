const test = require('node:test');
const assert = require('node:assert');
const {
  createSchedule, updateSchedule, deleteSchedule,
  isDoneToday, toggleDone, groupByJam, isDuplicateSchedule,
} = require('../src/logic/schedules');

const base = () => createSchedule({ petId: 'p1', perawatan: 'makan', jam: '07:00' }, 's1');

test('createSchedule membuat jadwal kosong riwayat', () => {
  assert.deepEqual(base(), {
    id: 's1', petId: 'p1', perawatan: 'makan', jam: '07:00',
    notificationId: null, riwayat: [],
  });
});

test('toggleDone menambah lalu menghapus tanggal', () => {
  const done = toggleDone(base(), '2026-11-23');
  assert.equal(isDoneToday(done, '2026-11-23'), true);
  const undone = toggleDone(done, '2026-11-23');
  assert.equal(isDoneToday(undone, '2026-11-23'), false);
});

test('toggleDone tidak memutasi jadwal lama', () => {
  const s = base();
  toggleDone(s, '2026-11-23');
  assert.deepEqual(s.riwayat, []);
});

test('updateSchedule mengganti jam tanpa memutasi daftar', () => {
  const list = [base()];
  const next = updateSchedule(list, 's1', { jam: '08:00' });
  assert.equal(next[0].jam, '08:00');
  assert.equal(list[0].jam, '07:00');
});

test('deleteSchedule membuang satu jadwal', () => {
  const list = [base(), createSchedule({ petId: 'p1', perawatan: 'mandi', jam: '17:00' }, 's2')];
  assert.deepEqual(deleteSchedule(list, 's1').map((s) => s.id), ['s2']);
});

test('isDuplicateSchedule mendeteksi hewan, perawatan, dan jam yang sama', () => {
  const list = [base()];
  assert.equal(
    isDuplicateSchedule(list, { petId: 'p1', perawatan: 'makan', jam: '07:00' }),
    true
  );
  assert.equal(
    isDuplicateSchedule(list, { petId: 'p2', perawatan: 'makan', jam: '07:00' }),
    false
  );
  assert.equal(
    isDuplicateSchedule(list, { petId: 'p1', perawatan: 'makan', jam: '07:00' }, 's1'),
    false
  );
});

test('groupByJam mengelompokkan dan mengurutkan', () => {
  const list = [
    createSchedule({ petId: 'p1', perawatan: 'mandi', jam: '17:00' }, 's2'),
    base(),
  ];
  assert.deepEqual(groupByJam(list).map((g) => g.jam), ['07:00', '17:00']);
  assert.equal(groupByJam(list)[0].items[0].id, 's1');
});
