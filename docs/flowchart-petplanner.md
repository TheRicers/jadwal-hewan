# PetPlanner — Flowchart

Dokumen ini berisi flowchart alur aplikasi PetPlanner. Diagram dirender oleh
GitHub dari blok Mermaid di bawah.

## 1. Alur utama aplikasi

```mermaid
flowchart TD
    APP(["App dibuka"]) --> PERM{"Izin notifikasi?"}
    PERM -- "Ya" --> RESCHED["Siapkan ulang notifikasi<br/>untuk jadwal tanpa notificationId"]
    PERM -- "Tidak" --> BANNER["Banner: notifikasi nonaktif"]
    RESCHED --> LIST
    BANNER --> LIST

    subgraph SCREENS["Layar"]
        LIST["JadwalListScreen<br/>Daftar jadwal hari ini"]
        FORM["JadwalFormScreen<br/>Tambah / edit jadwal"]
        PET["HewanScreen<br/>Daftar hewan"]
    end

    LIST -- "FAB + / empty state" --> FORM
    LIST -- "Tap kartu jadwal" --> FORM
    LIST -- "Tombol Hewan" --> PET
    LIST -- "Empty state, belum ada hewan" --> PET
    FORM -- "Simpan / kembali" --> LIST
    PET -- "Kembali" --> LIST

    subgraph ACTIONS["Aksi utama"]
        TOGGLE["Centang selesai<br/>tambah/hapus tanggal di riwayat"]
        DELJ["Hapus jadwal<br/>batalkan notifikasi"]
        SAVEJ["Simpan jadwal<br/>jadwalkan notifikasi harian"]
        ADDPET["Tambah / edit hewan"]
        DELPET["Hapus hewan<br/>hapus jadwal + notifikasinya"]
        CUSTOM["+ Baru / Kelola<br/>jenis perawatan kustom"]
    end

    LIST --> TOGGLE
    LIST --> DELJ
    FORM --> SAVEJ
    FORM --> CUSTOM
    PET --> ADDPET
    PET --> DELPET

    subgraph STORAGE["AsyncStorage"]
        DB1[("@pets")]
        DB2[("@schedules")]
        DB3[("@perawatanKustom")]
    end

    subgraph NOTIF["expo-notifications"]
        N1["scheduleDaily<br/>trigger harian HH:mm"]
        N2["cancelNotification"]
    end

    TOGGLE --> DB2
    DELJ --> N2
    DELJ --> DB2
    SAVEJ --> N1
    SAVEJ --> DB2
    ADDPET --> DB1
    DELPET --> DB1
    DELPET --> DB2
    DELPET --> N2
    CUSTOM --> DB3
    CUSTOM --> N1
```

## 2. Alur jenis perawatan kustom

```mermaid
flowchart TD
    START["Form Jadwal"] --> ADD["+ Baru"]
    START --> MANAGE["Kelola"]

    ADD --> NAME["Modal nama"]
    NAME --> VALID{"Nama valid?<br/>wajib, maks. 30, unik, bukan bawaan"}
    VALID -- "Tidak" --> NAME
    VALID -- "Ya" --> SAVE["Simpan ke @perawatanKustom"]
    SAVE --> SELECT["Chip kustom terpilih"]

    MANAGE --> LIST2["Daftar jenis kustom"]
    LIST2 -- "Ubah" --> RENAME["Ubah nama"]
    RENAME --> SAVER["Simpan nama<br/>+ reschedule notifikasi terkait"]

    LIST2 -- "Hapus" --> USED{"Dipakai jadwal?"}
    USED -- "Ya" --> CONFIRM["Konfirmasi jumlah jadwal"]
    CONFIRM --> DETACH["Jadwal diubah ke lainnya<br/>+ reschedule notifikasi"]
    USED -- "Tidak" --> REMOVE["Hapus jenis"]
```

## 3. Data yang disimpan

| Key | Bentuk data |
|---|---|
| `@pets` | `{ id, nama, jenis }` |
| `@schedules` | `{ id, petId, perawatan, jam, notificationId, riwayat }` |
| `@perawatanKustom` | `{ id, nama }` |

`perawatan` berisi `'makan'`, `'mandi'`, `'custom:<id>'`, atau nilai lama
`'lainnya'`. Status selesai hari ini dihitung dari `riwayat.includes(YYYY-MM-DD)`.
