const React = require('react');
const { useCallback, useEffect, useState } = React;
const { AppState } = require('react-native');
const { StatusBar } = require('expo-status-bar');
const { NavigationContainer } = require('@react-navigation/native');
const { createNativeStackNavigator } = require('@react-navigation/native-stack');
const { SafeAreaProvider } = require('react-native-safe-area-context');

const JadwalListScreen = require('./src/screens/JadwalListScreen');
const JadwalFormScreen = require('./src/screens/JadwalFormScreen');
const HewanScreen = require('./src/screens/HewanScreen');
const RiwayatScreen = require('./src/screens/RiwayatScreen');
const PengaturanScreen = require('./src/screens/PengaturanScreen');
const { NotificationStatusContext } = require('./src/NotificationStatus');
const {
  getNotificationPermission, setupNotifications, rescheduleMissing,
} = require('./src/notifications');
const { loadSchedules, saveSchedules, loadPerawatanKustom } = require('./src/storage/db');
const { colors } = require('./src/theme');

const Stack = createNativeStackNavigator();

function App() {
  const [notificationGranted, setNotificationGranted] = useState(null);

  const syncNotifications = useCallback(async (requestPermission = false) => {
    let granted = false;
    try {
      granted = requestPermission
        ? await setupNotifications()
        : await getNotificationPermission();
    } catch (error) {
      console.warn('Gagal menyiapkan notifikasi', error);
    }
    setNotificationGranted(granted);
    if (!granted) return;

    try {
      const [schedules, perawatanKustom] = await Promise.all([
        loadSchedules(),
        loadPerawatanKustom(),
      ]);
      const result = await rescheduleMissing(schedules, perawatanKustom);
      if (result.changed) {
        await saveSchedules(result.schedules);
      }
    } catch (error) {
      console.warn('Gagal menjadwalkan ulang notifikasi', error);
    }
  }, []);

  useEffect(() => {
    syncNotifications(true);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncNotifications(false);
    });
    return () => {
      subscription.remove();
    };
  }, [syncNotifications]);

  return (
    <SafeAreaProvider>
      <NotificationStatusContext.Provider
        value={{ granted: notificationGranted, refresh: () => syncNotifications(false) }}
      >
        <StatusBar style="light" />
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerStyle: { backgroundColor: colors.primary },
              headerTintColor: '#FFFFFF',
              headerTitleStyle: { fontWeight: '600' },
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen
              name="JadwalList"
              component={JadwalListScreen}
              options={{ title: 'Jadwal Perawatan' }}
            />
            <Stack.Screen
              name="JadwalForm"
              component={JadwalFormScreen}
              options={({ route }) => ({
                title: route.params?.scheduleId ? 'Edit Jadwal' : 'Tambah Jadwal',
              })}
            />
            <Stack.Screen
              name="Hewan"
              component={HewanScreen}
              options={{ title: 'Hewan Saya' }}
            />
            <Stack.Screen
              name="Riwayat"
              component={RiwayatScreen}
              options={{ title: 'Riwayat Perawatan' }}
            />
            <Stack.Screen
              name="Pengaturan"
              component={PengaturanScreen}
              options={{ title: 'Pengaturan' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </NotificationStatusContext.Provider>
    </SafeAreaProvider>
  );
}

module.exports = App;
