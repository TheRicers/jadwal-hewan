const React = require('react');
const { useEffect, useState } = React;
const {
  KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} = require('react-native');

const { colors, spacing, radius } = require('../theme');

function NamaPerawatanModal({
  visible, mode = 'tambah', initialNama = '', onClose, onSubmit,
}) {
  const [nama, setNama] = useState(initialNama);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setNama(initialNama || '');
    setError(null);
    setSubmitting(false);
  }, [visible, initialNama]);

  function handleChange(value) {
    setNama(value);
    if (error) setError(null);
  }

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const message = await onSubmit(nama);
      if (message) setError(message);
    } catch (err) {
      console.warn('Gagal menyimpan jenis perawatan', err);
      setError('Gagal menyimpan jenis perawatan.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    if (submitting) return;
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>
            {mode === 'ubah' ? 'Ubah Jenis Perawatan' : 'Jenis Perawatan Baru'}
          </Text>

          <Text style={styles.inputLabel}>Nama</Text>
          <TextInput
            value={nama}
            onChangeText={handleChange}
            placeholder="Misalnya Grooming"
            placeholderTextColor={colors.muted}
            style={styles.input}
            autoFocus
            maxLength={30}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.modalActions}>
            <Pressable
              style={[styles.modalButton, styles.modalCancel]}
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Batal"
            >
              <Text style={styles.modalCancelText}>Batal</Text>
            </Pressable>
            <Pressable
              style={[styles.modalButton, styles.modalSave, submitting && styles.modalSaveDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Simpan jenis perawatan"
            >
              <Text style={styles.modalSaveText}>{submitting ? 'Menyimpan…' : 'Simpan'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function KelolaPerawatanModal({
  visible, perawatanKustom = [], onClose, onUbah, onHapus,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Kelola Jenis Perawatan</Text>

          {perawatanKustom.length === 0 ? (
            <Text style={styles.kelolaEmpty}>
              Belum ada jenis perawatan kustom. Tambahkan lewat chip + Baru.
            </Text>
          ) : (
            <ScrollView style={styles.kelolaList}>
              {perawatanKustom.map((item) => (
                <View key={item.id} style={styles.kelolaRow}>
                  <Text style={styles.kelolaNama} numberOfLines={1}>
                    🐾 {item.nama}
                  </Text>
                  <Pressable
                    onPress={() => onUbah(item)}
                    hitSlop={8}
                    style={styles.kelolaAction}
                    accessibilityRole="button"
                    accessibilityLabel={`Ubah ${item.nama}`}
                  >
                    <Text style={styles.kelolaActionText}>Ubah</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onHapus(item)}
                    hitSlop={8}
                    style={[styles.kelolaAction, styles.kelolaActionDanger]}
                    accessibilityRole="button"
                    accessibilityLabel={`Hapus ${item.nama}`}
                  >
                    <Text style={[styles.kelolaActionText, styles.kelolaActionDangerText]}>
                      Hapus
                    </Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}

          <Pressable
            style={styles.kelolaTutup}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Tutup kelola jenis perawatan"
          >
            <Text style={styles.kelolaTutupText}>Tutup</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  error: { marginTop: spacing.sm, color: colors.danger, fontSize: 13 },
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
  modalSaveDisabled: { opacity: 0.6 },
  modalSaveText: { color: '#FFFFFF', fontWeight: '700' },
  kelolaList: { marginTop: spacing.md, maxHeight: 280 },
  kelolaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  kelolaNama: { flex: 1, color: colors.text, fontWeight: '600' },
  kelolaAction: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  kelolaActionText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  kelolaActionDanger: { marginLeft: spacing.xs },
  kelolaActionDangerText: { color: colors.danger },
  kelolaEmpty: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    color: colors.muted,
    lineHeight: 20,
  },
  kelolaTutup: {
    marginTop: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  kelolaTutupText: { color: colors.text, fontWeight: '600' },
});

module.exports = { NamaPerawatanModal, KelolaPerawatanModal };
