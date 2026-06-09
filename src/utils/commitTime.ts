// Pure helpers for commit-time analytics.

/**
 * The hour-of-day (0–23) at which a commit was authored, in the AUTHOR's local
 * time — not the viewer's. Git stores a UTC timestamp plus a timezone offset
 * (minutes, JS `Date.getTimezoneOffset()` convention: UTC − local). Shifting
 * the timestamp by −offset and reading UTC hours recovers the local hour.
 *
 * Falls back to UTC when the offset is unknown.
 */
export function authorLocalHour(timestamp: number, tzOffsetMinutes?: number): number {
  const offset = tzOffsetMinutes ?? 0
  return new Date((timestamp - offset * 60) * 1000).getUTCHours()
}

/**
 * The day-of-week (0 = Sunday … 6 = Saturday) on which a commit was authored,
 * in the AUTHOR's local time — same convention as {@link authorLocalHour}. Used
 * so the day-of-week histogram matches the hour histogram (and the panel's
 * "author local time" label) rather than resolving in the viewer's timezone.
 */
export function authorLocalDay(timestamp: number, tzOffsetMinutes?: number): number {
  const offset = tzOffsetMinutes ?? 0
  return new Date((timestamp - offset * 60) * 1000).getUTCDay()
}
