const TZ_OFFSETS: Record<string, number> = {
  "Pacific/Honolulu": -10,
  "America/Anchorage": -9,
  "America/Los_Angeles": -8,
  "America/Denver": -7,
  "America/Phoenix": -7,
  "America/Chicago": -6,
  "America/New_York": -5,
  "America/Halifax": -4,
  "America/Sao_Paulo": -3,
  "Atlantic/South_Georgia": -2,
  "Atlantic/Azores": -1,
  "UTC": 0,
  "Europe/London": 0,
  "Europe/Berlin": 1,
  "Europe/Paris": 1,
  "Europe/Helsinki": 2,
  "Europe/Istanbul": 3,
  "Asia/Dubai": 4,
  "Asia/Karachi": 5,
  "Asia/Kolkata": 5.5,
  "Asia/Dhaka": 6,
  "Asia/Bangkok": 7,
  "Asia/Shanghai": 8,
  "Asia/Hong_Kong": 8,
  "Asia/Singapore": 8,
  "Asia/Tokyo": 9,
  "Asia/Seoul": 9,
  "Australia/Sydney": 10,
  "Pacific/Auckland": 12,
};

export function getUtcOffset(tz: string): number | null {
  return TZ_OFFSETS[tz] ?? null;
}

export function timezoneProximity(tzA: string, tzB: string): number {
  if (tzA === tzB) return 1.0;

  const offsetA = getUtcOffset(tzA);
  const offsetB = getUtcOffset(tzB);

  if (offsetA === null || offsetB === null) return 0.5;

  const diff = Math.abs(offsetA - offsetB);
  const wrappedDiff = Math.min(diff, 24 - diff);

  if (wrappedDiff <= 1) return 0.95;
  if (wrappedDiff <= 3) return 0.75;
  if (wrappedDiff <= 6) return 0.5;
  if (wrappedDiff <= 9) return 0.25;
  return 0.1;
}
