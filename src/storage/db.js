const AsyncStorage = require('@react-native-async-storage/async-storage').default;

const PETS_KEY = '@pets';
const SCHEDULES_KEY = '@schedules';
const PERAWATAN_KUSTOM_KEY = '@perawatanKustom';

function parseStoredArray(raw) {
  if (!raw) return [];
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Data tersimpan tidak valid.');
  }
  if (!Array.isArray(parsed)) {
    throw new Error('Data tersimpan tidak valid.');
  }
  return parsed;
}

async function readJson(key) {
  const raw = await AsyncStorage.getItem(key);
  return parseStoredArray(raw);
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

async function saveAll({ pets, schedules, perawatanKustom }) {
  const entries = [];
  if (pets !== undefined) entries.push([PETS_KEY, JSON.stringify(pets)]);
  if (schedules !== undefined) entries.push([SCHEDULES_KEY, JSON.stringify(schedules)]);
  if (perawatanKustom !== undefined) {
    entries.push([PERAWATAN_KUSTOM_KEY, JSON.stringify(perawatanKustom)]);
  }
  await AsyncStorage.multiSet(entries);
}

async function clearAll() {
  await AsyncStorage.multiRemove([PETS_KEY, SCHEDULES_KEY, PERAWATAN_KUSTOM_KEY]);
}

module.exports = {
  PETS_KEY,
  SCHEDULES_KEY,
  PERAWATAN_KUSTOM_KEY,
  parseStoredArray,
  loadPets,
  savePets,
  loadSchedules,
  saveSchedules,
  loadPerawatanKustom,
  savePerawatanKustom,
  loadAll,
  saveAll,
  clearAll,
};
