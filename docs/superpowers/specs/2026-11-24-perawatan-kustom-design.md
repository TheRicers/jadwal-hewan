# Desain: Jenis Perawatan Kustom

## Tujuan

Mengganti pilihan "Lainnya" yang statis dengan jenis perawatan kustom yang bisa
diberi nama, dipakai ulang untuk hewan dan jadwal mana pun, serta diubah atau
dihapus namanya. Nama kustom tampil di daftar jadwal, dialog hapus, dan isi
notifikasi.

## Bukan cakupan

- Ikon atau warna khusus per jenis; semua jenis kustom memakai 🐾.
- Mengurutkan ulang jenis, menggabungkan jenis, atau mengubah jenis lewat
  layar daftar jadwal.
- Sinkronisasi/backend; semua data tetap lokal.

## Batasan

- Data lama harus tetap terbaca, termasuk jadwal `perawatan: 'lainnya'`.
- Tanpa development build; tetap berjalan di Expo Go SDK 58.
- Pola UI mengikuti modal yang sudah ada di `HewanScreen.js`.
- Nama kustom: di-trim, wajib diisi, maksimal 30 karakter, unik tanpa
  membedakan huruf besar/kecil, dan tidak boleh sama dengan Makan, Mandi, atau
  Lainnya.

## Data

Key AsyncStorage baru:

```
@perawatanKustom: [{ id, nama }]
```

Jadwal menyimpan referensi:

```
perawatan: 'makan' | 'mandi' | 'custom:<id>' | 'lainnya' (data lama)
```

Makan dan Mandi tetap bawaan di kode dan tidak disimpan. Tidak ada migrasi:
jadwal lama `'lainnya'` tetap ditampilkan sebagai "Lainnya". Nama kustom
diselesaikan saat render, sehingga rename langsung berlaku untuk semua jadwal
yang memakainya.

## Pendekatan yang dipilih

Penyimpanan **A: daftar kustom terpisah**. Alternatif semua jenis di storage
perlu migrasi dan proteksi bawaan tanpa manfaat nyata; menyimpan nama di tiap
jadwal membuat rename harus menulis ulang banyak jadwal dan rawan duplikasi.

UI **B: tambah inline + tautan Kelola**. Chip "+ Baru" membuka modal nama;
tautan "Kelola" di samping label membuka modal daftar jenis kustom dengan
Ubah/Hapus. Alternatif long-press kurang terlihat, sedangkan layar terpisah
berlebihan untuk aplikasi sebesar ini.

## Perilaku

### Tambah

- Chip "+ Baru" membuka modal nama (modal sendiri, bukan `Alert.prompt`, agar
  jalan di Android).
- Simpan → jenis masuk ke `@perawatanKustom` dan langsung terpilih pada jadwal
  yang sedang dibuat/diedit.
- Nama tidak valid ditolak dengan pesan di modal.

### Rename

- Lewat "Kelola" → "Ubah" pada jenis kustom.
- Daftar jenis disimpan, lalu semua jadwal yang memakai jenis itu dijadwalkan
  ulang notifikasinya agar isi pesan memakai nama baru.
- Jadwal yang sedang diedit tetap memakai `custom:<id>` yang sama.

### Hapus

- Lewat "Kelola" → "Hapus".
- Jika dipakai jadwal, konfirmasi menyebut jumlah jadwal; setelah dikonfirmasi
  jadwal tersebut diubah menjadi `'lainnya'` dan notifikasinya dijadwalkan
  ulang dengan pesan generik.
- Jika jenis yang dihapus sedang dipilih di form, pilihan berpindah ke Makan.

### Tampilan

- Form: baris jenis perawatan memakai chip yang bisa wrap; chip bawaan, chip
  kustom, lalu "+ Baru". Tautan "Kelola" muncul di samping label.
- Daftar jadwal: label dan ikon diselesaikan lewat helper; data lama/tak dikenal
  jatuh ke "Lainnya".
- Notifikasi: Makan/Mandi memakai pesan lama; jenis kustom memakai
  `Jangan lupa <nama> hewan peliharaanmu.`

## Struktur file

```
src/logic/perawatan.js            # helper murni + validasi
src/components/PerawatanModal.js  # modal nama + modal kelola
src/screens/JadwalFormScreen.js   # chip, tambah/rename/hapus, reschedule
src/screens/JadwalListScreen.js   # resolusi label kustom
src/storage/db.js                 # key, load/save, loadAll
src/notifications.js              # body memakai nama kustom
App.js                            # muat jenis kustom saat reschedule
tests/perawatan.test.js
```

## Verifikasi

- Tes otomatis baru untuk create/rename/delete, validasi nama, resolusi label,
  dan pelepasan jadwal saat jenis dihapus; jalankan `npm test`.
- `npx expo lint`.
- Manual di Expo Go: tambah jenis, pakai di dua jadwal, rename, hapus saat
  dipakai, edit jadwal lama `'lainnya'`, dan cek isi notifikasi.
