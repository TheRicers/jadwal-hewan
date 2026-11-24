# Jenis Perawatan Kustom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reusable, named custom care types that can be created, renamed, and deleted, with names shown in schedules and notifications.

**Architecture:** Keep Makan/Mandi built in; store custom types under `@perawatanKustom` as `{ id, nama }` and reference them from schedules as `custom:<id>`. Pure helpers in `src/logic/perawatan.js` resolve labels, validate names, convert schedules, and build notification copy; the form manages types through small modals, and the list screen and notifications use the same helpers.

**Tech Stack:** JavaScript (CommonJS), Expo SDK 58, React Native 0.88, AsyncStorage, expo-notifications, `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-24-perawatan-kustom-design.md`

## Global Constraints

- Stay on Expo Go SDK 58; add no dependencies.
- JavaScript with CommonJS `require`/`module.exports`, matching existing files.
- All data stays in AsyncStorage; no backend.
- Existing schedules with `perawatan: 'lainnya'` must keep rendering and saving as "Lainnya".
- Custom name rules: trim, required, max 30 characters, unique case-insensitively, and not Makan/Mandi/Lainnya.
- Every custom type uses the 🐾 icon.
- All user-facing copy is Indonesian.
- Custom notification copy is exactly `Jangan lupa <nama> hewan peliharaanmu.`
- Verification commands: `npm test` and `npx expo lint`.

## Review Focus

- Schedules with legacy `lainnya`, a missing custom id, or an unknown value must render as "Lainnya" and stay editable/saveable.
- Rename/delete must keep schedules and their notifications consistent, including schedules with `notificationId: null` when permission was denied.
- Name edge cases — whitespace only, case variants, 30/31 characters, reserved names — must behave the same on add and rename.
- Existing installs with no `@perawatanKustom` key, or old `@schedules` entries, must keep their data.
- Deleting the type currently selected in the form must not leave a dangling `custom:<deleted>` selection that gets saved.

---

### Task 1: Pure care-type logic

**Files:**
- Create: `src/logic/perawatan.js`
- Test: `tests/perawatan.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `BUILTIN_PERAWATAN`: `[{ value: 'makan', label: 'Makan', icon: '🍽️' }, { value: 'mandi', label: 'Mandi', icon: '🛁' }]`
  - `customPerawatanValue(id) -> string` (`custom:<id>`)
  - `resolvePerawatan(value, perawatanKustom = []) -> { label: string, icon: string }`
  - `validateNamaPerawatan(nama, perawatanKustom = [], excludeId = null) -> string | null`
  - `createPerawatanKustom(nama, id) -> { id, nama }`
  - `renamePerawatanKustom(daftar, id, nama) -> Array<{ id, nama }>`
  - `removePerawatanKustom(daftar, id) -> Array<{ id, nama }>`
  - `schedulesUsingPerawatan(jadwal, value) -> Array`
  - `detachPerawatanKustom(jadwal, value) -> Array` (matching entries become `perawatan: 'lainnya'`)
  - `bodyNotifikasiPerawatan(value, perawatanKustom = []) -> string`

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test`
Expected: FAIL because `src/logic/perawatan.js` does not exist.

- [ ] **Step 3: Implement the module**

Create `src/logic/perawatan.js` exporting the interfaces above. Reserve `makan`, `mandi`, and `lainnya` (case-insensitive) and use these exact validation messages: `Nama perawatan wajib diisi.`, `Nama perawatan maksimal 30 karakter.`, `Nama Makan, Mandi, dan Lainnya sudah dipakai.`, `Nama perawatan sudah ada.` Resolve missing or unknown values to `{ label: 'Lainnya', icon: '🐾' }`. `bodyNotifikasiPerawatan` returns the existing Makan/Mandi copy, the custom copy with the stored name unchanged, and the generic `Jangan lupa merawat hewan peliharaanmu.` otherwise.

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm test`
Expected: PASS, including all tests in `tests/perawatan.test.js`.

- [ ] **Step 5: Commit**

```bash
git add src/logic/perawatan.js tests/perawatan.test.js
git commit -m "feat: add custom care type logic"
```

---

### Task 2: Persistence, notification copy, and app startup

**Files:**
- Modify: `src/storage/db.js`
- Modify: `src/notifications.js`
- Modify: `App.js`

**Interfaces:**
- Consumes: `bodyNotifikasiPerawatan(value, perawatanKustom = [])` from Task 1.
- Produces:
  - `PERAWATAN_KUSTOM_KEY` (`'@perawatanKustom'`)
  - `loadPerawatanKustom() -> Promise<Array<{ id, nama }>>`
  - `savePerawatanKustom(daftar) -> Promise<void>`
  - `loadAll() -> Promise<{ pets, schedules, perawatanKustom }>`
  - `scheduleDaily(schedule, perawatanKustom = [])`
  - `rescheduleMissing(schedules, perawatanKustom = [])`

- [ ] **Step 1: Add the new AsyncStorage key and loaders**

In `src/storage/db.js`, add `PERAWATAN_KUSTOM_KEY = '@perawatanKustom'`, `loadPerawatanKustom`, and `savePerawatanKustom` using the existing `readJson`/`writeJson` helpers. Extend `loadAll` to load all three keys in parallel and return `perawatanKustom` alongside `pets` and `schedules`. Export the new key and functions.

- [ ] **Step 2: Delegate notification copy and pass custom types through**

In `src/notifications.js`, remove the local `bodyFor` logic and require `bodyNotifikasiPerawatan` from `./logic/perawatan`. Change `scheduleDaily(schedule, perawatanKustom = [])` to use `bodyNotifikasiPerawatan(schedule.perawatan, perawatanKustom)`, and pass `perawatanKustom` through `rescheduleMissing(schedules, perawatanKustom = [])`.

- [ ] **Step 3: Load custom types during startup rescheduling**

In `App.js`, import `loadPerawatanKustom` and load it together with schedules before calling `rescheduleMissing(schedules, perawatanKustom)`. A missing key must behave as an empty array.

- [ ] **Step 4: Verify**

Run: `npm test`
Expected: PASS.

Run: `npx expo lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/storage/db.js src/notifications.js App.js
git commit -m "feat: persist custom care types and use names in notifications"
```

---

### Task 3: Name modal and custom chips in the schedule form

**Files:**
- Create: `src/components/PerawatanModal.js`
- Modify: `src/screens/JadwalFormScreen.js`

**Interfaces:**
- Consumes: Task 1 helpers, Task 2 storage functions, and `scheduleDaily(schedule, perawatanKustom)`.
- Produces:
  - `NamaPerawatanModal({ visible, mode, initialNama, onClose, onSubmit })`
    - `mode`: `'tambah' | 'ubah'`
    - `onSubmit(nama) -> Promise<string | null>`; a returned string is displayed as the modal error, `null` closes it.
  - Form supports adding a custom type with `+ Baru` and selecting it for the current schedule.

- [ ] **Step 1: Create the name modal component**

Create `src/components/PerawatanModal.js` with the `NamaPerawatanModal` export. Follow the modal styling in `HewanScreen.js`: transparent overlay, `KeyboardAvoidingView`, title (`Jenis Perawatan Baru` or `Ubah Jenis Perawatan`), a `TextInput` with `autoFocus` and `maxLength={30}`, an error text when `onSubmit` returns a message, and Batal/Simpan buttons. Reset the input and error whenever `visible` or `initialNama` changes. Disable the Simpan button while submitting and show `Menyimpan…`.

- [ ] **Step 2: Load custom types and render chips**

In `src/screens/JadwalFormScreen.js`, remove the local `PERAWATAN` array and use `BUILTIN_PERAWATAN` plus form state `perawatanKustom`. Replace the load call with `loadAll()` and store `data.perawatanKustom`. Render built-in chips, one chip per custom type (`customPerawatanValue(item.id)`, label `item.nama`, icon `🐾`), and a dashed `+ Baru` chip. Keep the selected state using the same `perawatan` value. Change the row style to wrap so any number of chips fits.

- [ ] **Step 3: Wire the add flow**

Add state `namaModal` (`{ mode: 'tambah' }` or null). `+ Baru` opens it. Render `NamaPerawatanModal` from the form; wrap the existing `ScrollView` and modal in a fragment. On submit, validate with `validateNamaPerawatan(nama, perawatanKustom)`, create the type with `newId()` and `createPerawatanKustom`, persist it with `savePerawatanKustom`, then update state, select `customPerawatanValue(created.id)`, and close the modal. Return the validation or save error message to the modal.

- [ ] **Step 4: Pass custom types when scheduling notifications**

Change both `scheduleDaily(...)` calls in `handleSave` to `scheduleDaily(schedule, perawatanKustom)`.

- [ ] **Step 5: Verify**

Run: `npm test`
Expected: PASS.

Run: `npx expo lint`
Expected: no errors.

Manual check in Expo Go: open Tambah Jadwal, tap `+ Baru`, add `Grooming`, confirm the new chip is selected, save, and confirm the schedule appears with "Grooming".

- [ ] **Step 6: Commit**

```bash
git add src/components/PerawatanModal.js src/screens/JadwalFormScreen.js
git commit -m "feat: add custom care type chips to schedule form"
```

---

### Task 4: Manage, rename, and delete custom types

**Files:**
- Modify: `src/components/PerawatanModal.js`
- Modify: `src/screens/JadwalFormScreen.js`

**Interfaces:**
- Consumes: Task 1 helpers, Task 2 storage and notification functions, and Task 3 form state.
- Produces:
  - `KelolaPerawatanModal({ visible, perawatanKustom, onClose, onUbah, onHapus })`
  - `handleNamaSubmit` handles `mode === 'ubah'` and reschedules affected notifications.
  - Deleting a type detaches its schedules to `lainnya` and reschedules them.

- [ ] **Step 1: Add the management modal**

Extend `src/components/PerawatanModal.js` with `KelolaPerawatanModal`. Show a scrollable list of `🐾 <nama>` rows with `Ubah` and `Hapus` actions, an empty message `Belum ada jenis perawatan kustom. Tambahkan lewat chip + Baru.`, and a Tutup button.

- [ ] **Step 2: Add the Kelola link and rename flow**

In the form, put a `Kelola` text link in a row with the `Jenis perawatan` label; it opens `KelolaPerawatanModal`. `Ubah` closes the management modal and opens `NamaPerawatanModal` in `ubah` mode with the current name. Extend `handleNamaSubmit`: validate with `validateNamaPerawatan(nama, perawatanKustom, target.id)`, persist `renamePerawatanKustom(...)`, then update state and close. Reschedule schedules using the type so notification copy changes:

```js
const value = customPerawatanValue(target.id);
const schedules = await loadSchedules();
const affected = schedulesUsingPerawatan(schedules, value);
let next = schedules;
for (const schedule of affected) {
  await cancelNotification(schedule.notificationId);
  const notificationId = await scheduleDaily(schedule, nextTypes);
  next = updateSchedule(next, schedule.id, { notificationId });
}
await saveSchedules(next);
```

If type saving succeeds but rescheduling fails, keep the rename and show an alert; do not roll it back.

- [ ] **Step 3: Add the delete flow**

`Hapus` loads schedules and counts those using `customPerawatanValue(item.id)`. Confirm with `Hapus jenis perawatan?` and a body that says either `<n> jadwal yang memakai jenis ini akan diubah menjadi Lainnya.` or `Jenis <nama> akan dihapus.` On confirm:

1. Compute `nextTypes = removePerawatanKustom(perawatanKustom, item.id)`.
2. Compute `detached = detachPerawatanKustom(schedules, value)`.
3. For each affected schedule, find `const detachedSchedule = detached.find((item) => item.id === schedule.id)`, cancel the old notification, call `scheduleDaily(detachedSchedule, nextTypes)`, and store the new `notificationId` with `updateSchedule`.
4. Save custom types and schedules, update form state, and if `perawatan === value` switch the selection to `'makan'`.

- [ ] **Step 4: Verify**

Run: `npm test`
Expected: PASS.

Run: `npx expo lint`
Expected: no errors.

Manual checks in Expo Go:
- Use a custom type on two schedules, rename it, and confirm both rows and the notification copy use the new name.
- Delete a used type, confirm the count message, and confirm those schedules become "Lainnya".
- Delete the currently selected type while creating a schedule and confirm Makan becomes selected.
- Turn notifications off/deny permission, then rename and delete types; no crash and schedules remain intact.

- [ ] **Step 5: Commit**

```bash
git add src/components/PerawatanModal.js src/screens/JadwalFormScreen.js
git commit -m "feat: manage and reschedule custom care types"
```

---

### Task 5: Show custom names in the schedule list

**Files:**
- Modify: `src/screens/JadwalListScreen.js`

**Interfaces:**
- Consumes: `loadAll()` returning `perawatanKustom` and `resolvePerawatan(value, perawatanKustom)`.
- Produces: list rows, delete confirmation, and accessibility labels using the resolved custom name.

- [ ] **Step 1: Resolve labels from custom types**

Remove the local `PERAWATAN` map. Add `perawatanKustom` state, store `data.perawatanKustom` from `loadAll`, and replace both lookups (`handleDelete` and `renderItem`) with `resolvePerawatan(schedule.perawatan, perawatanKustom)`. The fallback must still render "Lainnya" for old data.

- [ ] **Step 2: Verify**

Run: `npm test`
Expected: PASS.

Run: `npx expo lint`
Expected: no errors.

Manual end-to-end checks in Expo Go:
- A pre-existing schedule saved as `lainnya` shows "Lainnya", opens in the form, and saves without errors.
- A schedule using a custom type shows its name and icon in the list and in the delete confirmation.
- Starting with no `@perawatanKustom` key (fresh install or cleared key) shows only Makan/Mandi and `+ Baru`; adding the first type works.
- Rename a type used by an existing schedule and confirm the list updates after returning to it.
- Delete a type used by an existing schedule and confirm the list shows "Lainnya" for that schedule.

- [ ] **Step 3: Commit**

```bash
git add src/screens/JadwalListScreen.js
git commit -m "feat: show custom care names in schedule list"
```
