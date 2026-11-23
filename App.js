const React = require('react');
const { useEffect, useState } = React;
const { StatusBar } = require('expo-status-bar');
const { NavigationContainer } = require('@react-navigation/native');
const { createNativeStackNavigator } = require('@react-navigation/native-stack');
const { SafeAreaProvider } = require('react-native-safe-area-context');

const JadwalListScreen = require('./src/screens/JadwalListScreen');
const JadwalFormScreen = require('./src/screens/JadwalFormScreen');
const HewanScreen = require('./src/screens/HewanScreen');
const { NotificationStatusContext } = require('./src/NotificationStatus');
const { setupNotifications, rescheduleMissing } = require('./src/notifications');
const { loadSchedules, saveSchedules } = require('./src/storage/db');
const { colors } = require('./src/theme');

const Stack = createNativeStackNavigator();

function App() {
  const [notificationGranted, setNotificationGranted] = useState(null);

  useEffect(() => {
    let active = true;

    async function prepareNotifications() {
      let granted = false;
      try {
        granted = await setupNotifications();
      } catch (error) {
        console.warn('Gagal menyiapkan notifikasi', error);
      }
      if (!active) return;
      setNotificationGranted(granted);
      if (!granted) return;

      try {
        const schedules = await loadSchedules();
        const result = await rescheduleMissing(schedules);
        if (result.changed) {
          await saveSchedules(result.schedules);
        }
      } catch (error) {
        console.warn('Gagal menjadwalkan ulang notifikasi', error);
      }
    }

    prepareNotifications();
    return () => {
      active = false;
    };
  }, []);

  return (
    <SafeAreaProvider>
      <NotificationStatusContext.Provider value={{ granted: notificationGranted }}>
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
          </Stack.Navigator>
        </NavigationContainer>
      </NotificationStatusContext.Provider>
    </SafeAreaProvider>
  );
}

module.exports = App;
