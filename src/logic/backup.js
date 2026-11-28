const { isValidJam } = require('../utils/date');

const BACKUP_VERSION = 1;
const TANGGAL_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function gagal(pesan) {
  return { valid: false, error: pesan, data: null };
}

function teks(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function createBackup({ pets, schedules, perawatanKustom }, exportedAt = new Date().toISOString()) {
  return {
    app: 'PetPlanner',
    version: BACKUP_VERSION,
    exportedAt,
    pets,
    schedules,
    perawatanKustom,
  };
}

function validateBackup(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return gagal('File backup tidak valid.');
  }
  if (payload.version !== BACKUP_VERSION) {
    return gagal('Versi backup tidak didukung.');
  }
  if (
    !Array.isArray(payload.pets)
    || !Array.isArray(payload.schedules)
    || !Array.isArray(payload.perawatanKustom)
  ) {
    return gagal('Struktur backup tidak lengkap.');
  }

  const pets = [];
  const petIds = new Set();
  for (const item of payload.pets) {
    if (!item || typeof item !== 'object') return gagal('Data hewan di backup tidak valid.');
    const id = teks(item.id);
    const nama = teks(item.nama);
    if (!id || !nama) return gagal('Data hewan di backup tidak lengkap.');
    if (petIds.has(id)) return gagal('ID hewan di backup duplikat.');
    petIds.add(id);
    pets.push({ id, nama, jenis: teks(item.jenis) || 'Hewan' });
  }

  const schedules = [];
  const scheduleIds = new Set();
  for (const item of payload.schedules) {
    if (!item || typeof item !== 'object') return gagal('Data jadwal di backup tidak valid.');
    const id = teks(item.id);
    const petId = teks(item.petId);
    const perawatan = teks(item.perawatan);
    if (!id || !petId || !perawatan || !isValidJam(item.jam)) {
      return gagal('Data jadwal di backup tidak lengkap atau jamnya tidak valid.');
    }
    if (scheduleIds.has(id)) return gagal('ID jadwal di backup duplikat.');
    scheduleIds.add(id);

    const riwayat = item.riwayat === undefined ? [] : item.riwayat;
    if (!Array.isArray(riwayat) || riwayat.some((tanggal) => !TANGGAL_PATTERN.test(tanggal))) {
      return gagal('Riwayat tanggal di backup tidak valid.');
    }

    schedules.push({
      id,
      petId,
      perawatan,
      jam: item.jam,
      riwayat: [...riwayat],
    });
  }

  const perawatanKustom = [];
  const customIds = new Set();
  for (const item of payload.perawatanKustom) {
    if (!item || typeof item !== 'object') return gagal('Data jenis perawatan di backup tidak valid.');
    const id = teks(item.id);
    const nama = teks(item.nama);
    if (!id || !nama) return gagal('Data jenis perawatan di backup tidak lengkap.');
    if (customIds.has(id)) return gagal('ID jenis perawatan di backup duplikat.');
    customIds.add(id);
    perawatanKustom.push({ id, nama });
  }

  return { valid: true, error: null, data: { pets, schedules, perawatanKustom } };
}

module.exports = {
  BACKUP_VERSION,
  createBackup,
  validateBackup,
};
