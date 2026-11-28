const React = require('react');
const { Pressable, StyleSheet, Text, View } = require('react-native');
const { colors, spacing, radius } = require('../theme');

function DataErrorBanner({
  message = 'Gagal memuat data dari penyimpanan.',
  onRetry,
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          style={styles.button}
          accessibilityRole="button"
          accessibilityLabel="Coba muat ulang data"
        >
          <Text style={styles.buttonText}>Coba lagi</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  text: { color: colors.danger, lineHeight: 20 },
  button: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    backgroundColor: colors.danger,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
});

module.exports = DataErrorBanner;
