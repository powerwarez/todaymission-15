import { formatInTimeZone } from "date-fns-tz";
import { isOptionalMissionDay } from "./koreanHolidays";

const KST_TIMEZONE = "Asia/Seoul";
const DAY_MS = 24 * 60 * 60 * 1000;

/** ISO 시각을 KST 기준 yyyy-MM-dd 로 변환 */
export const toKstDateString = (isoOrDate: string | Date): string =>
  formatInTimeZone(isoOrDate, KST_TIMEZONE, "yyyy-MM-dd");

const toDayNumber = (dateString: string): number =>
  Math.floor(new Date(`${dateString}T00:00:00Z`).getTime() / DAY_MS);

const toDateString = (dayNumber: number): string =>
  new Date(dayNumber * DAY_MS).toISOString().slice(0, 10);

/**
 * 이 날 다음에 반드시 달성해야 연속이 이어지는 날.
 * 주말과 한국 공휴일은 건너뛴다.
 */
const nextRequiredDay = (dayNumber: number): number => {
  let next = dayNumber + 1;
  for (let guard = 0; guard < 21; guard += 1) {
    if (!isOptionalMissionDay(toDateString(next))) return next;
    next += 1;
  }
  return next;
};

/**
 * 오늘의 영웅을 달성한 날 중 가장 길게 이어진 연속 일수.
 * 세는 날은 주말과 한국 공휴일을 뺀 평일뿐이다.
 * 그 날은 달성해도 일수에 넣지 않고, 빼먹어도 연속이 끊기지 않는다.
 */
export const calcBestHeroStreak = (dateStrings: Iterable<string>): number => {
  const days = [...new Set(dateStrings)]
    .map(toDayNumber)
    .filter(
      (day) => Number.isFinite(day) && !isOptionalMissionDay(toDateString(day))
    )
    .sort((a, b) => a - b);

  if (days.length === 0) return 0;

  let best = 1;
  let current = 1;
  for (let i = 1; i < days.length; i += 1) {
    if (days[i] === nextRequiredDay(days[i - 1])) {
      current += 1;
    } else {
      current = 1;
    }
    if (current > best) best = current;
  }
  return best;
};
