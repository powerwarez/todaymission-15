export interface WeeklyMissionDay {
  date: string;
  isCompleted: boolean | null;
  isHoliday: boolean;
}

/**
 * 이번 주 월~금 중 한국 공휴일을 뺀 날이 모두 완료됐는지.
 * 공휴일은 완료 여부와 상관없이 조건에서 빠진다.
 * 아직 오지 않은 필수 요일이 남아 있으면 달성으로 보지 않는다.
 * 필수 요일이 하나도 없으면 달성으로 보지 않는다.
 */
export const isWeeklyMissionComplete = (
  days: WeeklyMissionDay[],
  today: string
): boolean => {
  const required = days.filter((day) => !day.isHoliday);
  if (required.length === 0) return false;
  return required.every(
    (day) => day.date <= today && day.isCompleted === true
  );
};
