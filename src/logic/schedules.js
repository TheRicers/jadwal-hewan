function createSchedule({ petId, perawatan, jam }, id) {
  return {
    id,
    petId,
    perawatan,
    jam,
    notificationId: null,
    riwayat: [],
  };
}

function updateSchedule(schedules, id, patch) {
  return schedules.map((schedule) => (
    schedule.id === id ? { ...schedule, ...patch } : schedule
  ));
}

function deleteSchedule(schedules, id) {
  return schedules.filter((schedule) => schedule.id !== id);
}

function isDoneToday(schedule, dateKey) {
  return Array.isArray(schedule.riwayat) && schedule.riwayat.includes(dateKey);
}

function toggleDone(schedule, dateKey) {
  const riwayat = Array.isArray(schedule.riwayat) ? schedule.riwayat : [];
  const done = riwayat.includes(dateKey);
  return {
    ...schedule,
    riwayat: done
      ? riwayat.filter((date) => date !== dateKey)
      : [...riwayat, dateKey],
  };
}

function groupByJam(schedules) {
  const groups = new Map();
  schedules.forEach((schedule) => {
    if (!groups.has(schedule.jam)) {
      groups.set(schedule.jam, []);
    }
    groups.get(schedule.jam).push(schedule);
  });
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([jam, items]) => ({ jam, items }));
}

module.exports = {
  createSchedule,
  updateSchedule,
  deleteSchedule,
  isDoneToday,
  toggleDone,
  groupByJam,
};
