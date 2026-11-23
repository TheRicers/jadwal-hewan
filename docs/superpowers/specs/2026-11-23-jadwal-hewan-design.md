# Desain: Jadwal Merawat Hewan

## Tujuan

Aplikasi mobile lokal (Expo Go) untuk mencatat jadwal harian perawatan hewan
peliharaan — memberi makan dan memandikan — serta mengingatkannya dengan
notifikasi lokal. Tugas personal, menekankan CRUD dasar.

## Bukan cakupan

Login, backend/cloud, push notification dari server, foto hewan, grafik
riwayat, multi-pengguna, build APK/EAS.

## Batasan

- Harus berjalan di Expo Go tanpa development build.
- Tanpa internet saat digunakan; data hanya di perangkat.
- JavaScript, Expo SDK 58, React Navigation native-stack.
- Tanggal dan jam memakai waktu lokal perangkat.
- ID berupa string unik yang dibuat sendiri (tanpa dependensi uuid).

## Pendekatan yang dipilih

**B. Beberapa layar dengan React Navigation** — dipilih pengguna. Alternatif
satu layar + modal (A) lebih sedikit dependensi tetapi kurang terbaca sebagai
aplikasi utuh; Expo Router (C) menambah konsep baru tanpa manfaat untuk CRUD
sebesar ini.

## Data

AsyncStorage, dua key:

```
@pets:      [{ id, nama, jenis }]
@schedules: [{ id, petId, perawatan: 'makan'|'mandi'|'lainnya',
               jam: 'HH:mm', notificationId, riwayat: ['YYYY-MM-DD'] }]
```

Status "sudah dilakukan hari ini" dihitung dengan `riwayat.includes(todayKey())`.
Tidak ada tabel riwayat terpisah.

## Layar

1. **Daftar Jadwal** — daftar dikelompokkan per jam, tiap baris menampilkan nama
   hewan, jenis perawatan, jam, tombol centang selesai, dan hapus. FAB tambah.
   Tombol menuju layar Hewan. Empty state.
2. **Form Jadwal** — tambah/edit dalam satu layar. Pilih hewan, pilih perawatan,
   pilih jam dengan datetimepicker. Validasi jam dan hewan.
3. **Hewan** — daftar hewan, tambah/edit/hapus. Menghapus hewan ikut menghapus
   jadwalnya dan membatalkan notifikasinya setelah konfirmasi.

## Notifikasi

- `expo-notifications`, izin diminta saat aplikasi dibuka.
- Channel kustom (`jadwal-perawatan`) tidak dapat dibuat di Expo Go SDK 58 —
  `setNotificationChannelAsync` melempar `NullPointerException` — sehingga
  notifikasi memakai channel bawaan Expo Go. Keputusan ini diambil setelah
  pengujian di emulator; di development build channel kustom bisa diaktifkan.
- Simpan/edit jadwal: batalkan notifikasi lama, jadwalkan `DAILY` pada jam
  tersebut, simpan `notificationId`.
- Hapus jadwal/hewan: batalkan notifikasi terkait.
- Saat aplikasi dibuka: jadwal tanpa `notificationId` dijadwalkan ulang.
- Keterbatasan yang didokumentasikan: mencentang selesai tidak mematikan
  notifikasi hari itu.

## Struktur file

```
App.js
src/screens/JadwalListScreen.js
src/screens/JadwalFormScreen.js
src/screens/HewanScreen.js
src/storage/db.js
src/notifications.js
src/logic/pets.js
src/logic/schedules.js
src/utils/date.js
src/utils/id.js
src/theme.js
```

## Verifikasi

Tes otomatis untuk logika murni (tanggal, CRUD, cascade delete) memakai
`node --test`. UI, penyimpanan, dan notifikasi diverifikasi manual di Expo Go.
