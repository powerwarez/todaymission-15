// 클래스 이름 결합 헬퍼 (falsy 값은 제외)
export const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");
