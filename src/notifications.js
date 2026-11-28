const Notifications = require('expo-notifications');
const { Platform } = require('react-native');
const { bodyNotifikasiPerawatan } = require('./logic/perawatan');

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function getNotificationPermission() {
  try {
    const current = await Notifications.getPermissionsAsync();
    return current.granted;
  } catch (error) {
    console.warn('Gagal memeriksa izin notifikasi', error);
    return false;
  }
}

async function setupNotifications() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

async function getExactAlarmPermission() {
  if (Platform.OS !== 'android') return true;
  try {
    const response = await Notifications.getExactAlarmPermissionsAsync();
    return response.granted;
  } catch (error) {
    console.warn('Gagal memeriksa izin alarm tepat waktu', error);
    return false;
  }
}

async function requestExactAlarmPermission() {
  if (Platform.OS !== 'android') return true;
  try {
    const response = await Notifications.requestExactAlarmPermissionsAsync();
    return response.granted;
  } catch (error) {
    console.warn('Gagal meminta izin alarm tepat waktu', error);
    return false;
  }
}

let notificationQueue = Promise.resolve();

function enqueueNotificationTask(task) {
  const run = notificationQueue.then(task, task);
  notificationQueue = run.catch(() => {});
  return run;
}

async function scheduleDailyInternal(schedule, perawatanKustom = []) {
  const [hour, minute] = schedule.jam.split(':').map(Number);
  const trigger = {
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour,
    minute,
  };
  if (Platform.OS === 'android') {
    trigger.delivery = 'alarmClock';
  }
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Waktunya merawat hewan',
        body: bodyNotifikasiPerawatan(schedule.perawatan, perawatanKustom),
        sound: 'default',
        data: { scheduleId: schedule.id },
      },
      trigger,
    });
  } catch (error) {
    console.warn('Gagal menjadwalkan notifikasi', error);
    return null;
  }
}

function scheduleDaily(schedule, perawatanKustom = []) {
  return enqueueNotificationTask(
    () => scheduleDailyInternal(schedule, perawatanKustom)
  );
}

async function cancelNotification(notificationId) {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.warn('Gagal membatalkan notifikasi', error);
  }
}

async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.warn('Gagal membatalkan semua notifikasi', error);
  }
}

function rescheduleAll(schedules, perawatanKustom = []) {
  return enqueueNotificationTask(async () => {
    await cancelAllNotifications();
    return rescheduleMissingInternal(
      schedules.map((schedule) => ({ ...schedule, notificationId: null })),
      perawatanKustom
    );
  });
}

function rescheduleMissing(schedules, perawatanKustom = []) {
  return enqueueNotificationTask(
    () => rescheduleMissingInternal(schedules, perawatanKustom)
  );
}

async function rescheduleMissingInternal(schedules, perawatanKustom = []) {
  // Bersihkan notifikasi yang tidak lagi dimiliki jadwal mana pun dan
  // sinkronkan ID yang tersimpan dengan notifikasi yang benar-benar aktif.
  let scheduledIds = null;
  const scheduledByScheduleId = new Map();
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    scheduledIds = new Set(scheduled.map((notification) => notification.identifier));
    const scheduleIds = new Set(schedules.map((schedule) => schedule.id));
    const activeIds = new Set(
      schedules.map((schedule) => schedule.notificationId).filter(Boolean)
    );

    // Pertahankan satu notifikasi per jadwal meskipun notificationId di
    // storage hilang atau basi (misalnya setelah impor/reschedule).
    for (const notification of scheduled) {
      const scheduleId = notification.content?.data?.scheduleId;
      if (
        scheduleId
        && scheduleIds.has(scheduleId)
        && !scheduledByScheduleId.has(scheduleId)
      ) {
        scheduledByScheduleId.set(scheduleId, notification.identifier);
        activeIds.add(notification.identifier);
      }
    }

    for (const notification of scheduled) {
      if (!activeIds.has(notification.identifier)) {
        await cancelNotification(notification.identifier);
      }
    }
  } catch (error) {
    console.warn('Gagal membersihkan notifikasi lama', error);
  }

  let changed = false;
  const next = [];
  for (const schedule of schedules) {
    if (
      schedule.notificationId
      && (scheduledIds === null || scheduledIds.has(schedule.notificationId))
    ) {
      next.push(schedule);
      continue;
    }
    if (scheduledByScheduleId.has(schedule.id)) {
      next.push({
        ...schedule,
        notificationId: scheduledByScheduleId.get(schedule.id),
      });
      changed = true;
      continue;
    }
    const notificationId = await scheduleDailyInternal(schedule, perawatanKustom);
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
  getNotificationPermission,
  getExactAlarmPermission,
  requestExactAlarmPermission,
  setupNotifications,
  scheduleDaily,
  cancelNotification,
  cancelAllNotifications,
  rescheduleAll,
  rescheduleMissing,
};
