const test = require('node:test');
const assert = require('node:assert');
const {
  BUILTIN_PERAWATAN,
  bodyNotifikasiPerawatan,
  createPerawatanKustom,
  customPerawatanValue,
  detachPerawatanKustom,
  removePerawatanKustom,
  renamePerawatanKustom,
  resolvePerawatan,
  schedulesUsingPerawatan,
  validateNamaPerawatan,
} = require('../src/logic/perawatan');

const kustom = [{ id: 'c1', nama: 'Grooming' }];

test('BUILTIN_PERAWATAN hanya Makan dan Mandi', () => {
  assert.deepEqual(BUILTIN_PERAWATAN.map((item) => item.label), ['Makan', 'Mandi']);
});

test('resolvePerawatan mengembalikan bawaan, kustom, dan fallback', () => {
  assert.deepEqual(resolvePerawatan('makan'), { label: 'Makan', icon: '🍽️' });
  assert.deepEqual(resolvePerawatan('mandi'), { label: 'Mandi', icon: '🛁' });
  assert.deepEqual(resolvePerawatan(customPerawatanValue('c1'), kustom), {
    label: 'Grooming', icon: '🐾',
  });
  assert.deepEqual(resolvePerawatan('lainnya'), { label: 'Lainnya', icon: '🐾' });
  assert.deepEqual(resolvePerawatan(customPerawatanValue('hilang'), kustom), {
    label: 'Lainnya', icon: '🐾',
  });
});

test('validateNamaPerawatan menolak nama kosong, panjang, bawaan, dan duplikat', () => {
  assert.equal(validateNamaPerawatan('   '), 'Nama perawatan wajib diisi.');
  assert.equal(validateNamaPerawatan('a'.repeat(31)), 'Nama perawatan maksimal 30 karakter.');
  assert.equal(validateNamaPerawatan('a'.repeat(30)), null);
  assert.equal(validateNamaPerawatan('Makan'), 'Nama Makan, Mandi, dan Lainnya sudah dipakai.');
  assert.equal(validateNamaPerawatan('lainnya'), 'Nama Makan, Mandi, dan Lainnya sudah dipakai.');
  assert.equal(validateNamaPerawatan('grooming', kustom), 'Nama perawatan sudah ada.');
  assert.equal(validateNamaPerawatan('Grooming', kustom, 'c1'), null);
});

test('create, rename, dan remove tidak memutasi daftar lama', () => {
  assert.deepEqual(createPerawatanKustom('  Grooming  ', 'c1'), { id: 'c1', nama: 'Grooming' });

  const daftar = [{ id: 'c1', nama: 'Grooming' }, { id: 'c2', nama: 'Vitamin' }];
  const diubah = renamePerawatanKustom(daftar, 'c1', '  Salon  ');
  assert.deepEqual(diubah.map((item) => item.nama), ['Salon', 'Vitamin']);
  assert.equal(daftar[0].nama, 'Grooming');

  const dihapus = removePerawatanKustom(daftar, 'c1');
  assert.deepEqual(dihapus.map((item) => item.id), ['c2']);
  assert.equal(daftar.length, 2);
});

test('schedulesUsingPerawatan dan detachPerawatanKustom hanya menyentuh jenis terkait', () => {
  const jadwal = [
    { id: 's1', perawatan: customPerawatanValue('c1'), jam: '07:00' },
    { id: 's2', perawatan: 'makan', jam: '08:00' },
  ];
  const dipakai = schedulesUsingPerawatan(jadwal, customPerawatanValue('c1'));
  assert.deepEqual(dipakai.map((item) => item.id), ['s1']);

  const dilepas = detachPerawatanKustom(jadwal, customPerawatanValue('c1'));
  assert.equal(dilepas[0].perawatan, 'lainnya');
  assert.equal(dilepas[0].jam, '07:00');
  assert.equal(dilepas[1].perawatan, 'makan');
  assert.equal(jadwal[0].perawatan, customPerawatanValue('c1'));
});

test('bodyNotifikasiPerawatan memakai nama kustom dan pesan lama untuk sisanya', () => {
  assert.equal(bodyNotifikasiPerawatan('makan'), 'Jangan lupa memberi makan hewan peliharaanmu.');
  assert.equal(bodyNotifikasiPerawatan('mandi'), 'Jangan lupa memandikan hewan peliharaanmu.');
  assert.equal(
    bodyNotifikasiPerawatan(customPerawatanValue('c1'), kustom),
    'Jangan lupa Grooming hewan peliharaanmu.'
  );
  assert.equal(bodyNotifikasiPerawatan('lainnya'), 'Jangan lupa merawat hewan peliharaanmu.');
  assert.equal(
    bodyNotifikasiPerawatan(customPerawatanValue('hilang'), kustom),
    'Jangan lupa merawat hewan peliharaanmu.'
  );
});
