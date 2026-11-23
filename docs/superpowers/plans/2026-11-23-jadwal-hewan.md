# Jadwal Merawat Hewan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplikasi Expo Go offline untuk CRUD jadwal harian perawatan hewan dengan notifikasi lokal.

**Architecture:** Tiga layar React Navigation, logika CRUD murni dipisah dari UI dan diuji dengan `node --test`, penyimpanan AsyncStorage, pengingat harian `expo-notifications`.

**Tech Stack:** Expo SDK 58, JavaScript, React Navigation native-stack, AsyncStorage, expo-notifications, @react-native-community/datetimepicker, node:test.

**Spec:** `docs/superpowers/specs/2026-11-23-jadwal-hewan-design.md`

## Global Constraints

- Harus berjalan di Expo Go; tidak boleh memakai modul native yang tidak dibundel Expo Go.
- Tanpa backend, tanpa login, tanpa internet saat digunakan.
- Data hanya di AsyncStorage key `@pets` dan `@schedules`.
- Tanggal lokal format `YYYY-MM-DD`; jam format `HH:mm` 24 jam.
- Semua ID string unik dari `newId()`.
- Bahasa UI: Indonesia.

## Review Focus

1. Jam tidak valid (`7:5`, `25:00`, kosong) ditolak dengan pesan, bukan crash.
2. Nama hewan kosong atau hanya spasi ditolak.
3. Menghapus hewan ikut menghapus jadwalnya dan membatalkan notifikasinya.
4. Izin notifikasi ditolak: CRUD tetap berjalan, tidak ada crash.
5. Edit jam jadwal membatalkan notifikasi lama (tidak ada notifikasi ganda).

---

### Task 1: Scaffold proyek dan dependensi

**Files:**
- Create: `package.json`, `app.json`, `App.js`, `index.js`, `babel.config.js` (dari template)
- Create: `docs/superpowers/specs/2026-11-23-jadwal-hewan-design.md`
- Create: `docs/superpowers/plans/2026-11-23-jadwal-hewan.md`

**Interfaces:**
- Produces: proyek Expo SDK 58 yang bisa dijalankan dengan `npx expo start`.

- [ ] **Step 1: Buat proyek dan pasang dependensi**

```bash
npx create-expo-app@latest jadwal-hewan --template blank
cd jadwal-hewan
npx expo install @react-native-async-storage/async-storage expo-notifications @react-native-community/datetimepicker react-native-screens react-native-safe-area-context
npm i @react-navigation/native @react-navigation/native-stack
```

- [ ] **Step 2: Verifikasi dependensi terpasang**

Run: `node -p "Object.keys(require('./package.json').dependencies).join('\n')"`
Expected: memuat `expo`, `expo-notifications`, `@react-native-async-storage/async-storage`, `@react-navigation/native`, `@react-navigation/native-stack`, `@react-native-community/datetimepicker`.

- [ ] **Step 3: Tambah script tes di `package.json`**

```json
"test": "node --test tests/"
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold expo app with dependencies"
```

### Task 2: Utilitas tanggal dan ID

**Files:**
- Create: `src/utils/date.js`
- Create: `src/utils/id.js`
- Test: `tests/date.test.js`, `tests/id.test.js`

**Interfaces:**
- Produces:
  - `todayKey(now?: Date) -> string` format `YYYY-MM-DD`, waktu lokal.
  - `isValidJam(jam: string) -> boolean` menerima `00:00`–`23:59`.
  - `formatJam(jam: string) -> string` mengembalikan `HH:mm` apa adanya setelah validasi.
  - `newId() -> string` unik.

- [ ] **Step 1: Tulis tes yang gagal**

```js
// tests/date.test.js
const test = require('node:test');
const assert = require('node:assert');
const { todayKey, isValidJam } = require('../src/utils/date');

test('todayKey memakai tanggal lokal', () => {
  assert.equal(todayKey(new Date(2026, 10, 23, 23, 30)), '2026-11-23');
});

test('isValidJam menerima jam valid', () => {
  assert.equal(isValidJam('00:00'), true);
  assert.equal(isValidJam('23:59'), true);
});

test('isValidJam menolak jam tidak valid', () => {
  assert.equal(isValidJam('7:5'), false);
  assert.equal(isValidJam('25:00'), false);
  assert.equal(isValidJam(''), false);
});
```

```js
// tests/id.test.js
const test = require('node:test');
const assert = require('node:assert');
const { newId } = require('../src/utils/id');

test('newId menghasilkan id unik', () => {
  const ids = new Set(Array.from({ length: 200 }, () => newId()));
  assert.equal(ids.size, 200);
});
```

- [ ] **Step 2: Jalankan tes, pastikan gagal**

Run: `npm test`
Expected: FAIL karena `src/utils/date.js` belum ada.

- [ ] **Step 3: Implementasi**

```js
// src/utils/date.js
function todayKey(now = new Date()) { /* tahun-bulan-tanggal lokal, 2 digit */ }
function isValidJam(jam) { /* /^([01]\d|2[0-3]):[0-5]\d$/ */ }
function formatJam(jam) { /* validasi lalu kembalikan jam */ }
module.exports = { todayKey, isValidJam, formatJam };
```

```js
// src/utils/id.js
function newId() { /* Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8) */ }
module.exports = { newId };
```

- [ ] **Step 4: Jalankan tes**

Run: `npm test`
Expected: PASS untuk `date.test.js` dan `id.test.js`.

- [ ] **Step 5: Commit**

```bash
git add src/utils tests
git commit -m "feat: date and id utilities"
```

### Task 3: Logika jadwal dan hewan

**Files:**
- Create: `src/logic/schedules.js`
- Create: `src/logic/pets.js`
- Test: `tests/schedules.test.js`, `tests/pets.test.js`

**Interfaces:**
- Consumes: `todayKey`, `newId`.
- Produces:
  - `createSchedule({ petId, perawatan, jam }, id) -> schedule` (`riwayat: []`, `notificationId: null`).
  - `updateSchedule(schedules, id, patch) -> schedules` (baru, tidak memutasi).
  - `deleteSchedule(schedules, id) -> schedules`.
  - `isDoneToday(schedule, dateKey) -> boolean`.
  - `toggleDone(schedule, dateKey) -> schedule`.
  - `groupByJam(schedules) -> [{ jam, items }]`, urut jam naik.
  - `deletePet(pets, schedules, petId) -> { pets, schedules, removed }`; `removed` adalah jadwal yang ikut terhapus.

- [ ] **Step 1: Tulis tes yang gagal**

```js
// tests/schedules.test.js
const test = require('node:test');
const assert = require('node:assert');
const {
  createSchedule, updateSchedule, deleteSchedule,
  isDoneToday, toggleDone, groupByJam,
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

test('groupByJam mengelompokkan dan mengurutkan', () => {
  const list = [
    createSchedule({ petId: 'p1', perawatan: 'mandi', jam: '17:00' }, 's2'),
    base(),
  ];
  assert.deepEqual(groupByJam(list).map((g) => g.jam), ['07:00', '17:00']);
  assert.equal(groupByJam(list)[0].items[0].id, 's1');
});
```

```js
// tests/pets.test.js
const test = require('node:test');
const assert = require('node:assert');
const { deletePet } = require('../src/logic/pets');

test('deletePet menghapus hewan beserta jadwalnya', () => {
  const pets = [{ id: 'p1', nama: 'Milo', jenis: 'Kucing' }, { id: 'p2', nama: 'Bruno', jenis: 'Anjing' }];
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
```

- [ ] **Step 2: Jalankan tes, pastikan gagal**

Run: `npm test`
Expected: FAIL karena `src/logic/schedules.js` dan `src/logic/pets.js` belum ada.

- [ ] **Step 3: Implementasi**

Buat kedua modul. Semua fungsi mengembalikan struktur baru, tidak memutasi input. `groupByJam` mengurutkan berdasarkan string `HH:mm` (format 24 jam sehingga urutan leksikal = urutan waktu).

- [ ] **Step 4: Jalankan tes**

Run: `npm test`
Expected: PASS semua tes.

- [ ] **Step 5: Commit**

```bash
git add src/logic tests
git commit -m "feat: pure schedule and pet logic with tests"
```

### Task 4: Penyimpanan AsyncStorage

**Files:**
- Create: `src/storage/db.js`

**Interfaces:**
- Produces:
  - `loadPets() -> Promise<Pet[]>`, `savePets(pets) -> Promise<void>`
  - `loadSchedules() -> Promise<Schedule[]>`, `saveSchedules(list) -> Promise<void>`
  - `loadAll() -> Promise<{ pets, schedules }>` (paralel).

- [ ] **Step 1: Implementasi**

```js
// src/storage/db.js
const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const PETS_KEY = '@pets';
const SCHEDULES_KEY = '@schedules';
async function readJson(key) { /* getItem, JSON.parse, fallback [] bila kosong/rusak */ }
async function writeJson(key, value) { /* setItem JSON.stringify */ }
async function loadPets() { return readJson(PETS_KEY); }
async function savePets(pets) { return writeJson(PETS_KEY, pets); }
async function loadSchedules() { return readJson(SCHEDULES_KEY); }
async function saveSchedules(list) { return writeJson(SCHEDULES_KEY, list); }
async function loadAll() { /* Promise.all */ }
module.exports = { loadPets, savePets, loadSchedules, saveSchedules, loadAll };
```

- [ ] **Step 2: Verifikasi tidak ada error sintaks**

Run: `node --check src/storage/db.js`
Expected: tidak ada output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/storage
git commit -m "feat: async storage layer"
```

### Task 5: Modul notifikasi

**Files:**
- Create: `src/notifications.js`

**Interfaces:**
- Consumes: jadwal dengan `jam` `HH:mm`.
- Produces:
  - `setupNotifications() -> Promise<boolean>` — buat channel Android, minta izin, `true` bila diizinkan.
  - `scheduleDaily(schedule) -> Promise<string|null>` — `DAILY` {hour, minute}, mengembalikan `notificationId`.
  - `cancelNotification(notificationId) -> Promise<void>` — abaikan bila `null`.
  - `rescheduleMissing(schedules) -> Promise<Schedule[]>` — isi `notificationId` yang kosong.

- [ ] **Step 1: Implementasi**

```js
// src/notifications.js
const Notifications = require('expo-notifications');
const { Platform } = require('react-native');
const CHANNEL_ID = 'jadwal-perawatan';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, shouldShowList: true,
    shouldPlaySound: true, shouldSetBadge: false,
  }),
});

async function setupNotifications() { /* channel Android + get/request permissions */ }
async function scheduleDaily(schedule) { /* trigger { type: DAILY, hour, minute, channelId } */ }
async function cancelNotification(id) { /* cancelScheduledNotificationAsync bila id */ }
async function rescheduleMissing(list) { /* scheduleDaily untuk notificationId null */ }
module.exports = { setupNotifications, scheduleDaily, cancelNotification, rescheduleMissing };
```

- [ ] **Step 2: Verifikasi sintaks**

Run: `node --check src/notifications.js`
Expected: exit 0.

- [ ] **Step 3: Verifikasi manual di Expo Go (dilakukan saat Task 9 selesai)**

Jadwalkan notifikasi uji 1 menit ke depan dari layar sementara; kunci HP; notifikasi muncul. Hapus tombol uji setelah lolos.

- [ ] **Step 4: Commit**

```bash
git add src/notifications.js
git commit -m "feat: local daily notifications"
```

### Task 6: Kerangka navigasi dan tema

**Files:**
- Modify: `App.js`
- Create: `src/screens/JadwalListScreen.js`, `src/screens/JadwalFormScreen.js`, `src/screens/HewanScreen.js`
- Create: `src/theme.js`

**Interfaces:**
- Produces: rute `JadwalList`, `JadwalForm` (params `{ scheduleId? }`), `Hewan`.

- [ ] **Step 1: Implementasi**

`App.js`: `NavigationContainer` + `createNativeStackNavigator`, header berwarna tema, judul "Jadwal Perawatan" dan "Hewan Saya". Ketiga layar sementara berisi `View` + `Text` judul.

- [ ] **Step 2: Verifikasi sintaks**

Run: `node --check App.js && node --check src/screens/JadwalListScreen.js && node --check src/screens/JadwalFormScreen.js && node --check src/screens/HewanScreen.js`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add App.js src/screens src/theme.js
git commit -m "feat: navigation shell"
```

### Task 7: Layar Daftar Jadwal

**Files:**
- Modify: `src/screens/JadwalListScreen.js`

**Interfaces:**
- Consumes: `loadAll`, `saveSchedules`, `groupByJam`, `toggleDone`, `isDoneToday`, `deleteSchedule`, `cancelNotification`, `todayKey`.

- [ ] **Step 1: Implementasi**

`useFocusEffect` memuat data. `SectionList` per jam. Baris: nama hewan (cari dari `pets`), label perawatan, jam, tombol centang (toggle `riwayat` + simpan), tombol hapus (konfirmasi → `cancelNotification` → `deleteSchedule` → simpan). FAB "+" ke `JadwalForm`. Tombol header ke `Hewan`. Empty state "Belum ada jadwal".

- [ ] **Step 2: Verifikasi sintaks**

Run: `node --check src/screens/JadwalListScreen.js`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/screens/JadwalListScreen.js
git commit -m "feat: schedule list screen"
```

### Task 8: Form Tambah/Edit Jadwal

**Files:**
- Modify: `src/screens/JadwalFormScreen.js`

**Interfaces:**
- Consumes: `loadPets`, `loadSchedules`, `saveSchedules`, `createSchedule`, `updateSchedule`, `isValidJam`, `newId`, `scheduleDaily`, `cancelNotification`.
- Produces: menyimpan `notificationId` hasil `scheduleDaily` ke jadwal.

- [ ] **Step 1: Implementasi**

Params `scheduleId` opsional untuk mode edit. State: `petId`, `perawatan`, `jam` (`Date` untuk picker). Validasi: hewan dipilih, jam valid; tampilkan `Alert`/teks error. Simpan: batalkan notifikasi lama bila ada, susun jadwal baru, `scheduleDaily`, simpan daftar, `navigation.goBack()`.

- [ ] **Step 2: Verifikasi sintaks**

Run: `node --check src/screens/JadwalFormScreen.js`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/screens/JadwalFormScreen.js
git commit -m "feat: add and edit schedule form"
```

### Task 9: Layar Hewan

**Files:**
- Modify: `src/screens/HewanScreen.js`

**Interfaces:**
- Consumes: `loadAll`, `savePets`, `saveSchedules`, `deletePet`, `newId`, `cancelNotification`.

- [ ] **Step 1: Implementasi**

Daftar hewan dengan tombol edit/hapus. Form tambah/edit memakai `Modal` + `TextInput` nama dan jenis; nama wajib (trim tidak kosong). Hapus: konfirmasi → `deletePet` → `cancelNotification` untuk tiap `removed` → simpan kedua key.

- [ ] **Step 2: Verifikasi sintaks**

Run: `node --check src/screens/HewanScreen.js`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/screens/HewanScreen.js
git commit -m "feat: pet management screen"
```

### Task 10: Penjadwalan ulang saat mulai dan penanganan izin

**Files:**
- Modify: `App.js`

**Interfaces:**
- Consumes: `setupNotifications`, `rescheduleMissing`, `loadSchedules`, `saveSchedules`.

- [ ] **Step 1: Implementasi**

Di `useEffect` App: `setupNotifications()`, lalu `rescheduleMissing(await loadSchedules())` dan simpan bila berubah. Bila izin `false`, tampilkan banner kecil "Notifikasi nonaktif" (state di App, diteruskan lewat context sederhana atau prop screen).

- [ ] **Step 2: Verifikasi sintaks**

Run: `node --check App.js`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add App.js
git commit -m "feat: reschedule on startup and permission banner"
```

### Task 11: Uji terima dan README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Jalankan seluruh tes otomatis**

Run: `npm test`
Expected: PASS semua.

- [ ] **Step 2: Uji manual di Expo Go**

Checklist: tambah hewan; tambah jadwal; edit jam; centang selesai; hapus jadwal; hapus hewan (jadwal ikut hilang); tutup-buka aplikasi (data tetap); izin notifikasi ditolak (CRUD tetap jalan); notifikasi harian berbunyi.

- [ ] **Step 3: Tulis README**

Cara menjalankan (`npm install`, `npx expo start`, scan QR Expo Go), struktur data, dan keterbatasan (notifikasi tetap berbunyi walau sudah dicentang; Expo Go tidak bisa build APK).

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: readme and acceptance notes"
```
