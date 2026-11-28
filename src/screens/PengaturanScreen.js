const React = require('react');
const { useCallback, useRef, useState } = React;
const {
  ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View,
} = require('react-native');
const { useFocusEffect } = require('@react-navigation/native');
const { File, Paths } = require('expo-file-system');
const Sharing = require('expo-sharing');
const DocumentPicker = require('expo-document-picker');

const {
  clearAll, loadAll, saveAll,
} = require('../storage/db');
const { createBackup, validateBackup } = require('../logic/backup');
const {
  cancelAllNotifications, rescheduleMissing,
} = require('../notifications');
const { useNotificationStatus } = require('../NotificationStatus');
const DataErrorBanner = require('../components/DataErrorBanner');
const { colors, spacing, radius } = require('../theme');

const { version } = require('../../package.json');

function konfirmasiImpor(data) {
  return new Promise((resolve) => {
    Alert.alert(
      'Impor data?',
      `Data saat ini akan diganti dengan ${data.pets.length} hewan, `
        + `${data.schedules.length} jadwal, dan ${data.perawatanKustom.length} jenis kustom.`,
      [
        { text: 'Batal', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Impor', style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}

function PengaturanScreen() {
  const [counts, setCounts] = useState({ pets: 0, schedules: 0, perawatanKustom: 0 });
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const { granted } = useNotificationStatus();
  const requestRef = useRef(0);

  const loadData = useCallback(async () => {
    const request = requestRef.current + 1;
    requestRef.current = request;
    try {
      const data = await loadAll();
      if (request !== requestRef.current) return;
      setCounts({
        pets: data.pets.length,
        schedules: data.schedules.length,
        perawatanKustom: data.perawatanKustom.length,
      });
      setLoadError(data.errors.length > 0);
    } catch (error) {
      if (request !== requestRef.current) return;
      console.warn('Gagal memuat data pengaturan', error);
      setLoadError(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  async function handleExport() {
    setBusy(true);
    try {
      const data = await loadAll();
      if (data.errors.length > 0) {
        await new Promise((resolve) => {
          Alert.alert(
            'Backup sebagian',
            'Sebagian data tidak dapat dibaca. Backup tetap dibuat dari data yang berhasil dibaca.',
            [{ text: 'Lanjut', onPress: resolve }],
            { cancelable: false, onDismiss: resolve }
          );
        });
      }
      const backup = createBackup(data);
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const file = new File(Paths.cache, `petplanner-backup-${stamp}.json`);
      if (!file.exists) file.create();
      await file.write(JSON.stringify(backup, null, 2));

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Bagikan backup PetPlanner',
        });
      } else {
        Alert.alert('Backup dibuat', `File tersimpan di:\n${file.uri}`);
      }
    } catch (error) {
      console.warn('Gagal mengekspor data', error);
      Alert.alert('Gagal mengekspor', 'Backup tidak dapat dibuat.');
    } finally {
      setBusy(false);
    }
  }

  async function handleImport() {
    setBusy(true);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain', 'application/octet-stream'],
        copyToCacheDirectory: true,
      });
      if (picked.canceled) return;

      const asset = picked.assets?.[0];
      if (!asset) return;

      const file = new File(asset.uri);
      const text = await file.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        Alert.alert('Backup tidak valid', 'File yang dipilih bukan JSON yang valid.');
        return;
      }

      const result = validateBackup(parsed);
      if (!result.valid) {
        Alert.alert('Backup tidak valid', result.error);
        return;
      }

      const lanjut = await konfirmasiImpor(result.data);
      if (!lanjut) return;

      // Simpan dulu data baru tanpa notificationId. Jika langkah ini gagal,
      // data dan pengingat lama tetap utuh.
      await saveAll({
        pets: result.data.pets,
        schedules: result.data.schedules,
        perawatanKustom: result.data.perawatanKustom,
      });

      // Setelah data tersimpan, baru ganti pengingat. Jadwal di storage sudah
      // tidak memiliki notificationId, sehingga kegagalan di sini bisa
      // dipulihkan oleh rescheduleMissing saat aplikasi dibuka berikutnya.
      await cancelAllNotifications();
      const scheduled = await rescheduleMissing(
        result.data.schedules,
        result.data.perawatanKustom
      );
      try {
        if (scheduled.changed) {
          await saveAll({ schedules: scheduled.schedules });
        }
      } catch (error) {
        console.warn('Gagal menyimpan ID pengingat hasil impor', error);
      }

      setCounts({
        pets: result.data.pets.length,
        schedules: result.data.schedules.length,
        perawatanKustom: result.data.perawatanKustom.length,
      });
      Alert.alert(
        'Impor berhasil',
        'Data berhasil dipulihkan. Pengingat akan disinkronkan saat aplikasi dibuka jika belum aktif.'
      );
    } catch (error) {
      console.warn('Gagal mengimpor data', error);
      Alert.alert('Gagal mengimpor', 'Data backup tidak dapat dipulihkan.');
    } finally {
      setBusy(false);
    }
  }

  function handleReset() {
    Alert.alert(
      'Hapus semua data?',
      'Seluruh hewan, jadwal, jenis kustom, dan pengingat akan dihapus permanen.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              // Hapus data dulu; kalau gagal, pengingat lama tidak ikut hilang.
              await clearAll();
              await cancelAllNotifications();
              setCounts({ pets: 0, schedules: 0, perawatanKustom: 0 });
              Alert.alert('Data dihapus', 'Semua data PetPlanner sudah dihapus.');
            } catch (error) {
              console.warn('Gagal menghapus semua data', error);
              Alert.alert('Gagal menghapus', 'Data tidak dapat dihapus.');
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }

  function bukaPengaturanAndroid() {
    Linking.openSettings().catch(() => {
      Alert.alert('Tidak dapat membuka pengaturan', 'Buka pengaturan Android secara manual.');
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {loadError ? (
        <DataErrorBanner
          message="Data pengaturan tidak dapat dimuat."
          onRetry={loadData}
        />
      ) : null}

      <Text style={styles.sectionTitle}>Notifikasi</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {granted === null
            ? 'Memeriksa izin…'
            : granted
              ? 'Notifikasi aktif'
              : 'Notifikasi nonaktif'}
        </Text>
        <Text style={styles.cardBody}>
          {granted
            ? 'Pengingat harian akan berbunyi sesuai jadwal yang kamu buat.'
            : 'Aktifkan izin notifikasi agar pengingat harian dapat berbunyi.'}
        </Text>
        <Pressable
          style={styles.secondaryButton}
          onPress={bukaPengaturanAndroid}
          accessibilityRole="button"
          accessibilityLabel="Buka pengaturan Android"
        >
          <Text style={styles.secondaryButtonText}>Buka Pengaturan Android</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Data</Text>
      <View style={styles.card}>
        <View style={styles.countRow}>
          <Text style={styles.cardBody}>{loadError ? '—' : counts.pets} hewan</Text>
          <Text style={styles.cardBody}>{loadError ? '—' : counts.schedules} jadwal</Text>
          <Text style={styles.cardBody}>
            {loadError ? '—' : counts.perawatanKustom} jenis kustom
          </Text>
        </View>
        <Text style={styles.cardBody}>
          Backup disimpan sebagai file JSON. Simpan file tersebut di Google Drive
          atau tempat aman lainnya.
        </Text>
        <Pressable
          style={[styles.secondaryButton, busy && styles.disabled]}
          onPress={handleExport}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Ekspor data"
        >
          <Text style={styles.secondaryButtonText}>Ekspor Data</Text>
        </Pressable>
        <Pressable
          style={[styles.secondaryButton, busy && styles.disabled]}
          onPress={handleImport}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Impor data"
        >
          <Text style={styles.secondaryButtonText}>Impor Data</Text>
        </Pressable>
        <Pressable
          style={[styles.dangerButton, busy && styles.disabled]}
          onPress={handleReset}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Hapus semua data"
        >
          <Text style={styles.dangerButtonText}>Hapus Semua Data</Text>
        </Pressable>
        {busy ? (
          <View style={styles.busyRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.cardBody}>Memproses…</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>Tentang</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>PetPlanner {version}</Text>
        <Text style={styles.cardBody}>
          Aplikasi to-do list perawatan hewan peliharaan. Data tersimpan lokal
          di perangkat dan tidak memerlukan akun.
        </Text>
        <Text style={styles.cardBody}>Dibuat untuk tugas Pemrograman Mobile.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  sectionTitle: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.primaryDark },
  cardBody: { marginTop: spacing.xs, color: colors.muted, fontSize: 13, lineHeight: 19 },
  countRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' },
  secondaryButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  secondaryButtonText: { color: colors.primaryDark, fontWeight: '700' },
  dangerButton: {
    marginTop: spacing.md,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  dangerButtonText: { color: colors.danger, fontWeight: '700' },
  disabled: { opacity: 0.45 },
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
});

module.exports = PengaturanScreen;
