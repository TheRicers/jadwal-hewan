function pad2(value) {
  return String(value).padStart(2, '0');
}

function todayKey(now = new Date()) {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

const JAM_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function isValidJam(jam) {
  return typeof jam === 'string' && JAM_PATTERN.test(jam);
}

function formatJam(jam) {
  if (!isValidJam(jam)) {
    throw new Error(`Jam tidak valid: ${jam}`);
  }
  return jam;
}

module.exports = { todayKey, isValidJam, formatJam };
