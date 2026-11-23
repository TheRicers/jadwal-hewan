# Jadwal Merawat Hewan

Aplikasi mobile sederhana untuk mencatat jadwal harian perawatan hewan
peliharaan (memberi makan dan memandikan) sekaligus mengingatkannya lewat
notifikasi lokal. Dibuat untuk tugas personal mata kuliah pemrograman mobile.

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
  kustom dapat diaktifkan kembali.
- Push notification dari server tidak didukung Expo Go; aplikasi ini hanya
  memakai notifikasi lokal sehingga tetap berjalan offline.
- Expo Go tidak menghasilkan file APK. Untuk itu perlu development build/EAS
  Build, di luar cakupan tugas ini.
