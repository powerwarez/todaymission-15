const PLACEHOLDER_BADGE = "/placeholder_badge.png";
const LOCAL_BADGE_PREFIX = "/badges/";
const STORAGE_BUCKET = "badges";

/**
 * 배지 image_path 를 화면에 표시할 수 있는 URL 로 변환한다.
 * - 비어 있으면 플레이스홀더
 * - http(s) 전체 URL 은 중복 슬래시만 정리해서 그대로 사용
 * - `/badges/` 로 시작하면 앱의 public 폴더에 포함된 정적 이미지
 * - 그 외 상대 경로는 Supabase Storage(badges 버킷) 경로
 */
export const getBadgeImageUrl = (imagePath: string | null | undefined): string => {
  if (!imagePath) return PLACEHOLDER_BADGE;

  if (imagePath.startsWith("http")) {
    return imagePath.replace(/([^:]\/)\/+/g, "$1");
  }

  if (imagePath.startsWith(LOCAL_BADGE_PREFIX)) {
    return imagePath;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const cleanRelativePath = imagePath.replace(/^\/+|\/+$/g, "");
  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${cleanRelativePath}`;
};
