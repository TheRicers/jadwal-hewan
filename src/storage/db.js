const AsyncStorage = require('@react-native-async-storage/async-storage').default;

const PETS_KEY = '@pets';
const SCHEDULES_KEY = '@schedules';
const PERAWATAN_KUSTOM_KEY = '@perawatanKustom';

async function readJson(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn(`Gagal membaca ${key}`, error);
    return [];
  }
}

async function writeJson(key, value) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

async function loadPets() {
  return readJson(PETS_KEY);
}

async function savePets(pets) {
  return writeJson(PETS_KEY, pets);
}

async function loadSchedules() {
  return readJson(SCHEDULES_KEY);
}

async function saveSchedules(schedules) {
  return writeJson(SCHEDULES_KEY, schedules);
}

async function loadPerawatanKustom() {
  return readJson(PERAWATAN_KUSTOM_KEY);
}

async function savePerawatanKustom(perawatanKustom) {
  return writeJson(PERAWATAN_KUSTOM_KEY, perawatanKustom);
}

async function loadAll() {
  const [pets, schedules, perawatanKustom] = await Promise.all([
    loadPets(),
    loadSchedules(),
    loadPerawatanKustom(),
  ]);
  return { pets, schedules, perawatanKustom };
}

module.exports = {
  PETS_KEY,
  SCHEDULES_KEY,
  PERAWATAN_KUSTOM_KEY,
  loadPets,
  savePets,
  loadSchedules,
  saveSchedules,
  loadPerawatanKustom,
  savePerawatanKustom,
  loadAll,
};
