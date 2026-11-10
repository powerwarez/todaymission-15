import {
  y2018,
  y2019,
  y2020,
  y2021,
  y2022,
  y2023,
  y2024,
  y2025,
  y2026,
  y2027,
} from "@hyunbinseo/holidays-kr/all";

/**
 * 우주항공청 월력요항을 가공한 한국 공휴일.
 * 설·추석 연휴, 대체공휴일, 임시공휴일, 선거일이 포함된다. (2018–2027)
 */
const HOLIDAYS: Record<string, readonly string[]> = {
  ...y2018,
  ...y2019,
  ...y2020,
  ...y2021,
  ...y2022,
  ...y2023,
  ...y2024,
  ...y2025,
  ...y2026,
  ...y2027,
};

/** yyyy-MM-dd 가 한국 공휴일이면 true */
export const isKoreanPublicHoliday = (dateString: string): boolean =>
  Object.prototype.hasOwnProperty.call(HOLIDAYS, dateString);

/** 공휴일 이름. 같은 날 이름이 여러 개면 가운데 점으로 잇는다. */
export const getKoreanHolidayLabel = (dateString: string): string | null => {
  const names = HOLIDAYS[dateString];
  return names ? names.join(" · ") : null;
};

/**
 * 미션을 하지 않아도 되는 날.
 * 토요일·일요일과 한국 공휴일은 달성해도 되고 안 해도 된다.
 */
export const isOptionalMissionDay = (dateString: string): boolean => {
  const day = new Date(`${dateString}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6 || isKoreanPublicHoliday(dateString);
};
