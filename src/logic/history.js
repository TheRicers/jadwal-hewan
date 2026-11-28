const { todayKey } = require('../utils/date');

function pad2(value) {
  return String(value).padStart(2, '0');
}

function dateKeyFor(year, monthIndex, day) {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

function monthPrefix(year, monthIndex) {
  return `${year}-${pad2(monthIndex + 1)}`;
}

function dateFromKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function completionDates(schedules) {
  const dates = new Set();
  for (const schedule of schedules) {
    const riwayat = Array.isArray(schedule.riwayat) ? schedule.riwayat : [];
    for (const date of riwayat) {
      if (typeof date === 'string') dates.add(date);
    }
  }
  return dates;
}

function monthSummary(schedules, year, monthIndex) {
  const prefix = monthPrefix(year, monthIndex);
  const counts = {};
  let total = 0;

  for (const schedule of schedules) {
    const riwayat = Array.isArray(schedule.riwayat) ? schedule.riwayat : [];
    const unik = new Set(riwayat.filter((date) => typeof date === 'string'));
    for (const date of unik) {
      if (!date.startsWith(prefix)) continue;
      counts[date] = (counts[date] || 0) + 1;
      total += 1;
    }
  }

  return { counts, total, activeDays: Object.keys(counts).length };
}

function perPetCounts(schedules, year, monthIndex) {
  const prefix = monthPrefix(year, monthIndex);
  const counts = {};

  for (const schedule of schedules) {
    const riwayat = Array.isArray(schedule.riwayat) ? schedule.riwayat : [];
    const unik = new Set(riwayat.filter((date) => typeof date === 'string'));
    for (const date of unik) {
      if (!date.startsWith(prefix)) continue;
      counts[schedule.petId] = (counts[schedule.petId] || 0) + 1;
    }
  }

  return counts;
}

function currentStreak(schedules, today = todayKey()) {
  const dates = completionDates(schedules);
  const cursor = dateFromKey(today);

  if (!dates.has(today)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (true) {
    const key = dateKeyFor(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
    if (!dates.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function buildCalendar(year, monthIndex) {
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const leading = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = [];

  for (let index = 0; index < leading; index += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, key: dateKeyFor(year, monthIndex, day) });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  return weeks;
}

module.exports = {
  buildCalendar,
  currentStreak,
  dateKeyFor,
  monthSummary,
  perPetCounts,
};
