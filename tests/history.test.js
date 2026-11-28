const test = require('node:test');
const assert = require('node:assert');
const {
  dateKeyFor,
  buildCalendar,
  monthSummary,
  perPetCounts,
  currentStreak,
} = require('../src/logic/history');

const schedules = [
  {
    id: 's1',
    petId: 'p1',
    riwayat: ['2026-11-01', '2026-11-02', '2026-11-27'],
  },
  {
    id: 's2',
    petId: 'p2',
    riwayat: ['2026-11-02', '2026-10-31'],
  },
];

test('dateKeyFor membuat tanggal lokal dengan nol di depan', () => {
  assert.equal(dateKeyFor(2026, 10, 5), '2026-11-05');
});

test('monthSummary hanya menghitung tanggal di bulan yang dipilih', () => {
  const summary = monthSummary(schedules, 2026, 10);
  assert.equal(summary.total, 4);
  assert.equal(summary.activeDays, 3);
  assert.deepEqual(summary.counts, {
    '2026-11-01': 1,
    '2026-11-02': 2,
    '2026-11-27': 1,
  });
});

test('perPetCounts mengelompokkan jumlah selesai per hewan', () => {
  assert.deepEqual(perPetCounts(schedules, 2026, 10), { p1: 3, p2: 1 });
});

test('currentStreak menghitung hari berurutan sampai hari ini', () => {
  const riwayat = [
    { riwayat: ['2026-11-25', '2026-11-26', '2026-11-27'] },
    { riwayat: ['2026-11-26'] },
  ];
  assert.equal(currentStreak(riwayat, '2026-11-27'), 3);
  assert.equal(currentStreak(riwayat, '2026-11-28'), 3);
  assert.equal(currentStreak([{ riwayat: ['2026-11-25'] }], '2026-11-27'), 0);
});

test('buildCalendar menyusun minggu Senin-Minggu untuk November 2026', () => {
  const weeks = buildCalendar(2026, 10);
  assert.equal(weeks.length, 6);
  assert.equal(weeks[0][6].day, 1);
  assert.equal(weeks[0][5], null);
  assert.equal(weeks[5][0].day, 30);
  assert.equal(weeks[5][6], null);
});
