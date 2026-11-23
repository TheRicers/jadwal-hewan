const React = require('react');
const { useEffect, useState } = React;
const {
  Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View,
} = require('react-native');
const DateTimePicker = require('@react-native-community/datetimepicker').default;

const { loadPets, loadSchedules, saveSchedules } = require('../storage/db');
const {
  createSchedule, updateSchedule,
} = require('../logic/schedules');
const { newId } = require('../utils/id');
const { isValidJam } = require('../utils/date');
const { scheduleDaily, cancelNotification } = require('../notifications');
const { colors, spacing, radius } = require('../theme');

const PERAWATAN = [
  { value: 'makan', label: 'Makan', icon: '🍽️' },
  { value: 'mandi', label: 'Mandi', icon: '🛁' },
  { value: 'lainnya', label: 'Lainnya', icon: '🐾' },
];

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

function JadwalFormScreen({ navigation, route }) {
  const scheduleId = route.params?.scheduleId;
  const isEdit = Boolean(scheduleId);

  const [pets, setPets] = useState([]);
  const [petId, setPetId] = useState(null);
  const [perawatan, setPerawatan] = useState('makan');
  const [jamDate, setJamDate] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30, 0, 0);
    return now;
  });
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const [daftarHewan, schedules] = await Promise.all([loadPets(), loadSchedules()]);
      if (!active) return;
      setPets(daftarHewan);
      setPetId((current) => current || daftarHewan[0]?.id || null);

      if (scheduleId) {
        const existing = schedules.find((item) => item.id === scheduleId);
        if (existing) {
          setPetId(existing.petId);
          setPerawatan(existing.perawatan);
          setJamDate(dateDariJam(existing.jam));
        }
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [scheduleId]);

  function handleTimeChange(event, value) {
    if (Platform.OS === 'android') setShowPicker(false);
    if (event.type === 'dismissed' || !value) return;
    setJamDate(value);
  }

  async function handleSave() {
    if (!petId) {
      Alert.alert('Hewan belum dipilih', 'Tambahkan hewan terlebih dahulu di menu Hewan.');
      return;
    }

    const jam = jamDariDate(jamDate);
    if (!isValidJam(jam)) {
      Alert.alert('Jam tidak valid', 'Pilih jam dengan format HH:mm, misalnya 07:00.');
      return;
    }

    setSaving(true);
    try {
      const schedules = await loadSchedules();

      if (isEdit) {
        const current = schedules.find((item) => item.id === scheduleId);
        if (current?.notificationId) {
          await cancelNotification(current.notificationId);
        }
        let next = updateSchedule(schedules, scheduleId, {
          petId,
          perawatan,
          jam,
          notificationId: null,
        });
        const updated = next.find((item) => item.id === scheduleId);
        const notificationId = updated ? await scheduleDaily(updated) : null;
        next = updateSchedule(next, scheduleId, { notificationId });
        await saveSchedules(next);
      } else {
        const schedule = createSchedule({ petId, perawatan, jam }, newId());
        const notificationId = await scheduleDaily(schedule);
        await saveSchedules([...schedules, { ...schedule, notificationId }]);
      }

      navigation.goBack();
    } catch (error) {
      console.warn('Gagal menyimpan jadwal', error);
      Alert.alert('Gagal menyimpan', 'Terjadi kesalahan saat menyimpan jadwal.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Hewan</Text>
      {pets.length === 0 ? (
        <View style={styles.warning}>
          <Text style={styles.warningText}>
            Belum ada hewan. Tambahkan hewan dulu agar bisa membuat jadwal.
          </Text>
          <Pressable style={styles.warningButton} onPress={() => navigation.navigate('Hewan')}>
            <Text style={styles.warningButtonText}>Tambah Hewan</Text>
          </Pressable>
        </View>
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

      <Text style={styles.label}>Jenis perawatan</Text>
      <View style={styles.perawatanRow}>
        {PERAWATAN.map((item) => {
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
      </View>

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
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving || pets.length === 0}
        accessibilityRole="button"
        accessibilityLabel="Simpan jadwal"
      >
        <Text style={styles.saveText}>
          {saving ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Simpan Jadwal'}
        </Text>
      </Pressable>
    </ScrollView>
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
  perawatanRow: { flexDirection: 'row' },
  perawatan: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginRight: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  perawatanSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  perawatanIcon: { fontSize: 22 },
  perawatanText: { marginTop: spacing.xs, fontWeight: '600', color: colors.text },
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
