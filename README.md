# PetPlanner

Aplikasi mobile sederhana untuk mencatat jadwal harian perawatan hewan
peliharaan — memberi makan, memandikan, dan jenis perawatan kustom — sekaligus
mengingatkannya lewat notifikasi lokal. Dibuat untuk tugas personal mata kuliah
pemrograman mobile.

## Fitur

- CRUD hewan peliharaan (nama dan jenis).
- CRUD jadwal perawatan: hewan, jenis perawatan, dan jam.
- Centang "selesai" per jadwal untuk hari ini.
- Notifikasi pengingat berulang setiap hari pada jam yang dipilih.
- Semua data tersimpan lokal di HP (`AsyncStorage`), tanpa akun, server, atau internet.

## Menjalankan

Prasyarat: Node.js LTS, aplikasi **Expo Go** di HP (Play Store/App Store), dan HP
satu jaringan Wi-Fi dengan komputer.

```bash
npm install
npx expo start
```

Pindai QR yang muncul dengan Expo Go (Android) atau kamera (iOS). Jika HP dan
komputer berbeda jaringan, jalankan `npx expo start --tunnel`.

Perintah lain:

```bash
npm test          # tes logika (node:test)
npx expo start    # jalankan Metro/Expo
```

## Build APK

Project ini memakai Continuous Native Generation, jadi folder `android/` dibuat
otomatis:

```bash
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```

APK ada di `android/app/build/outputs/apk/release/app-release.apk`. Folder
`android/` juga bisa dibuka langsung di Android Studio untuk build lewat GUI.
Build release dari template Expo ditandatangani dengan debug keystore, jadi
cocok untuk instalasi langsung di HP, bukan untuk upload ke Play Store.

## Struktur

```
App.js                        navigasi + penyiapan notifikasi saat mulai
src/screens/JadwalListScreen  daftar jadwal per jam, centang selesai, hapus
src/screens/JadwalFormScreen  form tambah/edit jadwal + pemilih jam
src/screens/HewanScreen       CRUD hewan (hapus ikut menghapus jadwalnya)
src/storage/db.js             baca/tulis AsyncStorage
src/notifications.js          izin, channel Android, jadwal notifikasi harian
src/logic/                    fungsi CRUD murni (diuji otomatis)
src/utils/                    tanggal dan ID
```

## Data

```
@pets:      [{ id, nama, jenis }]
@schedules: [{ id, petId, perawatan, jam, notificationId, riwayat }]
```

`riwayat` berisi tanggal `YYYY-MM-DD` saat jadwal dicentang selesai.

## Keterbatasan

- Notifikasi tetap berbunyi pada hari itu walau jadwal sudah dicentang selesai.
- Notifikasi yang dijadwalkan hilang jika aplikasi dihapus/dipasang ulang.
- Di Expo Go SDK 58, pembuatan channel notifikasi kustom gagal
  (`setNotificationChannelAsync` melempar NullPointerException), sehingga
  pengingat memakai channel bawaan Expo Go. Di development build, channel
  kustom dapat ditambahkan kembali lewat kode/config plugin.
- Push notification dari server tidak didukung Expo Go; aplikasi ini hanya
  memakai notifikasi lokal sehingga tetap berjalan offline.
- Expo Go tidak menghasilkan file APK. Untuk build APK lokal, jalankan
  `npx expo prebuild --platform android`, buka folder `android/` di Android
  Studio, lalu buat signed APK. Alternatifnya memakai EAS Build.
