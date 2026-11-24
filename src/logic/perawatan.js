const BUILTIN_PERAWATAN = [
  { value: 'makan', label: 'Makan', icon: '🍽️' },
  { value: 'mandi', label: 'Mandi', icon: '🛁' },
];

const CUSTOM_PREFIX = 'custom:';
const MAX_NAMA = 30;
const LAINNYA = { label: 'Lainnya', icon: '🐾' };
const RESERVED_NAMA = ['makan', 'mandi', 'lainnya'];

function customPerawatanValue(id) {
  return `${CUSTOM_PREFIX}${id}`;
}

function findCustom(value, perawatanKustom) {
  if (typeof value !== 'string' || !value.startsWith(CUSTOM_PREFIX)) return null;
  const id = value.slice(CUSTOM_PREFIX.length);
  return perawatanKustom.find((item) => item.id === id) || null;
}

function resolvePerawatan(value, perawatanKustom = []) {
  const builtin = BUILTIN_PERAWATAN.find((item) => item.value === value);
  if (builtin) return { label: builtin.label, icon: builtin.icon };

  const custom = findCustom(value, perawatanKustom);
  if (custom) return { label: custom.nama, icon: LAINNYA.icon };

  return { ...LAINNYA };
}

function validateNamaPerawatan(nama, perawatanKustom = [], excludeId = null) {
  const bersih = typeof nama === 'string' ? nama.trim() : '';
  if (!bersih) return 'Nama perawatan wajib diisi.';
  if (bersih.length > MAX_NAMA) return 'Nama perawatan maksimal 30 karakter.';

  const kecil = bersih.toLowerCase();
  if (RESERVED_NAMA.includes(kecil)) {
    return 'Nama Makan, Mandi, dan Lainnya sudah dipakai.';
  }

  const duplikat = perawatanKustom.some((item) => (
    item.id !== excludeId
    && typeof item.nama === 'string'
    && item.nama.trim().toLowerCase() === kecil
  ));
  if (duplikat) return 'Nama perawatan sudah ada.';

  return null;
}

function createPerawatanKustom(nama, id) {
  return { id, nama: nama.trim() };
}

function renamePerawatanKustom(daftar, id, nama) {
  return daftar.map((item) => (
    item.id === id ? { ...item, nama: nama.trim() } : item
  ));
}

function removePerawatanKustom(daftar, id) {
  return daftar.filter((item) => item.id !== id);
}

function schedulesUsingPerawatan(jadwal, value) {
  return jadwal.filter((schedule) => schedule.perawatan === value);
}

function detachPerawatanKustom(jadwal, value) {
  return jadwal.map((schedule) => (
    schedule.perawatan === value ? { ...schedule, perawatan: 'lainnya' } : schedule
  ));
}

function bodyNotifikasiPerawatan(value, perawatanKustom = []) {
  if (value === 'makan') return 'Jangan lupa memberi makan hewan peliharaanmu.';
  if (value === 'mandi') return 'Jangan lupa memandikan hewan peliharaanmu.';

  const custom = findCustom(value, perawatanKustom);
  if (custom && custom.nama) return `Jangan lupa ${custom.nama} hewan peliharaanmu.`;

  return 'Jangan lupa merawat hewan peliharaanmu.';
}

module.exports = {
  BUILTIN_PERAWATAN,
  customPerawatanValue,
  resolvePerawatan,
  validateNamaPerawatan,
  createPerawatanKustom,
  renamePerawatanKustom,
  removePerawatanKustom,
  schedulesUsingPerawatan,
  detachPerawatanKustom,
  bodyNotifikasiPerawatan,
};
