const React = require('react');
const { useCallback, useMemo, useRef, useState } = React;
const { Pressable, ScrollView, StyleSheet, Text, View } = require('react-native');
const { useFocusEffect } = require('@react-navigation/native');

const { loadAll } = require('../storage/db');
const {
  buildCalendar, currentStreak, monthSummary, perPetCounts,
} = require('../logic/history');
const { resolvePerawatan } = require('../logic/perawatan');
const { todayKey } = require('../utils/date');
const DataErrorBanner = require('../components/DataErrorBanner');
const { colors, spacing, radius } = require('../theme');

const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const HARI_SINGKAT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

function formatTanggal(key) {
  const [year, month, day] = key.split('-').map(Number);
  return `${day} ${BULAN[month - 1]} ${year}`;
}

function RiwayatScreen() {
  const [pets, setPets] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [perawatanKustom, setPerawatanKustom] = useState([]);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState(null);
  const [today, setToday] = useState(() => todayKey());
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const requestRef = useRef(0);

  const loadData = useCallback(async () => {
    const request = requestRef.current + 1;
    requestRef.current = request;
    setToday(todayKey());
    setLoaded(false);
    try {
      const data = await loadAll();
      if (request !== requestRef.current) return;
      setPets(data.pets);
      setSchedules(data.schedules);
      setPerawatanKustom(data.perawatanKustom);
      setLoadError(data.errors.length > 0);
      setLoaded(true);
    } catch (error) {
      if (request !== requestRef.current) return;
      console.warn('Gagal memuat riwayat', error);
      setLoadError(true);
      setLoaded(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const summary = useMemo(
    () => monthSummary(schedules, month.year, month.month),
    [schedules, month]
  );
  const perPet = useMemo(
    () => perPetCounts(schedules, month.year, month.month),
    [schedules, month]
  );
  const weeks = useMemo(
    () => buildCalendar(month.year, month.month),
    [month]
  );
  const streak = useMemo(() => currentStreak(schedules, today), [schedules, today]);

  const petById = new Map(pets.map((pet) => [pet.id, pet]));
  const perPetRows = Object.entries(perPet)
    .map(([petId, count]) => ({ petId, count, pet: petById.get(petId) }))
    .sort((a, b) => b.count - a.count);
  const selectedSchedules = selectedDate
    ? schedules.filter((schedule) => (
      Array.isArray(schedule.riwayat) && schedule.riwayat.includes(selectedDate)
    ))
    : [];

  function changeMonth(delta) {
    setMonth((previous) => {
      const date = new Date(previous.year, previous.month + delta, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
    setSelectedDate(null);
  }

  function renderDay(cell, index) {
    if (!cell) return <View key={`empty-${index}`} style={styles.dayCellEmpty} />;

    const count = summary.counts[cell.key] || 0;
    const selected = selectedDate === cell.key;
    const level = count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : 3;

    return (
      <Pressable
        key={cell.key}
        onPress={() => setSelectedDate(cell.key)}
        disabled={count === 0}
        style={[
          styles.dayCell,
          styles[`dayLevel${level}`],
          selected && styles.daySelected,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${cell.day} ${BULAN[month.month]} ${month.year}, ${count} perawatan selesai`}
      >
        <Text style={[styles.dayNumber, level === 3 && styles.dayTextLight]}>
          {cell.day}
        </Text>
        {count > 0 ? (
          <Text style={[styles.dayCount, level === 3 && styles.dayTextLight]}>
            {count}
          </Text>
        ) : null}
      </Pressable>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {loadError ? (
        <DataErrorBanner
          message="Riwayat tidak dapat dimuat dari penyimpanan."
          onRetry={loadData}
        />
      ) : null}

      <View style={styles.monthRow}>
        <Pressable
          onPress={() => changeMonth(-1)}
          hitSlop={12}
          style={styles.monthButton}
          accessibilityRole="button"
          accessibilityLabel="Bulan sebelumnya"
        >
          <Text style={styles.monthButtonText}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>
          {BULAN[month.month]} {month.year}
        </Text>
        <Pressable
          onPress={() => changeMonth(1)}
          hitSlop={12}
          style={styles.monthButton}
          accessibilityRole="button"
          accessibilityLabel="Bulan berikutnya"
        >
          <Text style={styles.monthButtonText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{summary.total}</Text>
          <Text style={styles.statLabel}>Selesai bulan ini</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{summary.activeDays}</Text>
          <Text style={styles.statLabel}>Hari aktif</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{streak}</Text>
          <Text style={styles.statLabel}>Hari beruntun</Text>
        </View>
      </View>

      <View style={styles.calendarCard}>
        <View style={styles.weekdayRow}>
          {HARI_SINGKAT.map((hari) => (
            <Text key={hari} style={styles.weekday}>{hari}</Text>
          ))}
        </View>
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.map((cell, dayIndex) => renderDay(cell, dayIndex))}
          </View>
        ))}
      </View>

      <Text style={styles.legend}>
        Warna makin gelap berarti makin banyak perawatan selesai pada hari itu.
        Ketuk tanggal berwarna untuk melihat detail.
      </Text>

      {selectedDate ? (
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>{formatTanggal(selectedDate)}</Text>
          {selectedSchedules.length === 0 ? (
            <Text style={styles.muted}>Tidak ada jadwal yang selesai pada tanggal ini.</Text>
          ) : (
            selectedSchedules.map((schedule) => {
              const pet = petById.get(schedule.petId);
              const perawatan = resolvePerawatan(schedule.perawatan, perawatanKustom);
              return (
                <View key={schedule.id} style={styles.detailRow}>
                  <Text style={styles.detailIcon}>{perawatan.icon}</Text>
                  <View style={styles.detailBody}>
                    <Text style={styles.detailPet}>{pet ? pet.nama : 'Hewan dihapus'}</Text>
                    <Text style={styles.muted}>{perawatan.label} • {schedule.jam}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Ringkasan per hewan</Text>
      {perPetRows.length === 0 ? (
        <Text style={styles.muted}>
          {loadError
            ? 'Ringkasan tidak dapat dimuat.'
            : loaded
              ? 'Belum ada perawatan selesai bulan ini.'
              : 'Memuat riwayat…'}
        </Text>
      ) : (
        perPetRows.map((row) => (
          <View key={row.petId} style={styles.petRow}>
            <Text style={styles.petName}>{row.pet ? row.pet.nama : 'Hewan dihapus'}</Text>
            <Text style={styles.petCount}>{row.count} selesai</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  monthButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthButtonText: { fontSize: 26, color: colors.primaryDark, lineHeight: 28 },
  monthLabel: { fontSize: 18, fontWeight: '700', color: colors.text },
  summaryRow: { flexDirection: 'row', marginTop: spacing.lg },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginRight: spacing.sm,
    alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '700', color: colors.primaryDark },
  statLabel: { marginTop: 2, fontSize: 11, color: colors.muted, textAlign: 'center' },
  calendarCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  weekdayRow: { flexDirection: 'row', marginBottom: spacing.xs },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
  },
  weekRow: { flexDirection: 'row' },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    margin: 2,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayCellEmpty: { flex: 1, aspectRatio: 1, margin: 2 },
  dayLevel0: { backgroundColor: colors.background },
  dayLevel1: { backgroundColor: colors.primarySoft },
  dayLevel2: { backgroundColor: '#B7DCD2' },
  dayLevel3: { backgroundColor: colors.primary },
  daySelected: { borderColor: colors.accent, borderWidth: 2 },
  dayNumber: { fontSize: 13, fontWeight: '600', color: colors.text },
  dayCount: { fontSize: 10, color: colors.primaryDark, marginTop: 1 },
  dayTextLight: { color: '#FFFFFF' },
  legend: { marginTop: spacing.sm, fontSize: 12, color: colors.muted, lineHeight: 18 },
  detailCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  detailTitle: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  detailIcon: { fontSize: 20, width: 30 },
  detailBody: { flex: 1 },
  detailPet: { fontWeight: '600', color: colors.text },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  sectionTitle: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  petRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  petName: { fontWeight: '600', color: colors.text },
  petCount: { color: colors.primaryDark, fontWeight: '600' },
});

module.exports = RiwayatScreen;
