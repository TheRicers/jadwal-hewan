const Notifications = require('expo-notifications');
const { Platform } = require('react-native');

const CHANNEL_ID = 'jadwal-perawatan';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function bodyFor(perawatan) {
  if (perawatan === 'makan') return 'Jangan lupa memberi makan hewan peliharaanmu.';
  if (perawatan === 'mandi') return 'Jangan lupa memandikan hewan peliharaanmu.';
  return 'Jangan lupa merawat hewan peliharaanmu.';
}

async function setupNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Jadwal Perawatan',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

async function scheduleDaily(schedule) {
  const [hour, minute] = schedule.jam.split(':').map(Number);
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Waktunya merawat hewan',
        body: bodyFor(schedule.perawatan),
        sound: 'default',
        data: { scheduleId: schedule.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: CHANNEL_ID,
      },
    });
  } catch (error) {
    console.warn('Gagal menjadwalkan notifikasi', error);
    return null;
  }
}

async function cancelNotification(notificationId) {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.warn('Gagal membatalkan notifikasi', error);
  }
}

async function rescheduleMissing(schedules) {
  let changed = false;
  const next = [];
  for (const schedule of schedules) {
    if (schedule.notificationId) {
      next.push(schedule);
      continue;
    }
    const notificationId = await scheduleDaily(schedule);
    next.push({ ...schedule, notificationId });
    changed = true;
  }
  return { schedules: next, changed };
}

module.exports = {
  CHANNEL_ID,
  setupNotifications,
  scheduleDaily,
  cancelNotification,
  rescheduleMissing,
};
