const React = require('react');
const { useEffect, useState } = React;
const {
  Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View,
} = require('react-native');
const DateTimePicker = require('@react-native-community/datetimepicker').default;

const { loadAll, loadSchedules, saveSchedules, savePerawatanKustom } = require('../storage/db');
const {
  createSchedule, updateSchedule, isDuplicateSchedule,
} = require('../logic/schedules');
const {
  BUILTIN_PERAWATAN, customPerawatanValue, createPerawatanKustom, validateNamaPerawatan,
  renamePerawatanKustom, removePerawatanKustom, schedulesUsingPerawatan, detachPerawatanKustom,
} = require('../logic/perawatan');
const { NamaPerawatanModal, KelolaPerawatanModal } = require('../components/PerawatanModal');
const DataErrorBanner = require('../components/DataErrorBanner');
const { newId } = require('../utils/id');
const { formatJam } = require('../utils/date');
const { scheduleDaily, cancelNotification } = require('../notifications');
const { colors, spacing, radius } = require('../theme');

function pad2(value) {
  return String(value).padStart(2, '0');
}

function jamDariDate(date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function dateDariJam(jam) {
  const [hour, minute] = jam.split(':').map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

function konfirmasiDuplikat() {
  return new Promise((resolve) => {
    Alert.alert(
      'Jadwal serupa sudah ada',
      'Hewan, jenis perawatan, dan jam yang sama sudah memiliki jadwal. Tetap simpan?',
      [
        { text: 'Batal', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Tetap simpan', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}

function JadwalFormScreen({ navigation, route }) {
  const scheduleId = route.params?.scheduleId;
  const isEdit = Boolean(scheduleId);

  const [pets, setPets] = useState([]);
  const [petId, setPetId] = useState(null);
  const [perawatan, setPerawatan] = useState('makan');
  const [perawatanKustom, setPerawatanKustom] = useState([]);
  const [namaModalVisible, setNamaModalVisible] = useState(false);
  const [kelolaVisible, setKelolaVisible] = useState(false);
  const [busyPerawatan, setBusyPerawatan] = useState(false);
  const [jamDate, setJamDate] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30, 0, 0);
    return now;
  });
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await loadAll();
        if (!active) return;
        setLoadError(data.errors.length > 0);
        const daftarHewan = data.pets;
        setPets(daftarHewan);
        setPerawatanKustom(data.perawatanKustom);
        setPetId((current) => current || daftarHewan[0]?.id || null);

        if (scheduleId) {
          const existing = data.schedules.find((item) => item.id === scheduleId);
          if (existing) {
            setPetId(existing.petId);
            setPerawatan(existing.perawatan);
            setJamDate(dateDariJam(existing.jam));
          }
        }
      } catch (error) {
        console.warn('Gagal memuat data jadwal', error);
        if (active) setLoadError(true);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [scheduleId, reloadToken]);

  function handleTimeChange(event, value) {
    if (Platform.OS === 'android') setShowPicker(false);
    if (event.type === 'dismissed' || !value) return;
    setJamDate(value);
  }

  async function handleSave() {
    if (loadError) {
      Alert.alert('Data belum siap', 'Muat ulang data terlebih dahulu.');
      return;
    }
    if (!petId) {
      Alert.alert('Hewan belum dipilih', 'Tambahkan hewan terlebih dahulu di menu Hewan.');
      return;
    }

    let jam;
    try {
      jam = formatJam(jamDariDate(jamDate));
    } catch {
      Alert.alert('Jam tidak valid', 'Pilih jam dengan format HH:mm, misalnya 07:00.');
      return;
    }

    setSaving(true);
    try {
      const schedules = await loadSchedules();
      const duplicate = isDuplicateSchedule(
        schedules,
        { petId, perawatan, jam },
        isEdit ? scheduleId : null
      );
      if (duplicate) {
        const lanjut = await konfirmasiDuplikat();
        if (!lanjut) return;
      }

      if (isEdit) {
        const current = schedules.find((item) => item.id === scheduleId);
        const oldNotificationId = current?.notificationId || null;
        let next = updateSchedule(schedules, scheduleId, {
          petId,
          perawatan,
          jam,
          notificationId: null,
        });
        const updated = next.find((item) => item.id === scheduleId);
        const notificationId = updated
          ? await scheduleDaily(updated, perawatanKustom)
          : null;
        next = updateSchedule(next, scheduleId, { notificationId });
        try {
          await saveSchedules(next);
        } catch (error) {
          await cancelNotification(notificationId);
          throw error;
        }
        await cancelNotification(oldNotificationId);
      } else {
        const schedule = createSchedule({ petId, perawatan, jam }, newId());
        const notificationId = await scheduleDaily(schedule, perawatanKustom);
        try {
          await saveSchedules([...schedules, { ...schedule, notificationId }]);
        } catch (error) {
          await cancelNotification(notificationId);
          throw error;
        }
      }

      navigation.goBack();
    } catch (error) {
      console.warn('Gagal menyimpan jadwal', error);
      Alert.alert('Gagal menyimpan', 'Terjadi kesalahan saat menyimpan jadwal.');
    } finally {
      setSaving(false);
    }
  }

  async function handleNamaSubmit(nama) {
    const error = validateNamaPerawatan(nama, perawatanKustom);
    if (error) return error;

    const created = createPerawatanKustom(nama, newId());
    const next = [...perawatanKustom, created];
    try {
      await savePerawatanKustom(next);
    } catch (err) {
      console.warn('Gagal menyimpan jenis perawatan', err);
      return 'Gagal menyimpan jenis perawatan.';
    }

    setPerawatanKustom(next);
    setPerawatan(customPerawatanValue(created.id));
    setNamaModalVisible(false);
    return null;
  }

  async function handleUbahPerawatan(item, nama) {
    const error = validateNamaPerawatan(nama, perawatanKustom, item.id);
    if (error) return error;

    const nextTypes = renamePerawatanKustom(perawatanKustom, item.id, nama);
    try {
      await savePerawatanKustom(nextTypes);
    } catch (err) {
      console.warn('Gagal menyimpan jenis perawatan', err);
      return 'Gagal menyimpan jenis perawatan.';
    }

    setPerawatanKustom(nextTypes);

    const value = customPerawatanValue(item.id);
    try {
      const schedules = await loadSchedules();
      const affected = schedulesUsingPerawatan(schedules, value);
      let next = schedules;
      for (const schedule of affected) {
        await cancelNotification(schedule.notificationId);
        const notificationId = await scheduleDaily(schedule, nextTypes);
        next = updateSchedule(next, schedule.id, { notificationId });
      }
      if (affected.length > 0) await saveSchedules(next);
    } catch (err) {
      console.warn('Gagal memperbarui pengingat jenis perawatan', err);
      Alert.alert(
        'Jenis perawatan tersimpan',
        'Gagal memperbarui pengingat jadwal yang memakai jenis ini.'
      );
    }
    return null;
  }

  async function handleHapusPerawatan(item) {
    const value = customPerawatanValue(item.id);
    let schedules;
    try {
      schedules = await loadSchedules();
    } catch (error) {
      console.warn('Gagal memuat jadwal untuk menghapus jenis perawatan', error);
      Alert.alert('Gagal memuat', 'Jadwal tidak dapat dimuat. Coba lagi.');
      return;
    }
    const affected = schedulesUsingPerawatan(schedules, value);
    const pesan = affected.length > 0
      ? `${affected.length} jadwal yang memakai jenis ini akan diubah menjadi Lainnya.`
      : `Jenis ${item.nama} akan dihapus.`;

    Alert.alert('Hapus jenis perawatan?', pesan, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          setBusyPerawatan(true);
          try {
            const nextTypes = removePerawatanKustom(perawatanKustom, item.id);
            const detached = detachPerawatanKustom(schedules, value);
            let next = detached;
            for (const schedule of affected) {
              const detachedSchedule = detached.find((entry) => entry.id === schedule.id);
              if (!detachedSchedule) continue;
              await cancelNotification(schedule.notificationId);
              const notificationId = await scheduleDaily(detachedSchedule, nextTypes);
              next = updateSchedule(next, schedule.id, { notificationId });
            }

            try {
              if (affected.length > 0) {
                await saveSchedules(next);
              }
              await savePerawatanKustom(nextTypes);
            } catch (error) {
              console.warn('Gagal menghapus jenis perawatan', error);
              Alert.alert(
                'Gagal menghapus',
                'Terjadi kesalahan saat menghapus jenis perawatan.'
              );
              return;
            }

            setPerawatanKustom(nextTypes);
            setPerawatan((current) => (current === value ? 'makan' : current));
          } finally {
            setBusyPerawatan(false);
          }
        },
      },
    ]);
  }

  const perawatanDikenal = BUILTIN_PERAWATAN.some((item) => item.value === perawatan)
    || perawatanKustom.some((item) => customPerawatanValue(item.id) === perawatan);

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {loadError ? (
          <DataErrorBanner
            message="Data jadwal tidak dapat dimuat. Form dinonaktifkan agar data tidak tertimpa."
            onRetry={() => setReloadToken((value) => value + 1)}
          />
        ) : null}

        <Text style={styles.label}>Hewan</Text>
        {pets.length === 0 ? (
          loadError ? null : (
            <View style={styles.warning}>
              <Text style={styles.warningText}>
                Belum ada hewan. Tambahkan hewan dulu agar bisa membuat jadwal.
              </Text>
              <Pressable style={styles.warningButton} onPress={() => navigation.navigate('Hewan')}>
                <Text style={styles.warningButtonText}>Tambah Hewan</Text>
              </Pressable>
            </View>
          )
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {pets.map((pet) => {
              const selected = pet.id === petId;
              return (
                <Pressable
                  key={pet.id}
                  onPress={() => setPetId(pet.id)}
                  style={[styles.chip, selected && styles.chipSelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {pet.nama}
                  </Text>
                  <Text style={[styles.chipSub, selected && styles.chipTextSelected]}>
                    {pet.jenis}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.labelRow}>
          <Text style={styles.labelInline}>Jenis perawatan</Text>
          <Pressable
            onPress={() => setKelolaVisible(true)}
            disabled={loadError}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Kelola jenis perawatan"
            accessibilityState={{ disabled: loadError }}
          >
            <Text style={styles.kelolaLink}>Kelola</Text>
          </Pressable>
        </View>
        <View style={styles.perawatanRow}>
          {BUILTIN_PERAWATAN.map((item) => {
            const selected = item.value === perawatan;
            return (
              <Pressable
                key={item.value}
                onPress={() => setPerawatan(item.value)}
                style={[styles.perawatan, selected && styles.perawatanSelected]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <Text style={styles.perawatanIcon}>{item.icon}</Text>
                <Text style={[styles.perawatanText, selected && styles.chipTextSelected]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
          {perawatanKustom.map((item) => {
            const value = customPerawatanValue(item.id);
            const selected = value === perawatan;
            return (
              <Pressable
                key={value}
                onPress={() => setPerawatan(value)}
                style={[styles.perawatan, selected && styles.perawatanSelected]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <Text style={styles.perawatanIcon}>🐾</Text>
                <Text style={[styles.perawatanText, selected && styles.chipTextSelected]}>
                  {item.nama}
                </Text>
              </Pressable>
            );
          })}
          {!perawatanDikenal ? (
            <View
              style={[styles.perawatan, styles.perawatanSelected]}
              accessible
              accessibilityRole="text"
              accessibilityLabel="Jenis perawatan lama: Lainnya"
            >
              <Text style={styles.perawatanIcon}>🐾</Text>
              <Text style={[styles.perawatanText, styles.chipTextSelected]}>Lainnya</Text>
            </View>
          ) : null}
          <Pressable
            onPress={() => setNamaModalVisible(true)}
            disabled={loadError}
            style={[styles.perawatan, styles.perawatanBaru]}
            accessibilityRole="button"
            accessibilityLabel="Tambah jenis perawatan baru"
            accessibilityState={{ disabled: loadError }}
          >
            <Text style={[styles.perawatanIcon, styles.perawatanBaruText]}>+</Text>
            <Text style={[styles.perawatanText, styles.perawatanBaruText]}>Baru</Text>
          </Pressable>
        </View>

        {!perawatanDikenal ? (
          <Text style={styles.hint}>
            {'Jenis ini tersimpan sebagai "Lainnya" dari versi sebelumnya. Pilih jenis di atas untuk menggantinya.'}
          </Text>
        ) : null}

        <Text style={styles.label}>Jam pengingat</Text>
        <Pressable
          style={styles.timeButton}
          onPress={() => setShowPicker(true)}
          accessibilityRole="button"
          accessibilityLabel={`Pilih jam, saat ini ${jamDariDate(jamDate)}`}
        >
          <Text style={styles.timeText}>{jamDariDate(jamDate)}</Text>
          <Text style={styles.timeHint}>Ubah jam</Text>
        </Pressable>

        {showPicker ? (
          <View style={styles.pickerWrap}>
            <DateTimePicker
              value={jamDate}
              mode="time"
              is24Hour
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
            />
            {Platform.OS === 'ios' ? (
              <Pressable style={styles.pickerDone} onPress={() => setShowPicker(false)}>
                <Text style={styles.pickerDoneText}>Selesai</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <Text style={styles.hint}>
          Pengingat akan berbunyi setiap hari pada jam ini selama aplikasi terpasang.
        </Text>

        <Pressable
          style={[
            styles.saveButton,
            (saving || busyPerawatan || loadError) && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={saving || busyPerawatan || loadError || pets.length === 0}
          accessibilityRole="button"
          accessibilityLabel="Simpan jadwal"
          accessibilityState={{ disabled: saving || busyPerawatan || loadError || pets.length === 0 }}
        >
          <Text style={styles.saveText}>
            {saving ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Simpan Jadwal'}
          </Text>
        </Pressable>
      </ScrollView>

      <NamaPerawatanModal
        visible={namaModalVisible}
        mode="tambah"
        initialNama=""
        onClose={() => setNamaModalVisible(false)}
        onSubmit={handleNamaSubmit}
      />

      <KelolaPerawatanModal
        visible={kelolaVisible}
        perawatanKustom={perawatanKustom}
        busy={busyPerawatan}
        onClose={() => setKelolaVisible(false)}
        onUbah={handleUbahPerawatan}
        onHapus={handleHapusPerawatan}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  labelInline: { fontSize: 14, fontWeight: '700', color: colors.text },
  kelolaLink: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  chipRow: { marginHorizontal: -spacing.xs, paddingVertical: 2 },
  chip: {
    minWidth: 96,
    marginHorizontal: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontWeight: '600', color: colors.text },
  chipTextSelected: { color: '#FFFFFF' },
  chipSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  perawatanRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  perawatan: {
    minWidth: 84,
    maxWidth: '100%',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  perawatanSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  perawatanBaru: { borderStyle: 'dashed', backgroundColor: colors.background },
  perawatanBaruText: { color: colors.primary },
  perawatanIcon: { fontSize: 22 },
  perawatanText: {
    marginTop: spacing.xs,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  timeText: { fontSize: 28, fontWeight: '700', color: colors.primaryDark },
  timeHint: { color: colors.muted },
  pickerWrap: {
    marginTop: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  pickerDone: { alignSelf: 'flex-end', padding: spacing.sm },
  pickerDoneText: { color: colors.primary, fontWeight: '700' },
  hint: { marginTop: spacing.md, color: colors.muted, fontSize: 13, lineHeight: 19 },
  saveButton: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  warning: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  warningText: { color: colors.danger },
  warningButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  warningButtonText: { color: '#FFFFFF', fontWeight: '600' },
});

module.exports = JadwalFormScreen;
