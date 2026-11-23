const React = require('react');
const { View, Text, StyleSheet } = require('react-native');
const { colors, spacing } = require('../theme');

function JadwalFormScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Form jadwal</Text>
      <Text style={styles.body}>Form akan diisi di langkah berikutnya.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  title: { fontSize: 18, fontWeight: '600', color: colors.text },
  body: { marginTop: spacing.sm, color: colors.muted },
});

module.exports = JadwalFormScreen;
