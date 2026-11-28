const React = require('react');
const { useCallback, useRef, useState } = React;
const {
  Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable,
  StyleSheet, Text, TextInput, View,
} = require('react-native');
const { useFocusEffect } = require('@react-navigation/native');

const {
  loadAll, saveAll, savePets,
} = require('../storage/db');
const { deletePet } = require('../logic/pets');
const { newId } = require('../utils/id');
const { cancelNotification } = require('../notifications');
const DataErrorBanner = require('../components/DataErrorBanner');
const { colors, spacing, radius } = require('../theme');

const JENIS_CONTOH = ['Kucing', 'Anjing', 'Kelinci', 'Burung', 'Ikan'];

function HewanScreen() {
  const [pets, setPets] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [nama, setNama] = useState('');
  const [jenis, setJenis] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const requestRef = useRef(0);

  const loadData = useCallback(async () => {
    const request = requestRef.current + 1;
    requestRef.current = request;
    setLoaded(false);
    try {
      const data = await loadAll();
      if (request !== requestRef.current) return;
      setPets(data.pets);
      setSchedules(data.schedules);
      setLoadError(data.errors.length > 0);
      setLoaded(true);
    } catch (error) {
      if (request !== requestRef.current) return;
      console.warn('Gagal memuat data hewan', error);
      setLoadError(true);
      setLoaded(true);
    }
  }, []);

  const canWrite = loaded && !loadError;

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  function openAdd() {
    setEditingId(null);
    setNama('');
    setJenis('');
    setModalVisible(true);
  }

  function openEdit(pet) {
    setEditingId(pet.id);
    setNama(pet.nama);
    setJenis(pet.jenis);
    setModalVisible(true);
  }

  async function handleSave() {
    if (!canWrite) {
      Alert.alert('Data belum siap', 'Muat ulang data terlebih dahulu.');
      return;
    }
    const namaBersih = nama.trim();
    const jenisBersih = jenis.trim();
    if (!namaBersih) {
      Alert.alert('Nama wajib diisi', 'Isi nama hewan peliharaanmu.');
      return;
    }

    let next;
    if (editingId) {
      next = pets.map((pet) => (
        pet.id === editingId
          ? { ...pet, nama: namaBersih, jenis: jenisBersih || 'Hewan' }
          : pet
      ));
    } else {
      next = [...pets, { id: newId(), nama: namaBersih, jenis: jenisBersih || 'Hewan' }];
    }

    try {
      await savePets(next);
      setPets(next);
      setModalVisible(false);
    } catch (error) {
      console.warn('Gagal menyimpan hewan', error);
      Alert.alert('Gagal menyimpan', 'Data hewan tidak dapat disimpan.');
    }
  }

  function handleDelete(pet) {
    const jumlah = schedules.filter((item) => item.petId === pet.id).length;
    const pesan = jumlah > 0
      ? `${jumlah} jadwal perawatan milik ${pet.nama} juga akan dihapus.`
      : `Hewan ${pet.nama} akan dihapus.`;

    Alert.alert('Hapus hewan?', pesan, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          if (!canWrite) {
            Alert.alert('Data belum siap', 'Muat ulang data terlebih dahulu.');
            return;
          }
          const result = deletePet(pets, schedules, pet.id);
          try {
            await saveAll({
              pets: result.pets,
              schedules: result.schedules,
            });
            setPets(result.pets);
            setSchedules(result.schedules);
            for (const schedule of result.removed) {
              await cancelNotification(schedule.notificationId);
            }
          } catch (error) {
            console.warn('Gagal menghapus hewan', error);
            Alert.alert('Gagal menghapus', 'Data hewan tidak dapat dihapus.');
          }
        },
      },
    ]);
  }

  function renderPet({ item }) {
    const jumlah = schedules.filter((schedule) => schedule.petId === item.id).length;
    return (
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.nama.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.nama}>{item.nama}</Text>
          <Text style={styles.meta}>
            {item.jenis} • {jumlah} jadwal
          </Text>
        </View>
        <Pressable
          onPress={() => openEdit(item)}
          disabled={!canWrite}
          hitSlop={8}
          style={styles.action}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${item.nama}`}
          accessibilityState={{ disabled: !canWrite }}
        >
          <Text style={styles.actionText}>Ubah</Text>
        </Pressable>
        <Pressable
          onPress={() => handleDelete(item)}
          disabled={!canWrite}
          hitSlop={8}
          style={[styles.action, styles.actionDanger]}
          accessibilityRole="button"
          accessibilityLabel={`Hapus ${item.nama}`}
          accessibilityState={{ disabled: !canWrite }}
        >
          <Text style={[styles.actionText, styles.actionDangerText]}>Hapus</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={pets}
        keyExtractor={(item) => item.id}
        renderItem={renderPet}
        contentContainerStyle={[
          styles.listContent,
          pets.length === 0 && styles.listContentEmpty,
        ]}
        ListHeaderComponent={loadError ? (
          <DataErrorBanner
            message="Data hewan tidak dapat dimuat. Perubahan dinonaktifkan agar data tidak tertimpa."
            onRetry={loadData}
          />
        ) : null}
        ListEmptyComponent={
          loadError ? null : !loaded ? (
            <Text style={styles.loading}>Memuat hewan…</Text>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🐶</Text>
              <Text style={styles.emptyTitle}>Belum ada hewan</Text>
              <Text style={styles.emptyBody}>
                Tambahkan hewan peliharaanmu agar bisa dibuatkan jadwal perawatan.
              </Text>
            </View>
          )
        }
      />

      <Pressable
        style={[styles.fab, !canWrite && styles.fabDisabled]}
        onPress={openAdd}
        disabled={!canWrite}
        accessibilityRole="button"
        accessibilityLabel="Tambah hewan"
        accessibilityState={{ disabled: !canWrite }}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingId ? 'Edit Hewan' : 'Hewan Baru'}
            </Text>

            <Text style={styles.inputLabel}>Nama</Text>
            <TextInput
              value={nama}
              onChangeText={setNama}
              placeholder="Misalnya Milo"
              placeholderTextColor={colors.muted}
              style={styles.input}
              autoFocus
            />

            <Text style={styles.inputLabel}>Jenis</Text>
            <TextInput
              value={jenis}
              onChangeText={setJenis}
              placeholder="Misalnya Kucing"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
            <View style={styles.suggestRow}>
              {JENIS_CONTOH.map((contoh) => (
                <Pressable
                  key={contoh}
                  onPress={() => setJenis(contoh)}
                  style={styles.suggest}
                >
                  <Text style={styles.suggestText}>{contoh}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.modalCancel]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, styles.modalSave]} onPress={handleSave}>
                <Text style={styles.modalSaveText}>Simpan</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.lg, paddingBottom: 120 },
  listContentEmpty: { flexGrow: 1 },
  loading: { textAlign: 'center', color: colors.muted, marginTop: spacing.xl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: colors.primaryDark },
  cardBody: { flex: 1 },
  nama: { fontSize: 16, fontWeight: '600', color: colors.text },
  meta: { marginTop: 2, color: colors.muted, fontSize: 13 },
  action: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  actionText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  actionDanger: { marginLeft: spacing.xs },
  actionDangerText: { color: colors.danger },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { marginTop: spacing.md, fontSize: 17, fontWeight: '700', color: colors.text },
  emptyBody: {
    marginTop: spacing.sm,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
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
  fabDisabled: { opacity: 0.45 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 32, 28, 0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  inputLabel: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.text,
    backgroundColor: colors.background,
  },
  suggestRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm },
  suggest: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
    marginTop: spacing.xs,
  },
  suggestText: { color: colors.primaryDark, fontSize: 12, fontWeight: '600' },
  modalActions: { flexDirection: 'row', marginTop: spacing.lg },
  modalButton: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  modalCancel: { backgroundColor: colors.background, marginRight: spacing.sm },
  modalCancelText: { color: colors.text, fontWeight: '600' },
  modalSave: { backgroundColor: colors.primary },
  modalSaveText: { color: '#FFFFFF', fontWeight: '700' },
});

module.exports = HewanScreen;
