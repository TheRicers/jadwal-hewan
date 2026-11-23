const React = require('react');
const { useCallback, useEffect, useState } = React;
const {
  Alert, AppState, Pressable, SectionList, StyleSheet, Text, View,
} = require('react-native');
const { useFocusEffect } = require('@react-navigation/native');

const { loadAll, saveSchedules } = require('../storage/db');
const {
  groupByJam, toggleDone, isDoneToday, deleteSchedule,
} = require('../logic/schedules');
const { todayKey } = require('../utils/date');
const { cancelNotification } = require('../notifications');
const { useNotificationStatus } = require('../NotificationStatus');
const { colors, spacing, radius } = require('../theme');

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const PERAWATAN = {
  makan: { label: 'Makan', icon: '🍽️' },
  mandi: { label: 'Mandi', icon: '🛁' },
  lainnya: { label: 'Lainnya', icon: '🐾' },
};

function tanggalPanjang(date = new Date()) {
  return `${HARI[date.getDay()]}, ${date.getDate()} ${BULAN[date.getMonth()]} ${date.getFullYear()}`;
}

function JadwalListScreen({ navigation }) {
  const [pets, setPets] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const { granted } = useNotificationStatus();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setNow(new Date());
      loadAll()
        .then((data) => {
          if (!active) return;
          setPets(data.pets);
          setSchedules(data.schedules);
          setLoaded(true);
        })
        .catch((error) => {
          console.warn('Gagal memuat data', error);
          if (active) setLoaded(true);
        });
      return () => {
        active = false;
      };
    }, [])
  );

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => navigation.navigate('Hewan')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Kelola hewan"
        >
          <Text style={styles.headerButton}>Hewan</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow((previous) => (
        todayKey(previous) === todayKey() ? previous : new Date()
      ));
    }, 60 * 1000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(new Date());
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  const today = todayKey(now);
  const petById = new Map(pets.map((pet) => [pet.id, pet]));
  const sections = groupByJam(schedules).map((group) => ({
    title: group.jam,
    data: group.items,
  }));
  const doneCount = schedules.filter((item) => isDoneToday(item, today)).length;

  async function handleToggle(schedule) {
    const next = schedules.map((item) => (
      item.id === schedule.id ? toggleDone(item, today) : item
    ));
    setSchedules(next);
    await saveSchedules(next);
  }

  function handleDelete(schedule) {
    const pet = petById.get(schedule.petId);
    const perawatan = PERAWATAN[schedule.perawatan] || PERAWATAN.lainnya;
    Alert.alert(
      'Hapus jadwal?',
      `${pet ? pet.nama : 'Hewan'} • ${perawatan.label} pukul ${schedule.jam}`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            await cancelNotification(schedule.notificationId);
            const next = deleteSchedule(schedules, schedule.id);
            setSchedules(next);
            await saveSchedules(next);
          },
        },
      ]
    );
  }

  function renderItem({ item }) {
    const pet = petById.get(item.petId);
    const perawatan = PERAWATAN[item.perawatan] || PERAWATAN.lainnya;
    const done = isDoneToday(item, today);

    return (
      <Pressable
        style={[styles.card, done && styles.cardDone]}
        onPress={() => navigation.navigate('JadwalForm', { scheduleId: item.id })}
        accessibilityRole="button"
        accessibilityLabel={`Edit jadwal ${perawatan.label} ${pet ? pet.nama : ''}`}
      >
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>{perawatan.icon}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.petName, done && styles.textDone]}>
            {pet ? pet.nama : 'Hewan dihapus'}
          </Text>
          <Text style={styles.meta}>
            {perawatan.label} • {item.jam}
          </Text>
        </View>
        <Pressable
          onPress={() => handleToggle(item)}
          hitSlop={10}
          style={[styles.check, done && styles.checkDone]}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={done ? 'Tandai belum selesai' : 'Tandai selesai'}
        >
          {done ? <Text style={styles.checkMark}>✓</Text> : null}
        </Pressable>
        <Pressable
          onPress={() => handleDelete(item)}
          hitSlop={10}
          style={styles.deleteButton}
          accessibilityRole="button"
          accessibilityLabel="Hapus jadwal"
        >
          <Text style={styles.deleteText}>🗑</Text>
        </Pressable>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      {granted === false ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Notifikasi nonaktif. Jadwal tetap tersimpan, tetapi pengingat tidak akan berbunyi.
          </Text>
        </View>
      ) : null}

      <View style={styles.header}>
        <Text style={styles.date}>{tanggalPanjang(now)}</Text>
        <Text style={styles.summary}>
          {schedules.length === 0
            ? 'Belum ada jadwal'
            : `${doneCount} dari ${schedules.length} jadwal selesai hari ini`}
        </Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionJam}>{section.title}</Text>
            <Text style={styles.sectionCount}>{section.data.length} jadwal</Text>
          </View>
        )}
        contentContainerStyle={[
          styles.listContent,
          sections.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={
          loaded ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🐾</Text>
              <Text style={styles.emptyTitle}>Belum ada jadwal perawatan</Text>
              <Text style={styles.emptyBody}>
                {pets.length === 0
                  ? 'Tambahkan hewan peliharaanmu dulu, lalu buat jadwal makannya.'
                  : 'Tambahkan jadwal pertama untuk hewan peliharaanmu.'}
              </Text>
              <Pressable
                style={styles.emptyButton}
                onPress={() => navigation.navigate(pets.length === 0 ? 'Hewan' : 'JadwalForm')}
              >
                <Text style={styles.emptyButtonText}>
                  {pets.length === 0 ? 'Tambah Hewan' : 'Tambah Jadwal'}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.loading}>Memuat jadwal…</Text>
          )
        }
      />

      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('JadwalForm')}
        accessibilityRole="button"
        accessibilityLabel="Tambah jadwal"
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  date: { fontSize: 20, fontWeight: '700', color: colors.text },
  summary: { marginTop: spacing.xs, color: colors.muted, fontSize: 14 },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: 120 },
  listContentEmpty: { flexGrow: 1 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionJam: { fontSize: 16, fontWeight: '700', color: colors.primaryDark },
  sectionCount: { fontSize: 12, color: colors.muted },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardDone: { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  icon: { fontSize: 20 },
  cardBody: { flex: 1 },
  petName: { fontSize: 16, fontWeight: '600', color: colors.text },
  textDone: { textDecorationLine: 'line-through', color: colors.primaryDark },
  meta: { marginTop: 2, color: colors.muted, fontSize: 13 },
  check: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  checkDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkMark: { color: '#FFFFFF', fontWeight: '700' },
  deleteButton: { marginLeft: spacing.sm, padding: spacing.xs },
  deleteText: { fontSize: 16 },
  banner: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  bannerText: { color: '#4A3A10', fontSize: 13 },
  headerButton: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    marginTop: spacing.md,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  emptyBody: {
    marginTop: spacing.sm,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  emptyButtonText: { color: '#FFFFFF', fontWeight: '600' },
  loading: { textAlign: 'center', color: colors.muted, marginTop: spacing.xl },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  fabText: { color: '#FFFFFF', fontSize: 30, lineHeight: 34, fontWeight: '600' },
});

module.exports = JadwalListScreen;
