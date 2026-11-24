const Notifications = require('expo-notifications');
const { bodyNotifikasiPerawatan } = require('./logic/perawatan');

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function setupNotifications() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

async function scheduleDaily(schedule, perawatanKustom = []) {
  const [hour, minute] = schedule.jam.split(':').map(Number);
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Waktunya merawat hewan',
        body: bodyNotifikasiPerawatan(schedule.perawatan, perawatanKustom),
        sound: 'default',
        data: { scheduleId: schedule.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
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

async function rescheduleMissing(schedules, perawatanKustom = []) {
  let changed = false;
  const next = [];
  for (const schedule of schedules) {
    if (schedule.notificationId) {
      next.push(schedule);
      continue;
    }
    const notificationId = await scheduleDaily(schedule, perawatanKustom);
    if (!notificationId) {
      next.push(schedule);
      continue;
    }
    next.push({ ...schedule, notificationId });
    changed = true;
  }
  return { schedules: next, changed };
}

module.exports = {
  setupNotifications,
  scheduleDaily,
  cancelNotification,
  rescheduleMissing,
};
