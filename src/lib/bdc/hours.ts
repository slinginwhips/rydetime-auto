/**
 * Dealership open/closed clock for the BDC.
 *
 * The BDC answers 24/7, but what it SAYS depends on whether anyone is here:
 * during hours it can offer "come by today"; after hours it books the next
 * open slot instead of implying someone is at a desk right now.
 *
 * Hours mirror DEALERSHIP.hours (Mon–Fri 10–6, Sat 10–5, Sun closed) and are
 * evaluated in the dealership's own timezone, never the server's UTC.
 */

export const DEALERSHIP_TZ = "America/New_York";

/** Open hours per weekday index (0 = Sunday). null = closed all day. */
const OPEN_HOURS: ({ open: number; close: number } | null)[] = [
  null, // Sun
  { open: 10, close: 18 }, // Mon
  { open: 10, close: 18 },
  { open: 10, close: 18 },
  { open: 10, close: 18 },
  { open: 10, close: 18 }, // Fri
  { open: 10, close: 17 }, // Sat
];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface LocalTime {
  /** 0 = Sunday. */
  weekday: number;
  hour: number;
  minute: number;
  /** YYYY-MM-DD in dealership local time. */
  date: string;
}

/** Break a UTC instant into dealership-local parts (DST-correct). */
export function localParts(now: Date = new Date()): LocalTime {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: DEALERSHIP_TZ,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday ?? "Sun");
  // hourCycle quirk: midnight can format as "24".
  const hour = Number(parts.hour) % 24;
  return {
    weekday: weekdayIndex < 0 ? 0 : weekdayIndex,
    hour,
    minute: Number(parts.minute),
    date: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

export function isOpenAt(now: Date = new Date()): boolean {
  const { weekday, hour } = localParts(now);
  const window = OPEN_HOURS[weekday];
  if (!window) return false;
  return hour >= window.open && hour < window.close;
}

/** Human phrase for the next time someone is here, e.g. "tomorrow at 10am". */
export function nextOpenDescription(now: Date = new Date()): string {
  const { weekday, hour } = localParts(now);
  const today = OPEN_HOURS[weekday];

  if (today && hour < today.open) return `today at ${formatHour(today.open)}`;

  for (let ahead = 1; ahead <= 7; ahead++) {
    const day = (weekday + ahead) % 7;
    const window = OPEN_HOURS[day];
    if (!window) continue;
    const when = ahead === 1 ? "tomorrow" : DAY_NAMES[day];
    return `${when} at ${formatHour(window.open)}`;
  }
  return "when we reopen";
}

/** "5:37pm" (or "5pm" on the hour). */
function formatClock(hour24: number, minute: number): string {
  const suffix = hour24 >= 12 ? "pm" : "am";
  const h = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return minute ? `${h}:${String(minute).padStart(2, "0")}${suffix}` : `${h}${suffix}`;
}

function formatHour(hour24: number): string {
  const suffix = hour24 >= 12 ? "pm" : "am";
  const h = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${h}${suffix}`;
}

/** Is a proposed appointment (local date + 24h time) inside open hours? */
export function isWithinHours(date: string, time: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const t = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m || !t) return false;
  const hour = Number(t[1]);
  const minute = Number(t[2]);
  if (hour > 23 || minute > 59) return false;
  // Noon UTC avoids the date rolling backwards for US timezones.
  const parsed = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
  if (Number.isNaN(parsed.getTime())) return false;
  const window = OPEN_HOURS[parsed.getUTCDay()];
  if (!window) return false;
  const minutes = hour * 60 + minute;
  return minutes >= window.open * 60 && minutes <= (window.close - 1) * 60 + 30;
}

/** The open/closed block handed to the model with every draft. */
export function hoursContext(now: Date = new Date()): string {
  const { weekday, hour, minute, date } = localParts(now);
  const clock = `${DAY_NAMES[weekday]} ${date} at ${formatClock(hour, minute)}`;
  return isOpenAt(now)
    ? `RIGHT NOW: ${clock} (dealership local time). We are OPEN — someone is here today until ${formatHour(OPEN_HOURS[weekday]!.close)}.`
    : `RIGHT NOW: ${clock} (dealership local time). We are CLOSED. Next open: ${nextOpenDescription(now)}.`;
}
