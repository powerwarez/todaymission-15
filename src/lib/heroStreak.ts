import { formatInTimeZone } from "date-fns-tz";

const KST_TIMEZONE = "Asia/Seoul";
const DAY_MS = 24 * 60 * 60 * 1000;

/** ISO 시각을 KST 기준 yyyy-MM-dd 로 변환 */
export const toKstDateString = (isoOrDate: string | Date): string =>
  formatInTimeZone(isoOrDate, KST_TIMEZONE, "yyyy-MM-dd");

const toDayNumber = (dateString: string): number =>
  Math.floor(new Date(`${dateString}T00:00:00Z`).getTime() / DAY_MS);

// 0: 일요일 ~ 6: 토요일
const getDayOfWeek = (dayNumber: number): number =>
  new Date(dayNumber * DAY_MS).getUTCDay();

/**
 * 이어지려면 다음에 나타나야 하는 가장 늦은 날(일 번호).
 * 주말에는 쉬어도 연속이 끊기지 않도록 금요일 다음은 월요일로 본다.
 */
const getLatestContinuingDay = (dayNumber: number): number => {
  switch (getDayOfWeek(dayNumber)) {
    case 5: // 금 → 월
      return dayNumber + 3;
    case 6: // 토 → 월
      return dayNumber + 2;
    default:
      return dayNumber + 1;
  }
};

/**
 * 오늘의 영웅을 달성한 날짜들 중 가장 길게 이어진 연속 일수를 계산한다.
 * 주말(토/일)은 달성하지 않아도 연속이 끊기지 않으며, 달성한 주말은 일수에 포함된다.
 */
export const calcBestHeroStreak = (dateStrings: Iterable<string>): number => {
  const days = [...new Set(dateStrings)].map(toDayNumber).sort((a, b) => a - b);
  if (days.length === 0) return 0;

  let best = 1;
  let current = 1;
  for (let i = 1; i < days.length; i++) {
    if (days[i] <= getLatestContinuingDay(days[i - 1])) {
      current += 1;
    } else {
      current = 1;
    }
    if (current > best) best = current;
  }
  return best;
};
